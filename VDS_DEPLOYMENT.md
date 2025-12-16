# Инструкция по развертыванию на VDS/VPS

Этот проект можно развернуть на любом VDS/VPS сервере с поддержкой Node.js.

## Требования

- Ubuntu 20.04+ или Debian 11+ (рекомендуется)
- Node.js 18+ 
- npm или yarn
- Доступ по SSH

## Шаг 1: Подключение к серверу

```bash
ssh root@your-server-ip
```

## Шаг 2: Установка Node.js

```bash
# Обновляем систему
apt update && apt upgrade -y

# Устанавливаем Node.js через NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Проверяем установку
node --version
npm --version
```

## Шаг 3: Установка PM2 (менеджер процессов)

PM2 позволит запускать приложение в фоновом режиме и автоматически перезапускать его при сбоях.

```bash
npm install -g pm2
```

## Шаг 4: Загрузка проекта на сервер

### Вариант 1: Через Git (рекомендуется)

```bash
# Устанавливаем Git
apt install -y git

# Клонируем репозиторий (если он в Git)
cd /var/www
git clone https://your-repo-url.git telegram-chat-app
cd telegram-chat-app
```

### Вариант 2: Через SCP (если нет Git)

На вашем локальном компьютере:

```bash
# Создаем архив проекта (исключая node_modules)
tar -czf project.tar.gz --exclude='node_modules' --exclude='.git' .

# Загружаем на сервер
scp project.tar.gz root@your-server-ip:/var/www/

# На сервере распаковываем
ssh root@your-server-ip
cd /var/www
tar -xzf project.tar.gz
mv extracted-folder telegram-chat-app
cd telegram-chat-app
```

## Шаг 5: Установка зависимостей

```bash
cd /var/www/telegram-chat-app
npm install
```

## Шаг 6: Настройка переменных окружения

```bash
# Создаем файл .env
nano .env
```

Добавьте следующие переменные:

```env
NODE_ENV=production
PORT=3000
ADMIN_TELEGRAM_ID=your_telegram_id_here
```

Сохраните файл (Ctrl+O, Enter, Ctrl+X).

## Шаг 7: Запуск приложения через PM2

```bash
# Запускаем приложение
pm2 start server.js --name telegram-chat-app

# Сохраняем конфигурацию PM2 для автозапуска
pm2 save
pm2 startup
```

## Шаг 8: Настройка Nginx (обратный прокси)

```bash
# Устанавливаем Nginx
apt install -y nginx

# Создаем конфигурацию
nano /etc/nginx/sites-available/telegram-chat-app
```

Добавьте следующую конфигурацию:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Замените на ваш домен или IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активируем конфигурацию:

```bash
ln -s /etc/nginx/sites-available/telegram-chat-app /etc/nginx/sites-enabled/
nginx -t  # Проверяем конфигурацию
systemctl restart nginx
```

## Шаг 9: Настройка SSL (HTTPS) через Let's Encrypt

```bash
# Устанавливаем Certbot
apt install -y certbot python3-certbot-nginx

# Получаем SSL сертификат
certbot --nginx -d your-domain.com

# Автоматическое обновление сертификата
certbot renew --dry-run
```

## Шаг 10: Настройка файрвола

```bash
# Устанавливаем UFW
apt install -y ufw

# Разрешаем SSH, HTTP и HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Включаем файрвол
ufw enable
```

## Полезные команды PM2

```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs telegram-chat-app

# Перезапуск приложения
pm2 restart telegram-chat-app

# Остановка приложения
pm2 stop telegram-chat-app

# Удаление из PM2
pm2 delete telegram-chat-app
```

## Обновление приложения

```bash
cd /var/www/telegram-chat-app

# Если используете Git
git pull origin main

# Устанавливаем новые зависимости (если есть)
npm install

# Перезапускаем приложение
pm2 restart telegram-chat-app
```

## Резервное копирование базы данных

```bash
# Создаем скрипт для бэкапа
nano /root/backup-db.sh
```

Добавьте:

```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp /var/www/telegram-chat-app/database.db $BACKUP_DIR/database_$DATE.db
find $BACKUP_DIR -name "database_*.db" -mtime +7 -delete  # Удаляем старые бэкапы
```

Делаем скрипт исполняемым:

```bash
chmod +x /root/backup-db.sh

# Добавляем в cron для ежедневного бэкапа
crontab -e
# Добавьте строку:
0 2 * * * /root/backup-db.sh
```

## Мониторинг

```bash
# Установка мониторинга PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Решение проблем

### Приложение не запускается
```bash
pm2 logs telegram-chat-app
```

### Порт 3000 занят
```bash
lsof -i :3000
kill -9 <PID>
```

### Nginx не работает
```bash
systemctl status nginx
nginx -t
```

### Проверка WebSocket соединений
Убедитесь, что в Nginx правильно настроен `upgrade` заголовок для WebSocket.

## Дополнительные настройки

### Увеличение лимитов Node.js

```bash
# Создаем файл для увеличения лимитов
nano /etc/systemd/system/telegram-chat-app.service
```

Добавьте:

```ini
[Service]
LimitNOFILE=65536
```

## Контакты и поддержка

При возникновении проблем проверьте:
1. Логи PM2: `pm2 logs`
2. Логи Nginx: `tail -f /var/log/nginx/error.log`
3. Статус сервисов: `systemctl status nginx`

