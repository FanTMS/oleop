/**
 * Модуль навигации между экранами
 */

import { Storage } from '../utils/storage.js';
import { hapticFeedback } from '../utils/telegram.js';
import { updateProfilePreview } from './profile.js';
import { loadChatsList, updateChatsBadge } from './chat.js';

/**
 * Показать главное приложение
 */
export function showMainApp() {
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    document.getElementById('activeChatScreen').classList.remove('active');
    
    // Показываем нижнюю навигацию
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = 'flex';
    }
    
    const currentUser = Storage.getCurrentUser();
    if (currentUser) {
        updateProfilePreview();
        loadChatsList().then(() => {
            updateChatsBadge();
        });
        
        // Скрываем админ-панель для не-админов
        updateAdminNavVisibility(currentUser);
    }
    
    // Показываем главный экран по умолчанию
    showScreen('home');
}

/**
 * Обновить видимость админ-панели в навигации
 */
export async function updateAdminNavVisibility(user) {
    const adminNavButton = document.querySelector('.nav-item[data-screen="admin"]');
    if (!adminNavButton) return;
    
    try {
        // Проверяем, является ли пользователь администратором
        const userData = await Storage.getUser(user.id);
        const isAdmin = userData?.is_admin === 1 || userData?.is_admin === true;
        
        if (isAdmin) {
            adminNavButton.style.display = 'flex';
        } else {
            adminNavButton.style.display = 'none';
        }
    } catch (error) {
        console.error('Ошибка проверки прав администратора:', error);
        adminNavButton.style.display = 'none';
    }
}

/**
 * Навигация между экранами приложения
 */
export function showScreen(screenName) {
    // Скрываем все экраны
    document.querySelectorAll('.app-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Показываем нужный экран
    const screenMap = {
        'home': 'homeScreen',
        'chats': 'chatsScreen',
        'shop': 'shopScreen',
        'profile': 'profileScreen'
    };
    
    const screenId = screenMap[screenName];
    if (screenId) {
        document.getElementById(screenId).classList.add('active');
    }
    
    // Обновляем навигацию
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`.nav-item[data-screen="${screenName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Обновляем данные при переходе
    if (screenName === 'chats') {
        loadChatsList().then(() => {
            updateChatsBadge();
        });
    } else if (screenName === 'profile') {
        import('./profile.js').then(module => {
            module.updateProfileScreen();
        });
    } else if (screenName === 'shop') {
        import('./shop.js').then(module => {
            module.loadShopScreen();
        });
    } else if (screenName === 'home') {
        updateProfilePreview();
        import('./shop.js').then(module => {
            module.updateCoinsBalance('homeCoinsBalance');
        });
    }
    
    hapticFeedback('light');
}

/**
 * Выход из приложения
 */
export function handleLogout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        const currentUser = Storage.getCurrentUser();
        if (currentUser) {
            Storage.removeOnlineUser(currentUser.id);
            Storage.removeFromSearchQueue(currentUser.id);
            Storage.setCurrentChat(null);
        }
        Storage.setCurrentUser(null);
        
        import('./search.js').then(module => {
            module.stopSearching();
        });
        
        import('./auth.js').then(module => {
            module.showAuthScreen();
        });
        
        import('../utils/telegram.js').then(module => {
            module.hapticNotification('warning');
        });
    }
}

