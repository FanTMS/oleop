/**
 * Модуль статусов пользователей
 */

import { Storage } from '../utils/storage.js';
import { API_BASE_URL } from '../utils/api.js';

/**
 * Обновить статус пользователя
 */
export async function updateUserStatus(status) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            throw new Error('Ошибка обновления статуса');
        }

        return true;
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        return false;
    }
}

/**
 * Получить статус пользователя
 */
export async function getUserStatus(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}/status`);
        if (!response.ok) {
            throw new Error('Ошибка получения статуса');
        }

        const data = await response.json();
        return data.status || 'offline';
    } catch (error) {
        console.error('Ошибка получения статуса:', error);
        return 'offline';
    }
}

/**
 * Получить историю активности пользователя
 */
export async function getUserActivityHistory(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}/activity`);
        if (!response.ok) {
            throw new Error('Ошибка получения истории активности');
        }

        const data = await response.json();
        return data.activity || [];
    } catch (error) {
        console.error('Ошибка получения истории активности:', error);
        return [];
    }
}

/**
 * Получить последнее время активности пользователя
 */
export async function getLastSeen(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}/last-seen`);
        if (!response.ok) {
            throw new Error('Ошибка получения времени активности');
        }

        const data = await response.json();
        return data.last_seen || null;
    } catch (error) {
        console.error('Ошибка получения времени активности:', error);
        return null;
    }
}

