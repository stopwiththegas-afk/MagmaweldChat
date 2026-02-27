#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Шаг 3 — Nginx + Certbot SSL
# Использование: bash 03_nginx_ssl.sh api.ваш-домен.ru
# Пример: bash 03_nginx_ssl.sh api.magmaweld.ru
# ─────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="${1:?Укажите домен: bash 03_nginx_ssl.sh <DOMAIN>}"
APP_PORT=3000

echo "==> Установка Nginx и Certbot..."
apt install -y nginx certbot python3-certbot-nginx

echo "==> Создание конфига Nginx для ${DOMAIN}..."
cat > "/etc/nginx/sites-available/magmaweld" <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;

        # WebSocket support (Socket.io)
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/magmaweld /etc/nginx/sites-enabled/magmaweld
rm -f /etc/nginx/sites-enabled/default

echo "==> Проверка конфига Nginx..."
nginx -t

echo "==> Перезапуск Nginx..."
systemctl enable nginx
systemctl reload nginx

echo "==> Получение SSL-сертификата Let's Encrypt..."
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email \
  --redirect

echo "==> Проверка автообновления сертификата..."
systemctl status certbot.timer

echo ""
echo "==> Готово! API доступно по адресу: https://${DOMAIN}"
curl -s "https://${DOMAIN}/health"
