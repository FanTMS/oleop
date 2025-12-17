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
    
    // Инициализируем редактирование имени
    initNameEditing();
    
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
 * Загрузить информацию профиля из базы данных
 */
async function loadProfileInfo() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    try {
        // Загружаем актуальные данные пользователя из базы данных
        const { getUser } = await import('../utils/api.js');
        const userFromDB = await getUser(currentUser.id);
        
        // Обновляем данные пользователя в Storage
        const updatedUser = {
            ...currentUser,
            name: userFromDB.name,
            age: userFromDB.age,
            gender: userFromDB.gender,
            interests: userFromDB.interests || [],
            coins: userFromDB.coins || 0,
            rating_average: userFromDB.rating_average || 0,
            rating_count: userFromDB.rating_count || 0
        };
        Storage.setCurrentUser(updatedUser);
        
        // Получаем рейтинг и чаты
        const rating = await Storage.getUserRating(currentUser.id);
        const chats = await Storage.getChatsForUser(currentUser.id);
        
        // Обновляем имя в профиле
        const profileNameDisplay = document.getElementById('profileNameDisplay');
        const profileNameInput = document.getElementById('profileNameInput');
        if (profileNameDisplay) {
            profileNameDisplay.textContent = userFromDB.name;
        }
        if (profileNameInput) {
            profileNameInput.value = userFromDB.name;
        }
        
        // Обновляем аватар (первая буква имени)
        const profileAvatarInitial = document.getElementById('profileAvatarInitial');
        if (profileAvatarInitial) {
            profileAvatarInitial.textContent = userFromDB.name ? userFromDB.name.charAt(0).toUpperCase() : 'U';
        }
        
        // Старый элемент для совместимости
        const oldProfileName = document.getElementById('profileName');
        if (oldProfileName) {
            oldProfileName.textContent = userFromDB.name;
        }
        
        // Обновляем возраст
        const profileAgeEl = document.getElementById('profileAge');
        if (profileAgeEl) {
            profileAgeEl.textContent = `${userFromDB.age} лет`;
        }
        
        // Обновляем пол
        const profileGenderEl = document.getElementById('profileGender');
        if (profileGenderEl) {
            profileGenderEl.textContent = GENDER_LABELS[userFromDB.gender] || userFromDB.gender;
        }
        
        // Обновляем рейтинг
        const ratingEl = document.getElementById('profileRating');
        if (ratingEl) {
            ratingEl.textContent = rating.count > 0 ? rating.average : 'Нет оценок';
        }
        
        const starsEl = document.getElementById('profileRatingStars');
        if (starsEl) {
            if (rating.count > 0) {
                const stars = Math.round(parseFloat(rating.average));
                starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
            } else {
                starsEl.textContent = '';
            }
        }
        
        // Обновляем интересы
        const interestsEl = document.getElementById('profileInterests');
        if (interestsEl) {
            interestsEl.innerHTML = '';
            (userFromDB.interests || []).forEach(interest => {
                const tag = document.createElement('span');
                tag.className = 'interest-tag';
                tag.textContent = interest;
                interestsEl.appendChild(tag);
            });
        }
        
        // Обновляем статистику
        const statTotalChatsEl = document.getElementById('statTotalChats');
        if (statTotalChatsEl) {
            statTotalChatsEl.textContent = chats.length;
        }
        
        const statTotalRatingsEl = document.getElementById('statTotalRatings');
        if (statTotalRatingsEl) {
            statTotalRatingsEl.textContent = rating.count;
        }
        
        // Загружаем бейдж пользователя
        await loadUserBadge(currentUser.id);
    } catch (error) {
        console.error('Ошибка загрузки информации профиля:', error);
        // В случае ошибки используем данные из Storage
        const profileNameDisplay = document.getElementById('profileNameDisplay');
        if (profileNameDisplay && currentUser.name) {
            profileNameDisplay.textContent = currentUser.name;
        }
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

/**
 * Инициализация редактирования имени
 */
function initNameEditing() {
    const editBtn = document.getElementById('profileEditNameBtn');
    const nameDisplay = document.getElementById('profileNameDisplay');
    const nameEdit = document.getElementById('profileNameEdit');
    const nameInput = document.getElementById('profileNameInput');
    const saveBtn = document.getElementById('profileSaveNameBtn');
    const cancelBtn = document.getElementById('profileCancelNameBtn');
    
    if (!editBtn || !nameDisplay || !nameEdit || !nameInput || !saveBtn || !cancelBtn) {
        return;
    }
    
    editBtn.addEventListener('click', () => {
        nameDisplay.style.display = 'none';
        editBtn.style.display = 'none';
        nameEdit.style.display = 'flex';
        nameInput.focus();
        nameInput.select();
    });
    
    cancelBtn.addEventListener('click', () => {
        const currentUser = Storage.getCurrentUser();
        if (currentUser) {
            nameInput.value = currentUser.name;
        }
        nameDisplay.style.display = 'block';
        editBtn.style.display = 'flex';
        nameEdit.style.display = 'none';
    });
    
    saveBtn.addEventListener('click', async () => {
        const newName = nameInput.value.trim();
        const currentUser = Storage.getCurrentUser();
        
        if (!newName) {
            alert('Имя не может быть пустым');
            nameInput.focus();
            return;
        }
        
        if (newName === currentUser.name) {
            nameDisplay.style.display = 'block';
            editBtn.style.display = 'flex';
            nameEdit.style.display = 'none';
            return;
        }
        
        if (newName.length > 50) {
            alert('Имя не может быть длиннее 50 символов');
            nameInput.focus();
            return;
        }
        
        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Сохранение...';
            
            const { updateUserName } = await import('../utils/api.js');
            const response = await updateUserName(currentUser.id, newName);
            
            // Обновляем текущего пользователя
            const updatedUser = {
                ...currentUser,
                name: response.user.name
            };
            Storage.setCurrentUser(updatedUser);
            
            // Перезагружаем данные профиля из базы данных
            await loadProfileInfo();
            
            // Обновляем отображение
            nameDisplay.style.display = 'block';
            editBtn.style.display = 'flex';
            nameEdit.style.display = 'none';
            
            // Обновляем превью профиля
            await updateProfilePreview();
            
            saveBtn.disabled = false;
            saveBtn.textContent = 'Сохранить';
        } catch (error) {
            console.error('Ошибка обновления имени:', error);
            alert('Ошибка обновления имени: ' + (error.message || 'Неизвестная ошибка'));
            saveBtn.disabled = false;
            saveBtn.textContent = 'Сохранить';
        }
    });
    
    // Сохранение по Enter
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveBtn.click();
        } else if (e.key === 'Escape') {
            cancelBtn.click();
        }
    });
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
