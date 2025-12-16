/**
 * Модуль для работы с данными через API
 * Заменяет localStorage на работу с backend сервером
 */

import * as API from './api.js';

export const Storage = {
    // Ключи для локального хранения (только для текущего пользователя и чата)
    keys: {
        currentUser: 'chat_current_user',
        currentChat: 'chat_current_chat',
        readMessages: 'chat_read_messages', // Хранит ID прочитанных сообщений
        unreadCounts: 'chat_unread_counts', // Хранит количество непрочитанных сообщений по чатам
    },
    
    /**
     * Работа с текущим пользователем (локально)
     */
    getCurrentUser() {
        const data = localStorage.getItem(this.keys.currentUser);
        return data ? JSON.parse(data) : null;
    },
    
    setCurrentUser(user) {
        if (user) {
            localStorage.setItem(this.keys.currentUser, JSON.stringify(user));
        } else {
            localStorage.removeItem(this.keys.currentUser);
        }
    },
    
    /**
     * Работа с текущим чатом (локально)
     */
    getCurrentChat() {
        const data = localStorage.getItem(this.keys.currentChat);
        // chatId - это строка, не JSON объект
        return data || null;
    },
    
    setCurrentChat(chatId) {
        if (chatId) {
            localStorage.setItem(this.keys.currentChat, chatId);
        } else {
            localStorage.removeItem(this.keys.currentChat);
        }
    },
    
    /**
     * Работа с пользователями через API
     */
    async saveUser(userData) {
        try {
            const response = await API.registerUser(userData);
            return response.user;
        } catch (error) {
            console.error('Ошибка сохранения пользователя:', error);
            throw error;
        }
    },
    
    async getUser(userId) {
        try {
            return await API.getUser(userId);
        } catch (error) {
            console.error('Ошибка получения пользователя:', error);
            return null;
        }
    },
    
    /**
     * Работа с чатами через API
     */
    async getChatsForUser(userId) {
        try {
            return await API.getUserChats(userId);
        } catch (error) {
            console.error('Ошибка получения чатов:', error);
            return [];
        }
    },
    
    async getChat(chatId) {
        try {
            // Получаем чат через список чатов пользователя
            const currentUser = this.getCurrentUser();
            if (!currentUser) return null;
            
            const chats = await this.getChatsForUser(currentUser.id);
            return chats.find(chat => chat.id === chatId) || null;
        } catch (error) {
            console.error('Ошибка получения чата:', error);
            return null;
        }
    },
    
    async saveChat(chatId, chatData) {
        // Чат создается через API при поиске или создании
        // Здесь просто обновляем локальный кэш если нужно
        return chatData;
    },
    
    async deleteChat(chatId) {
        // Удаление чата через API (если нужно)
        // Пока не реализовано на backend
        console.log('Удаление чата:', chatId);
    },
    
    /**
     * Работа с сообщениями через API
     */
    async getChatMessages(chatId) {
        try {
            const result = await API.getChatMessages(chatId);
            return result.messages || result; // Поддержка старого формата для совместимости
        } catch (error) {
            console.error('Ошибка получения сообщений:', error);
            return [];
        }
    },
    
    async getChatInfo(chatId) {
        try {
            const result = await API.getChatMessages(chatId);
            return {
                messages: result.messages || result,
                isCompleted: result.isCompleted || false
            };
        } catch (error) {
            console.error('Ошибка получения информации о чате:', error);
            return { messages: [], isCompleted: false };
        }
    },
    
    async saveChatMessage(chatId, userId, text, replyToId = null) {
        try {
            return await API.sendMessage(chatId, userId, text, replyToId);
        } catch (error) {
            console.error('Ошибка сохранения сообщения:', error);
            throw error;
        }
    },
    
    /**
     * Работа с рейтингами через API
     */
    async saveRating(userId, ratedUserId, rating) {
        try {
            await API.addRating(userId, ratedUserId, rating);
            return true;
        } catch (error) {
            console.error('Ошибка сохранения рейтинга:', error);
            return false;
        }
    },
    
    async getUserRating(userId) {
        try {
            return await API.getUserRating(userId);
        } catch (error) {
            console.error('Ошибка получения рейтинга:', error);
            return { average: 0, count: 0 };
        }
    },
    
    /**
     * Очередь поиска через API
     */
    async addToSearchQueue(userId) {
        try {
            await API.startSearch(userId);
            return true;
        } catch (error) {
            console.error('Ошибка добавления в очередь поиска:', error);
            return false;
        }
    },
    
    async removeFromSearchQueue(userId) {
        try {
            await API.stopSearch(userId);
            return true;
        } catch (error) {
            console.error('Ошибка удаления из очереди поиска:', error);
            return false;
        }
    },
    
    getSearchQueue() {
        // Очередь теперь управляется на сервере
        // Возвращаем пустой массив для совместимости
        return [];
    },
    
    /**
     * Вспомогательные методы для совместимости
     */
    generateId() {
        // ID теперь генерируются на сервере
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    getUsers() {
        // Для совместимости возвращаем пустой объект
        // Используйте getUser(userId) для получения конкретного пользователя
        return {};
    },
    
    getChats() {
        // Для совместимости возвращаем пустой объект
        // Используйте getChatsForUser(userId) для получения чатов пользователя
        return {};
    },
    
    getRatings() {
        // Рейтинги теперь хранятся в базе данных
        return {};
    },
    
    getOnlineUsers() {
        // Онлайн пользователи управляются через WebSocket
        return [];
    },
    
    addOnlineUser(userId) {
        // Онлайн пользователи управляются через WebSocket
    },
    
    removeOnlineUser(userId) {
        // Онлайн пользователи управляются через WebSocket
    },
    
    /**
     * Работа с прочитанными сообщениями
     */
    async markMessagesAsRead(chatId) {
        try {
            const readMessages = this.getReadMessages();
            const messages = await this.getChatMessages(chatId);
            
            if (messages && messages.length > 0) {
                messages.forEach(msg => {
                    if (!readMessages.includes(msg.id)) {
                        readMessages.push(msg.id);
                    }
                });
                localStorage.setItem(this.keys.readMessages, JSON.stringify(readMessages));
            }
            
            // Обновляем счетчик непрочитанных
            this.updateUnreadCount(chatId, 0);
        } catch (error) {
            console.error('Ошибка отметки сообщений как прочитанных:', error);
        }
    },
    
    getReadMessages() {
        const data = localStorage.getItem(this.keys.readMessages);
        return data ? JSON.parse(data) : [];
    },
    
    getUnreadCount(chatId) {
        const data = localStorage.getItem(this.keys.unreadCounts);
        const counts = data ? JSON.parse(data) : {};
        return counts[chatId] || 0;
    },
    
    updateUnreadCount(chatId, count) {
        const data = localStorage.getItem(this.keys.unreadCounts);
        const counts = data ? JSON.parse(data) : {};
        counts[chatId] = count;
        localStorage.setItem(this.keys.unreadCounts, JSON.stringify(counts));
    },
    
    incrementUnreadCount(chatId) {
        const current = this.getUnreadCount(chatId);
        this.updateUnreadCount(chatId, current + 1);
    },
    
    /**
     * Проверка наличия активного чата (исключая чат с администратором)
     */
    async hasActiveChat() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;
        
        try {
            const chats = await this.getChatsForUser(currentUser.id);
            const ADMIN_ID = 'system_admin_001';
            
            // Проверяем, есть ли хотя бы один активный (незавершенный) чат, исключая чат с администратором
            const activeChats = chats.filter(chat => {
                if (chat.is_completed) return false;
                // Исключаем чат с администратором
                const isAdminChat = chat.user1_id === ADMIN_ID || chat.user2_id === ADMIN_ID;
                return !isAdminChat;
            });
            
            return activeChats && activeChats.length > 0;
        } catch (error) {
            console.error('Ошибка проверки активного чата:', error);
            return false;
        }
    }
};
