/**
 * Модуль заданий
 */

import { Storage } from '../utils/storage.js';
import { API_BASE_URL } from '../utils/api.js';

/**
 * Получить список заданий пользователя
 */
export async function getUserQuests() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return [];

    try {
        const response = await fetch(`${API_BASE_URL}/api/quests/user/${currentUser.id}`);
        if (!response.ok) {
            throw new Error('Ошибка получения заданий');
        }

        const data = await response.json();
        return data.quests || [];
    } catch (error) {
        console.error('Ошибка получения заданий:', error);
        return [];
    }
}

/**
 * Получить все доступные задания
 */
export async function getAllQuests() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/quests`);
        if (!response.ok) {
            throw new Error('Ошибка получения заданий');
        }

        const data = await response.json();
        return data.quests || [];
    } catch (error) {
        console.error('Ошибка получения заданий:', error);
        return [];
    }
}

/**
 * Забрать награду за выполненное задание
 */
export async function claimQuestReward(questId) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/api/quests/${questId}/claim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: currentUser.id })
        });

        if (!response.ok) {
            throw new Error('Ошибка получения награды');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка получения награды:', error);
        return false;
    }
}

/**
 * Обновить прогресс задания
 */
export async function updateQuestProgress(questType, value = 1) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;

    try {
        await fetch(`${API_BASE_URL}/api/quests/progress`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                questType: questType,
                value: value
            })
        });
    } catch (error) {
        console.error('Ошибка обновления прогресса задания:', error);
    }
}

/**
 * Показать модальное окно заданий
 */
export async function showQuestsModal() {
    const modal = document.getElementById('questsModal');
    if (!modal) return;
    
    const quests = await getUserQuests();
    const container = document.getElementById('questsList');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (quests.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Нет доступных заданий</p></div>';
        modal.style.display = 'flex';
        return;
    }
    
    quests.forEach(quest => {
        const questEl = document.createElement('div');
        questEl.className = `quest-item ${quest.completed ? 'completed' : ''}`;
        
        const progress = quest.progress || 0;
        const target = quest.target_value || 1;
        const progressPercent = Math.min((progress / target) * 100, 100);
        
        questEl.innerHTML = `
            <div class="quest-icon">${quest.icon}</div>
            <div class="quest-info">
                <div class="quest-name">${quest.name}</div>
                <div class="quest-description">${quest.description}</div>
                <div class="quest-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="progress-text">${progress}/${target}</div>
                </div>
            </div>
            <div class="quest-reward">
                ${quest.completed ? `
                    <button class="quest-claim-btn" onclick="claimQuestReward('${quest.id}')">
                        Забрать ${quest.reward_coins}🪙
                    </button>
                ` : `
                    <span>${quest.reward_coins}🪙</span>
                `}
            </div>
        `;
        
        container.appendChild(questEl);
    });
    
    modal.style.display = 'flex';
}

