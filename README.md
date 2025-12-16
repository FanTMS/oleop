# Telegram Mini App - Анонимный чат

Полнофункциональное приложение для анонимного общения в Telegram с базой данных и real-time поиском собеседников.

## Технологии

- **Frontend**: HTML, CSS, JavaScript (ES Modules)
- **Backend**: Node.js, Express
- **База данных**: SQLite (better-sqlite3)
- **Real-time**: WebSocket (ws)
- **Стиль**: Glassmorphism, светлая тема

## Установка и запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Инициализация базы данных

База данных создается автоматически при первом запуске сервера.

### 3. Запуск сервера

```bash
npm start
```

Или для разработки с автоперезагрузкой:

```bash
npm run dev
```

Сервер запустится на `http://localhost:3000`

## Структура проекта

```
├── server.js              # Backend сервер (Express + WebSocket)
├── package.json           # Зависимости проекта
├── database.db            # SQLite база данных (создается автоматически)
├── index.html             # Главная HTML страница
├── style.css              # Стили приложения
├── js/
│   ├── app.js             # Главный файл приложения
│   ├── utils/
│   │   ├── api.js         # API клиент и WebSocket
│   │   ├── storage.js     # Работа с данными через API
│   │   ├── telegram.js    # Telegram Web App API
│   │   └── constants.js   # Константы
│   ├── modules/
│   │   ├── auth.js        # Регистрация пользователей
│   │   ├── search.js      # Поиск собеседников (WebSocket)
│   │   ├── chat.js        # Работа с чатами
│   │   ├── profile.js     # Профиль пользователя
│   │   ├── rating.js       # Система рейтингов
│   │   ├── games.js       # Игры в чате
│   │   ├── gameUI.js      # UI для игр
│   │   ├── admin.js       # Админ-панель (логика)
│   │   └── adminUI.js     # Админ-панель (UI)
│   └── components/
│       └── ui.js          # UI компоненты
```

## API Endpoints

### Пользователи
- `POST /api/users/register` - Регистрация пользователя
- `GET /api/users/:id` - Получить пользователя
- `GET /api/users/:id/chats` - Получить чаты пользователя
- `GET /api/users/:id/rating` - Получить рейтинг пользователя

### Чаты
- `POST /api/chats` - Создать чат
- `GET /api/chats/:id/messages` - Получить сообщения чата
- `POST /api/chats/:id/messages` - Отправить сообщение

### Поиск
- `POST /api/search/start` - Начать поиск
- `POST /api/search/stop` - Остановить поиск

### Рейтинги
- `POST /api/ratings` - Добавить рейтинг

### Статистика
- `GET /api/stats` - Получить статистику системы

## WebSocket

WebSocket используется для real-time обновлений:
- Поиск собеседников
- Новые сообщения
- Найденные пары

## База данных

### Таблицы:
- `users` - Пользователи
- `chats` - Чаты
- `messages` - Сообщения
- `ratings` - Рейтинги
- `search_queue` - Очередь поиска

## Особенности

- ✅ Полноценная база данных SQLite
- ✅ Real-time поиск через WebSocket
- ✅ API для всех операций
- ✅ Система рейтингов
- ✅ Игры в чате (камень-ножницы-бумага, крестики-нолики)
- ✅ Админ-панель
- ✅ Тестовые боты для проверки функционала
- ✅ Принудительная светлая тема
- ✅ Glassmorphism дизайн

## Пароль админ-панели

По умолчанию: `admin123`

## Разработка

Для разработки рекомендуется использовать `npm run dev` для автоперезагрузки сервера при изменениях.
"# oleop" 
