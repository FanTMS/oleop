/**
 * Модуль бота для автоматического поиска собеседника
 */

import { Storage } from '../utils/storage.js';
import { SEARCH_CONFIG } from '../utils/constants.js';
import { createChat } from './search.js';

let botInterval = null;
let botActive = false;

/**
 * Инициализация бота
 */
export function initBot() {
    // Бот автоматически ищет собеседников для пользователей в очереди
    if (botInterval) return;
    
    botInterval = setInterval(() => {
        matchUsers();
    }, SEARCH_CONFIG.interval);
    
    botActive = true;
    console.log('Bot initialized');
}

/**
 * Остановка бота
 */
export function stopBot() {
    if (botInterval) {
        clearInterval(botInterval);
        botInterval = null;
    }
    botActive = false;
    console.log('Bot stopped');
}

/**
 * Поиск и сопоставление пользователей
 */
function matchUsers() {
    const queue = Storage.getSearchQueue();
    const users = Storage.getUsers();
    
    if (queue.length < 2) return;
    
    // Сортируем очередь по времени ожидания
    const sortedQueue = [...queue].sort((a, b) => {
        // Можно добавить логику приоритета
        return 0;
    });
    
    // Ищем пары пользователей
    for (let i = 0; i < sortedQueue.length - 1; i++) {
        for (let j = i + 1; j < sortedQueue.length; j++) {
            const user1Id = sortedQueue[i];
            const user2Id = sortedQueue[j];
            
            const user1 = users[user1Id];
            const user2 = users[user2Id];
            
            if (!user1 || !user2) continue;
            
            // Проверяем совпадение интересов
            const commonInterests = user1.interests.filter(interest => 
                user2.interests.includes(interest)
            );
            
            if (commonInterests.length >= SEARCH_CONFIG.minCommonInterests) {
                // Создаем чат между пользователями
                createChat(user1Id, user2Id);
                return; // Создаем только одну пару за раз
            }
        }
    }
}

/**
 * Проверка активности бота
 */
export function isBotActive() {
    return botActive;
}

