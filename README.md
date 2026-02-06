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

Или из корня проекта (в двух терминалах):

```bash
npm run dev:backend
# и
npm run dev:frontend
```

---

## Деплой на Railway

Подробная инструкция: **[docs/DEPLOY-RAILWAY.md](docs/DEPLOY-RAILWAY.md)**.

Кратко: **один сервис** из корня репозитория. Build: `npm run build`, Start: `npm run start`. В Variables задать `DATABASE_URL` и `JWT_SECRET`. Фронт и API отдаются с одного домена.
