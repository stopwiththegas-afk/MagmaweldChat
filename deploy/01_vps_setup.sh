#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Шаг 1 — Первичная настройка VPS (Ubuntu 22.04 / 24.04)
# Запускать от root: bash 01_vps_setup.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

echo "==> Обновление пакетов..."
apt update && apt upgrade -y

echo "==> Установка базовых инструментов..."
apt install -y curl git ufw

echo "==> Настройка фаервола (UFW)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose

echo "==> Установка Node.js 22 через NodeSource..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v
npm -v

echo "==> Установка PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root | tail -1 | bash

echo "==> Установка PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

echo ""
echo "==> Создание БД. Введите пароль для пользователя magmaweld:"
read -rsp "Пароль: " DB_PASS
echo ""
sudo -u postgres psql <<SQL
CREATE USER magmaweld WITH PASSWORD '${DB_PASS}';
CREATE DATABASE magmaweldchat OWNER magmaweld;
GRANT ALL PRIVILEGES ON DATABASE magmaweldchat TO magmaweld;
SQL

echo ""
echo "==> VPS настроен. DATABASE_URL для .env:"
echo "    postgresql://magmaweld:${DB_PASS}@localhost:5432/magmaweldchat"
