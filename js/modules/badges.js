/**
 * Модуль бейджей и титулов
 */

import { Storage } from '../utils/storage.js';
import { API_BASE_URL } from '../utils/api.js';

/**
 * Получить бейджи пользователя
 */
export async function getUserBadges(userId = null) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser && !userId) return [];

    const targetUserId = userId || currentUser.id;

    try {
        const response = await fetch(`${API_BASE_URL}/api/badges/user/${targetUserId}`);
        if (!response.ok) {
            throw new Error('Ошибка получения бейджей');
        }

        const data = await response.json();
        return data.badges || [];
    } catch (error) {
        console.error('Ошибка получения бейджей:', error);
        return [];
    }
}

/**
 * Получить активный титул пользователя
 */
export async function getUserActiveTitle(userId = null) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser && !userId) return null;

    const targetUserId = userId || currentUser.id;

    try {
        const response = await fetch(`${API_BASE_URL}/api/badges/user/${targetUserId}/active-title`);
        if (!response.ok) {
            throw new Error('Ошибка получения титула');
        }

        const data = await response.json();
        return data.title || null;
    } catch (error) {
        console.error('Ошибка получения титула:', error);
        return null;
    }
}

/**
 * Установить активный титул
 */
export async function setActiveTitle(badgeId) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/api/badges/${badgeId}/set-active`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: currentUser.id })
        });

        if (!response.ok) {
            throw new Error('Ошибка установки титула');
        }

        return true;
    } catch (error) {
        console.error('Ошибка установки титула:', error);
        return false;
    }
}

/**
 * Получить все доступные бейджи
 */
export async function getAllBadges() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/badges`);
        if (!response.ok) {
            throw new Error('Ошибка получения бейджей');
        }

        const data = await response.json();
        return data.badges || [];
    } catch (error) {
        console.error('Ошибка получения бейджей:', error);
        return [];
    }
}

/**
 * Показать модальное окно бейджей
 */
export async function showBadgesModal() {
    const modal = document.getElementById('badgesModal');
    if (!modal) return;
    
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    // Инициализация вкладок
    const tabButtons = modal.querySelectorAll('.badges-tabs .tab-btn');
    const badgesList = document.getElementById('badgesList');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadBadgesTab(btn.dataset.badgeTab);
        });
    });
    
    await loadBadgesTab('badges');
    modal.style.display = 'flex';
}

/**
 * Загрузить вкладку бейджей
 */
async function loadBadgesTab(tab) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    const container = document.getElementById('badgesList');
    if (!container) return;
    
    try {
        let badges = [];
        
        if (tab === 'badges') {
            badges = await getUserBadges();
            badges = badges.filter(b => b.badge_type === 'badge');
        } else {
            badges = await getUserBadges();
            badges = badges.filter(b => b.badge_type === 'title');
        }
        
        container.innerHTML = '';
        
        if (badges.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>У вас пока нет ' + (tab === 'badges' ? 'бейджей' : 'титулов') + '</p></div>';
            return;
        }
        
        badges.forEach(badge => {
            const badgeEl = document.createElement('div');
            badgeEl.className = `badge-item ${badge.is_active ? 'active' : ''}`;
            badgeEl.innerHTML = `
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
                <div class="badge-description">${badge.description}</div>
                ${badge.is_active ? '<div class="badge-status active">Активен</div>' : ''}
            `;
            
            if (tab === 'titles' && !badge.is_active) {
                badgeEl.addEventListener('click', async () => {
                    await setActiveTitle(badge.id);
                    await loadBadgesTab(tab);
                });
            }
            
            container.appendChild(badgeEl);
        });
    } catch (error) {
        console.error('Ошибка загрузки бейджей:', error);
    }
}

