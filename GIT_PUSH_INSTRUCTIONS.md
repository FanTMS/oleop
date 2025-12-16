# Инструкция по загрузке проекта в Git и на Amvera

## Шаг 1: Добавление файлов в Git

Выполните следующие команды в терминале:

```bash
# Добавляем все файлы (кроме тех, что в .gitignore)
git add .

# Если появится ошибка про oleop/, удалите эту папку или добавьте её в .gitignore
# Удаление папки (если она не нужна):
# rmdir /s oleop

# Делаем коммит
git commit -m "Initial commit: Telegram chat app"

# Проверяем текущую ветку
git branch

# Если ветка называется master, пушим в master:
git push origin master

# Если ветка называется main, пушим в main:
git push origin main
```

## Шаг 2: Если ветка называется master, а репозиторий ожидает main

Если получили ошибку "src refspec main does not match any", значит:
- Ваша локальная ветка называется `master`
- А удаленный репозиторий ожидает `main`

**Решение 1: Переименовать локальную ветку в main**

```bash
# Переименовываем ветку
git branch -M main

# Пушим в main
git push origin main
```

**Решение 2: Пушить в master (если репозиторий поддерживает master)**

```bash
# Просто пушим в master
git push origin master
```

## Шаг 3: Настройка на Amvera

После успешного пуша в Git:

1. Откройте панель Amvera
2. Перейдите в раздел "Репозиторий"
3. Убедитесь, что репозиторий подключен правильно
4. Проверьте, что файл `amvera.yml` есть в репозитории
5. В разделе "Переменные" добавьте:
   - `NODE_ENV` = `production`
   - `PORT` = `3000` (или оставьте пустым, Amvera назначит автоматически)
   - `ADMIN_TELEGRAM_ID` = ваш Telegram ID

6. Запустите сборку

## Решение проблем

### Ошибка: 'oleop/' does not have a commit checked out

Эта папка либо пустая, либо является подмодулем. Решение:

```bash
# Удалить папку (если она не нужна)
rmdir /s oleop

# Или добавить в .gitignore (уже добавлено)
# Затем снова:
git add .
git commit -m "Initial commit"
```

### Предупреждения о LF/CRLF

Это нормально для Windows. Git автоматически конвертирует окончания строк. Можно игнорировать эти предупреждения.

### Файлы не добавляются в коммит

Убедитесь, что файлы не в `.gitignore`:

```bash
# Проверяем статус
git status

# Если файлы показываются как "Untracked", добавляем их:
git add .
git commit -m "Add files"
```

## Проверка перед пушем

```bash
# Проверяем, что все нужные файлы добавлены
git status

# Должны быть видны:
# - package.json
# - server.js
# - index.html
# - js/
# - amvera.yml
# И другие важные файлы

# Делаем коммит
git commit -m "Initial commit"

# Пушим
git push origin master  # или main
```

