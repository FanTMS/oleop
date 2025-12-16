/**
 * Модуль админ-панели
 */

import { Storage } from '../utils/storage.js';
import { AVAILABLE_INTERESTS } from '../utils/constants.js';

const ADMIN_PASSWORD = 'admin123'; // Пароль для доступа к админ-панели

/**
 * Проверка пароля админа
 */
export function checkAdminPassword(password) {
    return password === ADMIN_PASSWORD;
}

/**
 * Получить статистику системы
 */
export function getStats() {
    const users = Storage.getUsers();
    const chats = Storage.getChats();
    const ratings = Storage.getRatings();
    const queue = Storage.getSearchQueue();
    
    const totalUsers = Object.keys(users).length;
    const totalChats = Object.keys(chats).length;
    const totalRatings = Object.keys(ratings).length;
    const usersInQueue = queue.length;
    
    // Подсчет активных чатов (с сообщениями)
    const activeChats = Object.values(chats).filter(chat => 
        chat.messages && chat.messages.length > 0
    ).length;
    
    // Подсчет среднего рейтинга
    const allRatings = Object.values(ratings);
    const avgRating = allRatings.length > 0
        ? (allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length).toFixed(2)
        : '0.00';
    
    return {
        totalUsers,
        totalChats,
        activeChats,
        totalRatings,
        usersInQueue,
        avgRating
    };
}

/**
 * Получить список всех пользователей
 */
export function getAllUsers() {
    return Object.values(Storage.getUsers());
}

/**
 * Получить список всех чатов
 */
export function getAllChats() {
    return Object.values(Storage.getChats());
}

/**
 * Удалить пользователя
 */
export function deleteUser(userId) {
    const users = Storage.getUsers();
    delete users[userId];
    localStorage.setItem(Storage.keys.users, JSON.stringify(users));
    
    // Удаляем чаты пользователя
    const chats = Storage.getChats();
    Object.keys(chats).forEach(chatId => {
        const chat = chats[chatId];
        if (chat.user1Id === userId || chat.user2Id === userId) {
            delete chats[chatId];
        }
    });
    localStorage.setItem(Storage.keys.chats, JSON.stringify(chats));
    
    // Удаляем из очереди поиска
    Storage.removeFromSearchQueue(userId);
}

/**
 * Удалить чат
 */
export function deleteChat(chatId) {
    const chats = Storage.getChats();
    delete chats[chatId];
    localStorage.setItem(Storage.keys.chats, JSON.stringify(chats));
}

/**
 * Очистить все данные
 */
export function clearAllData() {
    localStorage.removeItem(Storage.keys.users);
    localStorage.removeItem(Storage.keys.chats);
    localStorage.removeItem(Storage.keys.ratings);
    localStorage.removeItem(Storage.keys.searchQueue);
    localStorage.removeItem(Storage.keys.onlineUsers);
}

/**
 * Создать тестового бота
 */
export function createTestBot() {
    const botId = 'test_bot_' + Date.now();
    const users = Storage.getUsers();
    
    // Создаем бота со случайными интересами
    const randomInterests = [...AVAILABLE_INTERESTS]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 5) + 3); // 3-7 интересов
    
    const bot = {
        id: botId,
        name: 'Тестовый бот 🤖',
        age: Math.floor(Math.random() * 30) + 18,
        gender: ['male', 'female', 'other'][Math.floor(Math.random() * 3)],
        interests: randomInterests,
        createdAt: new Date().toISOString(),
        isBot: true
    };
    
    users[botId] = bot;
    localStorage.setItem(Storage.keys.users, JSON.stringify(users));
    
    return bot;
}

/**
 * Добавить бота в очередь поиска
 */
export function addBotToQueue(botId) {
    Storage.addToSearchQueue(botId);
}

/**
 * Удалить всех ботов
 */
export function removeAllBots() {
    const users = Storage.getUsers();
    Object.keys(users).forEach(userId => {
        if (users[userId].isBot || userId.startsWith('test_bot_')) {
            delete users[userId];
            Storage.removeFromSearchQueue(userId);
        }
    });
    localStorage.setItem(Storage.keys.users, JSON.stringify(users));
}

/**
 * Получить всех ботов
 */
export function getAllBots() {
    const users = Storage.getUsers();
    return Object.values(users).filter(user => user.isBot || user.id.startsWith('test_bot_'));
}

