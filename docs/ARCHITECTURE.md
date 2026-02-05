# Архитектура системы складского и финансового учёта стоматологической клиники

## 1. Обзор системы

Система предназначена для:
- Учёта материалов и поставщиков
- Приёмки товара (поступление на склад)
- Списания (ручное и через оказание услуг)
- Расчёта средней взвешенной себестоимости (WAC)
- Управления услугами и их составом
- Финансовой аналитики: маржа, рентабельность, точка безубыточности

Прибыль клиники формируется из:
1. **Наценка на материалы** (разница между закупочной ценой и учётной/отпускной)
2. **Трудовая маржа** (разница между ценой услуги и себестоимостью материалов + доля врача)

---

## 2. Архитектура приложения

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React + TS)                     │
│  Features: materials | suppliers | services | sales | reports   │
│  State: Zustand | API: axios/fetch                               │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (NestJS)                             │
│  REST API | DTO validation | Guards (Auth, RBAC)                 │
│  Modules: Materials | Suppliers | Stock | Services | Sales |     │
│           Reports | Auth | Users                                  │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Domain Services (Business Logic)                                │
│  - StockMovementEngine (WAC, движения, списания)                  │
│  - FinancialEngine (себестоимость услуги, маржа, break-even)     │
│  - SnapshotService (снимки себестоимости при продаже)            │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Prisma ORM  →  PostgreSQL                                       │
│  Транзакции, блокировки для конкуренции, soft delete             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Схема базы данных

### 3.1 Основные сущности

| Таблица | Назначение |
|--------|------------|
| `materials` | Справочник материалов (название, категория, единица, порог, WAC) |
| `suppliers` | Поставщики и контакты |
| `stock_entries` | Приходные накладные (поставка от поставщика) |
| `stock_entry_items` | Строки приходной накладной (материал, кол-во, цена) |
| `stock_movements` | Универсальный журнал движений (приход/расход, причина, ссылка на документ) |
| `services` | Услуги (название, описание, базовая цена) |
| `service_materials` | Состав услуги (материал, количество на одну услугу) |
| `service_sales` | Факт продажи услуги (дата, цена продажи, снимок себестоимости) |
| `service_sale_material_snapshots` | Снимок себестоимости материалов на момент продажи |
| `write_offs` | Ручные списания (материал, кол-во, причина) |
| `users` | Пользователи |
| `roles` | Роли (admin, manager, doctor, viewer) |
| `audit_logs` | Журнал операций для аудита |

### 3.2 Связи и ключевые поля

- **materials**: `average_cost` (WAC), `unit`, `min_stock_threshold`, `is_archived`
- **stock_movements**: `type` (IN | OUT), `source_type` (STOCK_ENTRY | WRITE_OFF | SERVICE_SALE), `source_id`, блокировка по `material_id` при расчёте WAC
- **service_sales**: `sale_price`, `material_cost_total`, `gross_margin`, `margin_percent`, `owner_share`, `doctor_share` (опционально)
- **service_sale_material_snapshots**: `material_id`, `quantity`, `unit_cost_snapshot`, `total_cost` — неизменяемая история

### 3.3 Транзакционная целостность

- При приходе: одна транзакция = создание `stock_entry` + `stock_entry_items` + записи в `stock_movements` + пересчёт WAC по каждому материалу.
- При списании (ручное/по услуге): запись в `stock_movements` + обновление остатков; для услуги — дополнительно создание `service_sale` и снимков в `service_sale_material_snapshots`.
- Использование `SELECT ... FOR UPDATE` по материалу при расчёте WAC и списании для устранения гонок.

---

## 4. Бизнес-сервисы (Domain Services)

### 4.1 StockMovementEngine

- **Приход (Goods Receipt)**  
  Вход: поставщик, список (материал, кол-во, цена за единицу), дата.  
  Действия: создание `stock_entry`, для каждого материала — движение type=IN, пересчёт WAC по формуле:
  `WAC_new = (Q_old * WAC_old + Q_in * Price_in) / (Q_old + Q_in)`.

