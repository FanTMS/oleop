/**
 * Backend сервер для Telegram Mini App
 * Express + SQLite + WebSocket
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import TelegramBot from 'node-telegram-bot-api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Инициализация Telegram бота
const BOT_TOKEN = process.env.BOT_TOKEN || '8472658938:AAH7ss1oXrCZLzxz3ebcD7qBQAF7GPF2Gmk';
const MINI_APP_URL = process.env.MINI_APP_URL || `https://oleop-fantms1.amvera.io`;
const TELEGRAM_CHANNEL = process.env.TELEGRAM_CHANNEL || '@your_channel'; // Замените на ваш канал

let bot = null;

// Инициализация бота
try {
    // Используем polling для разработки, webhook для продакшена
    const useWebhook = process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL;

    if (useWebhook) {
        // Webhook режим для продакшена
        bot = new TelegramBot(BOT_TOKEN);
        const webhookUrl = `${process.env.WEBHOOK_URL}/bot${BOT_TOKEN}`;
        bot.setWebHook(webhookUrl).then(() => {
            console.log(`Webhook установлен: ${webhookUrl}`);
        }).catch(err => {
            console.error('Ошибка установки webhook:', err);
        });

        // Обработка webhook запросов
        app.post(`/bot${BOT_TOKEN}`, (req, res) => {
            bot.processUpdate(req.body);
            res.sendStatus(200);
        });
    } else {
        // Polling режим для разработки
        bot = new TelegramBot(BOT_TOKEN, { polling: true });
        console.log('Telegram бот запущен в режиме polling');
    }

    // Обработка команды /start
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const username = msg.from.username || msg.from.first_name || 'Пользователь';

        console.log(`Команда /start от пользователя ${userId} (@${username})`);

        // Текст приветственного сообщения
        const welcomeText = `Хомяк возвращается! 🐹\n\nИгры, приложения — все это ждет тебя во вселенной Хомяка 🚀\n\nПереходи в HamsterVerse и получай награды за свою активность`;

        // Создаем inline клавиатуру с кнопками
        const keyboard = {
            inline_keyboard: [
                [
                    {
                        text: '🐹 HamsterVerse 🐹',
                        web_app: { url: MINI_APP_URL }
                    }
                ],
                [
                    {
                        text: 'Подписаться на официальный канал',
                        url: `https://t.me/${TELEGRAM_CHANNEL.replace('@', '')}`
                    }
                ]
            ]
        };

        try {
            await bot.sendMessage(chatId, welcomeText, {
                reply_markup: keyboard,
                parse_mode: 'HTML'
            });
            console.log(`Приветственное сообщение отправлено пользователю ${userId}`);
        } catch (error) {
            console.error('Ошибка отправки сообщения боту:', error);
        }
    });

    // Обработка ошибок бота
    bot.on('error', (error) => {
        console.error('Ошибка Telegram бота:', error);
    });

    // Обработка polling ошибок
    bot.on('polling_error', (error) => {
        console.error('Ошибка polling:', error);
    });

} catch (error) {
    console.error('Ошибка инициализации Telegram бота:', error);
    console.log('Бот будет работать без Telegram интеграции');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Инициализация базы данных
// Используем /data для персистентного хранения на Amvera, иначе текущая директория
const dataDir = existsSync('/data') ? '/data' : __dirname;
const dbPath = join(dataDir, 'database.db');
const db = new sqlite3.Database(dbPath);

// Промис-обертки для работы с базой данных
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbExec = promisify(db.exec.bind(db));

// Включение внешних ключей
db.run('PRAGMA foreign_keys = ON');

// Инициализация схемы базы данных
async function initDatabase() {
    try {
        // Таблица пользователей
        await dbExec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                age INTEGER NOT NULL,
                gender TEXT NOT NULL,
                interests TEXT NOT NULL,
                rating_average REAL DEFAULT 0,
                rating_count INTEGER DEFAULT 0,
                coins INTEGER DEFAULT 0,
                decorations TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Добавляем поле coins если его нет (миграция)
        try {
            await dbExec(`ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0`);
        } catch (error) {
            // Поле уже существует, игнорируем ошибку
        }

        // Добавляем поле decorations если его нет (миграция)
        try {
            await dbExec(`ALTER TABLE users ADD COLUMN decorations TEXT DEFAULT '{}'`);
        } catch (error) {
            // Поле уже существует, игнорируем ошибку
        }

        // Добавляем поле is_admin если его нет (миграция)
        try {
            await dbExec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`);
        } catch (error) {
            // Поле уже существует, игнорируем ошибку
        }

        // Добавляем поле is_system если его нет (миграция) - для системных пользователей
        try {
            await dbExec(`ALTER TABLE users ADD COLUMN is_system INTEGER DEFAULT 0`);
        } catch (error) {
            // Поле уже существует, игнорируем ошибку
        }

        // Добавляем поле telegram_id если его нет (миграция)
        try {
            await dbExec(`ALTER TABLE users ADD COLUMN telegram_id TEXT`);
        } catch (error) {
            // Поле уже существует, игнорируем ошибку
        }

        // Добавляем поле admin_role если его нет (миграция)
        // Значения: 'super_admin' (главный администратор), 'admin' (администратор), 'moderator' (модератор), NULL (обычный пользователь)
        try {
            await dbExec(`ALTER TABLE users ADD COLUMN admin_role TEXT DEFAULT NULL`);
        } catch (error) {
            // Поле уже существует, игнорируем ошибку
        }

        // Создаем уникальный индекс на telegram_id (только для не-NULL значений)
        // Это предотвратит создание дубликатов
        try {
            await dbExec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id) WHERE telegram_id IS NOT NULL`);
        } catch (error) {
            // Индекс уже существует или ошибка создания, логируем но продолжаем
            console.log('Индекс на telegram_id:', error.message);
        }

        // Таблица чатов
        await dbExec(`
            CREATE TABLE IF NOT EXISTS chats (
                id TEXT PRIMARY KEY,
                user1_id TEXT NOT NULL,
                user2_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_completed INTEGER DEFAULT 0,
                completed_at DATETIME,
                FOREIGN KEY (user1_id) REFERENCES users(id),
                FOREIGN KEY (user2_id) REFERENCES users(id)
            )
        `);

        // Добавляем поле is_completed если его нет (миграция)
        try {
            await dbExec(`ALTER TABLE chats ADD COLUMN is_completed INTEGER DEFAULT 0`);
        } catch (error) {
            // Поле уже существует, игнорируем ошибку
        }

        // Добавляем поле completed_at если его нет (миграция)
        try {
            await dbExec(`ALTER TABLE chats ADD COLUMN completed_at DATETIME`);
        } catch (error) {
            // Поле уже существует, игнорируем ошибку
        }

        // Таблица сообщений
        await dbExec(`
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                text TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (chat_id) REFERENCES chats(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Таблица рейтингов
        await dbExec(`
            CREATE TABLE IF NOT EXISTS ratings (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                rated_user_id TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (rated_user_id) REFERENCES users(id),
                UNIQUE(user_id, rated_user_id)
            )
        `);

        // Таблица очереди поиска
        await dbExec(`
            CREATE TABLE IF NOT EXISTS search_queue (
                user_id TEXT PRIMARY KEY,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Таблица достижений
        await dbExec(`
            CREATE TABLE IF NOT EXISTS achievements (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                reward_coins INTEGER DEFAULT 0,
                condition_type TEXT NOT NULL,
                condition_value INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Таблица достижений пользователей
        await dbExec(`
            CREATE TABLE IF NOT EXISTS user_achievements (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                achievement_id TEXT NOT NULL,
                unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (achievement_id) REFERENCES achievements(id),
                UNIQUE(user_id, achievement_id)
            )
        `);

        // Таблица товаров магазина
        await dbExec(`
            CREATE TABLE IF NOT EXISTS shop_items (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                price INTEGER NOT NULL,
                item_type TEXT NOT NULL,
                item_value TEXT NOT NULL,
                rarity TEXT DEFAULT 'common',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Таблица купленных товаров пользователей
        await dbExec(`
            CREATE TABLE IF NOT EXISTS user_items (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active INTEGER DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (item_id) REFERENCES shop_items(id)
            )
        `);

        // Таблица жалоб
        await dbExec(`
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                reporter_id TEXT NOT NULL,
                reported_user_id TEXT NOT NULL,
                chat_id TEXT NOT NULL,
                reason TEXT NOT NULL,
                description TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                admin_verdict TEXT,
                admin_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME,
                FOREIGN KEY (reporter_id) REFERENCES users(id),
                FOREIGN KEY (reported_user_id) REFERENCES users(id),
                FOREIGN KEY (chat_id) REFERENCES chats(id)
            )
        `);

        // Таблица блокировок пользователей
        await dbExec(`
            CREATE TABLE IF NOT EXISTS user_blocks (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                reason TEXT NOT NULL,
                blocked_until DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Таблица статусов пользователей
        await dbExec(`
            CREATE TABLE IF NOT EXISTS user_statuses (
                user_id TEXT PRIMARY KEY,
                status TEXT DEFAULT 'offline',
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Таблица истории активности
        await dbExec(`
            CREATE TABLE IF NOT EXISTS user_activity (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                activity_type TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Таблица ежедневных бонусов
        await dbExec(`
            CREATE TABLE IF NOT EXISTS daily_bonuses (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                bonus_date DATE NOT NULL,
                coins_reward INTEGER DEFAULT 0,
                streak_days INTEGER DEFAULT 1,
                claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, bonus_date)
            )
        `);

        // Таблица заданий
        await dbExec(`
            CREATE TABLE IF NOT EXISTS quests (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                quest_type TEXT NOT NULL,
                target_value INTEGER NOT NULL,
                reward_coins INTEGER DEFAULT 0,
                is_daily INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Таблица прогресса заданий пользователей
        await dbExec(`
            CREATE TABLE IF NOT EXISTS user_quests (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                quest_id TEXT NOT NULL,
                progress INTEGER DEFAULT 0,
                completed INTEGER DEFAULT 0,
                completed_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (quest_id) REFERENCES quests(id),
                UNIQUE(user_id, quest_id)
            )
        `);

        // Таблица бейджей и титулов
        await dbExec(`
            CREATE TABLE IF NOT EXISTS badges (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                badge_type TEXT NOT NULL,
                condition_type TEXT NOT NULL,
                condition_value INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Таблица бейджей пользователей
        await dbExec(`
            CREATE TABLE IF NOT EXISTS user_badges (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                badge_id TEXT NOT NULL,
                is_active INTEGER DEFAULT 0,
                unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (badge_id) REFERENCES badges(id),
                UNIQUE(user_id, badge_id)
            )
        `);

        // Таблица пользовательских именных бейджей
        await dbExec(`
            CREATE TABLE IF NOT EXISTS custom_badges (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                badge_text TEXT NOT NULL,
                badge_color TEXT DEFAULT 'green',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active INTEGER DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Таблица подарков в чатах
        await dbExec(`
            CREATE TABLE IF NOT EXISTS chat_gifts (
                id TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL,
                from_user_id TEXT NOT NULL,
                to_user_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (chat_id) REFERENCES chats(id),
                FOREIGN KEY (from_user_id) REFERENCES users(id),
                FOREIGN KEY (to_user_id) REFERENCES users(id),
                FOREIGN KEY (item_id) REFERENCES shop_items(id)
            )
        `);

        // Добавляем поле reply_to в сообщения для ответов
        try {
            await dbExec(`ALTER TABLE messages ADD COLUMN reply_to TEXT`);
        } catch (error) {
            // Поле уже существует, игнорируем ошибку
        }

        // Добавляем поле gift_id в сообщения для подарков
        try {
            await dbExec(`ALTER TABLE messages ADD COLUMN gift_id TEXT`);
        } catch (error) {
            // Поле уже существует, игнорируем ошибку
        }

        // Индексы для оптимизации
        await dbExec(`
            CREATE INDEX IF NOT EXISTS idx_chats_user1 ON chats(user1_id);
            CREATE INDEX IF NOT EXISTS idx_chats_user2 ON chats(user2_id);
            CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
            CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(rated_user_id);
            CREATE INDEX IF NOT EXISTS idx_search_queue_created ON search_queue(created_at);
            CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_items_user ON user_items(user_id);
            CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
            CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);
            CREATE INDEX IF NOT EXISTS idx_user_blocks_user ON user_blocks(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_blocks_until ON user_blocks(blocked_until);
            CREATE INDEX IF NOT EXISTS idx_user_statuses_user ON user_statuses(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id);
            CREATE INDEX IF NOT EXISTS idx_daily_bonuses_user ON daily_bonuses(user_id);
            CREATE INDEX IF NOT EXISTS idx_daily_bonuses_date ON daily_bonuses(bonus_date);
            CREATE INDEX IF NOT EXISTS idx_user_quests_user ON user_quests(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
            CREATE INDEX IF NOT EXISTS idx_chat_gifts_chat ON chat_gifts(chat_id);
        `);

        // Инициализация достижений
        await initAchievements();

        // Инициализация товаров магазина
        await initShopItems();

        // Инициализация заданий
        await initQuests();

        // Инициализация бейджей
        await initBadges();

        // Создание системного администратора
        await initSystemAdmin();

        // Создание тестового пользователя для локальной разработки
        await initTestUser();

        console.log('База данных инициализирована');
    } catch (error) {
        console.error('Ошибка инициализации базы данных:', error);
        throw error;
    }
}

// Инициализация достижений
async function initAchievements() {
    const achievements = [
        {
            id: 'first_match',
            name: 'Первый шаг',
            description: 'Найди своего первого собеседника',
            icon: '🎯',
            reward_coins: 10,
            condition_type: 'first_chat',
            condition_value: 1
        },
        {
            id: 'chat_master',
            name: 'Мастер общения',
            description: 'Заверши 5 чатов',
            icon: '💬',
            reward_coins: 25,
            condition_type: 'completed_chats',
            condition_value: 5
        },
        {
            id: 'social_butterfly',
            name: 'Социальная бабочка',
            description: 'Заверши 10 чатов',
            icon: '🦋',
            reward_coins: 50,
            condition_type: 'completed_chats',
            condition_value: 10
        },
        {
            id: 'high_rated',
            name: 'Звезда общения',
            description: 'Получи рейтинг 4.5 или выше',
            icon: '⭐',
            reward_coins: 30,
            condition_type: 'rating',
            condition_value: 45
        },
        {
            id: 'popular',
            name: 'Популярный',
            description: 'Получи 10 оценок от других пользователей',
            icon: '👑',
            reward_coins: 40,
            condition_type: 'rating_count',
            condition_value: 10
        },
        {
            id: 'veteran',
            name: 'Ветеран',
            description: 'Используй приложение 7 дней',
            icon: '🏆',
            reward_coins: 35,
            condition_type: 'days_active',
            condition_value: 7
        },
        {
            id: 'gamer',
            name: 'Игрок',
            description: 'Сыграй 5 игр с собеседниками',
            icon: '🎮',
            reward_coins: 20,
            condition_type: 'games_played',
            condition_value: 5
        },
        {
            id: 'winner',
            name: 'Победитель',
            description: 'Выиграй 3 игры',
            icon: '🏅',
            reward_coins: 30,
            condition_type: 'games_won',
            condition_value: 3
        }
    ];

    for (const achievement of achievements) {
        try {
            await dbRun(
                `INSERT OR IGNORE INTO achievements (id, name, description, icon, reward_coins, condition_type, condition_value) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [achievement.id, achievement.name, achievement.description, achievement.icon,
                achievement.reward_coins, achievement.condition_type, achievement.condition_value]
            );
        } catch (error) {
            // Игнорируем ошибки при вставке существующих достижений
        }
    }
}

// Инициализация товаров магазина
async function initShopItems() {
    const items = [
        {
            id: 'fire_nickname',
            name: 'Огненный ник',
            description: 'Твой ник будет гореть огнем 🔥',
            icon: '🔥',
            price: 50,
            item_type: 'nickname_style',
            item_value: 'fire',
            rarity: 'rare'
        },
        {
            id: 'rainbow_nickname',
            name: 'Радужный ник',
            description: 'Твой ник будет переливаться всеми цветами 🌈',
            icon: '🌈',
            price: 75,
            item_type: 'nickname_style',
            item_value: 'rainbow',
            rarity: 'epic'
        },
        {
            id: 'golden_nickname',
            name: 'Золотой ник',
            description: 'Твой ник будет сиять золотом ✨',
            icon: '✨',
            price: 100,
            item_type: 'nickname_style',
            item_value: 'golden',
            rarity: 'legendary'
        },
        {
            id: 'glow_nickname',
            name: 'Светящийся ник',
            description: 'Твой ник будет светиться неоновым светом 💡',
            icon: '💡',
            price: 60,
            item_type: 'nickname_style',
            item_value: 'glow',
            rarity: 'rare'
        },
        {
            id: 'custom_badge',
            name: 'Именной бейдж',
            description: 'Создай свой уникальный бейдж! 🏷️',
            icon: '🏷️',
            price: 500,
            item_type: 'custom_badge',
            item_value: 'custom',
            rarity: 'legendary'
        },
        {
            id: 'crown_badge',
            name: 'Корона',
            description: 'Корона рядом с именем 👑',
            icon: '👑',
            price: 80,
            item_type: 'badge',
            item_value: 'crown',
            rarity: 'epic'
        },
        {
            id: 'star_badge',
            name: 'Звезда',
            description: 'Звезда рядом с именем ⭐',
            icon: '⭐',
            price: 40,
            item_type: 'badge',
            item_value: 'star',
            rarity: 'common'
        },
        {
            id: 'diamond_badge',
            name: 'Алмаз',
            description: 'Алмаз рядом с именем 💎',
            icon: '💎',
            price: 120,
            item_type: 'badge',
            item_value: 'diamond',
            rarity: 'legendary'
        },
        // Темы для чата
        {
            id: 'green_chat_theme',
            name: 'Зеленая тема чата',
            description: 'Зеленый фон для ваших чатов 🌿',
            icon: '🌿',
            price: 80,
            item_type: 'chat_theme',
            item_value: 'green',
            rarity: 'rare'
        },
        {
            id: 'blue_chat_theme',
            name: 'Голубая тема чата',
            description: 'Голубой фон для ваших чатов 💙',
            icon: '💙',
            price: 150,
            item_type: 'chat_theme',
            item_value: 'blue',
            rarity: 'epic'
        },
        {
            id: 'orange_chat_theme',
            name: 'Оранжевая тема чата',
            description: 'Оранжевый фон для ваших чатов 🧡',
            icon: '🧡',
            price: 200,
            item_type: 'chat_theme',
            item_value: 'orange',
            rarity: 'legendary'
        }
    ];

    for (const item of items) {
        try {
            await dbRun(
                `INSERT OR IGNORE INTO shop_items (id, name, description, icon, price, item_type, item_value, rarity) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [item.id, item.name, item.description, item.icon, item.price,
                item.item_type, item.item_value, item.rarity]
            );
        } catch (error) {
            // Игнорируем ошибки при вставке существующих товаров
        }
    }
}

// Инициализация заданий
async function initQuests() {
    const quests = [
        {
            id: 'quest_send_10_messages',
            name: 'Активный собеседник',
            description: 'Отправь 10 сообщений',
            icon: '💬',
            quest_type: 'send_messages',
            target_value: 10,
            reward_coins: 15,
            is_daily: 0
        },
        {
            id: 'quest_complete_1_chat',
            name: 'Заверши чат',
            description: 'Заверши 1 чат',
            icon: '✅',
            quest_type: 'complete_chats',
            target_value: 1,
            reward_coins: 20,
            is_daily: 0
        },
        {
            id: 'quest_play_3_games',
            name: 'Игрок',
            description: 'Сыграй 3 игры',
            icon: '🎮',
            quest_type: 'play_games',
            target_value: 3,
            reward_coins: 25,
            is_daily: 0
        },
        {
            id: 'quest_win_1_game',
            name: 'Победитель',
            description: 'Выиграй 1 игру',
            icon: '🏆',
            quest_type: 'win_games',
            target_value: 1,
            reward_coins: 30,
            is_daily: 0
        },
        {
            id: 'quest_daily_messages',
            name: 'Ежедневное общение',
            description: 'Отправь 5 сообщений сегодня',
            icon: '📝',
            quest_type: 'send_messages',
            target_value: 5,
            reward_coins: 10,
            is_daily: 1
        },
        {
            id: 'quest_daily_games',
            name: 'Ежедневная игра',
            description: 'Сыграй 1 игру сегодня',
            icon: '🎯',
            quest_type: 'play_games',
            target_value: 1,
            reward_coins: 15,
            is_daily: 1
        }
    ];

    for (const quest of quests) {
        try {
            await dbRun(
                `INSERT OR IGNORE INTO quests (id, name, description, icon, quest_type, target_value, reward_coins, is_daily, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [quest.id, quest.name, quest.description, quest.icon, quest.quest_type,
                quest.target_value, quest.reward_coins, quest.is_daily ? 1 : 0, 1]
            );
        } catch (error) {
            // Игнорируем ошибки при вставке существующих заданий
        }
    }
}

// Инициализация бейджей
async function initBadges() {
    const badges = [
        {
            id: 'badge_newbie',
            name: 'Новичок',
            description: 'Первый день в приложении',
            icon: '🌱',
            badge_type: 'title',
            condition_type: 'days_active',
            condition_value: 1
        },
        {
            id: 'badge_chatter',
            name: 'Болтун',
            description: 'Отправлено 100 сообщений',
            icon: '💬',
            badge_type: 'badge',
            condition_type: 'messages_sent',
            condition_value: 100
        },
        {
            id: 'badge_social',
            name: 'Общительный',
            description: 'Завершено 20 чатов',
            icon: '🤝',
            badge_type: 'badge',
            condition_type: 'completed_chats',
            condition_value: 20
        },
        {
            id: 'badge_champion',
            name: 'Чемпион',
            description: 'Выиграно 10 игр',
            icon: '👑',
            badge_type: 'title',
            condition_type: 'games_won',
            condition_value: 10
        },
        {
            id: 'badge_rich',
            name: 'Богач',
            description: 'Накоплено 1000 монет',
            icon: '💰',
            badge_type: 'badge',
            condition_type: 'total_coins',
            condition_value: 1000
        },
        {
            id: 'badge_legend',
            name: 'Легенда',
            description: 'Рейтинг 5.0',
            icon: '⭐',
            badge_type: 'title',
            condition_type: 'rating',
            condition_value: 50
        }
    ];

    for (const badge of badges) {
        try {
            await dbRun(
                `INSERT OR IGNORE INTO badges (id, name, description, icon, badge_type, condition_type, condition_value) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [badge.id, badge.name, badge.description, badge.icon, badge.badge_type,
                badge.condition_type, badge.condition_value]
            );
        } catch (error) {
            // Игнорируем ошибки при вставке существующих бейджей
        }
    }
}

// Инициализация системного администратора и главного администратора
async function initSystemAdmin() {
    try {
        // Создаем системного администратора (для чатов поддержки)
        const ADMIN_ID = 'system_admin_001';
        const admin = await dbGet('SELECT * FROM users WHERE id = ?', [ADMIN_ID]);

        if (!admin) {
            await dbRun(
                `INSERT INTO users (id, name, age, gender, interests, coins, decorations, is_admin, is_system, admin_role) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    ADMIN_ID,
                    'Администратор',
                    0,
                    'other',
                    JSON.stringify(['поддержка', 'администрирование']),
                    0,
                    JSON.stringify({}),
                    1,
                    1,
                    'admin'
                ]
            );
            console.log('Системный администратор создан');
        }

        // Создаем или обновляем главного администратора
        const SUPER_ADMIN_TELEGRAM_ID = '5394381166';
        const superAdmin = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [SUPER_ADMIN_TELEGRAM_ID]);

        if (superAdmin) {
            // Обновляем существующего пользователя до главного администратора
            if (superAdmin.admin_role !== 'super_admin') {
                await dbRun(
                    'UPDATE users SET is_admin = 1, admin_role = ? WHERE telegram_id = ?',
                    ['super_admin', SUPER_ADMIN_TELEGRAM_ID]
                );
                console.log('Пользователь с telegram_id 5394381166 назначен главным администратором');
            }
        } else {
            // Создаем главного администратора, если его нет
            const superAdminId = uuidv4();
            await dbRun(
                `INSERT INTO users (id, name, age, gender, interests, coins, decorations, is_admin, is_system, admin_role, telegram_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    superAdminId,
                    'Главный администратор',
                    0,
                    'other',
                    JSON.stringify(['администрирование']),
                    0,
                    JSON.stringify({}),
                    1,
                    0,
                    'super_admin',
                    SUPER_ADMIN_TELEGRAM_ID
                ]
            );
            console.log('Главный администратор создан (telegram_id: 5394381166)');
        }
    } catch (error) {
        console.error('Ошибка создания системного администратора:', error);
    }
}

// Инициализация тестового пользователя для локальной разработки
async function initTestUser() {
    try {
        const TEST_TELEGRAM_ID = '123456789';
        const testUser = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [TEST_TELEGRAM_ID]);

        if (!testUser) {
            const userId = uuidv4();
            await dbRun(
                `INSERT INTO users (id, name, age, gender, interests, coins, decorations, is_admin, is_system, admin_role, telegram_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    'Тестовый пользователь',
                    25,
                    'male',
                    JSON.stringify(['спорт', 'музыка', 'кино']),
                    100,
                    JSON.stringify({}),
                    0,
                    0,
                    null,
                    TEST_TELEGRAM_ID
                ]
            );
            console.log('Тестовый пользователь создан (telegram_id: 123456789)');
        }
    } catch (error) {
        console.error('Ошибка создания тестового пользователя:', error);
    }
}

// Инициализация базы данных при запуске
initDatabase().catch(err => {
    console.error('Критическая ошибка при инициализации БД:', err);
    process.exit(1);
});

// WebSocket сервер для real-time обновлений
const wss = new WebSocketServer({ server });

const activeConnections = new Map(); // userId -> WebSocket

// Интервал для периодического поиска (каждые 2 секунды)
let searchInterval = null;
// Время последней попытки поиска по интересам для каждого пользователя
const lastInterestSearchTime = new Map();
// Флаг блокировки обработки очереди для предотвращения дубликатов
let isProcessingQueue = false;

// Запуск периодического поиска
function startPeriodicSearch() {
    if (searchInterval) return; // Уже запущен

    searchInterval = setInterval(async () => {
        try {
            const queue = await dbAll('SELECT user_id FROM search_queue');
            if (queue.length >= 2) {
                await processSearchQueue();
            }
        } catch (error) {
            console.error('Ошибка периодического поиска:', error);
        }
    }, 2000); // Каждые 2 секунды

    console.log('Периодический поиск запущен (каждые 2 секунды)');
}

// Остановка периодического поиска
function stopPeriodicSearch() {
    if (searchInterval) {
        clearInterval(searchInterval);
        searchInterval = null;
        console.log('Периодический поиск остановлен');
    }
}

wss.on('connection', (ws, req) => {
    let userId = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === 'register') {
                userId = data.userId;

                // Проверяем, существует ли пользователь в базе данных
                const userExists = await dbGet('SELECT id FROM users WHERE id = ?', [userId]);
                if (!userExists) {
                    console.error(`Пользователь ${userId} не найден в базе данных`);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Пользователь не найден. Пожалуйста, зарегистрируйтесь сначала.'
                    }));
                    return;
                }

                activeConnections.set(userId, ws);
                console.log(`Пользователь ${userId} подключен`);

                // Устанавливаем статус онлайн при подключении
                dbRun(`
                    INSERT OR REPLACE INTO user_statuses (user_id, status, last_seen)
                    VALUES (?, 'online', CURRENT_TIMESTAMP)
                `, [userId]).then(async () => {
                    // Отправляем уведомление партнерам об изменении статуса
                    try {
                        const chats = await dbAll(`
                            SELECT id, user1_id, user2_id FROM chats 
                            WHERE (user1_id = ? OR user2_id = ?) AND is_completed = 0
                        `, [userId, userId]);

                        // Отправляем обновление статуса всем партнерам в активных чатах
                        for (const chat of chats) {
                            const partnerId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;
                            sendToUser(partnerId, {
                                type: 'user_status_update',
                                userId: userId,
                                status: 'online',
                                chatId: chat.id
                            });
                        }
                    } catch (error) {
                        console.error('Ошибка отправки уведомления о статусе:', error);
                    }
                }).catch(error => {
                    console.error('Ошибка установки статуса онлайн:', error);
                });

                // Запускаем периодический поиск если еще не запущен
                startPeriodicSearch();
            } else if (data.type === 'start_search') {
                // Обработка начала поиска
                handleStartSearch(userId);
            } else if (data.type === 'stop_search') {
                // Обработка остановки поиска
                handleStopSearch(userId);
            } else if (data.type === 'game_request') {
                // Обработка запроса на игру
                handleGameRequest(data);
            } else if (data.type === 'game_request_response') {
                // Обработка ответа на запрос игры
                handleGameRequestResponse(data);
            } else if (data.type === 'chat_ended') {
                // Обработка завершения чата
                handleChatEnded(data);
            } else if (data.type === 'rps_choice') {
                // Обработка выбора в игре RPS
                handleRPSChoice(data);
            } else if (data.type === 'ttt_move') {
                // Обработка хода в игре крестики-нолики
                handleTTTMove(data);
            } else if (data.type === 'typing') {
                // Обработка индикатора печати (старый формат для совместимости)
                handleTyping(data);
            } else if (data.type === 'typing_start') {
                // Обработка начала печати
                handleTypingStart(data);
            } else if (data.type === 'typing_stop') {
                // Остановка индикатора печати
                handleTypingStop(data);
            } else if (data.type === 'user_status_update') {
                // Обработка обновления статуса пользователя
                handleUserStatusUpdate(data);
            }
        } catch (error) {
            console.error('Ошибка обработки WebSocket сообщения:', error);
        }
    });

    ws.on('close', async () => {
        if (userId) {
            activeConnections.delete(userId);
            console.log(`Пользователь ${userId} отключен`);

            try {
                // Проверяем, существует ли пользователь перед обновлением статуса
                const userExists = await dbGet('SELECT id FROM users WHERE id = ?', [userId]);
                if (userExists) {
                    // Устанавливаем статус офлайн при отключении
                    await dbRun(`
                        INSERT OR REPLACE INTO user_statuses (user_id, status, last_seen)
                        VALUES (?, 'offline', CURRENT_TIMESTAMP)
                    `, [userId]);
                } else {
                    console.warn(`Пользователь ${userId} не найден в базе данных при отключении`);
                    return;
                }

                // Отправляем уведомление партнерам об изменении статуса
                const chats = await dbAll(`
                    SELECT id, user1_id, user2_id FROM chats 
                    WHERE (user1_id = ? OR user2_id = ?) AND is_completed = 0
                `, [userId, userId]);

                // Отправляем обновление статуса всем партнерам в активных чатах
                for (const chat of chats) {
                    const partnerId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;
                    sendToUser(partnerId, {
                        type: 'user_status_update',
                        userId: userId,
                        status: 'offline',
                        chatId: chat.id
                    });
                }
            } catch (error) {
                console.error('Ошибка установки статуса офлайн:', error);
            }
        }
    });
});

// Функция отправки сообщения пользователю через WebSocket
function sendToUser(userId, data) {
    const ws = activeConnections.get(userId);
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify(data));
    }
}

// Обработка запроса на игру
function handleGameRequest(data) {
    const { chatId, gameType, fromUserId, toUserId, isBet, betAmount } = data;

    console.log(`Запрос на игру ${gameType} от ${fromUserId} к ${toUserId} в чате ${chatId}${isBet ? ` со ставкой ${betAmount}` : ''}`);

    // Отправляем запрос получателю
    sendToUser(toUserId, {
        type: 'game_request',
        chatId: chatId,
        gameType: gameType,
        fromUserId: fromUserId,
        toUserId: toUserId,
        isBet: isBet || false,
        betAmount: betAmount || 0
    });
}

// Обработка ответа на запрос игры
async function handleGameRequestResponse(data) {
    const { chatId, gameType, accepted, fromUserId, toUserId, isBet, betAmount } = data;

    console.log(`Ответ на запрос игры ${gameType}: ${accepted ? 'принят' : 'отклонен'} от ${toUserId} к ${fromUserId}${isBet ? ` со ставкой ${betAmount}` : ''}`);

    // Если игра принята и на ставку, сохраняем информацию о ставке и списываем монеты
    if (accepted && isBet && betAmount > 0) {
        try {
            // Проверяем балансы обоих игроков
            const user1 = await dbGet('SELECT coins FROM users WHERE id = ?', [fromUserId]);
            const user2 = await dbGet('SELECT coins FROM users WHERE id = ?', [toUserId]);

            if (!user1 || !user2) {
                console.error('Один из игроков не найден');
                return;
            }

            if ((user1.coins || 0) < betAmount) {
                sendToUser(fromUserId, {
                    type: 'game_error',
                    chatId: chatId,
                    error: 'Недостаточно монет для ставки'
                });
                return;
            }

            if ((user2.coins || 0) < betAmount) {
                sendToUser(toUserId, {
                    type: 'game_error',
                    chatId: chatId,
                    error: 'Недостаточно монет для ставки'
                });
                return;
            }

            // Списываем монеты у обоих игроков
            await dbRun('UPDATE users SET coins = coins - ? WHERE id = ?', [betAmount, fromUserId]);
            await dbRun('UPDATE users SET coins = coins - ? WHERE id = ?', [betAmount, toUserId]);

            // Сохраняем информацию о ставке
            const gameId = `${chatId}_${gameType}`;
            gameBets[gameId] = {
                isBet: true,
                betAmount: betAmount,
                player1Id: fromUserId,
                player2Id: toUserId
            };

            console.log(`Ставка ${betAmount} монет зафиксирована для игры ${gameId}`);
        } catch (error) {
            console.error('Ошибка обработки ставки:', error);
        }
    }

    // Отправляем ответ отправителю запроса
    sendToUser(fromUserId, {
        type: 'game_request_response',
        chatId: chatId,
        gameType: gameType,
        accepted: accepted,
        fromUserId: fromUserId,
        toUserId: toUserId,
        isBet: isBet || false,
        betAmount: betAmount || 0
    });
}

// Обработка завершения чата
async function handleChatEnded(data) {
    const { chatId, fromUserId, toUserId } = data;

    console.log(`Чат ${chatId} завершен пользователем ${fromUserId}`);

    try {
        // Помечаем чат как завершенный в базе данных
        await dbRun(
            'UPDATE chats SET is_completed = 1, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
            [chatId]
        );

        // Отправляем уведомление партнеру
        sendToUser(toUserId, {
            type: 'chat_ended',
            chatId: chatId,
            fromUserId: fromUserId,
            toUserId: toUserId
        });
    } catch (error) {
        console.error('Ошибка завершения чата:', error);
    }
}

// Хранилище состояний игр RPS
const rpsGames = {};

// Хранилище состояний игр крестики-нолики
const tttGames = {};

// Хранилище информации о ставках для игр
const gameBets = {};

// Определение победителя в RPS
function determineRPSWinner(choice1, choice2) {
    if (choice1 === choice2) {
        return {
            winner: 'draw',
            message: 'Ничья!',
            choice1,
            choice2
        };
    }

    const wins = {
        'rock': 'scissors',
        'scissors': 'paper',
        'paper': 'rock'
    };

    if (wins[choice1] === choice2) {
        return {
            winner: 'player1',
            message: 'Игрок 1 победил!',
            choice1,
            choice2
        };
    } else {
        return {
            winner: 'player2',
            message: 'Игрок 2 победил!',
            choice1,
            choice2
        };
    }
}

// Обработка выбора в игре RPS
async function handleRPSChoice(data) {
    const { chatId, userId, choice } = data;

    console.log(`Выбор RPS от ${userId} в чате ${chatId}: ${choice}`);

    // Получаем или создаем состояние игры
    if (!rpsGames[chatId]) {
        rpsGames[chatId] = {
            player1Id: null,
            player2Id: null,
            player1Choice: null,
            player2Choice: null
        };
    }

    const game = rpsGames[chatId];

    // Получаем информацию о чате для определения партнера
    dbAll('SELECT user1_id, user2_id FROM chats WHERE id = ?', [chatId])
        .then(async rows => {
            if (rows.length === 0) {
                console.error(`Чат ${chatId} не найден`);
                return;
            }

            const chat = rows[0];
            const partnerId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;

            // Определяем игроков
            if (!game.player1Id) {
                game.player1Id = userId;
                game.player2Id = partnerId;
            }

            // Сохраняем выбор
            if (game.player1Id === userId) {
                game.player1Choice = choice;
            } else if (game.player2Id === userId) {
                game.player2Choice = choice;
            }

            // Проверяем, оба ли игрока сделали выбор
            if (game.player1Choice && game.player2Choice) {
                const result = determineRPSWinner(game.player1Choice, game.player2Choice);

                // Обновляем прогресс заданий для обоих игроков
                try {
                    for (const userId of [game.player1Id, game.player2Id]) {
                        await updateQuestProgressForUser(userId, 'play_games', 1);
                    }

                    // Обновляем прогресс для победителя
                    if (result.winner === 'player1') {
                        await updateQuestProgressForUser(game.player1Id, 'win_games', 1);
                    } else if (result.winner === 'player2') {
                        await updateQuestProgressForUser(game.player2Id, 'win_games', 1);
                    }
                } catch (error) {
                    console.error('Ошибка обновления прогресса заданий:', error);
                }

                // Обрабатываем ставку если игра была на ставку
                const gameId = `${chatId}_rps`;
                const betInfo = gameBets[gameId];
                if (betInfo && betInfo.isBet) {
                    await processGameBet(gameId, result, game.player1Id, game.player2Id);
                }

                // Определяем, кто победил относительно userId
                let userResult = {
                    ...result,
                    player1Id: game.player1Id,
                    player2Id: game.player2Id,
                    player1Choice: game.player1Choice,
                    player2Choice: game.player2Choice
                };
                if (result.winner === 'player1') {
                    userResult.winner = game.player1Id === userId ? 'you' : 'opponent';
                    userResult.yourChoice = game.player1Id === userId ? game.player1Choice : game.player2Choice;
                    userResult.opponentChoice = game.player1Id === userId ? game.player2Choice : game.player1Choice;
                } else if (result.winner === 'player2') {
                    userResult.winner = game.player2Id === userId ? 'you' : 'opponent';
                    userResult.yourChoice = game.player2Id === userId ? game.player2Choice : game.player1Choice;
                    userResult.opponentChoice = game.player2Id === userId ? game.player1Choice : game.player2Choice;
                } else {
                    // Ничья
                    userResult.yourChoice = game.player1Id === userId ? game.player1Choice : game.player2Choice;
                    userResult.opponentChoice = game.player1Id === userId ? game.player2Choice : game.player1Choice;
                }

                // Добавляем информацию о ставке в результат
                if (betInfo && betInfo.isBet) {
                    userResult.isBet = true;
                    userResult.betAmount = betInfo.betAmount;
                }

                // Отправляем результат первому игроку
                sendToUser(userId, {
                    type: 'rps_result',
                    chatId: chatId,
                    result: userResult
                });

                // Определяем результат для партнера
                let partnerResult = {
                    ...result,
                    player1Id: game.player1Id,
                    player2Id: game.player2Id,
                    player1Choice: game.player1Choice,
                    player2Choice: game.player2Choice
                };
                if (result.winner === 'player1') {
                    partnerResult.winner = game.player1Id === partnerId ? 'you' : 'opponent';
                    partnerResult.yourChoice = game.player1Id === partnerId ? game.player1Choice : game.player2Choice;
                    partnerResult.opponentChoice = game.player1Id === partnerId ? game.player2Choice : game.player1Choice;
                } else if (result.winner === 'player2') {
                    partnerResult.winner = game.player2Id === partnerId ? 'you' : 'opponent';
                    partnerResult.yourChoice = game.player2Id === partnerId ? game.player2Choice : game.player1Choice;
                    partnerResult.opponentChoice = game.player2Id === partnerId ? game.player1Choice : game.player2Choice;
                } else {
                    // Ничья
                    partnerResult.yourChoice = game.player1Id === partnerId ? game.player1Choice : game.player2Choice;
                    partnerResult.opponentChoice = game.player1Id === partnerId ? game.player2Choice : game.player1Choice;
                }

                // Добавляем информацию о ставке в результат
                if (betInfo && betInfo.isBet) {
                    partnerResult.isBet = true;
                    partnerResult.betAmount = betInfo.betAmount;
                }

                sendToUser(partnerId, {
                    type: 'rps_result',
                    chatId: chatId,
                    result: partnerResult
                });

                // Очищаем состояние игры после завершения
                delete rpsGames[chatId];
                if (betInfo) {
                    delete gameBets[gameId];
                }
            }
        })
        .catch(error => {
            console.error('Ошибка обработки выбора RPS:', error);
        });
}

// Обработка хода в игре крестики-нолики
async function handleTTTMove(data) {
    const { chatId, userId, position } = data;

    console.log(`Ход TTT от ${userId} в чате ${chatId}: позиция ${position}`);

    try {
        // Получаем информацию о чате
        const chat = await dbGet('SELECT user1_id, user2_id FROM chats WHERE id = ?', [chatId]);
        if (!chat) {
            console.error(`Чат ${chatId} не найден`);
            return;
        }

        const partnerId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;

        // Получаем или создаем состояние игры
        if (!tttGames[chatId]) {
            // Рандомно присваиваем крестик или нолик
            const randomSymbol = Math.random() < 0.5 ? 'X' : 'O';
            tttGames[chatId] = {
                board: Array(9).fill(null),
                currentPlayer: randomSymbol,
                player1Id: userId,
                player2Id: partnerId,
                player1Symbol: randomSymbol,
                player2Symbol: randomSymbol === 'X' ? 'O' : 'X',
                status: 'playing',
                winner: null
            };
        }

        const game = tttGames[chatId];

        // Определяем символ текущего игрока
        const playerSymbol = game.player1Id === userId ? game.player1Symbol : game.player2Symbol;

        // Проверяем, что это ход текущего игрока
        if (game.currentPlayer !== playerSymbol) {
            sendToUser(userId, {
                type: 'ttt_error',
                chatId: chatId,
                error: 'Не ваш ход!'
            });
            return;
        }

        // Проверяем, что клетка свободна
        if (game.board[position] !== null) {
            sendToUser(userId, {
                type: 'ttt_error',
                chatId: chatId,
                error: 'Эта клетка уже занята!'
            });
            return;
        }

        // Делаем ход
        game.board[position] = playerSymbol;

        // Проверяем победу
        const winner = checkTTTWinner(game.board);
        if (winner) {
            game.status = 'finished';
            game.winner = winner;

            // Обновляем прогресс заданий для обоих игроков
            try {
                for (const userId of [game.player1Id, game.player2Id]) {
                    await updateQuestProgressForUser(userId, 'play_games', 1);
                }

                // Обновляем прогресс для победителя
                if (winner !== 'draw') {
                    const winnerId = winner === game.player1Symbol ? game.player1Id : game.player2Id;
                    await updateQuestProgressForUser(winnerId, 'win_games', 1);
                }
            } catch (error) {
                console.error('Ошибка обновления прогресса заданий:', error);
            }

            // Обрабатываем ставку если игра была на ставку
            const gameId = `${chatId}_ttt`;
            const betInfo = gameBets[gameId];
            if (betInfo && betInfo.isBet) {
                const tttResult = {
                    winner: winner === 'draw' ? 'draw' : (winner === game.player1Symbol ? 'player1' : 'player2')
                };
                await processGameBet(gameId, tttResult, game.player1Id, game.player2Id);
            }

            // Получаем имена игроков
            const player1 = await dbGet('SELECT name FROM users WHERE id = ?', [game.player1Id]);
            const player2 = await dbGet('SELECT name FROM users WHERE id = ?', [game.player2Id]);
            const player1Name = player1 ? player1.name : 'Игрок 1';
            const player2Name = player2 ? player2.name : 'Игрок 2';

            // Определяем победителя по имени
            let winnerName = '';
            let winnerSymbol = '';
            if (winner === 'draw') {
                winnerName = 'Ничья';
            } else if (winner === game.player1Symbol) {
                winnerName = player1Name;
                winnerSymbol = game.player1Symbol;
            } else {
                winnerName = player2Name;
                winnerSymbol = game.player2Symbol;
            }

            // Отправляем результат обоим игрокам
            const resultData = {
                type: 'ttt_result',
                chatId: chatId,
                board: game.board,
                winner: winner === 'draw' ? 'draw' : (winner === game.player1Symbol ? 'player1' : 'player2'),
                winnerName: winnerName,
                winnerSymbol: winnerSymbol,
                player1Id: game.player1Id,
                player2Id: game.player2Id,
                player1Name: player1Name,
                player2Name: player2Name,
                player1Symbol: game.player1Symbol,
                player2Symbol: game.player2Symbol,
                message: winner === 'draw' ? 'Ничья!' : `Победил ${winnerName} (${winnerSymbol === 'X' ? 'крестик' : 'нолик'})!`
            };

            // Добавляем информацию о ставке в результат
            if (betInfo && betInfo.isBet) {
                resultData.isBet = true;
                resultData.betAmount = betInfo.betAmount;
            }

            sendToUser(userId, resultData);
            sendToUser(partnerId, resultData);

            // Очищаем состояние игры после завершения
            delete tttGames[chatId];
            if (betInfo) {
                delete gameBets[gameId];
            }
            return;
        }

        // Меняем игрока
        game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';

        // Получаем имена игроков
        const player1 = await dbGet('SELECT name FROM users WHERE id = ?', [game.player1Id]);
        const player2 = await dbGet('SELECT name FROM users WHERE id = ?', [game.player2Id]);
        const player1Name = player1 ? player1.name : 'Игрок 1';
        const player2Name = player2 ? player2.name : 'Игрок 2';

        // Определяем имя текущего игрока
        const currentPlayerId = game.currentPlayer === game.player1Symbol ? game.player1Id : game.player2Id;
        const currentPlayerName = currentPlayerId === game.player1Id ? player1Name : player2Name;
        const currentPlayerSymbolLabel = game.currentPlayer === 'X' ? 'крестик' : 'нолик';

        // Отправляем обновление обоим игрокам
        const updateData = {
            type: 'ttt_update',
            chatId: chatId,
            board: game.board,
            currentPlayer: game.currentPlayer,
            currentPlayerName: currentPlayerName,
            currentPlayerSymbolLabel: currentPlayerSymbolLabel,
            player1Id: game.player1Id,
            player2Id: game.player2Id,
            player1Name: player1Name,
            player2Name: player2Name,
            player1Symbol: game.player1Symbol,
            player2Symbol: game.player2Symbol,
            status: 'playing'
        };

        sendToUser(userId, updateData);
        sendToUser(partnerId, updateData);
    } catch (error) {
        console.error('Ошибка обработки хода TTT:', error);
        sendToUser(userId, {
            type: 'ttt_error',
            chatId: chatId,
            error: 'Ошибка обработки хода'
        });
    }
}

// Обработка ставки в игре
async function processGameBet(gameId, result, player1Id, player2Id) {
    const betInfo = gameBets[gameId];
    if (!betInfo || !betInfo.isBet) return;

    const betAmount = betInfo.betAmount;
    const winner = result.winner;

    try {
        if (winner === 'draw') {
            // При ничьей возвращаем монеты обоим игрокам
            await dbRun('UPDATE users SET coins = coins + ? WHERE id = ?', [betAmount, player1Id]);
            await dbRun('UPDATE users SET coins = coins + ? WHERE id = ?', [betAmount, player2Id]);
            console.log(`Ничья в игре ${gameId}: возвращено ${betAmount} монет каждому игроку`);
        } else if (winner === 'player1') {
            // Победил первый игрок - он получает удвоенную сумму (2 * betAmount)
            await dbRun('UPDATE users SET coins = coins + ? WHERE id = ?', [betAmount * 2, player1Id]);
            console.log(`Игрок ${player1Id} выиграл ${betAmount * 2} монет в игре ${gameId}`);
        } else if (winner === 'player2') {
            // Победил второй игрок - он получает удвоенную сумму (2 * betAmount)
            await dbRun('UPDATE users SET coins = coins + ? WHERE id = ?', [betAmount * 2, player2Id]);
            console.log(`Игрок ${player2Id} выиграл ${betAmount * 2} монет в игре ${gameId}`);
        }
    } catch (error) {
        console.error('Ошибка обработки ставки:', error);
    }
}

// Обработка индикатора печати (старый формат для совместимости)
function handleTyping(data) {
    const { chatId, userId } = data;

    // Получаем информацию о чате
    dbGet('SELECT user1_id, user2_id FROM chats WHERE id = ?', [chatId])
        .then(chat => {
            if (!chat) return;

            const partnerId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;

            // Отправляем событие печати партнеру
            sendToUser(partnerId, {
                type: 'typing',
                chatId: chatId,
                userId: userId
            });
        })
        .catch(error => {
            console.error('Ошибка обработки индикатора печати:', error);
        });
}

// Обработка начала печати
async function handleTypingStart(data) {
    const { chatId, userId } = data;

    try {
        // Получаем информацию о чате
        const chat = await dbGet('SELECT user1_id, user2_id FROM chats WHERE id = ?', [chatId]);
        if (!chat) return;

        const partnerId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;

        // Отправляем событие начала печати партнеру
        sendToUser(partnerId, {
            type: 'typing_start',
            chatId: chatId,
            userId: userId
        });
    } catch (error) {
        console.error('Ошибка обработки начала печати:', error);
    }
}

// Остановка индикатора печати
async function handleTypingStop(data) {
    const { chatId, userId } = data;

    try {
        // Получаем информацию о чате
        const chat = await dbGet('SELECT user1_id, user2_id FROM chats WHERE id = ?', [chatId]);
        if (!chat) return;

        const partnerId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;

        // Отправляем событие остановки печати партнеру
        sendToUser(partnerId, {
            type: 'typing_stop',
            chatId: chatId,
            userId: userId
        });
    } catch (error) {
        console.error('Ошибка обработки остановки печати:', error);
    }
}

// Обработка обновления статуса пользователя
async function handleUserStatusUpdate(data) {
    const { userId, status } = data;

    try {
        // Проверяем, существует ли пользователь
        const userExists = await dbGet('SELECT id FROM users WHERE id = ?', [userId]);
        if (!userExists) {
            console.error(`Пользователь ${userId} не найден при обновлении статуса`);
            return;
        }

        // Обновляем статус в базе данных
        await dbRun(`
            INSERT OR REPLACE INTO user_statuses (user_id, status, last_seen)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `, [userId, status]);

        // Получаем информацию о чатах пользователя для отправки обновления партнерам
        const chats = await dbAll(`
            SELECT id, user1_id, user2_id FROM chats 
            WHERE (user1_id = ? OR user2_id = ?) AND is_completed = 0
        `, [userId, userId]);

        // Отправляем обновление статуса всем партнерам в активных чатах
        for (const chat of chats) {
            const partnerId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;
            sendToUser(partnerId, {
                type: 'user_status_update',
                userId: userId,
                status: status,
                chatId: chat.id
            });
        }
    } catch (error) {
        console.error('Ошибка обработки обновления статуса:', error);
    }
}

// Проверка победителя в крестики-нолики
function checkTTTWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Горизонтальные
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Вертикальные
        [0, 4, 8], [2, 4, 6] // Диагональные
    ];

    for (let line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }

    // Проверка на ничью
    if (board.every(cell => cell !== null)) {
        return 'draw';
    }

    return null;
}

// Функция начала поиска
async function handleStartSearch(userId) {
    try {
        await dbRun('INSERT OR REPLACE INTO search_queue (user_id) VALUES (?)', [userId]);
        console.log(`Пользователь ${userId} добавлен в очередь поиска`);
        // Пытаемся найти пару для всех пользователей в очереди
        await processSearchQueue();
    } catch (error) {
        console.error('Ошибка начала поиска:', error);
    }
}

// Функция остановки поиска
async function handleStopSearch(userId) {
    try {
        await dbRun('DELETE FROM search_queue WHERE user_id = ?', [userId]);
    } catch (error) {
        console.error('Ошибка остановки поиска:', error);
    }
}

// Функция обработки очереди поиска
async function processSearchQueue() {
    // Блокируем обработку если уже идет процесс
    if (isProcessingQueue) {
        console.log('Обработка очереди уже идет, пропускаем');
        return;
    }

    try {
        isProcessingQueue = true;

        const queue = await dbAll('SELECT user_id, created_at FROM search_queue ORDER BY created_at');

        if (queue.length < 2) {
            console.log(`В очереди поиска: ${queue.length} пользователей`);
            return;
        }

        console.log(`Обработка очереди поиска: ${queue.length} пользователей`);

        let foundMatchByInterests = false;

        // Сначала пытаемся найти пары по интересам
        for (let i = 0; i < queue.length - 1; i++) {
            for (let j = i + 1; j < queue.length; j++) {
                const user1Id = queue[i].user_id;
                const user2Id = queue[j].user_id;

                const matched = await tryMatchUsers(user1Id, user2Id, true);
                if (matched) {
                    foundMatchByInterests = true;
                    // Если нашли пару, прекращаем поиск для этих пользователей
                    return;
                }
            }
        }

        // Если не нашли пары по интересам, проверяем время ожидания
        if (!foundMatchByInterests && queue.length >= 2) {
            const now = Date.now();
            const WAIT_TIME_BEFORE_RANDOM_MATCH = 5000; // 5 секунд ожидания перед случайным сопоставлением

            // Проверяем, прошло ли достаточно времени с момента добавления в очередь
            let allUsersWaitedLongEnough = true;
            for (const row of queue) {
                const waitTime = now - new Date(row.created_at).getTime();
                if (waitTime < WAIT_TIME_BEFORE_RANDOM_MATCH) {
                    allUsersWaitedLongEnough = false;
                    console.log(`Пользователь ${row.user_id} ждет ${Math.round(waitTime / 1000)} сек, нужно ${WAIT_TIME_BEFORE_RANDOM_MATCH / 1000} сек`);
                    break;
                }
            }

            // Если все пользователи ждут достаточно долго, создаем чаты между любыми пользователями
            if (allUsersWaitedLongEnough) {
                console.log('Не найдено пар по интересам, создаем чаты между любыми пользователями');

                // Создаем пары из оставшихся пользователей
                const remainingQueue = await dbAll('SELECT user_id FROM search_queue ORDER BY created_at');
                for (let i = 0; i < remainingQueue.length - 1; i += 2) {
                    const user1Id = remainingQueue[i].user_id;
                    const user2Id = remainingQueue[i + 1]?.user_id;

                    if (user2Id) {
                        await tryMatchUsers(user1Id, user2Id, false); // false = не проверяем интересы
                        // После создания пары выходим, чтобы не создавать несколько пар за раз
                        return;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Ошибка обработки очереди поиска:', error);
    } finally {
        // Снимаем блокировку
        isProcessingQueue = false;
    }
}

// Функция попытки сопоставления двух пользователей
async function tryMatchUsers(user1Id, user2Id, checkInterests = true) {
    try {
        // Получаем обоих пользователей
        const user1 = await dbGet('SELECT * FROM users WHERE id = ?', [user1Id]);
        const user2 = await dbGet('SELECT * FROM users WHERE id = ?', [user2Id]);

        if (!user1 || !user2) {
            console.log(`Пользователь не найден: ${!user1 ? user1Id : user2Id}`);
            return false;
        }

        // Если нужно проверять интересы
        if (checkInterests) {
            const user1Interests = JSON.parse(user1.interests);
            const user2Interests = JSON.parse(user2.interests);

            console.log(`Проверка сопоставления: ${user1.name} (${user1Interests.length} интересов) и ${user2.name} (${user2Interests.length} интересов)`);
            console.log(`Интересы ${user1.name}:`, user1Interests);
            console.log(`Интересы ${user2.name}:`, user2Interests);

            // Проверяем совпадение интересов
            const commonInterests = user1Interests.filter(interest => user2Interests.includes(interest));

            console.log(`Общих интересов: ${commonInterests.length}`, commonInterests);

            // Для ботов требуется минимум 1 общий интерес, для обычных - минимум 2
            const isBot1 = user1.id.startsWith('test_bot_') || user1.id.startsWith('bot_');
            const isBot2 = user2.id.startsWith('test_bot_') || user2.id.startsWith('bot_');
            const minInterests = (isBot1 || isBot2) ? 1 : 2;

            console.log(`Минимум общих интересов требуется: ${minInterests} (бот1: ${isBot1}, бот2: ${isBot2})`);

            // Если недостаточно общих интересов, не создаем чат
            if (commonInterests.length < minInterests) {
                console.log(`✗ Недостаточно общих интересов: ${commonInterests.length} < ${minInterests}`);
                return false;
            }

            console.log(`✓ Найдена пара по интересам: ${user1.name} и ${user2.name} (общих интересов: ${commonInterests.length})`);
        } else {
            console.log(`✓ Создание чата без проверки интересов: ${user1.name} и ${user2.name}`);
        }

        // Проверяем, что оба пользователя все еще в очереди
        const user1InQueue = await dbGet('SELECT user_id FROM search_queue WHERE user_id = ?', [user1Id]);
        const user2InQueue = await dbGet('SELECT user_id FROM search_queue WHERE user_id = ?', [user2Id]);

        if (!user1InQueue || !user2InQueue) {
            console.log('⚠ Один из пользователей уже удален из очереди');
            return false;
        }

        // Проверяем, нет ли уже активного чата между этими пользователями
        const existingChat = await dbGet(`
            SELECT id FROM chats 
            WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))
            AND is_completed = 0
        `, [user1Id, user2Id, user2Id, user1Id]);

        if (existingChat) {
            console.log(`⚠ У пользователей уже есть активный чат: ${existingChat.id}`);
            // Удаляем из очереди, так как у них уже есть чат
            await dbRun('DELETE FROM search_queue WHERE user_id IN (?, ?)', [user1Id, user2Id]);
            return false;
        }

        // Создаем чат
        const chatId = uuidv4();
        await dbRun('INSERT INTO chats (id, user1_id, user2_id) VALUES (?, ?, ?)', [chatId, user1Id, user2Id]);

        // Удаляем из очереди
        await dbRun('DELETE FROM search_queue WHERE user_id IN (?, ?)', [user1Id, user2Id]);

        // Получаем рейтинги и decorations пользователей
        const rating1 = await dbGet('SELECT rating_average, rating_count, decorations FROM users WHERE id = ?', [user1.id]);
        const rating2 = await dbGet('SELECT rating_average, rating_count, decorations FROM users WHERE id = ?', [user2.id]);

        // Получаем рейтинг, учитывая что он может быть null
        const user1Rating = rating1 && rating1.rating_average !== null ? rating1.rating_average : 0;
        const user2Rating = rating2 && rating2.rating_average !== null ? rating2.rating_average : 0;

        console.log(`Рейтинг ${user1.name}: ${user1Rating}, Рейтинг ${user2.name}: ${user2Rating}`);

        // Получаем decorations пользователей
        const user1Decorations = rating1 && rating1.decorations ? JSON.parse(rating1.decorations) : {};
        const user2Decorations = rating2 && rating2.decorations ? JSON.parse(rating2.decorations) : {};

        // Отправляем уведомления обоим пользователям
        const matchData1 = {
            type: 'match_found',
            chatId: chatId,
            partner: {
                id: user2.id,
                name: user2.name,
                age: user2.age,
                rating: user2Rating,
                decorations: user2Decorations
            }
        };

        const matchData2 = {
            type: 'match_found',
            chatId: chatId,
            partner: {
                id: user1.id,
                name: user1.name,
                age: user1.age,
                rating: user1Rating,
                decorations: user1Decorations
            }
        };

        console.log(`Отправка уведомления пользователю ${user1.name}:`, JSON.stringify(matchData1, null, 2));
        console.log(`Рейтинг в matchData1:`, matchData1.partner.rating);
        sendToUser(user1Id, matchData1);

        console.log(`Отправка уведомления пользователю ${user2.name}:`, JSON.stringify(matchData2, null, 2));
        console.log(`Рейтинг в matchData2:`, matchData2.partner.rating);
        sendToUser(user2Id, matchData2);

        console.log(`✓ Чат создан: ${chatId} между ${user1.name} и ${user2.name}`);

        // Проверяем достижения для обоих пользователей
        checkAndAwardAchievements(user1Id);
        checkAndAwardAchievements(user2Id);

        return true;
    } catch (error) {
        console.error('Ошибка сопоставления пользователей:', error);
        return false;
    }
}

// Функция поиска пары для конкретного пользователя (для обратной совместимости)
async function findMatch(userId) {
    await processSearchQueue();
}

// API Routes

// Функции проверки прав доступа
function hasAdminAccess(user) {
    if (!user) return false;
    return user.is_admin === 1 && (user.admin_role === 'super_admin' || user.admin_role === 'admin' || user.admin_role === 'moderator');
}

function hasSuperAdminAccess(user) {
    if (!user) return false;
    return user.is_admin === 1 && user.admin_role === 'super_admin';
}

function hasFullAdminAccess(user) {
    if (!user) return false;
    return user.is_admin === 1 && (user.admin_role === 'super_admin' || user.admin_role === 'admin');
}

function hasModeratorAccess(user) {
    if (!user) return false;
    return user.is_admin === 1 && (user.admin_role === 'moderator' || user.admin_role === 'admin' || user.admin_role === 'super_admin');
}

// Middleware для проверки прав администратора
async function requireAdmin(req, res, next) {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'Не указан ID пользователя' });
        }

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user || !hasAdminAccess(user)) {
            return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора.' });
        }

        req.adminUser = user;
        next();
    } catch (error) {
        console.error('Ошибка проверки прав администратора:', error);
        res.status(500).json({ error: 'Ошибка проверки прав доступа' });
    }
}

// Middleware для проверки прав супер-администратора
async function requireSuperAdmin(req, res, next) {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'Не указан ID пользователя' });
        }

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user || !hasSuperAdminAccess(user)) {
            return res.status(403).json({ error: 'Доступ запрещен. Требуются права главного администратора.' });
        }

        req.adminUser = user;
        next();
    } catch (error) {
        console.error('Ошибка проверки прав главного администратора:', error);
        res.status(500).json({ error: 'Ошибка проверки прав доступа' });
    }
}

// Регистрация пользователя
app.post('/api/users/register', async (req, res) => {
    try {
        const { name, age, gender, interests, telegram_id } = req.body;

        if (!name || !age || !gender || !interests || !Array.isArray(interests) || interests.length === 0) {
            return res.status(400).json({ error: 'Не все поля заполнены' });
        }

        // telegram_id обязателен для регистрации
        if (!telegram_id) {
            return res.status(400).json({ error: 'Telegram ID не получен. Убедитесь, что вы открыли приложение через Telegram.' });
        }

        // Нормализуем telegram_id (приводим к строке для единообразия и удаляем все пробелы)
        const normalizedTelegramId = String(telegram_id).trim().replace(/\s+/g, '');
        if (!normalizedTelegramId || normalizedTelegramId === 'null' || normalizedTelegramId === 'undefined') {
            return res.status(400).json({ error: 'Некорректный Telegram ID' });
        }

        console.log(`[REGISTER] Попытка регистрации пользователя с telegram_id: "${normalizedTelegramId}" (тип: ${typeof telegram_id}, оригинал: "${telegram_id}")`);

        // СТРОГАЯ ПРОВЕРКА: Ищем пользователя по telegram_id несколькими способами
        // 1. Точное совпадение нормализованного значения
        let existingUser = await dbGet('SELECT * FROM users WHERE telegram_id = ? COLLATE NOCASE', [normalizedTelegramId]);

        // 2. Если не нашли, пробуем найти по числовому значению (на случай если сохранено как число)
        if (!existingUser && !isNaN(normalizedTelegramId)) {
            existingUser = await dbGet('SELECT * FROM users WHERE CAST(telegram_id AS INTEGER) = ?', [parseInt(normalizedTelegramId)]);
        }

        // 3. Если все еще не нашли, пробуем найти по строковому представлению числа
        if (!existingUser && !isNaN(normalizedTelegramId)) {
            existingUser = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [parseInt(normalizedTelegramId).toString()]);
        }

        // Определяем роль администратора
        const SUPER_ADMIN_TELEGRAM_ID = '5394381166';
        let isAdmin = 0;
        let adminRole = null;

        // Если пользователь уже существует, сохраняем его текущую роль (если есть)
        if (existingUser && existingUser.admin_role) {
            adminRole = existingUser.admin_role;
            isAdmin = existingUser.is_admin || 0;
        } else {
            // Проверяем, является ли пользователь главным администратором
            if (normalizedTelegramId === SUPER_ADMIN_TELEGRAM_ID) {
                isAdmin = 1;
                adminRole = 'super_admin';
                console.log(`[REGISTER] Пользователь с telegram_id ${normalizedTelegramId} зарегистрирован как главный администратор`);
            } else {
                // Проверяем старый способ назначения администратора через переменную окружения
                const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID;
                if (ADMIN_TELEGRAM_ID && normalizedTelegramId === String(ADMIN_TELEGRAM_ID).trim().replace(/\s+/g, '')) {
                    isAdmin = 1;
                    adminRole = 'admin';
                    console.log(`[REGISTER] Пользователь с telegram_id ${normalizedTelegramId} зарегистрирован как администратор`);
                }
            }
        }

        // Логируем результат поиска
        if (existingUser) {
            console.log(`[REGISTER] ✓ Найден существующий пользователь:`);
            console.log(`  - telegram_id в БД: "${existingUser.telegram_id}"`);
            console.log(`  - telegram_id запроса: "${normalizedTelegramId}"`);
            console.log(`  - user_id: ${existingUser.id}`);
            console.log(`  - admin_role: ${adminRole || 'нет'}`);
        } else {
            console.log(`[REGISTER] ✗ Пользователь с telegram_id "${normalizedTelegramId}" не найден, создаем нового`);
        }

        let userId = null;
        if (existingUser) {
            // Обновляем существующего пользователя
            userId = existingUser.id;
            console.log(`[REGISTER] Обновляем данные пользователя ID: ${userId}`);

            // Убеждаемся, что telegram_id и роль установлены правильно (на случай если был NULL)
            await dbRun(
                'UPDATE users SET name = ?, age = ?, gender = ?, interests = ?, is_admin = ?, admin_role = ?, telegram_id = ? WHERE id = ?',
                [name, age, gender, JSON.stringify(interests), isAdmin, adminRole, normalizedTelegramId, userId]
            );
        } else {
            // Если пользователь не найден, создаем нового
            userId = uuidv4();
            console.log(`[REGISTER] Создаем нового пользователя:`);
            console.log(`  - user_id: ${userId}`);
            console.log(`  - telegram_id: "${normalizedTelegramId}"`);

            try {
                await dbRun(
                    'INSERT INTO users (id, name, age, gender, interests, coins, decorations, is_admin, is_system, admin_role, telegram_id) VALUES (?, ?, ?, ?, ?, 0, ?, ?, 0, ?, ?)',
                    [userId, name, age, gender, JSON.stringify(interests), JSON.stringify({}), isAdmin, adminRole, normalizedTelegramId]
                );
            } catch (insertError) {
                // Если ошибка уникальности индекса, значит пользователь все-таки существует
                if (insertError.message && insertError.message.includes('UNIQUE constraint')) {
                    console.log(`[REGISTER] Обнаружен конфликт уникальности, ищем пользователя снова...`);
                    existingUser = await dbGet('SELECT * FROM users WHERE telegram_id = ? COLLATE NOCASE', [normalizedTelegramId]);
                    if (existingUser) {
                        userId = existingUser.id;
                        console.log(`[REGISTER] Найден пользователь после конфликта, ID: ${userId}`);
                        await dbRun(
                            'UPDATE users SET name = ?, age = ?, gender = ?, interests = ?, is_admin = ?, admin_role = ?, telegram_id = ? WHERE id = ?',
                            [name, age, gender, JSON.stringify(interests), isAdmin, adminRole, normalizedTelegramId, userId]
                        );
                    } else {
                        throw insertError;
                    }
                } else {
                    throw insertError;
                }
            }
        }

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        user.interests = JSON.parse(user.interests);
        user.coins = user.coins || 0;
        user.decorations = user.decorations ? JSON.parse(user.decorations) : {};
        user.is_admin = user.is_admin || 0;

        // Создаем чат с администратором для нового пользователя (только если это не администратор)
        if (user.is_admin === 0) {
            const ADMIN_ID = 'system_admin_001';

            // Проверяем, нет ли уже чата с администратором (на случай повторной регистрации)
            const existingAdminChat = await dbGet(`
                SELECT id FROM chats 
                WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))
                LIMIT 1
            `, [userId, ADMIN_ID, ADMIN_ID, userId]);

            if (!existingAdminChat) {
                const adminChatId = uuidv4();
                await dbRun(
                    'INSERT INTO chats (id, user1_id, user2_id) VALUES (?, ?, ?)',
                    [adminChatId, userId, ADMIN_ID]
                );

                // Отправляем приветственное сообщение от администратора (только при регистрации)
                const welcomeMessageId = uuidv4();
                const welcomeText = 'Добро пожаловать! 👋 Я ваш администратор. Если у вас возникнут вопросы или проблемы, напишите мне здесь.';
                await dbRun(
                    'INSERT INTO messages (id, chat_id, user_id, text) VALUES (?, ?, ?, ?)',
                    [welcomeMessageId, adminChatId, ADMIN_ID, welcomeText]
                );
            }
        }

        res.json({ user });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка регистрации' });
    }
});

// Обновить имя пользователя
app.put('/api/users/:id/name', async (req, res) => {
    try {
        const userId = req.params.id;
        const { name } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'Имя не может быть пустым' });
        }

        if (name.trim().length > 50) {
            return res.status(400).json({ error: 'Имя не может быть длиннее 50 символов' });
        }

        const trimmedName = name.trim();

        // Проверяем существование пользователя
        const user = await dbGet('SELECT id FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Обновляем имя
        await dbRun('UPDATE users SET name = ? WHERE id = ?', [trimmedName, userId]);

        // Получаем обновленного пользователя
        const updatedUser = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        updatedUser.interests = updatedUser.interests ? JSON.parse(updatedUser.interests) : [];
        updatedUser.decorations = updatedUser.decorations ? JSON.parse(updatedUser.decorations) : {};

        console.log(`Имя пользователя ${userId} обновлено на "${trimmedName}"`);

        res.json({ user: updatedUser });
    } catch (error) {
        console.error('Ошибка обновления имени пользователя:', error);
        res.status(500).json({ error: 'Ошибка обновления имени пользователя' });
    }
});

// Получить пользователя по telegram_id (для отладки)
app.get('/api/users/by-telegram/:telegram_id', async (req, res) => {
    try {
        const telegramId = String(req.params.telegram_id).trim().replace(/\s+/g, '');

        // Ищем несколькими способами
        let user = await dbGet('SELECT * FROM users WHERE telegram_id = ? COLLATE NOCASE', [telegramId]);

        if (!user && !isNaN(telegramId)) {
            user = await dbGet('SELECT * FROM users WHERE CAST(telegram_id AS INTEGER) = ?', [parseInt(telegramId)]);
        }

        if (!user && !isNaN(telegramId)) {
            user = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [parseInt(telegramId).toString()]);
        }

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден', telegram_id: telegramId });
        }

        user.interests = JSON.parse(user.interests);
        user.coins = user.coins || 0;
        user.decorations = user.decorations ? JSON.parse(user.decorations) : {};
        res.json({ user, searched_telegram_id: telegramId });
    } catch (error) {
        console.error('Ошибка получения пользователя по telegram_id:', error);
        res.status(500).json({ error: 'Ошибка получения пользователя' });
    }
});

// Получить пользователя по ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.params.id]);

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        user.interests = JSON.parse(user.interests);
        user.coins = user.coins || 0;
        user.decorations = user.decorations ? JSON.parse(user.decorations) : {};
        res.json({ user });
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({ error: 'Ошибка получения пользователя' });
    }
});

// Получить чаты администратора (только с пользователями)
app.get('/api/admin/chats', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'Не указан ID пользователя' });
        }

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user || !hasModeratorAccess(user)) {
            return res.status(403).json({ error: 'Доступ запрещен. Требуются права модератора или выше.' });
        }

        const ADMIN_ID = 'system_admin_001';
        const chats = await dbAll(`
            SELECT c.*, 
                   u1.name as user1_name, u1.age as user1_age, u1.decorations as user1_decorations, u1.interests as user1_interests,
                   u2.name as user2_name, u2.age as user2_age, u2.decorations as user2_decorations, u2.interests as user2_interests
            FROM chats c
            JOIN users u1 ON c.user1_id = u1.id
            JOIN users u2 ON c.user2_id = u2.id
            WHERE (c.user1_id = ? OR c.user2_id = ?)
            ORDER BY c.updated_at DESC
        `, [ADMIN_ID, ADMIN_ID]);

        // Получаем последние сообщения для каждого чата
        const chatsWithMessages = await Promise.all(chats.map(async (chat) => {
            const lastMessage = await dbGet(`
                SELECT * FROM messages 
                WHERE chat_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            `, [chat.id]);

            const messageCount = await dbGet('SELECT COUNT(*) as count FROM messages WHERE chat_id = ?', [chat.id]);

            // Определяем пользователя (не администратора)
            const partnerId = chat.user1_id === ADMIN_ID ? chat.user2_id : chat.user1_id;
            const partnerName = chat.user1_id === ADMIN_ID ? chat.user2_name : chat.user1_name;
            const partnerAge = chat.user1_id === ADMIN_ID ? chat.user2_age : chat.user1_age;

            return {
                ...chat,
                lastMessage: lastMessage || null,
                messageCount: messageCount.count,
                is_completed: chat.is_completed === 1,
                partner_id: partnerId,
                partner_name: partnerName,
                partner_age: partnerAge,
                updated_at: chat.updated_at
            };
        }));

        res.json({ chats: chatsWithMessages });
    } catch (error) {
        console.error('Ошибка получения чатов администратора:', error);
        res.status(500).json({ error: 'Ошибка получения чатов администратора' });
    }
});

// Получить количество чатов пользователя (для определения бейджа)
app.get('/api/users/:id/chat-count', async (req, res) => {
    try {
        const { id } = req.params;
        const chatCount = await dbGet(
            'SELECT COUNT(*) as count FROM chats WHERE (user1_id = ? OR user2_id = ?) AND is_completed = 0',
            [id, id]
        );
        res.json({ count: chatCount.count || 0 });
    } catch (error) {
        console.error('Ошибка получения количества чатов:', error);
        res.status(500).json({ error: 'Ошибка получения количества чатов' });
    }
});

// Получить чаты пользователя
app.get('/api/users/:id/chats', async (req, res) => {
    try {
        const userId = req.params.id;
        const ADMIN_ID = 'system_admin_001';

        // Проверяем, существует ли пользователь
        const userExists = await dbGet('SELECT id FROM users WHERE id = ?', [userId]);
        if (!userExists) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Проверяем, есть ли чат с администратором для этого пользователя
        const adminChat = await dbGet(`
            SELECT id FROM chats 
            WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))
            LIMIT 1
        `, [userId, ADMIN_ID, ADMIN_ID, userId]);

        // Если чата с администратором нет, создаем его
        if (!adminChat) {
            const adminChatId = uuidv4();
            await dbRun(
                'INSERT INTO chats (id, user1_id, user2_id) VALUES (?, ?, ?)',
                [adminChatId, userId, ADMIN_ID]
            );

            // Проверяем, нет ли уже приветственного сообщения (защита от дублирования)
            const welcomeText = 'Добро пожаловать! 👋 Я ваш администратор. Если у вас возникнут вопросы или проблемы, напишите мне здесь.';
            const existingWelcome = await dbGet(`
                SELECT id FROM messages 
                WHERE chat_id = ? AND user_id = ? AND text = ?
                LIMIT 1
            `, [adminChatId, ADMIN_ID, welcomeText]);

            // Отправляем приветственное сообщение только если его еще нет
            if (!existingWelcome) {
                const welcomeMessageId = uuidv4();
                await dbRun(
                    'INSERT INTO messages (id, chat_id, user_id, text) VALUES (?, ?, ?, ?)',
                    [welcomeMessageId, adminChatId, ADMIN_ID, welcomeText]
                );
            }

            console.log(`Создан чат с администратором для пользователя ${userId}`);
        }

        const chats = await dbAll(`
            SELECT c.*, 
                   u1.name as user1_name, u1.age as user1_age, u1.decorations as user1_decorations, u1.interests as user1_interests,
                   u2.name as user2_name, u2.age as user2_age, u2.decorations as user2_decorations, u2.interests as user2_interests
            FROM chats c
            JOIN users u1 ON c.user1_id = u1.id
            JOIN users u2 ON c.user2_id = u2.id
            WHERE c.user1_id = ? OR c.user2_id = ?
            ORDER BY c.updated_at DESC
        `, [userId, userId]);

        // Добавляем decorations партнера к каждому чату
        const chatsWithDecorations = chats.map(chat => {
            const partnerId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;
            const partnerDecorations = chat.user1_id === userId
                ? (chat.user2_decorations ? JSON.parse(chat.user2_decorations) : {})
                : (chat.user1_decorations ? JSON.parse(chat.user1_decorations) : {});

            return {
                ...chat,
                partner_decorations: partnerDecorations
            };
        });

        // Получаем последние сообщения для каждого чата
        const chatsWithMessages = await Promise.all(chatsWithDecorations.map(async (chat) => {
            const lastMessage = await dbGet(`
                SELECT * FROM messages 
                WHERE chat_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            `, [chat.id]);

            const messageCount = await dbGet('SELECT COUNT(*) as count FROM messages WHERE chat_id = ?', [chat.id]);

            return {
                ...chat,
                lastMessage: lastMessage || null,
                messageCount: messageCount.count,
                is_completed: chat.is_completed === 1
            };
        }));

        res.json({ chats: chatsWithMessages });
    } catch (error) {
        console.error('Ошибка получения чатов:', error);
        res.status(500).json({ error: 'Ошибка получения чатов' });
    }
});

// Создать чат
app.post('/api/chats', async (req, res) => {
    try {
        const { user1Id, user2Id } = req.body;

        if (!user1Id || !user2Id) {
            return res.status(400).json({ error: 'Не указаны пользователи' });
        }

        const chatId = uuidv4();
        await dbRun('INSERT INTO chats (id, user1_id, user2_id) VALUES (?, ?, ?)', [chatId, user1Id, user2Id]);

        const chat = await dbGet('SELECT * FROM chats WHERE id = ?', [chatId]);
        res.json({ chat });
    } catch (error) {
        console.error('Ошибка создания чата:', error);
        res.status(500).json({ error: 'Ошибка создания чата' });
    }
});

// Завершить чат
app.post('/api/chats/:id/end', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Не указан пользователь' });
        }

        // Проверяем, что пользователь является участником чата
        const chat = await dbGet('SELECT user1_id, user2_id, is_completed FROM chats WHERE id = ?', [req.params.id]);
        if (!chat) {
            return res.status(404).json({ error: 'Чат не найден' });
        }

        if (chat.user1_id !== userId && chat.user2_id !== userId) {
            return res.status(403).json({ error: 'Вы не являетесь участником этого чата' });
        }

        if (chat.is_completed) {
            return res.status(400).json({ error: 'Чат уже завершен' });
        }

        // Помечаем чат как завершенный
        await dbRun(
            'UPDATE chats SET is_completed = 1, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
            [req.params.id]
        );

        // Обновляем прогресс заданий для завершения чатов для обоих пользователей
        try {
            for (const userId of [chat.user1_id, chat.user2_id]) {
                await updateQuestProgressForUser(userId, 'complete_chats', 1);
            }
        } catch (error) {
            console.error('Ошибка обновления прогресса заданий при завершении чата:', error);
        }

        // Проверяем достижения для обоих пользователей
        checkAndAwardAchievements(chat.user1_id);
        checkAndAwardAchievements(chat.user2_id);

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка завершения чата:', error);
        res.status(500).json({ error: 'Ошибка завершения чата' });
    }
});

// Получить сообщения чата
app.get('/api/chats/:id/messages', async (req, res) => {
    try {
        const messages = await dbAll(`
            SELECT m.*, u.name as username, u.decorations as user_decorations
            FROM messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.chat_id = ?
            ORDER BY m.created_at ASC
        `, [req.params.id]);

        // Парсим decorations для каждого сообщения
        const messagesWithDecorations = messages.map(msg => ({
            ...msg,
            decorations: msg.user_decorations ? JSON.parse(msg.user_decorations) : {}
        }));

        // Получаем информацию о завершенности чата
        const chat = await dbGet('SELECT is_completed FROM chats WHERE id = ?', [req.params.id]);

        res.json({
            messages: messagesWithDecorations,
            isCompleted: chat ? chat.is_completed === 1 : false
        });
    } catch (error) {
        console.error('Ошибка получения сообщений:', error);
        res.status(500).json({ error: 'Ошибка получения сообщений' });
    }
});

// Отправить сообщение
app.post('/api/chats/:id/messages', async (req, res) => {
    try {
        const { userId, text, replyToId } = req.body;

        if (!userId || !text) {
            return res.status(400).json({ error: 'Не указаны пользователь или текст сообщения' });
        }

        // Проверяем, завершен ли чат и получаем информацию о пользователях
        const chat = await dbGet('SELECT is_completed, user1_id, user2_id FROM chats WHERE id = ?', [req.params.id]);
        if (!chat) {
            return res.status(404).json({ error: 'Чат не найден' });
        }

        if (chat.is_completed) {
            return res.status(403).json({ error: 'Чат был завершен' });
        }

        // Получаем информацию об ответе, если есть
        let replyData = null;
        if (replyToId) {
            const replyMessage = await dbGet(`
                SELECT m.*, u.name as username
                FROM messages m
                JOIN users u ON m.user_id = u.id
                WHERE m.id = ? AND m.chat_id = ?
            `, [replyToId, req.params.id]);
            if (replyMessage) {
                replyData = {
                    id: replyMessage.id,
                    username: replyMessage.username,
                    text: replyMessage.text
                };
            }
        }

        const messageId = uuidv4();
        await dbRun(
            'INSERT INTO messages (id, chat_id, user_id, text, reply_to) VALUES (?, ?, ?, ?, ?)',
            [messageId, req.params.id, userId, text, replyToId || null]
        );

        // Обновляем время обновления чата
        await dbRun('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);

        const message = await dbGet(`
            SELECT m.*, u.name as username
            FROM messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.id = ?
        `, [messageId]);

        // Добавляем информацию об ответе в сообщение
        if (replyData) {
            message.reply = replyData;
        }

        // Отправляем сообщение через WebSocket
        const partnerId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;
        sendToUser(partnerId, {
            type: 'new_message',
            message: {
                ...message,
                chat_id: req.params.id
            }
        });

        // Обновляем прогресс заданий для отправки сообщений
        try {
            // Создаем записи прогресса для новых заданий
            // Находим задания, для которых еще нет записей прогресса
            const newQuests = await dbAll(`
                SELECT q.id as quest_id
                FROM quests q
                WHERE q.quest_type = 'send_messages' AND q.is_active = 1
                AND NOT EXISTS (
                    SELECT 1 FROM user_quests uq 
                    WHERE uq.user_id = ? AND uq.quest_id = q.id
                )
            `, [userId]);

            // Создаем записи по одной с уникальными ID
            for (const quest of newQuests) {
                await dbRun(
                    'INSERT INTO user_quests (id, user_id, quest_id, progress) VALUES (?, ?, ?, ?)',
                    [uuidv4(), userId, quest.quest_id, 1]
                );
            }

            // Обновляем прогресс существующих заданий
            await dbRun(`
                UPDATE user_quests 
                SET progress = progress + 1
                WHERE user_id = ? 
                AND quest_id IN (
                    SELECT id FROM quests 
                    WHERE quest_type = 'send_messages' AND is_active = 1
                )
                AND completed = 0
                AND progress < (
                    SELECT target_value FROM quests WHERE id = user_quests.quest_id
                )
            `, [userId]);

            // Проверяем завершение заданий
            const completedQuests = await dbAll(`
                SELECT uq.id, uq.quest_id, q.target_value, uq.progress
                FROM user_quests uq
                JOIN quests q ON uq.quest_id = q.id
                WHERE uq.user_id = ? 
                AND q.quest_type = 'send_messages' 
                AND q.is_active = 1
                AND uq.completed = 0
                AND uq.progress >= q.target_value
            `, [userId]);

            for (const quest of completedQuests) {
                await dbRun(
                    'UPDATE user_quests SET completed = 1, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [quest.id]
                );
            }
        } catch (error) {
            console.error('Ошибка обновления прогресса заданий при отправке сообщения:', error);
        }

        res.json({ message });
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        res.status(500).json({ error: 'Ошибка отправки сообщения' });
    }
});

// Добавить рейтинг
app.post('/api/ratings', async (req, res) => {
    try {
        const { userId, ratedUserId, rating } = req.body;

        if (!userId || !ratedUserId || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Неверные данные рейтинга' });
        }

        const ratingId = uuidv4();
        await dbRun(
            'INSERT OR REPLACE INTO ratings (id, user_id, rated_user_id, rating) VALUES (?, ?, ?, ?)',
            [ratingId, userId, ratedUserId, rating]
        );

        // Обновляем средний рейтинг пользователя
        const avgRating = await dbGet(`
            SELECT AVG(rating) as avg, COUNT(*) as count
            FROM ratings
            WHERE rated_user_id = ?
        `, [ratedUserId]);

        await dbRun(
            'UPDATE users SET rating_average = ?, rating_count = ? WHERE id = ?',
            [avgRating.avg || 0, avgRating.count || 0, ratedUserId]
        );

        // Проверяем достижения для пользователя, получившего рейтинг
        checkAndAwardAchievements(ratedUserId);

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка добавления рейтинга:', error);
        res.status(500).json({ error: 'Ошибка добавления рейтинга' });
    }
});

// Получить рейтинг пользователя
app.get('/api/users/:id/rating', async (req, res) => {
    try {
        const user = await dbGet('SELECT rating_average, rating_count FROM users WHERE id = ?', [req.params.id]);

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json({
            average: user.rating_average || 0,
            count: user.rating_count || 0
        });
    } catch (error) {
        console.error('Ошибка получения рейтинга:', error);
        res.status(500).json({ error: 'Ошибка получения рейтинга' });
    }
});

// ========== ЕЖЕДНЕВНЫЕ БОНУСЫ ==========
// Проверить и выдать ежедневный бонус
app.post('/api/daily-bonus/check', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'Не указан пользователь' });
        }

        const today = new Date().toISOString().split('T')[0];

        // Проверяем, получал ли пользователь бонус сегодня
        const existingBonus = await dbGet(
            'SELECT * FROM daily_bonuses WHERE user_id = ? AND bonus_date = ?',
            [userId, today]
        );

        if (existingBonus) {
            return res.json({
                already_claimed: true,
                coins_reward: existingBonus.coins_reward,
                streak_days: existingBonus.streak_days
            });
        }

        // Получаем последний бонус для расчета серии
        const lastBonus = await dbGet(
            'SELECT * FROM daily_bonuses WHERE user_id = ? ORDER BY bonus_date DESC LIMIT 1',
            [userId]
        );

        let streakDays = 1;
        if (lastBonus) {
            const lastDate = new Date(lastBonus.bonus_date);
            const todayDate = new Date(today);
            const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Продолжение серии
                streakDays = lastBonus.streak_days + 1;
            } else if (diffDays > 1) {
                // Серия прервана
                streakDays = 1;
            }
        }

        // Рассчитываем награду (базовая + бонус за серию)
        const baseReward = 10;
        const streakBonus = Math.min(streakDays - 1, 5) * 2; // Максимум +10 за серию
        const coinsReward = baseReward + streakBonus;

        // Выдаем бонус
        const bonusId = uuidv4();
        await dbRun(
            'INSERT INTO daily_bonuses (id, user_id, bonus_date, coins_reward, streak_days) VALUES (?, ?, ?, ?, ?)',
            [bonusId, userId, today, coinsReward, streakDays]
        );

        // Обновляем баланс пользователя
        await dbRun('UPDATE users SET coins = coins + ? WHERE id = ?', [coinsReward, userId]);

        // Записываем активность
        const activityId = uuidv4();
        await dbRun(
            'INSERT INTO user_activity (id, user_id, activity_type) VALUES (?, ?, ?)',
            [activityId, userId, 'daily_bonus_claimed']
        );

        res.json({
            already_claimed: false,
            coins_reward: coinsReward,
            streak_days: streakDays
        });
    } catch (error) {
        console.error('Ошибка проверки ежедневного бонуса:', error);
        res.status(500).json({ error: 'Ошибка проверки ежедневного бонуса' });
    }
});

// Получить информацию о ежедневном бонусе
app.get('/api/daily-bonus/info/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const today = new Date().toISOString().split('T')[0];

        const todayBonus = await dbGet(
            'SELECT * FROM daily_bonuses WHERE user_id = ? AND bonus_date = ?',
            [userId, today]
        );

        const lastBonus = await dbGet(
            'SELECT * FROM daily_bonuses WHERE user_id = ? ORDER BY bonus_date DESC LIMIT 1',
            [userId]
        );

        res.json({
            claimed_today: !!todayBonus,
            streak_days: lastBonus ? lastBonus.streak_days : 0,
            last_claim_date: lastBonus ? lastBonus.bonus_date : null
        });
    } catch (error) {
        console.error('Ошибка получения информации о бонусе:', error);
        res.status(500).json({ error: 'Ошибка получения информации о бонусе' });
    }
});

// ========== ЗАДАНИЯ ==========
// Получить все задания
app.get('/api/quests', async (req, res) => {
    try {
        const quests = await dbAll('SELECT * FROM quests WHERE is_active = 1');
        res.json({ quests });
    } catch (error) {
        console.error('Ошибка получения заданий:', error);
        res.status(500).json({ error: 'Ошибка получения заданий' });
    }
});

// Получить задания пользователя
app.get('/api/quests/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const userQuests = await dbAll(`
            SELECT q.*, uq.progress, uq.completed, uq.completed_at
            FROM quests q
            LEFT JOIN user_quests uq ON q.id = uq.quest_id AND uq.user_id = ?
            WHERE q.is_active = 1
            ORDER BY uq.completed ASC, q.is_daily DESC, q.created_at ASC
        `, [userId]);

        res.json({ quests: userQuests });
    } catch (error) {
        console.error('Ошибка получения заданий пользователя:', error);
        res.status(500).json({ error: 'Ошибка получения заданий пользователя' });
    }
});

// Обновить прогресс задания
app.post('/api/quests/progress', async (req, res) => {
    try {
        const { userId, questType, value } = req.body;
        if (!userId || !questType) {
            return res.status(400).json({ error: 'Не указаны параметры' });
        }

        // Находим задания соответствующего типа
        const quests = await dbAll('SELECT * FROM quests WHERE quest_type = ? AND is_active = 1', [questType]);

        for (const quest of quests) {
            // Получаем или создаем запись прогресса
            let userQuest = await dbGet(
                'SELECT * FROM user_quests WHERE user_id = ? AND quest_id = ?',
                [userId, quest.id]
            );

            if (!userQuest) {
                const userQuestId = uuidv4();
                await dbRun(
                    'INSERT INTO user_quests (id, user_id, quest_id, progress) VALUES (?, ?, ?, ?)',
                    [userQuestId, userId, quest.id, value]
                );
                userQuest = { progress: value, completed: 0 };
            } else if (userQuest.completed === 0) {
                // Обновляем прогресс только если задание не завершено
                const newProgress = Math.min(userQuest.progress + value, quest.target_value);
                await dbRun(
                    'UPDATE user_quests SET progress = ? WHERE id = ?',
                    [newProgress, userQuest.id]
                );
                userQuest.progress = newProgress;
            }

            // Проверяем, выполнено ли задание
            const finalProgress = userQuest ? userQuest.progress : value;
            if (finalProgress >= quest.target_value && userQuest && userQuest.completed === 0) {
                await dbRun(
                    'UPDATE user_quests SET completed = 1, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [userQuest.id]
                );
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка обновления прогресса задания:', error);
        res.status(500).json({ error: 'Ошибка обновления прогресса задания' });
    }
});

// Вспомогательная функция для обновления прогресса заданий
async function updateQuestProgressForUser(userId, questType, value = 1) {
    try {
        // Находим задания соответствующего типа
        const quests = await dbAll('SELECT * FROM quests WHERE quest_type = ? AND is_active = 1', [questType]);

        for (const quest of quests) {
            // Получаем или создаем запись прогресса
            let userQuest = await dbGet(
                'SELECT * FROM user_quests WHERE user_id = ? AND quest_id = ?',
                [userId, quest.id]
            );

            if (!userQuest) {
                const userQuestId = uuidv4();
                const initialProgress = Math.min(value, quest.target_value);
                await dbRun(
                    'INSERT INTO user_quests (id, user_id, quest_id, progress) VALUES (?, ?, ?, ?)',
                    [userQuestId, userId, quest.id, initialProgress]
                );
                userQuest = { id: userQuestId, progress: initialProgress, completed: 0 };
            } else if (userQuest.completed === 0) {
                // Обновляем прогресс только если задание не завершено
                const newProgress = Math.min(userQuest.progress + value, quest.target_value);
                await dbRun(
                    'UPDATE user_quests SET progress = ? WHERE id = ?',
                    [newProgress, userQuest.id]
                );
                userQuest.progress = newProgress;
            }

            // Проверяем, выполнено ли задание
            if (userQuest.progress >= quest.target_value && userQuest.completed === 0) {
                await dbRun(
                    'UPDATE user_quests SET completed = 1, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [userQuest.id]
                );
            }
        }
    } catch (error) {
        console.error('Ошибка обновления прогресса заданий:', error);
        throw error;
    }
}

// Забрать награду за задание
app.post('/api/quests/:questId/claim', async (req, res) => {
    try {
        const { questId } = req.params;
        const { userId } = req.body;

        const userQuest = await dbGet(
            'SELECT uq.*, q.reward_coins FROM user_quests uq JOIN quests q ON uq.quest_id = q.id WHERE uq.user_id = ? AND uq.quest_id = ?',
            [userId, questId]
        );

        if (!userQuest || userQuest.completed === 0) {
            return res.status(400).json({ error: 'Задание не выполнено' });
        }

        // Выдаем награду
        await dbRun('UPDATE users SET coins = coins + ? WHERE id = ?', [userQuest.reward_coins, userId]);

        res.json({
            success: true,
            coins_reward: userQuest.reward_coins
        });
    } catch (error) {
        console.error('Ошибка получения награды:', error);
        res.status(500).json({ error: 'Ошибка получения награды' });
    }
});

// ========== БЕЙДЖИ И ТИТУЛЫ ==========
// Получить все бейджи
app.get('/api/badges', async (req, res) => {
    try {
        const badges = await dbAll('SELECT * FROM badges ORDER BY badge_type, created_at');
        res.json({ badges });
    } catch (error) {
        console.error('Ошибка получения бейджей:', error);
        res.status(500).json({ error: 'Ошибка получения бейджей' });
    }
});

// Получить бейджи пользователя
app.get('/api/badges/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const badges = await dbAll(`
            SELECT b.*, ub.is_active, ub.unlocked_at
            FROM badges b
            LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = ?
            WHERE ub.id IS NOT NULL
            ORDER BY ub.is_active DESC, ub.unlocked_at DESC
        `, [userId]);

        res.json({ badges });
    } catch (error) {
        console.error('Ошибка получения бейджей пользователя:', error);
        res.status(500).json({ error: 'Ошибка получения бейджей пользователя' });
    }
});

// ========== ИМЕННЫЕ БЕЙДЖИ ==========
// Получить именной бейдж пользователя
app.get('/api/users/:userId/custom-badge', async (req, res) => {
    try {
        const { userId } = req.params;
        const badge = await dbGet(
            'SELECT * FROM custom_badges WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [userId]
        );
        res.json({ badge: badge || null });
    } catch (error) {
        console.error('Ошибка получения именного бейджа:', error);
        res.status(500).json({ error: 'Ошибка получения именного бейджа' });
    }
});

// Создать именной бейдж
app.post('/api/users/:userId/custom-badge', async (req, res) => {
    try {
        const { userId } = req.params;
        const { badge_text, badge_color } = req.body;

        if (!badge_text || badge_text.trim().length === 0) {
            return res.status(400).json({ error: 'Текст бейджа не может быть пустым' });
        }

        if (badge_text.length > 20) {
            return res.status(400).json({ error: 'Текст бейджа не должен превышать 20 символов' });
        }

        // Проверяем, что пользователь купил товар "Именной бейдж"
        const userItem = await dbGet(
            'SELECT * FROM user_items WHERE user_id = ? AND item_id = ?',
            [userId, 'custom_badge']
        );

        if (!userItem) {
            return res.status(400).json({ error: 'Сначала нужно купить товар "Именной бейдж" в магазине' });
        }

        // Деактивируем старый бейдж если есть
        await dbRun(
            'UPDATE custom_badges SET is_active = 0 WHERE user_id = ?',
            [userId]
        );

        // Создаем новый бейдж
        const badgeId = uuidv4();
        await dbRun(
            'INSERT INTO custom_badges (id, user_id, badge_text, badge_color, is_active) VALUES (?, ?, ?, ?, ?)',
            [badgeId, userId, badge_text.trim(), badge_color || '#4caf50', 1]
        );

        res.json({ success: true, badge: { id: badgeId, badge_text, badge_color } });
    } catch (error) {
        console.error('Ошибка создания именного бейджа:', error);
        res.status(500).json({ error: 'Ошибка создания именного бейджа' });
    }
});

// Получить активный титул пользователя
app.get('/api/badges/user/:userId/active-title', async (req, res) => {
    try {
        const { userId } = req.params;

        const title = await dbGet(`
            SELECT b.* FROM badges b
            JOIN user_badges ub ON b.id = ub.badge_id
            WHERE ub.user_id = ? AND ub.is_active = 1 AND b.badge_type = 'title'
            LIMIT 1
        `, [userId]);

        res.json({ title: title || null });
    } catch (error) {
        console.error('Ошибка получения титула:', error);
        res.status(500).json({ error: 'Ошибка получения титула' });
    }
});

// Установить активный титул
app.post('/api/badges/:badgeId/set-active', async (req, res) => {
    try {
        const { badgeId } = req.params;
        const { userId } = req.body;

        // Проверяем, что бейдж принадлежит пользователю и является титулом
        const badge = await dbGet(
            'SELECT * FROM badges WHERE id = ? AND badge_type = ?',
            [badgeId, 'title']
        );

        if (!badge) {
            return res.status(404).json({ error: 'Титул не найден' });
        }

        const userBadge = await dbGet(
            'SELECT * FROM user_badges WHERE user_id = ? AND badge_id = ?',
            [userId, badgeId]
        );

        if (!userBadge) {
            return res.status(400).json({ error: 'Титул не разблокирован' });
        }

        // Снимаем активность с других титулов
        await dbRun(`
            UPDATE user_badges SET is_active = 0
            WHERE user_id = ? AND badge_id IN (
                SELECT id FROM badges WHERE badge_type = 'title'
            )
        `, [userId]);

        // Устанавливаем активный титул
        await dbRun(
            'UPDATE user_badges SET is_active = 1 WHERE user_id = ? AND badge_id = ?',
            [userId, badgeId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка установки титула:', error);
        res.status(500).json({ error: 'Ошибка установки титула' });
    }
});

// ========== СТАТУСЫ ПОЛЬЗОВАТЕЛЕЙ ==========
// Обновить статус пользователя
app.post('/api/users/:userId/status', async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        if (!['online', 'away', 'busy', 'offline'].includes(status)) {
            return res.status(400).json({ error: 'Неверный статус' });
        }

        // Проверяем, существует ли пользователь
        const userExists = await dbGet('SELECT id FROM users WHERE id = ?', [userId]);
        if (!userExists) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        await dbRun(`
            INSERT OR REPLACE INTO user_statuses (user_id, status, last_seen)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `, [userId, status]);

        // Записываем активность
        const activityId = uuidv4();
        await dbRun(
            'INSERT INTO user_activity (id, user_id, activity_type) VALUES (?, ?, ?)',
            [activityId, userId, `status_${status}`]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        res.status(500).json({ error: 'Ошибка обновления статуса' });
    }
});

// Получить статус пользователя
app.get('/api/users/:userId/status', async (req, res) => {
    try {
        const { userId } = req.params;

        const status = await dbGet(
            'SELECT * FROM user_statuses WHERE user_id = ?',
            [userId]
        );

        res.json({
            status: status ? status.status : 'offline',
            last_seen: status ? status.last_seen : null
        });
    } catch (error) {
        console.error('Ошибка получения статуса:', error);
        res.status(500).json({ error: 'Ошибка получения статуса' });
    }
});

// Получить историю активности пользователя
app.get('/api/users/:userId/activity', async (req, res) => {
    try {
        const { userId } = req.params;

        const activity = await dbAll(
            'SELECT * FROM user_activity WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
        );

        res.json({ activity });
    } catch (error) {
        console.error('Ошибка получения истории активности:', error);
        res.status(500).json({ error: 'Ошибка получения истории активности' });
    }
});

// Получить последнее время активности
app.get('/api/users/:userId/last-seen', async (req, res) => {
    try {
        const { userId } = req.params;

        const lastSeen = await dbGet(
            'SELECT last_seen FROM user_statuses WHERE user_id = ?',
            [userId]
        );

        res.json({ last_seen: lastSeen ? lastSeen.last_seen : null });
    } catch (error) {
        console.error('Ошибка получения времени активности:', error);
        res.status(500).json({ error: 'Ошибка получения времени активности' });
    }
});

// ========== ПОДАРКИ В ЧАТЕ ==========
// Отправить подарок в чате
app.post('/api/chats/:chatId/gifts', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { fromUserId, toUserId, itemId, message } = req.body;

        console.log('Получен запрос на отправку подарка:', {
            chatId,
            fromUserId,
            toUserId,
            itemId,
            message: message ? 'есть' : 'нет',
            body: req.body
        });

        if (!fromUserId || !toUserId || !itemId) {
            console.error('Отсутствуют обязательные параметры:', {
                fromUserId: !!fromUserId,
                toUserId: !!toUserId,
                itemId: !!itemId
            });
            return res.status(400).json({ error: 'Не указаны параметры' });
        }

        // Проверяем, что пользователь владеет товаром
        const userItem = await dbGet(
            'SELECT * FROM user_items WHERE user_id = ? AND item_id = ?',
            [fromUserId, itemId]
        );

        if (!userItem) {
            return res.status(400).json({ error: 'Товар не найден в вашей коллекции' });
        }

        // Получаем информацию о товаре
        const item = await dbGet('SELECT * FROM shop_items WHERE id = ?', [itemId]);
        if (!item) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        // Создаем подарок
        const giftId = uuidv4();
        await dbRun(
            'INSERT INTO chat_gifts (id, chat_id, from_user_id, to_user_id, item_id, message) VALUES (?, ?, ?, ?, ?, ?)',
            [giftId, chatId, fromUserId, toUserId, itemId, message || null]
        );

        // Создаем сообщение о подарке
        const messageId = uuidv4();
        await dbRun(
            'INSERT INTO messages (id, chat_id, user_id, text, gift_id) VALUES (?, ?, ?, ?, ?)',
            [messageId, chatId, fromUserId, `🎁 Подарок: ${item.name}`, giftId]
        );

        // Удаляем товар из коллекции отправителя
        await dbRun(
            'DELETE FROM user_items WHERE user_id = ? AND item_id = ?',
            [fromUserId, itemId]
        );
        console.log('Товар удален из коллекции отправителя:', { fromUserId, itemId });

        // Обновляем decorations отправителя после удаления товара
        const senderActiveItems = await dbAll(`
            SELECT si.item_type, si.item_value
            FROM user_items ui
            JOIN shop_items si ON ui.item_id = si.id
            WHERE ui.user_id = ? AND ui.is_active = 1
        `, [fromUserId]);

        const senderDecorations = {};
        senderActiveItems.forEach(item => {
            if (!senderDecorations[item.item_type]) {
                senderDecorations[item.item_type] = [];
            }
            senderDecorations[item.item_type].push(item.item_value);
        });

        await dbRun(
            'UPDATE users SET decorations = ? WHERE id = ?',
            [JSON.stringify(senderDecorations), fromUserId]
        );
        console.log('Decorations отправителя обновлены:', senderDecorations);

        // Добавляем товар получателю (если его еще нет)
        const existingItem = await dbGet(
            'SELECT * FROM user_items WHERE user_id = ? AND item_id = ?',
            [toUserId, itemId]
        );

        if (!existingItem) {
            const newUserItemId = uuidv4();
            await dbRun(
                'INSERT INTO user_items (id, user_id, item_id, is_active) VALUES (?, ?, ?, ?)',
                [newUserItemId, toUserId, itemId, 0]
            );
            console.log('Товар добавлен получателю:', { toUserId, itemId });
        } else {
            console.log('Товар уже есть у получателя:', { toUserId, itemId });
        }

        // Отправляем уведомление через WebSocket (если пользователь онлайн)
        try {
            sendToUser(toUserId, {
                type: 'new_message',
                message: {
                    id: messageId,
                    chat_id: chatId,
                    user_id: fromUserId,
                    text: `🎁 Подарок: ${item.name}`,
                    gift_id: giftId,
                    created_at: new Date().toISOString()
                }
            });
        } catch (wsError) {
            console.error('Ошибка отправки WebSocket уведомления:', wsError);
            // Не прерываем выполнение, если WebSocket недоступен
        }

        res.json({
            success: true,
            gift: {
                id: giftId,
                item: item,
                message: message || null
            }
        });
    } catch (error) {
        console.error('Ошибка отправки подарка:', error);
        console.error('Стек ошибки:', error.stack);
        res.status(500).json({
            error: 'Ошибка отправки подарка',
            details: error.message
        });
    }
});

// Получить информацию о подарке
app.get('/api/chats/:chatId/gifts/:giftId', async (req, res) => {
    try {
        const { giftId } = req.params;

        const gift = await dbGet(`
            SELECT cg.*, si.name, si.icon, si.description, si.rarity
            FROM chat_gifts cg
            JOIN shop_items si ON cg.item_id = si.id
            WHERE cg.id = ?
        `, [giftId]);

        if (!gift) {
            return res.status(404).json({ error: 'Подарок не найден' });
        }

        res.json({
            gift: {
                id: gift.id,
                item: {
                    id: gift.item_id,
                    name: gift.name,
                    icon: gift.icon,
                    description: gift.description,
                    rarity: gift.rarity
                },
                message: gift.message
            }
        });
    } catch (error) {
        console.error('Ошибка получения информации о подарке:', error);
        res.status(500).json({ error: 'Ошибка получения информации о подарке' });
    }
});

// Начать поиск
app.post('/api/search/start', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Не указан пользователь' });
        }

        await dbRun('INSERT OR REPLACE INTO search_queue (user_id) VALUES (?)', [userId]);
        console.log(`API: Пользователь ${userId} добавлен в очередь поиска`);

        // Пытаемся найти пару для всех пользователей в очереди
        await processSearchQueue();

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка начала поиска:', error);
        res.status(500).json({ error: 'Ошибка начала поиска' });
    }
});

// Остановить поиск
app.post('/api/search/stop', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Не указан пользователь' });
        }

        await dbRun('DELETE FROM search_queue WHERE user_id = ?', [userId]);

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка остановки поиска:', error);
        res.status(500).json({ error: 'Ошибка остановки поиска' });
    }
});

// Статистика (для админ-панели)
app.get('/api/stats', async (req, res) => {
    try {
        const totalUsers = await dbGet('SELECT COUNT(*) as count FROM users WHERE is_system = 0');
        const totalChats = await dbGet('SELECT COUNT(*) as count FROM chats');
        const totalMessages = await dbGet('SELECT COUNT(*) as count FROM messages');
        const totalRatings = await dbGet('SELECT COUNT(*) as count FROM ratings');
        const usersInQueue = await dbGet('SELECT COUNT(*) as count FROM search_queue');

        const activeChats = await dbGet('SELECT COUNT(DISTINCT chat_id) as count FROM messages');

        const avgRating = await dbGet('SELECT AVG(rating_average) as avg FROM users WHERE rating_count > 0 AND is_system = 0');

        res.json({
            totalUsers: totalUsers.count,
            totalChats: totalChats.count,
            activeChats: activeChats.count,
            totalMessages: totalMessages.count,
            totalRatings: totalRatings.count,
            usersInQueue: usersInQueue.count,
            avgRating: parseFloat((avgRating.avg || 0).toFixed(2))
        });
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ error: 'Ошибка получения статистики' });
    }
});

// Получить всех пользователей (для админ-панели)
app.get('/api/admin/users', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'Не указан ID пользователя' });
        }

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user || !hasFullAdminAccess(user)) {
            return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора или выше.' });
        }

        const users = await dbAll(`
            SELECT id, name, age, gender, interests, coins, rating_average, rating_count, 
                   decorations, created_at, is_admin, is_system
            FROM users 
            WHERE is_system = 0
            ORDER BY created_at DESC
        `);

        const usersWithParsed = users.map(user => ({
            ...user,
            interests: user.interests ? JSON.parse(user.interests) : [],
            decorations: user.decorations ? JSON.parse(user.decorations) : {},
            coins: user.coins || 0,
            rating_average: user.rating_average || 0,
            rating_count: user.rating_count || 0
        }));

        res.json({ users: usersWithParsed });
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ error: 'Ошибка получения пользователей' });
    }
});

// Обновить пользователя (для админ-панели)
app.put('/api/admin/users/:id', async (req, res) => {
    try {
        const { userId: adminUserId, rating_average, rating_count, coins } = req.body;
        const targetUserId = req.params.id;

        if (!adminUserId) {
            return res.status(400).json({ error: 'Не указан ID администратора' });
        }

        const adminUser = await dbGet('SELECT * FROM users WHERE id = ?', [adminUserId]);
        if (!adminUser || !hasFullAdminAccess(adminUser)) {
            return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора или выше.' });
        }

        // Проверяем существование пользователя
        const targetUser = await dbGet('SELECT id FROM users WHERE id = ? AND is_system = 0', [targetUserId]);
        if (!targetUser) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const updates = [];
        const values = [];

        if (rating_average !== undefined) {
            updates.push('rating_average = ?');
            values.push(rating_average);
        }

        if (rating_count !== undefined) {
            updates.push('rating_count = ?');
            values.push(rating_count);
        }

        if (coins !== undefined) {
            updates.push('coins = ?');
            values.push(coins);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }

        values.push(targetUserId);
        await dbRun(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        const updatedUser = await dbGet(`
            SELECT id, name, age, gender, interests, coins, rating_average, rating_count, 
                   decorations, created_at, is_admin, is_system
            FROM users WHERE id = ?
        `, [targetUserId]);

        updatedUser.interests = updatedUser.interests ? JSON.parse(updatedUser.interests) : [];
        updatedUser.decorations = updatedUser.decorations ? JSON.parse(updatedUser.decorations) : {};

        res.json({ user: updatedUser });
    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        res.status(500).json({ error: 'Ошибка обновления пользователя' });
    }
});

// Удалить пользователя (для админ-панели)
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        const { userId: adminUserId } = req.body;
        const targetUserId = req.params.id;

        if (!adminUserId) {
            return res.status(400).json({ error: 'Не указан ID администратора' });
        }

        const adminUser = await dbGet('SELECT * FROM users WHERE id = ?', [adminUserId]);
        if (!adminUser || !hasFullAdminAccess(adminUser)) {
            return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора или выше.' });
        }

        // Проверяем существование пользователя
        const targetUser = await dbGet('SELECT id FROM users WHERE id = ? AND is_system = 0', [targetUserId]);
        if (!targetUser) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Удаляем пользователя и связанные данные
        await dbRun('DELETE FROM user_items WHERE user_id = ?', [targetUserId]);
        await dbRun('DELETE FROM ratings WHERE user_id = ? OR rated_user_id = ?', [targetUserId, targetUserId]);
        await dbRun('DELETE FROM search_queue WHERE user_id = ?', [targetUserId]);
        await dbRun('DELETE FROM messages WHERE user_id = ?', [targetUserId]);

        // Удаляем чаты пользователя
        const userChats = await dbAll('SELECT id FROM chats WHERE user1_id = ? OR user2_id = ?', [targetUserId, targetUserId]);
        for (const chat of userChats) {
            await dbRun('DELETE FROM messages WHERE chat_id = ?', [chat.id]);
        }
        await dbRun('DELETE FROM chats WHERE user1_id = ? OR user2_id = ?', [targetUserId, targetUserId]);

        await dbRun('DELETE FROM users WHERE id = ?', [targetUserId]);

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        res.status(500).json({ error: 'Ошибка удаления пользователя' });
    }
});

// Функция проверки и начисления достижений
async function checkAndAwardAchievements(userId) {
    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) return;

        // Получаем все достижения
        const achievements = await dbAll('SELECT * FROM achievements');

        // Получаем уже разблокированные достижения
        const unlockedAchievements = await dbAll(
            'SELECT achievement_id FROM user_achievements WHERE user_id = ?',
            [userId]
        );
        const unlockedIds = new Set(unlockedAchievements.map(ua => ua.achievement_id));

        for (const achievement of achievements) {
            if (unlockedIds.has(achievement.id)) continue;

            let conditionMet = false;

            switch (achievement.condition_type) {
                case 'first_chat':
                    const chatCount = await dbGet(
                        'SELECT COUNT(*) as count FROM chats WHERE user1_id = ? OR user2_id = ?',
                        [userId, userId]
                    );
                    conditionMet = chatCount.count >= achievement.condition_value;
                    break;

                case 'completed_chats':
                    const completedCount = await dbGet(
                        'SELECT COUNT(*) as count FROM chats WHERE (user1_id = ? OR user2_id = ?) AND is_completed = 1',
                        [userId, userId]
                    );
                    conditionMet = completedCount.count >= achievement.condition_value;
                    break;

                case 'rating':
                    conditionMet = (user.rating_average || 0) >= (achievement.condition_value / 10);
                    break;

                case 'rating_count':
                    conditionMet = (user.rating_count || 0) >= achievement.condition_value;
                    break;

                case 'days_active':
                    const daysSinceCreation = Math.floor(
                        (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    conditionMet = daysSinceCreation >= achievement.condition_value;
                    break;

                case 'games_played':
                    // TODO: Реализовать подсчет игр
                    conditionMet = false;
                    break;

                case 'games_won':
                    // TODO: Реализовать подсчет побед
                    conditionMet = false;
                    break;
            }

            if (conditionMet) {
                // Начисляем достижение
                const achievementId = uuidv4();
                await dbRun(
                    'INSERT INTO user_achievements (id, user_id, achievement_id) VALUES (?, ?, ?)',
                    [achievementId, userId, achievement.id]
                );

                // Начисляем монеты
                await dbRun(
                    'UPDATE users SET coins = coins + ? WHERE id = ?',
                    [achievement.reward_coins, userId]
                );

                console.log(`Достижение "${achievement.name}" разблокировано для пользователя ${userId}, начислено ${achievement.reward_coins} монет`);
            }
        }
    } catch (error) {
        console.error('Ошибка проверки достижений:', error);
    }
}

// API: Получить баланс монет пользователя
app.get('/api/users/:id/coins', async (req, res) => {
    try {
        const user = await dbGet('SELECT coins FROM users WHERE id = ?', [req.params.id]);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json({ coins: user.coins || 0 });
    } catch (error) {
        console.error('Ошибка получения баланса:', error);
        res.status(500).json({ error: 'Ошибка получения баланса' });
    }
});

// API: Получить достижения пользователя
app.get('/api/users/:id/achievements', async (req, res) => {
    try {
        const userAchievements = await dbAll(`
            SELECT ua.*, a.name, a.description, a.icon, a.reward_coins
            FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = ?
            ORDER BY ua.unlocked_at DESC
        `, [req.params.id]);

        const allAchievements = await dbAll('SELECT * FROM achievements ORDER BY reward_coins ASC');

        // Отмечаем какие достижения разблокированы
        const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));
        const achievements = allAchievements.map(ach => ({
            ...ach,
            unlocked: unlockedIds.has(ach.id),
            unlocked_at: userAchievements.find(ua => ua.achievement_id === ach.id)?.unlocked_at || null
        }));

        res.json({ achievements });
    } catch (error) {
        console.error('Ошибка получения достижений:', error);
        res.status(500).json({ error: 'Ошибка получения достижений' });
    }
});

// API: Получить все товары магазина
app.get('/api/shop/items', async (req, res) => {
    try {
        const items = await dbAll('SELECT * FROM shop_items ORDER BY price ASC');
        res.json({ items });
    } catch (error) {
        console.error('Ошибка получения товаров:', error);
        res.status(500).json({ error: 'Ошибка получения товаров' });
    }
});

// Получить товары пользователя
app.get('/api/shop/user-items/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const items = await dbAll(`
            SELECT ui.*, si.name, si.icon, si.description, si.rarity, si.item_type, si.item_value
            FROM user_items ui
            JOIN shop_items si ON ui.item_id = si.id
            WHERE ui.user_id = ?
            ORDER BY ui.purchased_at DESC
        `, [userId]);

        res.json({ items });
    } catch (error) {
        console.error('Ошибка получения товаров пользователя:', error);
        res.status(500).json({ error: 'Ошибка получения товаров пользователя' });
    }
});

// API: Получить купленные товары пользователя
app.get('/api/users/:id/items', async (req, res) => {
    try {
        // Возвращаем ВСЕ купленные товары, независимо от статуса активации
        const items = await dbAll(`
            SELECT ui.*, si.name, si.description, si.icon, si.item_type, si.item_value, si.rarity
            FROM user_items ui
            JOIN shop_items si ON ui.item_id = si.id
            WHERE ui.user_id = ?
            ORDER BY ui.purchased_at DESC
        `, [req.params.id]);
        res.json({ items });
    } catch (error) {
        console.error('Ошибка получения товаров пользователя:', error);
        res.status(500).json({ error: 'Ошибка получения товаров' });
    }
});

// Получить товары пользователя для подарков
app.get('/api/shop/user-items/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const items = await dbAll(`
            SELECT ui.*, si.name, si.icon, si.description, si.rarity, si.item_type, si.item_value
            FROM user_items ui
            JOIN shop_items si ON ui.item_id = si.id
            WHERE ui.user_id = ?
            ORDER BY ui.purchased_at DESC
        `, [userId]);

        res.json({ items });
    } catch (error) {
        console.error('Ошибка получения товаров пользователя:', error);
        res.status(500).json({ error: 'Ошибка получения товаров пользователя' });
    }
});

// API: Купить товар
app.post('/api/shop/purchase', async (req, res) => {
    try {
        const { userId, itemId } = req.body;

        if (!userId || !itemId) {
            return res.status(400).json({ error: 'Не указаны пользователь или товар' });
        }

        // Получаем товар
        const item = await dbGet('SELECT * FROM shop_items WHERE id = ?', [itemId]);
        if (!item) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        // Проверяем баланс пользователя
        const user = await dbGet('SELECT coins FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        if ((user.coins || 0) < item.price) {
            return res.status(400).json({ error: 'Недостаточно монет' });
        }

        // Проверяем, не куплен ли уже товар
        const existingItem = await dbGet(
            'SELECT * FROM user_items WHERE user_id = ? AND item_id = ?',
            [userId, itemId]
        );

        if (existingItem) {
            return res.status(400).json({ error: 'Товар уже куплен' });
        }

        // Списываем монеты
        await dbRun(
            'UPDATE users SET coins = coins - ? WHERE id = ?',
            [item.price, userId]
        );

        // Добавляем товар пользователю
        const userItemId = uuidv4();
        await dbRun(
            'INSERT INTO user_items (id, user_id, item_id) VALUES (?, ?, ?)',
            [userItemId, userId, itemId]
        );

        // Обновляем decorations в профиле пользователя
        const userItems = await dbAll(`
            SELECT si.item_type, si.item_value
            FROM user_items ui
            JOIN shop_items si ON ui.item_id = si.id
            WHERE ui.user_id = ? AND ui.is_active = 1
        `, [userId]);

        const decorations = {};
        userItems.forEach(item => {
            if (!decorations[item.item_type]) {
                decorations[item.item_type] = [];
            }
            decorations[item.item_type].push(item.item_value);
        });

        await dbRun(
            'UPDATE users SET decorations = ? WHERE id = ?',
            [JSON.stringify(decorations), userId]
        );

        // Получаем обновленный баланс
        const updatedUser = await dbGet('SELECT coins FROM users WHERE id = ?', [userId]);

        res.json({
            success: true,
            coins: updatedUser.coins,
            item: {
                id: userItemId,
                ...item
            }
        });
    } catch (error) {
        console.error('Ошибка покупки товара:', error);
        res.status(500).json({ error: 'Ошибка покупки товара' });
    }
});

// API: Активировать/деактивировать предмет
app.post('/api/shop/items/:userItemId/toggle', async (req, res) => {
    try {
        const { userItemId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Не указан пользователь' });
        }

        // Получаем текущий статус предмета
        const userItem = await dbGet('SELECT * FROM user_items WHERE id = ? AND user_id = ?', [userItemId, userId]);
        if (!userItem) {
            return res.status(404).json({ error: 'Предмет не найден' });
        }

        // Переключаем статус
        const newStatus = userItem.is_active === 1 ? 0 : 1;
        await dbRun('UPDATE user_items SET is_active = ? WHERE id = ?', [newStatus, userItemId]);

        // Обновляем decorations в профиле пользователя
        const userItems = await dbAll(`
            SELECT si.item_type, si.item_value
            FROM user_items ui
            JOIN shop_items si ON ui.item_id = si.id
            WHERE ui.user_id = ? AND ui.is_active = 1
        `, [userId]);

        const decorations = {};
        userItems.forEach(item => {
            if (!decorations[item.item_type]) {
                decorations[item.item_type] = [];
            }
            decorations[item.item_type].push(item.item_value);
        });

        await dbRun(
            'UPDATE users SET decorations = ? WHERE id = ?',
            [JSON.stringify(decorations), userId]
        );

        res.json({ success: true, is_active: newStatus === 1 });
    } catch (error) {
        console.error('Ошибка переключения предмета:', error);
        res.status(500).json({ error: 'Ошибка переключения предмета' });
    }
});

// API: Продать предмет
app.post('/api/shop/items/:userItemId/sell', async (req, res) => {
    try {
        const { userItemId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Не указан пользователь' });
        }

        // Получаем информацию о предмете пользователя
        const userItem = await dbGet(`
            SELECT ui.*, si.price 
            FROM user_items ui
            JOIN shop_items si ON ui.item_id = si.id
            WHERE ui.id = ? AND ui.user_id = ?
        `, [userItemId, userId]);

        if (!userItem) {
            return res.status(404).json({ error: 'Предмет не найден' });
        }

        // Вычисляем цену продажи (50% от стоимости)
        const sellPrice = Math.floor(userItem.price * 0.5);

        // Удаляем предмет из инвентаря пользователя
        await dbRun('DELETE FROM user_items WHERE id = ?', [userItemId]);

        // Добавляем монеты пользователю
        await dbRun('UPDATE users SET coins = coins + ? WHERE id = ?', [sellPrice, userId]);

        // Обновляем decorations в профиле пользователя
        const userItems = await dbAll(`
            SELECT si.item_type, si.item_value
            FROM user_items ui
            JOIN shop_items si ON ui.item_id = si.id
            WHERE ui.user_id = ? AND ui.is_active = 1
        `, [userId]);

        const decorations = {};
        userItems.forEach(item => {
            if (!decorations[item.item_type]) {
                decorations[item.item_type] = [];
            }
            decorations[item.item_type].push(item.item_value);
        });

        await dbRun(
            'UPDATE users SET decorations = ? WHERE id = ?',
            [JSON.stringify(decorations), userId]
        );

        // Получаем обновленный баланс
        const updatedUser = await dbGet('SELECT coins FROM users WHERE id = ?', [userId]);

        res.json({
            success: true,
            coins: updatedUser.coins,
            sellPrice: sellPrice
        });
    } catch (error) {
        console.error('Ошибка продажи предмета:', error);
        res.status(500).json({ error: 'Ошибка продажи предмета' });
    }
});


// API: Создать жалобу
app.post('/api/reports', async (req, res) => {
    try {
        const { reporterId, reportedUserId, chatId, reason, description } = req.body;

        if (!reporterId || !reportedUserId || !chatId || !reason || !description) {
            return res.status(400).json({ error: 'Не все поля заполнены' });
        }

        // Проверяем, что пользователь является участником чата
        const chat = await dbGet('SELECT user1_id, user2_id FROM chats WHERE id = ?', [chatId]);
        if (!chat) {
            return res.status(404).json({ error: 'Чат не найден' });
        }

        if (chat.user1_id !== reporterId && chat.user2_id !== reporterId) {
            return res.status(403).json({ error: 'Вы не являетесь участником этого чата' });
        }

        if (chat.user1_id !== reportedUserId && chat.user2_id !== reportedUserId) {
            return res.status(400).json({ error: 'Нарушитель не является участником этого чата' });
        }

        const reportId = uuidv4();
        await dbRun(
            'INSERT INTO reports (id, reporter_id, reported_user_id, chat_id, reason, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [reportId, reporterId, reportedUserId, chatId, reason, description, 'pending']
        );

        res.json({ success: true, reportId });
    } catch (error) {
        console.error('Ошибка создания жалобы:', error);
        res.status(500).json({ error: 'Ошибка создания жалобы' });
    }
});

// API: Получить список жалоб (для админа)
app.get('/api/reports', async (req, res) => {
    try {
        const { status, userId } = req.query;

        // Проверка прав доступа для администраторов
        if (userId) {
            const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
            if (!user || !hasModeratorAccess(user)) {
                return res.status(403).json({ error: 'Доступ запрещен. Требуются права модератора или выше.' });
            }
        }

        let query = `
            SELECT r.*, 
                   u1.name as reporter_name,
                   u2.name as reported_user_name,
                   c.id as chat_id
            FROM reports r
            JOIN users u1 ON r.reporter_id = u1.id
            JOIN users u2 ON r.reported_user_id = u2.id
            JOIN chats c ON r.chat_id = c.id
        `;
        const params = [];

        if (status) {
            query += ' WHERE r.status = ?';
            params.push(status);
        }

        query += ' ORDER BY r.created_at DESC';

        const reports = await dbAll(query, params);
        res.json({ reports });
    } catch (error) {
        console.error('Ошибка получения жалоб:', error);
        res.status(500).json({ error: 'Ошибка получения жалоб' });
    }
});

// API: Получить детали жалобы
app.get('/api/reports/:id', async (req, res) => {
    try {
        const { userId } = req.query;

        // Проверка прав доступа для администраторов
        if (userId) {
            const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
            if (!user || !hasModeratorAccess(user)) {
                return res.status(403).json({ error: 'Доступ запрещен. Требуются права модератора или выше.' });
            }
        }

        const report = await dbGet(`
            SELECT r.*, 
                   u1.name as reporter_name, u1.age as reporter_age,
                   u2.name as reported_user_name, u2.age as reported_user_age,
                   u2.rating_average, u2.rating_count,
                   c.id as chat_id
            FROM reports r
            JOIN users u1 ON r.reporter_id = u1.id
            JOIN users u2 ON r.reported_user_id = u2.id
            JOIN chats c ON r.chat_id = c.id
            WHERE r.id = ?
        `, [req.params.id]);

        if (!report) {
            return res.status(404).json({ error: 'Жалоба не найдена' });
        }

        // Получаем статистику нарушителя
        const chatCount = await dbGet(
            'SELECT COUNT(*) as count FROM chats WHERE user1_id = ? OR user2_id = ?',
            [report.reported_user_id, report.reported_user_id]
        );

        const completedChats = await dbGet(
            'SELECT COUNT(*) as count FROM chats WHERE (user1_id = ? OR user2_id = ?) AND is_completed = 1',
            [report.reported_user_id, report.reported_user_id]
        );

        res.json({
            report: {
                ...report,
                reported_user_stats: {
                    total_chats: chatCount.count,
                    completed_chats: completedChats.count,
                    rating_average: report.rating_average || 0,
                    rating_count: report.rating_count || 0
                }
            }
        });
    } catch (error) {
        console.error('Ошибка получения жалобы:', error);
        res.status(500).json({ error: 'Ошибка получения жалобы' });
    }
});

// API: Обработать жалобу (для админа)
app.post('/api/reports/:id/resolve', async (req, res) => {
    try {
        const { verdict, message, blockDays, userId } = req.body;
        const reportId = req.params.id;

        if (!userId) {
            return res.status(400).json({ error: 'Не указан ID пользователя' });
        }

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user || !hasModeratorAccess(user)) {
            return res.status(403).json({ error: 'Доступ запрещен. Требуются права модератора или выше.' });
        }

        if (!verdict || (verdict !== 'approved' && verdict !== 'rejected')) {
            return res.status(400).json({ error: 'Неверный вердикт' });
        }

        const report = await dbGet('SELECT * FROM reports WHERE id = ?', [reportId]);
        if (!report) {
            return res.status(404).json({ error: 'Жалоба не найдена' });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({ error: 'Жалоба уже обработана' });
        }

        // Обновляем статус жалобы
        await dbRun(
            'UPDATE reports SET status = ?, admin_verdict = ?, admin_message = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
            [verdict === 'approved' ? 'resolved' : 'dismissed', verdict, message || '', reportId]
        );

        // Если жалоба одобрена и нужно заблокировать
        if (verdict === 'approved' && blockDays && blockDays > 0) {
            const blockedUntil = new Date();
            blockedUntil.setDate(blockedUntil.getDate() + blockDays);

            const blockId = uuidv4();
            await dbRun(
                'INSERT INTO user_blocks (id, user_id, reason, blocked_until, created_by) VALUES (?, ?, ?, ?, ?)',
                [blockId, report.reported_user_id, report.reason, blockedUntil.toISOString(), 'admin']
            );
        }

        // Отправляем уведомление пользователю, который пожаловался
        sendToUser(report.reporter_id, {
            type: 'report_resolved',
            reportId: reportId,
            verdict: verdict,
            message: message || '',
            blockDays: blockDays || 0
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка обработки жалобы:', error);
        res.status(500).json({ error: 'Ошибка обработки жалобы' });
    }
});

// API: Получить список администраторов (только для супер-администратора)
app.get('/api/admin/admins', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'Не указан ID пользователя' });
        }

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user || !hasSuperAdminAccess(user)) {
            return res.status(403).json({ error: 'Доступ запрещен. Требуются права главного администратора.' });
        }

        const admins = await dbAll(`
            SELECT id, name, telegram_id, admin_role, is_admin, created_at
            FROM users 
            WHERE is_admin = 1 AND admin_role IS NOT NULL
            ORDER BY 
                CASE admin_role
                    WHEN 'super_admin' THEN 1
                    WHEN 'admin' THEN 2
                    WHEN 'moderator' THEN 3
                    ELSE 4
                END,
                created_at ASC
        `);

        res.json({ admins });
    } catch (error) {
        console.error('Ошибка получения списка администраторов:', error);
        res.status(500).json({ error: 'Ошибка получения списка администраторов' });
    }
});

// API: Добавить администратора (только для супер-администратора)
app.post('/api/admin/admins', async (req, res) => {
    try {
        const { userId, targetTelegramId, role } = req.body;

        if (!userId || !targetTelegramId || !role) {
            return res.status(400).json({ error: 'Не указаны все необходимые параметры' });
        }

        if (!['admin', 'moderator'].includes(role)) {
            return res.status(400).json({ error: 'Некорректная роль. Доступны: admin, moderator' });
        }

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user || !hasSuperAdminAccess(user)) {
            return res.status(403).json({ error: 'Доступ запрещен. Требуются права главного администратора.' });
        }

        // Ищем пользователя по telegram_id
        const normalizedTelegramId = String(targetTelegramId).trim().replace(/\s+/g, '');
        const targetUser = await dbGet('SELECT * FROM users WHERE telegram_id = ? COLLATE NOCASE', [normalizedTelegramId]);

        if (!targetUser) {
            return res.status(404).json({ error: 'Пользователь с указанным Telegram ID не найден' });
        }

        if (targetUser.admin_role === 'super_admin') {
            return res.status(400).json({ error: 'Нельзя изменить роль главного администратора' });
        }

        // Обновляем роль пользователя
        await dbRun(
            'UPDATE users SET is_admin = 1, admin_role = ? WHERE id = ?',
            [role, targetUser.id]
        );

        console.log(`Пользователь ${targetUser.name} (${targetUser.id}) назначен ${role === 'admin' ? 'администратором' : 'модератором'}`);

        res.json({
            success: true,
            message: `Пользователь успешно назначен ${role === 'admin' ? 'администратором' : 'модератором'}`,
            admin: {
                id: targetUser.id,
                name: targetUser.name,
                telegram_id: targetUser.telegram_id,
                admin_role: role
            }
        });
    } catch (error) {
        console.error('Ошибка добавления администратора:', error);
        res.status(500).json({ error: 'Ошибка добавления администратора' });
    }
});

// API: Удалить администратора (только для супер-администратора)
app.delete('/api/admin/admins/:adminId', async (req, res) => {
    try {
        const { userId } = req.body;
        const adminId = req.params.adminId;

        if (!userId) {
            return res.status(400).json({ error: 'Не указан ID пользователя' });
        }

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user || !hasSuperAdminAccess(user)) {
            return res.status(403).json({ error: 'Доступ запрещен. Требуются права главного администратора.' });
        }

        const targetAdmin = await dbGet('SELECT * FROM users WHERE id = ?', [adminId]);
        if (!targetAdmin) {
            return res.status(404).json({ error: 'Администратор не найден' });
        }

        if (targetAdmin.admin_role === 'super_admin') {
            return res.status(400).json({ error: 'Нельзя удалить главного администратора' });
        }

        // Удаляем права администратора
        await dbRun(
            'UPDATE users SET is_admin = 0, admin_role = NULL WHERE id = ?',
            [adminId]
        );

        console.log(`Права администратора удалены у пользователя ${targetAdmin.name} (${adminId})`);

        res.json({
            success: true,
            message: 'Права администратора успешно удалены'
        });
    } catch (error) {
        console.error('Ошибка удаления администратора:', error);
        res.status(500).json({ error: 'Ошибка удаления администратора' });
    }
});

// API: Изменить роль администратора (только для супер-администратора)
app.put('/api/admin/admins/:adminId', async (req, res) => {
    try {
        const { userId, role } = req.body;
        const adminId = req.params.adminId;

        if (!userId || !role) {
            return res.status(400).json({ error: 'Не указаны все необходимые параметры' });
        }

        if (!['admin', 'moderator'].includes(role)) {
            return res.status(400).json({ error: 'Некорректная роль. Доступны: admin, moderator' });
        }

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user || !hasSuperAdminAccess(user)) {
            return res.status(403).json({ error: 'Доступ запрещен. Требуются права главного администратора.' });
        }

        const targetAdmin = await dbGet('SELECT * FROM users WHERE id = ?', [adminId]);
        if (!targetAdmin) {
            return res.status(404).json({ error: 'Администратор не найден' });
        }

        if (targetAdmin.admin_role === 'super_admin') {
            return res.status(400).json({ error: 'Нельзя изменить роль главного администратора' });
        }

        // Обновляем роль
        await dbRun(
            'UPDATE users SET admin_role = ? WHERE id = ?',
            [role, adminId]
        );

        console.log(`Роль пользователя ${targetAdmin.name} (${adminId}) изменена на ${role}`);

        res.json({
            success: true,
            message: `Роль успешно изменена на ${role === 'admin' ? 'администратор' : 'модератор'}`,
            admin: {
                id: targetAdmin.id,
                name: targetAdmin.name,
                admin_role: role
            }
        });
    } catch (error) {
        console.error('Ошибка изменения роли администратора:', error);
        res.status(500).json({ error: 'Ошибка изменения роли администратора' });
    }
});

// API: Отправить сообщение от администратора пользователю
app.post('/api/admin/send-message', async (req, res) => {
    try {
        const { userId, text, adminUserId } = req.body;

        if (!adminUserId) {
            return res.status(400).json({ error: 'Не указан ID администратора' });
        }

        const adminUser = await dbGet('SELECT * FROM users WHERE id = ?', [adminUserId]);
        if (!adminUser || !hasModeratorAccess(adminUser)) {
            return res.status(403).json({ error: 'Доступ запрещен. Требуются права модератора или выше.' });
        }

        const ADMIN_ID = 'system_admin_001';

        if (!userId || !text) {
            return res.status(400).json({ error: 'Не указаны пользователь или текст сообщения' });
        }

        // Находим чат с администратором
        const chat = await dbGet(`
            SELECT id FROM chats 
            WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))
            LIMIT 1
        `, [userId, ADMIN_ID, ADMIN_ID, userId]);

        let chatId;
        if (!chat) {
            // Создаем чат если его нет
            chatId = uuidv4();
            await dbRun('INSERT INTO chats (id, user1_id, user2_id) VALUES (?, ?, ?)', [chatId, userId, ADMIN_ID]);
        } else {
            chatId = chat.id;
        }

        // Отправляем сообщение
        const messageId = uuidv4();
        await dbRun(
            'INSERT INTO messages (id, chat_id, user_id, text) VALUES (?, ?, ?, ?)',
            [messageId, chatId, ADMIN_ID, text]
        );

        // Обновляем время обновления чата
        await dbRun('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [chatId]);

        const message = await dbGet(`
            SELECT m.*, u.name as username
            FROM messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.id = ?
        `, [messageId]);

        // Отправляем сообщение через WebSocket
        sendToUser(userId, {
            type: 'new_message',
            message: {
                ...message,
                chat_id: chatId
            }
        });

        res.json({ message, chatId });
    } catch (error) {
        console.error('Ошибка отправки сообщения от администратора:', error);
        res.status(500).json({ error: 'Ошибка отправки сообщения' });
    }
});

// API: Массовая рассылка сообщений
app.post('/api/admin/broadcast', async (req, res) => {
    try {
        const { text, userIds, adminUserId } = req.body;

        if (!adminUserId) {
            return res.status(400).json({ error: 'Не указан ID администратора' });
        }

        const adminUser = await dbGet('SELECT * FROM users WHERE id = ?', [adminUserId]);
        if (!adminUser || !hasFullAdminAccess(adminUser)) {
            return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора или выше.' });
        }
        const ADMIN_ID = 'system_admin_001';

        if (!text) {
            return res.status(400).json({ error: 'Не указан текст сообщения' });
        }

        let targetUserIds = userIds;
        if (!targetUserIds || targetUserIds.length === 0) {
            // Если не указаны пользователи, отправляем всем
            const allUsers = await dbAll('SELECT id FROM users WHERE is_system = 0 AND is_admin = 0');
            targetUserIds = allUsers.map(u => u.id);
        }

        let successCount = 0;
        let errorCount = 0;

        for (const userId of targetUserIds) {
            try {
                // Находим или создаем чат с администратором
                let chat = await dbGet(`
                    SELECT id FROM chats 
                    WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))
                    LIMIT 1
                `, [userId, ADMIN_ID, ADMIN_ID, userId]);

                let chatId;
                if (!chat) {
                    chatId = uuidv4();
                    await dbRun('INSERT INTO chats (id, user1_id, user2_id) VALUES (?, ?, ?)', [chatId, userId, ADMIN_ID]);
                } else {
                    chatId = chat.id;
                }

                // Отправляем сообщение
                const messageId = uuidv4();
                await dbRun(
                    'INSERT INTO messages (id, chat_id, user_id, text) VALUES (?, ?, ?, ?)',
                    [messageId, chatId, ADMIN_ID, text]
                );

                await dbRun('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [chatId]);

                // Отправляем через WebSocket
                sendToUser(userId, {
                    type: 'new_message',
                    message: {
                        id: messageId,
                        chat_id: chatId,
                        user_id: ADMIN_ID,
                        text: text,
                        created_at: new Date().toISOString()
                    }
                });

                successCount++;
            } catch (error) {
                console.error(`Ошибка отправки сообщения пользователю ${userId}:`, error);
                errorCount++;
            }
        }

        res.json({
            success: true,
            successCount,
            errorCount,
            total: targetUserIds.length
        });
    } catch (error) {
        console.error('Ошибка массовой рассылки:', error);
        res.status(500).json({ error: 'Ошибка массовой рассылки' });
    }
});

// API: Проверить блокировку пользователя
app.get('/api/users/:id/block-status', async (req, res) => {
    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const block = await dbGet(
            'SELECT * FROM user_blocks WHERE user_id = ? AND blocked_until > datetime("now") ORDER BY blocked_until DESC LIMIT 1',
            [req.params.id]
        );

        if (block) {
            res.json({
                isBlocked: true,
                reason: block.reason,
                blockedUntil: block.blocked_until,
                blockedAt: block.created_at
            });
        } else {
            res.json({ isBlocked: false });
        }
    } catch (error) {
        console.error('Ошибка проверки блокировки:', error);
        res.status(500).json({ error: 'Ошибка проверки блокировки' });
    }
});

// Запуск сервера
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Откройте http://localhost:${PORT} в браузере`);
    console.log(`Telegram бот: ${bot ? 'активен' : 'не инициализирован'}`);
});

// Закрытие базы данных при завершении
process.on('SIGINT', () => {
    stopPeriodicSearch();
    db.close((err) => {
        if (err) {
            console.error('Ошибка закрытия базы данных:', err);
        } else {
            console.log('База данных закрыта');
        }
        process.exit(0);
    });
});
