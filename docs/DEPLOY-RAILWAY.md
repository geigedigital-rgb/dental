# Деплой на Railway

Один сервис: бэкенд (NestJS) отдаёт API и собранный фронтенд (Vite/React). Сборка из **корня репозитория**.

---

## 1. Настройка в Railway

- **Root Directory:** не указывать (корень репозитория)
- **Build Command:** `npm run build`
- **Start Command:** `npm run start`

Сборка: устанавливаются зависимости фронта и бэка, собирается фронт, собирается бэк, статика копируется в `backend/public`. Старт: запускается бэкенд (миграции + Nest), он отдаёт `/api/*` и статику SPA с одного домена.

---

## 2. Переменные окружения (Variables)

| Переменная     | Обязательно | Описание |
|----------------|-------------|----------|
| `DATABASE_URL` | Да          | URL PostgreSQL (Neon или Railway Postgres). Пример: `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET`   | Да          | Секрет для подписи JWT |
| `PORT`         | Нет         | Railway подставляет сам |
| `NODE_ENV`     | Нет         | Для продакшена можно задать `production` |

`VITE_API_URL` и `CORS_ORIGIN` не нужны: фронт и API на одном домене.

---

## 3. Порядок деплоя

1. Создать БД (Neon или Railway Postgres), скопировать `DATABASE_URL`.
2. Создать один сервис из репозитория (Root Directory пустой).
3. В Variables задать `DATABASE_URL` и `JWT_SECRET`.
4. Деплой: Build = `npm run build`, Start = `npm run start`.

После деплоя приложение доступно по одному URL (например `https://your-app.railway.app`).

---

## 4. Локальный запуск (без изменений)

Два терминала:

```bash
# Терминал 1 — бэкенд
cd backend && npm install && npm run start:dev
```

```bash
# Терминал 2 — фронтенд
cd frontend && npm install && npm run dev
```

Или из корня: `npm run dev:backend` и `npm run dev:frontend` в разных терминалах.

Открыть http://localhost:3000 — прокси перенаправляет `/api` на бэкенд.
