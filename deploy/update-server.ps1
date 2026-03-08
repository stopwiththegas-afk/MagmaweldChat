# Обновление кода на сервере 213.171.6.48
# Запуск: powershell -ExecutionPolicy Bypass -File deploy/update-server.ps1

$ErrorActionPreference = "Stop"
$server = "root@213.171.6.48"
$cmd = "cd /var/www/MagmaweldChat && git pull origin master && bash deploy/04_update.sh"

Write-Host "Connecting to $server and updating..." -ForegroundColor Cyan
ssh -o StrictHostKeyChecking=accept-new $server $cmd
Write-Host "Done." -ForegroundColor Green
