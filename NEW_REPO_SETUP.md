# Перенос проекта в новый репозиторий

## Шаг 1: Создание нового репозитория на GitHub

1. Откройте https://github.com
2. Нажмите кнопку **"+"** в правом верхнем углу → **"New repository"**
3. Заполните форму:
   - **Repository name**: например, `telegram-chat-app` или `oleop-new`
   - **Description**: (опционально) "Telegram Mini App для анонимного чата"
   - **Visibility**: выберите **Public** или **Private**
   - **НЕ** отмечайте "Add a README file"
   - **НЕ** отмечайте "Add .gitignore"
   - **НЕ** отмечайте "Choose a license"
4. Нажмите **"Create repository"**

## Шаг 2: Изменение remote URL

После создания репозитория GitHub покажет инструкции. Выполните в терминале:

```bash
# 1. Проверьте текущий remote
git remote -v

# 2. Удалите старый remote
git remote remove origin

# 3. Добавьте новый remote (замените YOUR_USERNAME и YOUR_REPO на ваши данные)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Например:
# git remote add origin https://github.com/Fantoms-24/telegram-chat-app.git
```

## Шаг 3: Первый push в новый репозиторий

```bash
# 1. Убедитесь, что все изменения закоммичены
git status

# 2. Если есть незакоммиченные изменения:
git add .
git commit -m "Initial commit: Telegram chat app"

# 3. Запушьте в новый репозиторий
git push -u origin main
```

Если ваша ветка называется `master` вместо `main`:

```bash
# Переименуйте ветку в main
git branch -M main

# Запушьте
git push -u origin main
```

## Шаг 4: Настройка аутентификации (если нужно)

Если получите ошибку доступа, используйте Personal Access Token:

```bash
# 1. Создайте токен на GitHub:
# Settings → Developer settings → Personal access tokens → Tokens (classic)
# Generate new token → выберите права "repo"

# 2. Используйте токен в URL:
git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO.git

# 3. Запушьте
git push -u origin main
```

## Полная последовательность команд

```bash
# 1. Проверьте статус
git status

# 2. Добавьте все файлы (если есть изменения)
git add .

# 3. Закоммитьте (если есть изменения)
git commit -m "Initial commit: Telegram chat app"

# 4. Удалите старый remote
git remote remove origin

# 5. Добавьте новый remote (ЗАМЕНИТЕ на ваш репозиторий!)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# 6. Убедитесь, что ветка называется main
git branch -M main

# 7. Запушьте в новый репозиторий
git push -u origin main
```

## Проверка

После успешного push:

1. Откройте ваш новый репозиторий на GitHub
2. Убедитесь, что все файлы загружены:
   - `package.json`
   - `server.js`
   - `index.html`
   - `js/` папка
   - `amvera.yml` (если используете Amvera)

## Настройка на Amvera

После переноса в новый репозиторий:

1. Откройте панель Amvera
2. Перейдите в настройки приложения
3. Обновите URL репозитория на новый
4. Или создайте новое приложение и подключите новый репозиторий

## Альтернатива: Клонировать и заново загрузить

Если хотите начать с чистого листа:

```bash
# 1. Создайте новый репозиторий на GitHub (см. Шаг 1)

# 2. Клонируйте новый репозиторий
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# 3. Скопируйте все файлы проекта в эту папку
# (кроме .git папки)

# 4. Добавьте и закоммитьте
git add .
git commit -m "Initial commit: Telegram chat app"
git push -u origin main
```

## Быстрый скрипт для Windows

Создайте файл `setup-new-repo.bat`:

```batch
@echo off
echo Введите ваш GitHub username:
set /p USERNAME=

echo Введите название нового репозитория:
set /p REPO=

git remote remove origin
git remote add origin https://github.com/%USERNAME%/%REPO%.git
git branch -M main
git push -u origin main

pause
```

Затем просто запустите этот файл и введите данные.

