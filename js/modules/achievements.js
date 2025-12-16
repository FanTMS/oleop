/**
 * Модуль достижений
 */

import { Storage } from '../utils/storage.js';
import { API_BASE_URL } from '../utils/api.js';

/**
 * Загрузить достижения пользователя
 */
export async function loadAchievements() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/achievements`);
        const data = await response.json();
        
        const achievementsList = document.getElementById('achievementsList');
        if (!achievementsList) return;
        
        achievementsList.innerHTML = '';
        
        if (data.achievements.length === 0) {
            achievementsList.innerHTML = '<div class="empty-state"><p>Достижения отсутствуют</p></div>';
            return;
        }
        
        data.achievements.forEach(achievement => {
            const achievementEl = createAchievementElement(achievement);
            achievementsList.appendChild(achievementEl);
        });
    } catch (error) {
        console.error('Ошибка загрузки достижений:', error);
        const achievementsList = document.getElementById('achievementsList');
        if (achievementsList) {
            achievementsList.innerHTML = '<div class="empty-state"><p>Ошибка загрузки достижений</p></div>';
        }
    }
}

/**
 * Создать элемент достижения
 */
function createAchievementElement(achievement) {
    const achievementEl = document.createElement('div');
    achievementEl.className = `achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`;
    
    const unlockedDate = achievement.unlocked_at 
        ? new Date(achievement.unlocked_at).toLocaleDateString('ru-RU')
        : '';
    
    achievementEl.innerHTML = `
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-info">
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-description">${achievement.description}</div>
            ${achievement.unlocked 
                ? `<div class="achievement-date">Разблокировано: ${unlockedDate}</div>`
                : '<div class="achievement-locked">Заблокировано</div>'
            }
        </div>
        <div class="achievement-reward">
            <span class="coins-icon-small">🪙</span>
            <span>${achievement.reward_coins}</span>
        </div>
    `;
    
    return achievementEl;
}

