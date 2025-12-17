/**
 * Модуль для работы с API
 */

import { Storage } from './storage.js';

export const API_BASE_URL = window.location.origin;

/**
 * Базовый запрос к API
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}/api${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка запроса');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Регистрация пользователя
 */
export async function registerUser(userData) {
    return await apiRequest('/users/register', {
        method: 'POST',
        body: userData
    });
}

/**
 * Получить пользователя по ID
 */
export async function getUser(userId) {
    const data = await apiRequest(`/users/${userId}`);
    return data.user;
}

/**
 * Получить чаты пользователя
 */
export async function getUserChats(userId) {
    const data = await apiRequest(`/users/${userId}/chats`);
    return data.chats;
}

/**
 * Создать чат
 */
export async function createChat(user1Id, user2Id) {
    const data = await apiRequest('/chats', {
        method: 'POST',
        body: { user1Id, user2Id }
    });
    return data.chat;
}

/**
 * Получить сообщения чата
 */
export async function getChatMessages(chatId) {
    const data = await apiRequest(`/chats/${chatId}/messages`);
    return {
        messages: data.messages,
        isCompleted: data.isCompleted || false
    };
}

/**
 * Завершить чат
 */
export async function endChat(chatId, userId) {
    return await apiRequest(`/chats/${chatId}/end`, {
        method: 'POST',
        body: { userId }
    });
}

/**
 * Отправить сообщение
 */
export async function sendMessage(chatId, userId, text, replyToId = null) {
    const data = await apiRequest(`/chats/${chatId}/messages`, {
        method: 'POST',
        body: { userId, text, replyToId }
    });
    return data.message;
}

/**
 * Добавить рейтинг
 */
export async function addRating(userId, ratedUserId, rating) {
    return await apiRequest('/ratings', {
        method: 'POST',
        body: { userId, ratedUserId, rating }
    });
}

/**
 * Получить рейтинг пользователя
 */
export async function getUserRating(userId) {
    return await apiRequest(`/users/${userId}/rating`);
}

/**
 * Начать поиск
 */
export async function startSearch(userId) {
    return await apiRequest('/search/start', {
        method: 'POST',
        body: { userId }
    });
}

/**
 * Остановить поиск
 */
export async function stopSearch(userId) {
    return await apiRequest('/search/stop', {
        method: 'POST',
        body: { userId }
    });
}

/**
 * Получить статистику
 */
export async function getStats() {
    return await apiRequest('/stats');
}

/**
 * Получить всех пользователей (для админ-панели)
 */
export async function getAllUsers() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser || !currentUser.id) {
        throw new Error('Пользователь не авторизован');
    }
    const data = await apiRequest(`/admin/users?userId=${currentUser.id}`);
    return data.users;
}

/**
 * Обновить пользователя (для админ-панели)
 */
export async function updateUser(userId, updates) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser || !currentUser.id) {
        throw new Error('Пользователь не авторизован');
    }
    return await apiRequest(`/admin/users/${userId}`, {
        method: 'PUT',
        body: { ...updates, userId: currentUser.id }
    });
}

/**
 * Обновить имя пользователя
 */
export async function updateUserName(userId, name) {
    return await apiRequest(`/users/${userId}/name`, {
        method: 'PUT',
        body: { name }
    });
}

/**
 * Удалить пользователя (для админ-панели)
 */
export async function deleteUser(userId) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser || !currentUser.id) {
        throw new Error('Пользователь не авторизован');
    }
    return await apiRequest(`/admin/users/${userId}`, {
        method: 'DELETE',
        body: { userId: currentUser.id }
    });
}

/**
 * Создать жалобу
 */
export async function createReport(reporterId, reportedUserId, chatId, reason, description) {
    return await apiRequest('/reports', {
        method: 'POST',
        body: { reporterId, reportedUserId, chatId, reason, description }
    });
}

/**
 * Получить список жалоб
 */
export async function getReports(status = null) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser || !currentUser.id) {
        throw new Error('Пользователь не авторизован');
    }
    let url = `/reports?userId=${currentUser.id}`;
    if (status) {
        url += `&status=${status}`;
    }
    const data = await apiRequest(url);
    return data.reports;
}

/**
 * Получить детали жалобы
 */
export async function getReportDetails(reportId) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser || !currentUser.id) {
        throw new Error('Пользователь не авторизован');
    }
    const data = await apiRequest(`/reports/${reportId}?userId=${currentUser.id}`);
    // Возвращаем весь объект данных, так как сервер возвращает { report: {...} }
    return data;
}

/**
 * Обработать жалобу
 */
