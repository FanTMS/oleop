/**
 * UI компоненты и утилиты
 */

/**
 * Показать сообщение об ошибке
 */
export function showError(message, containerId = 'authError') {
    const errorEl = document.getElementById(containerId);
    if (!errorEl) return;
    
    errorEl.textContent = message;
    errorEl.classList.add('show');
    setTimeout(() => {
        errorEl.classList.remove('show');
    }, 5000);
}

/**
 * Очистить сообщение об ошибке
 */
export function clearError(containerId = 'authError') {
    const errorEl = document.getElementById(containerId);
    if (errorEl) {
        errorEl.classList.remove('show');
    }
}

/**
 * Форматирование времени
 */
export function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

/**
 * Прокрутка к низу контейнера
 */
export function scrollToBottom(containerId = 'messagesContainer') {
    const container = document.getElementById(containerId);
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

/**
 * Создание элемента сообщения
 */
export function createMessageElement(message, isOwn) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    messageDiv.dataset.id = message.id;
    messageDiv.dataset.messageId = message.id;
    
    // Если это подарок
    if (message.gift_id || message.gift) {
        const giftDiv = document.createElement('div');
        giftDiv.className = 'message-gift';
        if (message.gift) {
            giftDiv.innerHTML = `
                <div class="gift-icon">${message.gift.icon || '🎁'}</div>
                <div class="gift-info">
                    <div class="gift-name">${isOwn ? 'Вы подарили' : message.username + ' подарил(а)'}: ${message.gift.name}</div>
                    ${message.gift_message ? `<div class="gift-message">${message.gift_message}</div>` : ''}
                </div>
            `;
        }
        messageDiv.appendChild(giftDiv);
    } else {
        // Обычное сообщение
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        // Если есть ответ на сообщение
        if (message.reply_to || message.reply) {
            const replyDiv = document.createElement('div');
            replyDiv.className = 'message-reply';
            if (message.reply) {
                replyDiv.innerHTML = `
                    <div class="reply-line"></div>
                    <div class="reply-content">
                        <div class="reply-author">${message.reply.username || 'Собеседник'}</div>
                        <div class="reply-text">${message.reply.text || ''}</div>
                    </div>
                `;
            }
            bubble.appendChild(replyDiv);
        }
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = message.text;
        bubble.appendChild(textDiv);
        
        const info = document.createElement('div');
        info.className = 'message-info';
        
        const author = document.createElement('span');
        author.className = 'message-author';
        if (isOwn) {
            author.textContent = 'Вы';
        } else {
            // Применяем украшения и бейдж к имени
            import('../utils/decorations.js').then(async (module) => {
                const decorations = message.decorations || {};
                const userId = message.user_id || null;
                author.innerHTML = await module.formatUserName(message.username, decorations, userId);
            });
        }
        
        const time = document.createElement('span');
        time.className = 'message-time';
        time.textContent = message.time || formatTime(message.timestamp);
        
        info.appendChild(author);
        info.appendChild(time);
        
        messageDiv.appendChild(bubble);
        messageDiv.appendChild(info);
        
        // Добавляем обработчик клика для ответа (только на чужие сообщения)
        if (!isOwn) {
            bubble.style.cursor = 'pointer';
            bubble.addEventListener('click', () => {
                setReplyMessage(message);
            });
        }
    }
    
    return messageDiv;
}

/**
 * Установить сообщение для ответа
 */
export function setReplyMessage(message) {
    const replyPreview = document.getElementById('replyPreview');
    const replyAuthor = replyPreview?.querySelector('.reply-author');
    const replyText = replyPreview?.querySelector('.reply-text');
    
    if (replyPreview && replyAuthor && replyText) {
        replyAuthor.textContent = message.username || 'Собеседник';
        replyText.textContent = message.text || '';
        replyPreview.style.display = 'flex';
        replyPreview.dataset.replyToId = message.id;
        replyPreview.dataset.replyToText = message.text || '';
        replyPreview.dataset.replyToUsername = message.username || '';
    }
}

/**
 * Очистить ответ на сообщение
 */
export function clearReply() {
    const replyPreview = document.getElementById('replyPreview');
    if (replyPreview) {
        replyPreview.style.display = 'none';
        delete replyPreview.dataset.replyToId;
        delete replyPreview.dataset.replyToText;
        delete replyPreview.dataset.replyToUsername;
    }
}

/**
 * Предотвращение зума на iOS
 */
export function preventIOSZoom() {
    const inputs = document.querySelectorAll('input[type="text"], input[type="number"], textarea, select');
    inputs.forEach(input => {
        if (input.type !== 'number' && input.type !== 'checkbox') {
            input.style.fontSize = '16px';
        }
        
        input.addEventListener('focus', () => {
            setTimeout(() => {
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    });
}

