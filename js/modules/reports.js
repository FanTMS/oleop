/**
 * Модуль работы с жалобами
 */

import { Storage } from '../utils/storage.js';
import { createReport } from '../utils/api.js';
import { hapticFeedback } from '../utils/telegram.js';

/**
 * Показать модальное окно жалобы
 */
export function showReportModal() {
    const modal = document.getElementById('reportModal');
    if (!modal) return;

    const currentUser = Storage.getCurrentUser();
    const chatId = Storage.getCurrentChat();

    if (!currentUser || !chatId) {
        alert('Ошибка: не удалось определить пользователя или чат');
        return;
    }

    // Получаем информацию о чате для определения нарушителя
    Storage.getChatsForUser(currentUser.id).then(chats => {
        const chat = chats.find(c => c.id === chatId);
        if (!chat) {
            alert('Чат не найден');
            return;
        }

        // Очищаем форму
        document.getElementById('reportReason').value = '';
        document.getElementById('reportDescription').value = '';
        document.getElementById('reportCharCount').textContent = '0';

        // Сохраняем ID нарушителя в data-атрибуте модального окна
        const reportedUserId = chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id;
        modal.dataset.reportedUserId = reportedUserId;
        modal.dataset.chatId = chatId;

        modal.classList.add('active');
        hapticFeedback('light');
    }).catch(error => {
        console.error('Ошибка получения информации о чате:', error);
        alert('Ошибка загрузки информации о чате');
    });
}

/**
 * Закрыть модальное окно жалобы
 */
export function closeReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Отправить жалобу
 */
export async function submitReport() {
    const modal = document.getElementById('reportModal');
    if (!modal) return;

    const reason = document.getElementById('reportReason').value;
    const description = document.getElementById('reportDescription').value.trim();
    const reportedUserId = modal.dataset.reportedUserId;
    const chatId = modal.dataset.chatId;

    if (!reason || !description) {
        alert('Пожалуйста, заполните все поля');
        return;
    }

    const currentUser = Storage.getCurrentUser();
    if (!currentUser) {
        alert('Ошибка: пользователь не авторизован');
        return;
    }

    try {
        await createReport(currentUser.id, reportedUserId, chatId, reason, description);
        
        // Автоматически завершаем чат без оценки
        const { endChat } = await import('./chat.js');
        await endChat(true); // true = пропустить оценку
        
        alert('Жалоба успешно отправлена. Чат был автоматически завершен. Администратор рассмотрит жалобу в ближайшее время.');
        closeReportModal();
        hapticFeedback('success');
    } catch (error) {
        console.error('Ошибка отправки жалобы:', error);
        alert('Ошибка отправки жалобы. Попробуйте еще раз.');
        hapticFeedback('error');
    }
}

/**
 * Обновить счетчик символов
 */
export function updateReportCharCount() {
    const textarea = document.getElementById('reportDescription');
    const counter = document.getElementById('reportCharCount');
    if (textarea && counter) {
        counter.textContent = textarea.value.length;
    }
}

