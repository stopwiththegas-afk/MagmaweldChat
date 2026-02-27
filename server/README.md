# MagmaweldChat — Backend Server

Node.js + Express + Socket.io + PostgreSQL (Prisma)

## Быстрый старт (локально)

```bash
cd server

# 1. Установить зависимости
npm install

# 2. Создать .env
cp .env.example .env
# Заполнить DATABASE_URL, JWT_SECRET

# 3. Применить миграции и сгенерировать клиент
npx prisma generate
npx prisma migrate deploy

# 4. Запустить в режиме разработки
npm run dev
```

## Продакшен (VPS)

Смотрите скрипты в папке `../deploy/`:

| Скрипт | Что делает |
|--------|-----------|
| `01_vps_setup.sh` | Обновления, UFW, Node.js, PM2, PostgreSQL |
| `02_deploy_app.sh <repo_url>` | Клонирование, сборка, запуск через PM2 |
| `03_nginx_ssl.sh <domain>` | Nginx reverse proxy + Let's Encrypt SSL |

## API

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| POST | `/auth/send-code` | — | Запросить SMS-код |
| POST | `/auth/verify-code` | — | Проверить код |
| POST | `/auth/register` | — | Создать аккаунт |
| GET | `/auth/me` | ✓ | Текущий пользователь |
| PATCH | `/auth/me` | ✓ | Обновить профиль |
| GET | `/chats` | ✓ | Список чатов |
| POST | `/chats` | ✓ | Открыть/создать чат |
| GET | `/chats/:id/messages` | ✓ | История сообщений |
| POST | `/chats/:id/messages` | ✓ | Отправить сообщение (REST) |
| GET | `/users/search?q=` | ✓ | Поиск пользователей |
| GET | `/health` | — | Health check |

## Socket.io события

Подключение: передать JWT в `auth.token`.

| Событие | Направление | Данные |
|---------|------------|--------|
| `join_chat` | client→server | `chatId: string` |
| `leave_chat` | client→server | `chatId: string` |
| `send_message` | client→server | `{ chatId, text }` |
| `new_message` | server→client | `ApiMessage` |
