/**
 * Модуль профиля пользователя через API
 */

import { Storage } from '../utils/storage.js';
import { GENDER_LABELS } from '../utils/constants.js';
import { loadAchievements } from './achievements.js';
import { getUserQuests } from './quests.js';
import { getUserBadges, getUserActiveTitle } from './badges.js';

/**
 * Обновление превью профиля на главной
 */
export async function updateProfilePreview() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    try {
        const rating = await Storage.getUserRating(currentUser.id);
        
        document.getElementById('previewName').textContent = currentUser.name;
        document.getElementById('previewAge').textContent = `${currentUser.age} лет`;
        document.getElementById('previewGender').textContent = GENDER_LABELS[currentUser.gender] || currentUser.gender;
        document.getElementById('previewRating').textContent = rating.count > 0 ? `${rating.average} (${rating.count})` : 'Нет оценок';
        document.getElementById('previewInterests').textContent = (currentUser.interests || []).join(', ') || 'Не указано';
    } catch (error) {
        console.error('Ошибка обновления превью профиля:', error);
    }
}

/**
 * Обновление экрана профиля
 */
export async function updateProfileScreen() {
    // Инициализируем вкладки
    initProfileTabs();
    
    // Загружаем информацию профиля
    await loadProfileInfo();
    
    // Загружаем достижения
    await loadAchievements();
    
    // Загружаем задания
    await loadProfileQuests();
}

/**
 * Инициализация вкладок профиля
 */
function initProfileTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Убираем активный класс у всех кнопок и контента
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Добавляем активный класс выбранным
            btn.classList.add('active');
            const tabContent = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });
}

/**
 * Загрузить информацию профиля
 */
async function loadProfileInfo() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    try {
        const rating = await Storage.getUserRating(currentUser.id);
        const chats = await Storage.getChatsForUser(currentUser.id);
        
        document.getElementById('profileName').textContent = currentUser.name;
        document.getElementById('profileAge').textContent = `${currentUser.age} лет`;
        document.getElementById('profileGender').textContent = GENDER_LABELS[currentUser.gender] || currentUser.gender;
        
        const ratingEl = document.getElementById('profileRating');
        ratingEl.textContent = rating.count > 0 ? rating.average : 'Нет оценок';
        
        const starsEl = document.getElementById('profileRatingStars');
        if (rating.count > 0) {
            const stars = Math.round(parseFloat(rating.average));
            starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
        } else {
            starsEl.textContent = '';
        }
        
        const interestsEl = document.getElementById('profileInterests');
        interestsEl.innerHTML = '';
        (currentUser.interests || []).forEach(interest => {
            const tag = document.createElement('span');
            tag.className = 'interest-tag';
            tag.textContent = interest;
            interestsEl.appendChild(tag);
        });
        
        document.getElementById('statTotalChats').textContent = chats.length;
        document.getElementById('statTotalRatings').textContent = rating.count;
        
        // Загружаем бейдж пользователя
        await loadUserBadge(currentUser.id);
    } catch (error) {
        console.error('Ошибка обновления экрана профиля:', error);
    }
}

/**
 * Загрузить бейдж пользователя
 */
export async function loadUserBadge(userId) {
    try {
        const { API_BASE_URL } = await import('../utils/api.js');
        const { getUserChatBadge } = await import('../utils/decorations.js');
        
        // Получаем бейдж на основе количества чатов
        const chatBadge = await getUserChatBadge(userId);
        
        // Получаем именной бейдж пользователя
        const customBadgeResponse = await fetch(`${API_BASE_URL}/api/users/${userId}/custom-badge`);
        let customBadge = null;
        if (customBadgeResponse.ok) {
            const customBadgeData = await customBadgeResponse.json();
            customBadge = customBadgeData.badge;
        }
        
        const badgeTextEl = document.getElementById('profileBadgeText');
        const badgeDateEl = document.getElementById('profileBadgeDate');
        
        if (!badgeTextEl || !badgeDateEl) return;
        
        if (customBadge && customBadge.is_active === 1) {
            // Показываем именной бейдж
            badgeTextEl.innerHTML = `<span class="user-chat-badge badge-custom" style="background: ${customBadge.badge_color || '#4caf50'}">${customBadge.badge_text}</span>`;
            const createdDate = new Date(customBadge.created_at);
            badgeDateEl.textContent = `Получен: ${createdDate.toLocaleDateString('ru-RU')}`;
            badgeDateEl.style.display = 'block';
        } else if (chatBadge) {
            // Показываем бейдж на основе количества чатов
            badgeTextEl.innerHTML = `<span class="user-chat-badge badge-${chatBadge.type}">${chatBadge.name}</span>`;
            badgeDateEl.textContent = 'Автоматический бейдж';
            badgeDateEl.style.display = 'block';
        } else {
            badgeTextEl.textContent = 'Нет бейджа';
            badgeDateEl.style.display = 'none';
        }
    } catch (error) {
        console.error('Ошибка загрузки бейджа:', error);
        const badgeTextEl = document.getElementById('profileBadgeText');
        if (badgeTextEl) {
            badgeTextEl.textContent = 'Ошибка загрузки';
        }
    }
}

/**
 * Загрузить бейджи профиля
 */
async function loadProfileBadges() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    try {
        const badges = await getUserBadges();
        const activeTitle = await getUserActiveTitle();
        const container = document.getElementById('profileBadgesList');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (badges.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>У вас пока нет бейджей</p></div>';
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
            
            if (badge.badge_type === 'title' && !badge.is_active) {
                badgeEl.addEventListener('click', async () => {
                    await setActiveTitle(badge.id);
                    await loadProfileBadges();
                });
            }
            
            container.appendChild(badgeEl);
        });
    } catch (error) {
        console.error('Ошибка загрузки бейджей:', error);
    }
}

/**
 * Загрузить задания профиля
 */
async function loadProfileQuests() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    try {
        const quests = await getUserQuests();
        const container = document.getElementById('profileQuestsList');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (quests.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Нет доступных заданий</p></div>';
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
    } catch (error) {
        console.error('Ошибка загрузки заданий:', error);
    }
}

// Глобальная функция для получения награды за задание
window.claimQuestReward = async function(questId) {
    const { claimQuestReward } = await import('./quests.js');
    const result = await claimQuestReward(questId);
    
    if (result) {
        alert(`Вы получили ${result.coins_reward} монет!`);
        await loadProfileQuests();
        
        // Обновляем баланс монет
        const currentUser = Storage.getCurrentUser();
        if (currentUser) {
            const user = await Storage.getUser(currentUser.id);
            if (user) {
                Storage.setCurrentUser(user);
                // Обновляем отображение баланса
                const coinsElements = document.querySelectorAll('.coins-amount');
                coinsElements.forEach(el => {
                    el.textContent = user.coins || 0;
                });
            }
        }
    }
};
