#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Шаг 2 — Клонирование репо, сборка и запуск через PM2
# Запускать от root после 01_vps_setup.sh
# Использование: bash 02_deploy_app.sh <GIT_REPO_URL>
# Пример: bash 02_deploy_app.sh https://github.com/user/MagmaweldChat.git
# ─────────────────────────────────────────────────────────────
set -euo pipefail

REPO_URL="${1:?Укажите URL репозитория: bash 02_deploy_app.sh <REPO_URL>}"
DEPLOY_DIR="/var/www/MagmaweldChat"

echo "==> Клонирование репозитория..."
if [ -d "$DEPLOY_DIR" ]; then
  cd "$DEPLOY_DIR" && git pull
else
  git clone "$REPO_URL" "$DEPLOY_DIR"
  cd "$DEPLOY_DIR"
fi

cd "$DEPLOY_DIR/server"

echo "==> Создание .env..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "  Заполните /var/www/MagmaweldChat/server/.env перед продолжением."
  echo "  Обязательные поля: DATABASE_URL, JWT_SECRET"
  echo "  Нажмите Enter после сохранения..."
  read -r
fi

echo "==> Установка зависимостей..."
npm ci --omit=dev
npm install prisma @prisma/client

echo "==> Генерация Prisma Client..."
npx prisma generate

echo "==> Применение миграций..."
npx prisma migrate deploy

echo "==> Сборка TypeScript..."
npm run build

echo "==> Запуск через PM2..."
pm2 delete magmaweld-api 2>/dev/null || true
pm2 start dist/index.js --name magmaweld-api --restart-delay=3000
pm2 save

echo ""
echo "==> Приложение запущено. Проверка:"
pm2 list
curl -s http://localhost:3000/health
