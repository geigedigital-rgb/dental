# Склад стоматологической клиники

## Запуск проекта

Нужны **два терминала**.

### 1. Бэкенд (API на порту 3001)

```bash
cd backend && npm install && npm run start:dev
```

### 2. Фронтенд (интерфейс на порту 3000)

```bash
cd frontend && npm install && npm run dev
```

После запуска откройте в браузере: **http://localhost:3000**

Страница **http://localhost:3000/sales** доступна после входа (логин на /login). Если не залогинены, произойдёт переход на страницу входа.

---

### Одной командой (оба в фоне)

```bash
cd backend && npm run start:dev &
cd frontend && npm run dev
```

(В первом терминале бэкенд уйдёт в фон, во втором — запустите фронтенд в том же или в новом терминале.)

Или из корня проекта:

```bash
cd /Users/vlad/Documents/коды/dental/dental/backend && npm run start:dev &
cd /Users/vlad/Documents/коды/dental/dental/frontend && npm run dev
```

---

## Деплой на Railway

Подробная инструкция: **[docs/DEPLOY-RAILWAY.md](docs/DEPLOY-RAILWAY.md)**.

Кратко: два сервиса — **backend** (root `backend`, build `npm run build`, start `npm run start:prod`) и **frontend** (root `frontend`, build `npm run build`, start `npm run start`). В бэкенде задать `DATABASE_URL`, `JWT_SECRET`, при необходимости `CORS_ORIGIN` и `NODE_ENV`. Во фронтенде при сборке задать `VITE_API_URL` — публичный URL бэкенда.