export async function resolveReport(reportId, verdict, message, blockDays) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser || !currentUser.id) {
        throw new Error('Пользователь не авторизован');
    }
    return await apiRequest(`/reports/${reportId}/resolve`, {
        method: 'POST',
        body: { verdict, message, blockDays, userId: currentUser.id }
    });
}

/**
 * Проверить блокировку пользователя
 */
export async function checkUserBlockStatus(userId) {
    return await apiRequest(`/users/${userId}/block-status`);
}

/**
 * Получить чаты администратора
 */
export async function getAdminChats() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser || !currentUser.id) {
        throw new Error('Пользователь не авторизован');
    }
    const data = await apiRequest(`/admin/chats?userId=${currentUser.id}`);
    return data.chats;
}

/**
 * Отправить сообщение от администратора пользователю
 */
export async function sendAdminMessage(userId, text) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser || !currentUser.id) {
        throw new Error('Пользователь не авторизован');
    }
    return await apiRequest('/admin/send-message', {
        method: 'POST',
        body: { userId, text, adminUserId: currentUser.id }
    });
}

/**
 * Массовая рассылка сообщений
 */
export async function broadcastMessage(text, userIds = null) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser || !currentUser.id) {
        throw new Error('Пользователь не авторизован');
    }
    return await apiRequest('/admin/broadcast', {
        method: 'POST',
        body: { text, userIds, adminUserId: currentUser.id }
    });
}

/**
 * WebSocket соединение
 */
export class WebSocketClient {
    constructor(userId) {
        this.userId = userId;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket подключен');
            this.reconnectAttempts = 0;
            
            // Регистрируем пользователя
            this.send({
                type: 'register',
                userId: this.userId
            });
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Ошибка обработки WebSocket сообщения:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket ошибка:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket отключен');
            this.reconnect();
        };
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    reconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                console.log(`Попытка переподключения ${this.reconnectAttempts}...`);
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        }
    }

    handleMessage(data) {
        console.log('WebSocket получено сообщение:', data);
        
        if (data.type === 'match_found') {
            // Вызываем обработчик найденной пары
            if (this.onMatchFound) {
                console.log('Вызов обработчика onMatchFound');
                this.onMatchFound(data);
            } else {
                console.warn('Обработчик onMatchFound не установлен');
            }
        } else if (data.type === 'new_message') {
            // Вызываем обработчик нового сообщения
            if (this.onNewMessage) {
                this.onNewMessage(data.message);
            }
        } else if (data.type === 'game_request') {
            // Вызываем обработчик запроса на игру
            if (this.onGameRequest) {
                this.onGameRequest(data);
            }
        } else if (data.type === 'game_request_response') {
            // Вызываем обработчик ответа на запрос игры
            if (this.onGameRequestResponse) {
                this.onGameRequestResponse(data);
            }
        } else if (data.type === 'chat_ended') {
            // Вызываем обработчик завершения чата
            if (this.onChatEnded) {
                this.onChatEnded(data);
            }
        } else if (data.type === 'rps_result') {
            // Вызываем обработчик результата игры RPS
            if (this.onRPSResult) {
                this.onRPSResult(data);
            }
        } else if (data.type === 'ttt_update') {
            // Вызываем обработчик обновления игры крестики-нолики
            if (this.onTTTUpdate) {
                this.onTTTUpdate(data);
            }
        } else if (data.type === 'ttt_result') {
            // Вызываем обработчик результата игры крестики-нолики
            if (this.onTTTResult) {
                this.onTTTResult(data);
            }
        } else if (data.type === 'ttt_error') {
            // Вызываем обработчик ошибки игры крестики-нолики
            if (this.onTTTError) {
                this.onTTTError(data);
            }
        } else if (data.type === 'typing') {
            // Вызываем обработчик индикатора печати
            if (this.onTyping) {
                this.onTyping(data);
            }
        } else if (data.type === 'typing_start') {
            // Вызываем обработчик начала печати
            if (this.onTypingStart) {
                this.onTypingStart(data);
            }
        } else if (data.type === 'typing_stop') {
            // Вызываем обработчик остановки печати
            if (this.onTypingStop) {
                this.onTypingStop(data);
            }
        } else if (data.type === 'user_status_update') {
            // Вызываем обработчик обновления статуса пользователя
            if (this.onUserStatusUpdate) {
                this.onUserStatusUpdate(data);
            }
        } else if (data.type === 'report_resolved') {
            // Вызываем обработчик решения жалобы
            if (this.onReportResolved) {
                this.onReportResolved(data);
            }
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

