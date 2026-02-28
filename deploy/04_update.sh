#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Быстрое обновление кода с GitHub (когда приложение уже развёрнуто)
# Запускать на сервере: bash 04_update.sh
# Или по SSH: ssh user@server "cd /var/www/MagmaweldChat && bash deploy/04_update.sh"
# ─────────────────────────────────────────────────────────────
set -euo pipefail

DEPLOY_DIR="/var/www/MagmaweldChat"

# Загрузка nvm (если установлен) — для доступа к node/npm
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
fi

echo "==> Обновление кода с GitHub..."
cd "$DEPLOY_DIR"
git pull

echo "==> Обновление сервера..."
cd "$DEPLOY_DIR/server"
npm ci --omit=dev
npm install prisma @prisma/client
npx prisma generate
npx prisma migrate deploy
npm run build

echo "==> Перезапуск приложения..."
pm2 restart magmaweld-api
pm2 save

echo ""
echo "==> Готово!"
pm2 list
