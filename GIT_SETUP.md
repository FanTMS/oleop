# Установка Git и загрузка проекта на GitHub

## Вариант 1: Установка Git через официальный установщик (Рекомендуется)

### Шаг 1: Скачайте Git
1. Перейдите на https://git-scm.com/download/win
2. Скачайте установщик для Windows (автоматически определит 64-bit или 32-bit)
3. Запустите установщик

### Шаг 2: Установка Git
1. **Выбор компонентов**: Оставьте все по умолчанию (можно включить "Git Bash Here")
2. **Выбор редактора**: Выберите ваш любимый редактор или оставьте "Nano editor"
3. **Настройка PATH**: Выберите **"Git from the command line and also from 3rd-party software"** (рекомендуется)
4. **HTTPS**: Выберите "Use the OpenSSL library"
5. **Обработка окончаний строк**: Выберите **"Checkout Windows-style, commit Unix-style line endings"**
6. **Эмулятор терминала**: Выберите "Use Windows' default console window"
7. **Дополнительные опции**: Оставьте по умолчанию
8. Нажмите **"Install"**

### Шаг 3: Проверка установки
1. Откройте новое окно PowerShell или Command Prompt
2. Выполните команду:
   ```bash
   git --version
   ```
3. Должна отобразиться версия Git (например, `git version 2.42.0`)

### Шаг 4: Настройка Git (первый раз)
Выполните следующие команды в PowerShell или Command Prompt:

```bash
git config --global user.name "Ваше Имя"
git config --global user.email "your.email@example.com"
```

Замените на ваши реальные данные.

---

## Вариант 2: Установка через GitHub Desktop (Проще для начинающих)

### Шаг 1: Скачайте GitHub Desktop
1. Перейдите на https://desktop.github.com/
2. Скачайте и установите GitHub Desktop
3. Войдите в свой GitHub аккаунт

### Шаг 2: Создайте репозиторий
1. В GitHub Desktop нажмите **"File"** → **"New Repository"**
2. Заполните:
   - **Name**: `telegram-chat-app` (или другое имя)
   - **Local Path**: Выберите папку `C:\Users\user\Desktop\цуз`
   - **Description**: Описание проекта (опционально)
   - **Initialize this repository with a README**: НЕ отмечайте (папка уже существует)
3. Нажмите **"Create Repository"**

### Шаг 3: Загрузите файлы
1. GitHub Desktop автоматически обнаружит все файлы
2. Введите сообщение коммита: `Initial commit`
3. Нажмите **"Commit to main"**
4. Нажмите **"Publish repository"** для загрузки на GitHub

---

## Вариант 3: Загрузка через веб-интерфейс GitHub

Если не хотите устанавливать Git, можно загрузить файлы через браузер:

### Шаг 1: Создайте репозиторий на GitHub
1. Зайдите на https://github.com
2. Нажмите **"+"** → **"New repository"**
3. Заполните:
   - **Repository name**: `telegram-chat-app`
   - **Description**: Описание проекта
   - **Public** или **Private** (выберите по желанию)
   - **НЕ** отмечайте "Initialize this repository with a README"
4. Нажмите **"Create repository"**

### Шаг 2: Загрузите файлы
1. На странице репозитория нажмите **"uploading an existing file"**
2. Перетащите все файлы из папки `C:\Users\user\Desktop\цуз` в браузер
3. Введите сообщение коммита: `Initial commit`
4. Нажмите **"Commit changes"**

---

## После установки Git: Инициализация репозитория

Если вы установили Git через Вариант 1, выполните следующие команды в PowerShell:

```bash
# Перейдите в папку проекта
cd C:\Users\user\Desktop\цуз

# Инициализируйте Git репозиторий
git init

# Добавьте все файлы
git add .

# Создайте первый коммит
git commit -m "Initial commit"

# Добавьте удаленный репозиторий (замените YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/telegram-chat-app.git

# Загрузите код на GitHub
git branch -M main
git push -u origin main
```

---

## Создание .gitignore файла

Убедитесь, что файл `.gitignore` существует и содержит:

```
node_modules/
database.db
*.log
.DS_Store
.env
```

Это предотвратит загрузку ненужных файлов на GitHub.

---

## Рекомендация

**Для начинающих**: Используйте **Вариант 2 (GitHub Desktop)** - это самый простой способ.

**Для опытных**: Используйте **Вариант 1 (Git CLI)** - больше контроля и гибкости.

**Быстрый способ**: Используйте **Вариант 3 (веб-интерфейс)** - не требует установки, но менее удобен для дальнейшей работы.

