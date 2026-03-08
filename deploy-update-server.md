# Команды для обновления кода на сервере 213.171.6.48

## 1. Подключиться и обновить репозиторий

```bash
ssh root@213.171.6.48
```

После входа на сервер выполните (подставьте свой путь к проекту, если он другой):

```bash
# Если проект в /root/MagmaweldChat:
cd /root/MagmaweldChat
git pull origin main
# или, если ветка master:
# git pull origin master

# Перезапуск приложения (если используется PM2):
# pm2 restart all

# Если есть серверная часть (Node) и PM2:
# cd /root/MagmaweldChat/server && npm install && pm2 restart magmaweldchat
```

## 2. Одной командой с вашей машины (без входа в интерактивную сессию)

```bash
ssh root@213.171.6.48 "cd /root/MagmaweldChat && git pull origin main"
```

Если проект лежит в другой папке (например `/var/www/MagmaweldChat`), замените путь в команде.

## 3. Если репозиторий на сервере ещё не клонирован

```bash
ssh root@213.171.6.48
cd /root
git clone https://github.com/YOUR_USERNAME/MagmaweldChat.git
cd MagmaweldChat
# далее установка зависимостей и настройка (npm install, env и т.д.)
```
