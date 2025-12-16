/**
 * Модуль системы рейтинга через API
 */

import { Storage } from '../utils/storage.js';
import { hapticFeedback, hapticNotification } from '../utils/telegram.js';
import { closeActiveChat } from './chat.js';

let currentRating = 0;

/**
 * Показать модальное окно оценки
 */
export async function showRatingModal(chatId) {
    try {
        const chats = await Storage.getChatsForUser(Storage.getCurrentUser().id);
        const chat = chats.find(c => c.id === chatId);
        
        if (!chat) return;
        
        const currentUser = Storage.getCurrentUser();
        const partnerId = chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id;
        
        document.getElementById('ratingModal').dataset.chatId = chatId;
        document.getElementById('ratingModal').dataset.partnerId = partnerId;
        document.getElementById('ratingModal').classList.add('active');
        currentRating = 0;
        updateRatingStars(0);
    } catch (error) {
        console.error('Ошибка показа модального окна оценки:', error);
    }
}

/**
 * Закрыть модальное окно оценки
 */
export function closeRatingModal() {
    document.getElementById('ratingModal').classList.remove('active');
    const chatId = document.getElementById('ratingModal').dataset.chatId;
    if (chatId) {
        closeActiveChat();
    }
}

/**
 * Установить рейтинг
 */
export function setRating(rating) {
    currentRating = rating;
    updateRatingStars(rating);
    document.getElementById('submitRatingBtn').disabled = false;
    hapticFeedback('light');
}

/**
 * Обновить отображение звезд
 */
function updateRatingStars(rating) {
    const stars = document.querySelectorAll('.star-btn');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
}

/**
 * Отправить оценку
 */
export async function submitRating() {
    if (currentRating === 0) return;
    
    const modal = document.getElementById('ratingModal');
    const chatId = modal.dataset.chatId;
    const partnerId = modal.dataset.partnerId;
    const currentUser = Storage.getCurrentUser();
    
    if (chatId && partnerId && currentUser) {
        try {
            await Storage.saveRating(currentUser.id, partnerId, currentRating);
            closeRatingModal();
            hapticNotification('success');
            
            // Обновляем профиль
            import('./profile.js').then(module => {
                module.updateProfileScreen();
                module.updateProfilePreview();
            });
        } catch (error) {
            console.error('Ошибка отправки рейтинга:', error);
            alert('Ошибка отправки рейтинга. Попробуйте еще раз.');
        }
    }
}
