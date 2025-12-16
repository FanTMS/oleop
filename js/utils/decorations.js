/**
 * Утилиты для работы с украшениями профиля
 */

import { API_BASE_URL } from './api.js';

/**
 * Определить бейдж на основе количества чатов
 */
export function getChatBadge(chatCount) {
    if (chatCount < 5) {
        return { name: 'Новичок', type: 'novice', color: 'green' };
    } else if (chatCount < 10) {
        return { name: 'Опытный', type: 'experienced', color: 'orange' };
    } else {
        return { name: 'Эксперт', type: 'expert', color: 'red' };
    }
}

/**
 * Получить количество чатов пользователя и определить бейдж
 */
export async function getUserChatBadge(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}/chat-count`);
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        return getChatBadge(data.count || 0);
    } catch (error) {
        console.error('Ошибка получения бейджа пользователя:', error);
        return null;
    }
}

/**
 * Форматировать имя пользователя с украшениями и бейджем
 */
export async function formatUserName(name, decorations = {}, userId = null) {
    if (!name) return '';
    
    let formattedName = name;
    let badgeHtml = '';
    
    // Получаем бейдж на основе количества чатов (только если передан userId и это не администратор)
    const ADMIN_ID = 'system_admin_001';
    if (userId && userId !== ADMIN_ID) {
        try {
            // Сначала проверяем именной бейдж
            const customBadgeResponse = await fetch(`${API_BASE_URL}/api/users/${userId}/custom-badge`);
            let customBadge = null;
            if (customBadgeResponse.ok) {
                const customBadgeData = await customBadgeResponse.json();
                customBadge = customBadgeData.badge;
            }
            
            if (customBadge && customBadge.is_active === 1) {
                // Показываем именной бейдж
                badgeHtml = `<span class="user-chat-badge badge-custom" style="background: ${customBadge.badge_color || '#4caf50'}">${customBadge.badge_text}</span>`;
            } else {
                // Показываем бейдж на основе количества чатов
                const chatBadge = await getUserChatBadge(userId);
                if (chatBadge) {
                    badgeHtml = `<span class="user-chat-badge badge-${chatBadge.type}">${chatBadge.name}</span>`;
                }
            }
        } catch (error) {
            console.error('Ошибка получения бейджа:', error);
            // Продолжаем без бейджа, если произошла ошибка
        }
    }
    
    // Добавляем значки (badges) из decorations
    if (decorations.badge && Array.isArray(decorations.badge) && decorations.badge.length > 0) {
        const badgeIcons = {
            'crown': '👑',
            'star': '⭐',
            'diamond': '💎'
        };
        decorations.badge.forEach(badge => {
            if (badgeIcons[badge]) {
                badgeHtml += `<span class="user-badge badge-${badge}">${badgeIcons[badge]}</span>`;
            }
        });
    }
    
    // Применяем стили к имени
    if (decorations.nickname_style && Array.isArray(decorations.nickname_style) && decorations.nickname_style.length > 0) {
        const style = decorations.nickname_style[0]; // Используем первый стиль
        
        switch (style) {
            case 'fire':
                formattedName = `<span class="nickname-fire">${name}</span>`;
                break;
            case 'rainbow':
                formattedName = `<span class="nickname-rainbow">${name}</span>`;
                break;
            case 'golden':
                formattedName = `<span class="nickname-golden">${name}</span>`;
                break;
            case 'glow':
                formattedName = `<span class="nickname-glow">${name}</span>`;
                break;
            default:
                formattedName = name;
        }
    }
    
    // Возвращаем бейдж слева от имени с пробелом
    return badgeHtml ? badgeHtml + ' ' + formattedName : formattedName;
}

/**
 * Получить CSS классы для имени пользователя
 */
export function getUserNameClasses(decorations = {}) {
    const classes = [];
    
    if (decorations.nickname_style && Array.isArray(decorations.nickname_style) && decorations.nickname_style.length > 0) {
        classes.push(`nickname-${decorations.nickname_style[0]}`);
    }
    
    return classes.join(' ');
}