- **Ручное списание**  
  Вход: материал, кол-во, причина.  
  Действия: проверка остатка, движение type=OUT, source_type=WRITE_OFF.

- **Списание по услуге**  
  Вызывается из FinancialEngine при регистрации продажи услуги: для каждого материала состава — движение type=OUT, source_type=SERVICE_SALE, source_id=service_sale.id.

### 4.2 FinancialEngine

- **Расчёт себестоимости услуги (текущая)**  
  По составу услуги (service_materials) и текущему WAC каждого материала:  
  `service_cost = sum(quantity * material.average_cost)`.

- **Минимальная цена (break-even)**  
  `break_even_price = service_cost` (без потери по материалам).  
  Опционально: `min_viable_price = service_cost + min_margin_percent`.

- **При регистрации продажи услуги**  
  Вход: услуга, фактическая цена продажи, опционально доля врача (%).  
  1. Текущая себестоимость по WAC.  
  2. Сохранение снимков в `service_sale_material_snapshots`.  
  3. Расчёт: `gross_margin = sale_price - material_cost_total`, `margin_percent = (gross_margin / sale_price) * 100`.  
  4. Распределение: `doctor_share`, `owner_share = gross_margin - doctor_share`.  
  5. Вызов StockMovementEngine для списания материалов.  
  6. Сохранение `service_sale` с полями маржи и долей.

- **Историческая точность**  
  Все отчёты по прибыли и рентабельности услуг используют сохранённые снимки (`service_sale_material_snapshots`), а не текущий WAC.

### 4.3 SnapshotService

- При создании `service_sale` для каждой строки состава услуги создаётся запись в `service_sale_material_snapshots` с текущим `average_cost` материала.  
- Таким образом, даже при изменении WAC в будущем отчёт по прошлым продажам остаётся корректным.

---

## 5. Алгоритмы

### 5.1 Weighted Average Cost (WAC)

После каждого прихода по материалу:
```
total_qty_before = SUM(movements IN) - SUM(movements OUT)
total_value_before = total_qty_before * current_average_cost
new_value = quantity_in * price_per_unit
WAC_new = (total_value_before + new_value) / (total_qty_before + quantity_in)
```
Обновляется поле `materials.average_cost`.

### 5.2 Остаток на складе

Остаток = SUM(movements IN) - SUM(movements OUT) по material_id. Для производительности можно вести денормализованное поле `current_quantity` в материалах и обновлять его в той же транзакции, что и движение (с блокировкой).

### 5.3 Распределение маржи

- `gross_margin = sale_price - material_cost_total`
- Если задана доля врача (например 30%): `doctor_share = gross_margin * 0.30`, `owner_share = gross_margin * 0.70`
- Возможность расширения: настройка правил в конфиге (процент по ролям, по категориям услуг).

---

## 6. Масштабируемость и расширяемость

- **Мультифилиальность**: добавление `branch_id` в материалы, движения, продажи и фильтрация по филиалу.
- **Интеграция с POS**: отдельный модуль приёма платежей, который создаёт `service_sale` через тот же FinancialEngine.
- **Настраиваемая финансовая логика**: вынос процентов (доля врача, минимальная маржа) в таблицу `settings` или конфиг.

---

## 7. Безопасность и надёжность

- **RBAC**: роли admin, manager, doctor, viewer; проверка прав на создание приходов, списаний, продаж, просмотр отчётов.
- **Аудит**: запись в `audit_logs` ключевых операций (приход, списание, продажа, смена цены услуги).
- **Soft delete**: для материалов, поставщиков, услуг — поле `deleted_at`; в выборках везде `WHERE deleted_at IS NULL` (через Prisma middleware).
- **Обработка ошибок**: единый Exception Filter, коды ошибок и сообщения на русском для API.

---

Дальнейшие шаги: реализация схемы Prisma, миграции, модули NestJS, затем фронтенд по фичам с интерфейсом на русском языке.
