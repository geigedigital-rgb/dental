# Деплой на Railway

Проект состоит из двух частей: **backend** (NestJS API) и **frontend** (Vite + React). На Railway их удобно развернуть как два сервиса (или один монорепо с двумя сервисами).

---

## 1. Подготовка репозитория

- В корне лежат папки `backend/` и `frontend/`.
- Секреты не коммитятся: в репозитории есть только `.env.example` в `backend/` и `frontend/`.
- Все переменные окружения задаются в Railway **Variables** для каждого сервиса.

---

## 2. Сервис Backend

### Настройка в Railway

- **Root Directory:** `backend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start:prod`
- **Watch Paths:** `backend/**` (если используете монорепо)

### Переменные окружения (Variables)

| Переменная      | Обязательно | Описание |
|-----------------|-------------|----------|
| `DATABASE_URL`  | Да          | URL PostgreSQL (Neon или Railway Postgres). Пример: `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET`    | Да          | Секрет для подписи JWT. Локально можно тестовый, в проде — длинная случайная строка |
| `PORT`          | Нет         | Railway подставляет сам. Оставлять пустым или не указывать |
| `CORS_ORIGIN`   | Рекомендуется | URL фронтенда через запятую. Пример: `https://your-frontend.railway.app` |
| `NODE_ENV`      | Нет         | Для продакшена можно задать `production` |

### Что делают скрипты

- `postinstall` — вызывает `prisma generate` после `npm install`.
- `build` — генерирует Prisma-клиент и собирает NestJS.
- `start:prod` — выполняет `prisma migrate deploy` (применяет миграции к БД) и запускает `nest start`.

---

## 3. Сервис Frontend

### Настройка в Railway

- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start`
- **Watch Paths:** `frontend/**` (если монорепо)

### Переменные окружения (Variables)

| Переменная     | Обязательно | Описание |
|----------------|-------------|----------|
| `VITE_API_URL` | Да (в проде) | Публичный URL бэкенда **без** слэша в конце. Пример: `https://your-backend.railway.app` |

При сборке Vite подставит `VITE_API_URL` в код. Без этой переменной сборка будет использовать относительный путь `/api` (подходит только если фронт и бэк хостятся на одном домене с проксированием).

### Что делают скрипты

- `build` — компиляция TypeScript и сборка Vite (результат в `dist/`).
- `start` — запуск статического сервера `serve -s dist` (читает `PORT` из окружения Railway).

---

## 4. Порядок деплоя

1. Создать БД (Neon или Railway Postgres) и скопировать `DATABASE_URL`.
2. Создать сервис **Backend**, указать Root Directory `backend`, переменные, Build и Start команды. Дождаться успешного деплоя и скопировать публичный URL бэкенда.
3. Создать сервис **Frontend**, указать Root Directory `frontend`, задать `VITE_API_URL` = URL бэкенда (из шага 2), указать Build и Start команды.
4. В бэкенде в `CORS_ORIGIN` прописать URL фронтенда (из шага 3).
5. При необходимости перезапустить бэкенд после смены `CORS_ORIGIN`.

---

## 5. Локальный запуск (без изменений)

- **Backend:** `cd backend && npm install && npm run start:dev` (порт 3001, без миграций в проде).
- **Frontend:** `cd frontend && npm install && npm run dev` (порт 3000, прокси `/api` на бэкенд).
- Локально можно не задавать `VITE_API_URL` и `CORS_ORIGIN` — всё работает через прокси и разрешённые origins по умолчанию.
