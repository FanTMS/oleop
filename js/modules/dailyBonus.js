/**
 * Модуль ежедневных бонусов
 */

import { Storage } from '../utils/storage.js';
import { API_BASE_URL } from '../utils/api.js';

/**
 * Проверить и выдать ежедневный бонус
 */
export async function checkDailyBonus() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/api/daily-bonus/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: currentUser.id })
        });

        if (!response.ok) {
            throw new Error('Ошибка проверки ежедневного бонуса');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка проверки ежедневного бонуса:', error);
        return null;
    }
}

/**
 * Получить информацию о ежедневном бонусе
 */
export async function getDailyBonusInfo() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/api/daily-bonus/info/${currentUser.id}`);
        if (!response.ok) {
            throw new Error('Ошибка получения информации о бонусе');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка получения информации о бонусе:', error);
        return null;
    }
}

/**
 * Показать модальное окно ежедневного бонуса
 */
export function showDailyBonusModal(bonusData) {
    const modal = document.getElementById('dailyBonusModal');
    if (!modal) return;

    const coinsReward = modal.querySelector('.bonus-coins');
    const streakDays = modal.querySelector('.bonus-streak');
    const bonusMessage = modal.querySelector('.bonus-message');

    if (coinsReward) coinsReward.textContent = bonusData.coins_reward || 0;
    if (streakDays) streakDays.textContent = bonusData.streak_days || 1;
    if (bonusMessage) {
        if (bonusData.streak_days > 1) {
            bonusMessage.textContent = `Отличная серия! Вы заходите ${bonusData.streak_days} день подряд!`;
        } else {
            bonusMessage.textContent = 'Добро пожаловать! Заберите свой ежедневный бонус!';
        }
    }

    modal.style.display = 'flex';
}

/**
 * Закрыть модальное окно ежедневного бонуса
 */
export function closeDailyBonusModal() {
    const modal = document.getElementById('dailyBonusModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

