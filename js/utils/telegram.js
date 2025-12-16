/**
 * Модуль для работы с Telegram Web App API
 */

let tg = window.Telegram?.WebApp;

/**
 * Инициализация Telegram Web App
 */
export function initTelegram() {
    if (!tg) return null;
    
    tg.ready();
    tg.expand();
    
    // Принудительная светлая тема - всегда белый цвет
    tg.setHeaderColor('#ffffff');
    tg.setBackgroundColor('#ffffff');
    
    // Принудительно устанавливаем светлую тему
    if (tg.setOptions) {
        tg.setOptions({
            themeParams: {
                bg_color: '#ffffff',
                text_color: '#1a1a1a',
                hint_color: '#6c6c6c',
                link_color: '#1a1a1a',
                button_color: '#1a1a1a',
                button_text_color: '#ffffff',
                secondary_bg_color: '#f5f5f5'
            }
        });
    }
    
    // Включение закрытия по свайпу
    tg.enableClosingConfirmation();
    
    // Настройка основной кнопки
    tg.MainButton.hide();
    
    // Обработка изменения размера viewport
    tg.onEvent('viewportChanged', () => {
        tg.expand();
        updateViewportHeight();
    });
    
    // Обработка изменения темы - принудительно переключаем на светлую
    tg.onEvent('themeChanged', () => {
        // Всегда принудительно устанавливаем светлую тему
        tg.setHeaderColor('#ffffff');
        tg.setBackgroundColor('#ffffff');
        
        if (tg.setOptions) {
            tg.setOptions({
                themeParams: {
                    bg_color: '#ffffff',
                    text_color: '#1a1a1a',
                    hint_color: '#6c6c6c',
                    link_color: '#1a1a1a',
                    button_color: '#1a1a1a',
                    button_text_color: '#ffffff',
                    secondary_bg_color: '#f5f5f5'
                }
            });
        }
    });
    
    // Установка начальной высоты
    updateViewportHeight();
    
    // Обновление при изменении размера окна
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', () => {
        setTimeout(updateViewportHeight, 100);
    });
    
    return tg;
}

/**
 * Обновление высоты viewport
 */
export function updateViewportHeight() {
    if (tg) {
        const viewportHeight = tg.viewportHeight;
        const viewportStableHeight = tg.viewportStableHeight;
        
        if (viewportHeight) {
            document.documentElement.style.setProperty('--tg-viewport-height', `${viewportHeight}px`);
            document.body.style.height = `${viewportHeight}px`;
        }
        
        if (viewportStableHeight) {
            document.documentElement.style.setProperty('--tg-viewport-stable-height', `${viewportStableHeight}px`);
        }
    } else {
        // Fallback для обычного браузера
        const vh = window.innerHeight;
        document.documentElement.style.setProperty('--tg-viewport-height', `${vh}px`);
        document.body.style.height = `${vh}px`;
    }
}

/**
 * Получить экземпляр Telegram Web App
 */
export function getTelegram() {
    return tg;
}

/**
 * Тактильная обратная связь
 */
export function hapticFeedback(type = 'light') {
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred(type);
    }
}

export function hapticNotification(type = 'success') {
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred(type);
    }
}

