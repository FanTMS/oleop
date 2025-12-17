/**
 * Главный файл приложения
 * Инициализация всех модулей
 */

import { initTelegram, updateViewportHeight } from './utils/telegram.js';
import { Storage } from './utils/storage.js';
import { preventIOSZoom } from './components/ui.js';
import { showMainApp, showScreen, handleLogout } from './modules/navigation.js';
import { showAuthScreen, showStep, initInterests, nextStep, prevStep, handleRegister } from './modules/auth.js';
import { sendMessage, handleKeyPress, endChat, closeActiveChat } from './modules/chat.js';
import { startSearching, stopSearching, goToMatchedChat } from './modules/search.js';
import { setRating, submitRating, closeRatingModal } from './modules/rating.js';
import { showGamesMenu, closeGamesMenu, makeRPSChoice, resetRPSGame, closeRPSGame, makeTTTChoice, resetTTTGame, closeTTTGame, startGame } from './modules/gameUI.js';
import { showAdminLogin, loginAdmin, logoutAdmin, showAdminStats, showAdminUsers, showAdminChats, showAdminReports, showAdminBot, showAdminAdmins } from './modules/adminUI.js';
import { initWebSocket } from './modules/search.js';
import { showReportModal, closeReportModal, submitReport, updateReportCharCount } from './modules/reports.js';
import { checkDailyBonus, showDailyBonusModal, closeDailyBonusModal } from './modules/dailyBonus.js';
import { getUserQuests, claimQuestReward } from './modules/quests.js';
import { getUserBadges, setActiveTitle } from './modules/badges.js';
import { updateUserStatus } from './modules/userStatus.js';

// Инициализация Telegram Web App
initTelegram();

// Принудительная светлая тема
document.documentElement.style.colorScheme = 'light';
document.documentElement.style.setProperty('color-scheme', 'light');
document.body.style.backgroundColor = '#ffffff';

// Глобальные функции должны быть доступны ДО загрузки DOM для onclick атрибутов
// Используем немедленно выполняемую функцию для гарантии доступности
(function() {
    'use strict';
    
    // Убеждаемся, что функции доступны сразу (до загрузки DOM)
    window.nextStep = function() {
        try {
            console.log('nextStep called from window (early)');
            return nextStep();
        } catch (e) {
            console.error('Error in nextStep (early):', e);
            // Если модуль еще не загружен, пробуем через динамический импорт
            import('./modules/auth.js').then(module => {
                module.nextStep();
            });
        }
    };
    
    window.prevStep = function() {
        try {
            console.log('prevStep called from window (early)');
            return prevStep();
        } catch (e) {
            console.error('Error in prevStep (early):', e);
            import('./modules/auth.js').then(module => {
                module.prevStep();
            });
        }
    };
    
    window.handleRegister = function() {
        try {
            console.log('handleRegister called from window (early)');
            return handleRegister();
        } catch (e) {
            console.error('Error in handleRegister (early):', e);
            import('./modules/auth.js').then(module => {
                module.handleRegister();
            });
        }
    };
    
    console.log('Early window functions set:', {
        nextStep: typeof window.nextStep,
        prevStep: typeof window.prevStep,
        handleRegister: typeof window.handleRegister
    });
})();

// Глобальные функции для HTML (добавляем сразу, чтобы были доступны в onclick)
// Обертки с проверкой для надежности
window.showScreen = (...args) => {
    try {
        return showScreen(...args);
    } catch (e) {
        console.error('Error in showScreen:', e);
    }
};

window.sendMessage = async (...args) => {
    try {
        return await sendMessage(...args);
    } catch (e) {
        console.error('Error in sendMessage:', e);
    }
};

window.handleKeyPress = (...args) => {
    try {
        return handleKeyPress(...args);
    } catch (e) {
        console.error('Error in handleKeyPress:', e);
    }
};

window.handleLogout = (...args) => {
    try {
        return handleLogout(...args);
    } catch (e) {
        console.error('Error in handleLogout:', e);
    }
};

window.startSearching = (...args) => {
    try {
        return startSearching(...args);
    } catch (e) {
        console.error('Error in startSearching:', e);
    }
};

window.stopSearching = (...args) => {
    try {
        return stopSearching(...args);
    } catch (e) {
        console.error('Error in stopSearching:', e);
    }
};

window.endChat = (...args) => {
    try {
        return endChat(...args);
    } catch (e) {
        console.error('Error in endChat:', e);
    }
};

window.setRating = (...args) => {
    try {
        return setRating(...args);
    } catch (e) {
        console.error('Error in setRating:', e);
    }
};

window.submitRating = (...args) => {
    try {
        return submitRating(...args);
    } catch (e) {
        console.error('Error in submitRating:', e);
    }
};

window.closeRatingModal = (...args) => {
    try {
        return closeRatingModal(...args);
    } catch (e) {
        console.error('Error in closeRatingModal:', e);
    }
};

window.closeActiveChat = (...args) => {
    try {
        return closeActiveChat(...args);
    } catch (e) {
        console.error('Error in closeActiveChat:', e);
    }
};

window.showAdminLogin = showAdminLogin;
window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;
window.showAdminStats = showAdminStats;
window.showAdminUsers = showAdminUsers;
window.showAdminChats = showAdminChats;
window.showAdminReports = showAdminReports;
window.showAdminAdmins = showAdminAdmins;
window.showAdminBot = showAdminBot;

// Функции для чатов
window.openChat = async (chatId) => {
    try {
        const { openChat: openChatFunc } = await import('./modules/chat.js');
        await openChatFunc(chatId);
    } catch (error) {
        console.error('Ошибка открытия чата:', error);
    }
};

window.closeActiveChat = () => {
    import('./modules/chat.js').then(module => {
        module.closeActiveChat();
    });
};

window.sendMessage = () => {
    import('./modules/chat.js').then(module => {
        module.sendMessage();
    });
};

window.endChat = () => {
    import('./modules/chat.js').then(module => {
        module.endChat();
    });
};

window.showReportModal = showReportModal;
window.closeReportModal = closeReportModal;
window.submitReport = submitReport;

// Переопределяем функции после загрузки модулей (для прямых вызовов)
window.nextStep = function(...args) {
    try {
        console.log('nextStep called from window (after load)');
        return nextStep(...args);
    } catch (e) {
        console.error('Error in nextStep:', e);
    }
};

window.prevStep = function(...args) {
    try {
        console.log('prevStep called from window (after load)');
        return prevStep(...args);
    } catch (e) {
        console.error('Error in prevStep:', e);
    }
};

window.handleRegister = function(...args) {
    try {
        console.log('handleRegister called from window (after load)');
        return handleRegister(...args);
    } catch (e) {
        console.error('Error in handleRegister:', e);
    }
};

// Функции для игр
window.showGamesMenu = showGamesMenu;
window.closeGamesMenu = closeGamesMenu;
window.makeRPSChoice = makeRPSChoice;
window.resetRPSGame = resetRPSGame;
window.closeRPSGame = closeRPSGame;
window.makeTTTChoice = makeTTTChoice;
window.resetTTTGame = resetTTTGame;
window.closeTTTGame = closeTTTGame;

// Функция для перехода в чат найденной пары
window.goToMatchedChat = goToMatchedChat;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Принудительная светлая тема при загрузке
    document.documentElement.style.colorScheme = 'light';
    document.documentElement.style.setProperty('color-scheme', 'light');
    document.body.style.backgroundColor = '#ffffff';
    
    // Переопределяем любые системные настройки темной темы
    const style = document.createElement('style');
    style.textContent = `
        * {
            color-scheme: light !important;
        }
        html, body {
            background-color: #ffffff !important;
            color: #1a1a1a !important;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg-color: #ffffff !important;
                --bg-secondary: #f5f5f5 !important;
                --text-color: #1a1a1a !important;
                --text-secondary: #6c6c6c !important;
                --border-color: #d0d0d0 !important;
                --message-bg: #f5f5f5 !important;
                --message-bg-own: #e8e8e8 !important;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Функция для скрытия загрузочного экрана
    function hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('active');
        }
    }
    
    // Небольшая задержка для плавного перехода (минимум 500мс для показа загрузки)
    const minLoadingTime = 500;
    const startTime = Date.now();
    
    const currentUser = Storage.getCurrentUser();
    
    if (currentUser) {
        // Проверяем блокировку пользователя
        import('./utils/api.js').then(async ({ checkUserBlockStatus }) => {
            try {
                const blockStatus = await checkUserBlockStatus(currentUser.id);
                
                if (blockStatus.isBlocked) {
                    const blockedUntil = new Date(blockStatus.blockedUntil);
                    const now = new Date();
                    const daysLeft = Math.ceil((blockedUntil - now) / (1000 * 60 * 60 * 24));
                    const hoursLeft = Math.ceil((blockedUntil - now) / (1000 * 60 * 60));
                    
                    let timeLeft = '';
                    if (daysLeft > 0) {
                        timeLeft = `${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}`;
                    } else if (hoursLeft > 0) {
                        timeLeft = `${hoursLeft} ${hoursLeft === 1 ? 'час' : hoursLeft < 5 ? 'часа' : 'часов'}`;
                    } else {
                        timeLeft = 'менее часа';
                    }
                    
                    // Ждем минимальное время загрузки
                    const elapsed = Date.now() - startTime;
                    const remainingTime = Math.max(0, minLoadingTime - elapsed);
                    await new Promise(resolve => setTimeout(resolve, remainingTime));
                    
                    hideLoadingScreen();
                    
                    alert(`Вы заблокированы!\n\nПричина: ${blockStatus.reason}\nБлокировка до: ${blockedUntil.toLocaleString('ru-RU')}\nОсталось: ${timeLeft}`);
                    Storage.clearCurrentUser();
                    import('./modules/auth.js').then(module => {
                        module.showAuthScreen();
                        module.showStep(1);
                    });
                    return;
                }
            } catch (error) {
                console.error('Ошибка проверки блокировки:', error);
            }
            
            // Ждем минимальное время загрузки
            const elapsed = Date.now() - startTime;
            const remainingTime = Math.max(0, minLoadingTime - elapsed);
            await new Promise(resolve => setTimeout(resolve, remainingTime));
            
            hideLoadingScreen();
            showMainApp();
            
            // Инициализируем WebSocket для поиска
            import('./modules/search.js').then(module => {
                module.initWebSocket();
            });
            
            // Обновляем badge уведомлений при загрузке
            import('./modules/chat.js').then(module => {
                module.updateChatsBadge();
            });
            
            // Устанавливаем статус онлайн при входе
            import('./modules/userStatus.js').then(module => {
                module.updateUserStatus('online');
            });
            
            // Обновляем статус при уходе со страницы
            window.addEventListener('beforeunload', () => {
                import('./modules/userStatus.js').then(module => {
                    module.updateUserStatus('offline');
                });
            });
            
            // Обновляем статус при возврате на страницу
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    import('./modules/userStatus.js').then(module => {
                        module.updateUserStatus('away');
                    });
                } else {
                    import('./modules/userStatus.js').then(module => {
                        module.updateUserStatus('online');
                    });
                }
            });
        });
    } else {
        // Ждем минимальное время загрузки
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsed);
        
        setTimeout(() => {
            hideLoadingScreen();
            // Показываем экран регистрации
            import('./modules/auth.js').then(module => {
                module.showAuthScreen();
                module.showStep(1);
            });
        }, remainingTime);
    }
    
    // Инициализация интересов
    initInterests();
    
    // Предотвращение зума на iOS
    preventIOSZoom();
    
    // Добавление обработчиков для кнопок регистрации (с небольшой задержкой для гарантии)
    setTimeout(() => {
        setupRegistrationButtons();
    }, 100);
    
    // Обработка Enter в полях формы регистрации
    const registerName = document.getElementById('registerName');
    const registerAge = document.getElementById('registerAge');
    const registerGender = document.getElementById('registerGender');
    
    if (registerName) {
        registerName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                import('./modules/auth.js').then(module => {
                    module.nextStep();
                });
            }
        });
    }
    
    if (registerAge) {
        registerAge.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                import('./modules/auth.js').then(module => {
                    module.nextStep();
                });
            }
        });
    }
    
    if (registerGender) {
        registerGender.addEventListener('change', () => {
            import('./components/ui.js').then(module => {
                module.clearError();
            });
            import('./utils/telegram.js').then(module => {
                module.hapticFeedback('light');
            });
        });
    }
    
    // Инициализация звезд рейтинга
    const starButtons = document.querySelectorAll('.star-btn');
    starButtons.forEach((btn, index) => {
        btn.addEventListener('click', () => setRating(index + 1));
    });
    
    // Обновление viewport при изменении размера
    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);
    
    // Оптимизация прокрутки для мобильных
    let isScrolling = false;
    const scrollContainers = document.querySelectorAll('.messages-container, #authScreen');
    scrollContainers.forEach(container => {
        container.addEventListener('scroll', () => {
            if (!isScrolling) {
                window.requestAnimationFrame(() => {
                    isScrolling = false;
                });
                isScrolling = true;
            }
        });
    });
    
    // Настройка обработчиков для игр
    setupGameListeners();
    
    // Настройка обработчиков для кнопок регистрации (уже настроено в DOMContentLoaded)
    // setupRegistrationButtons();
    
    // Обработчик для счетчика символов в жалобе
    const reportDescription = document.getElementById('reportDescription');
    if (reportDescription) {
        reportDescription.addEventListener('input', updateReportCharCount);
    }
    
    // Обработка кликов по элементам чата (делегирование событий)
    const chatsList = document.getElementById('chatsList');
    if (chatsList) {
        chatsList.addEventListener('click', async (e) => {
            const chatItem = e.target.closest('.chat-item');
            if (chatItem && chatItem.dataset.chatId) {
                e.preventDefault();
                e.stopPropagation();
                const chatId = chatItem.dataset.chatId;
                console.log('Открытие чата из списка:', chatId);
                try {
                    await window.openChat(chatId);
                } catch (error) {
                    console.error('Ошибка при открытии чата:', error);
                }
            }
        });
    }
});

/**
 * Настройка обработчиков для игр
 */
function setupGameListeners() {
    document.body.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.getAttribute('data-action');
        if (!action) return;
        
        switch (action) {
            case 'show-games-menu':
                e.preventDefault();
                showGamesMenu();
                break;
            case 'close-games-menu':
                e.preventDefault();
                closeGamesMenu();
                break;
            case 'start-game':
                e.preventDefault();
                const gameId = e.target.closest('.game-item')?.getAttribute('data-game-id');
                if (gameId) {
                    startGame(gameId);
                }
                break;
            case 'rps-choice':
                e.preventDefault();
                const choice = e.target.closest('.rps-choice')?.getAttribute('data-choice');
                if (choice) {
                    makeRPSChoice(choice);
                }
                break;
            case 'reset-rps-game':
                e.preventDefault();
                resetRPSGame();
                break;
            case 'close-rps-game':
                e.preventDefault();
                closeRPSGame();
                break;
            case 'reset-ttt-game':
                e.preventDefault();
                resetTTTGame();
                break;
            case 'close-ttt-game':
                e.preventDefault();
                closeTTTGame();
                break;
            case 'ttt-move':
                e.preventDefault();
                const position = parseInt(e.target.closest('.ttt-cell')?.getAttribute('data-position'));
                if (!isNaN(position)) {
                    makeTTTChoice(position);
                }
                break;
            case 'close-report-modal':
                e.preventDefault();
                closeReportModal();
                break;
            case 'submit-report':
                e.preventDefault();
                submitReport();
                break;
            case 'accept-game-request':
                e.preventDefault();
                import('./modules/gameUI.js').then(module => {
                    module.acceptGameRequest();
                });
                break;
            case 'reject-game-request':
                e.preventDefault();
                import('./modules/gameUI.js').then(module => {
                    module.rejectGameRequest();
                });
                break;
            case 'admin-login':
                e.preventDefault();
                loginAdmin();
                break;
            case 'admin-cancel':
                e.preventDefault();
                logoutAdmin();
                break;
            case 'admin-logout':
                e.preventDefault();
                logoutAdmin();
                break;
            case 'show-admin-stats':
                e.preventDefault();
                showAdminStats();
                break;
            case 'show-admin-users':
                e.preventDefault();
                showAdminUsers();
                break;
            case 'show-admin-chats':
                e.preventDefault();
                showAdminChats();
                break;
            case 'show-admin-bot':
                e.preventDefault();
                showAdminBot();
                break;
            case 'send-message':
                e.preventDefault();
                sendMessage();
                break;
            case 'show-gift-modal':
                e.preventDefault();
                import('./modules/chat.js').then(module => {
                    module.showGiftModal();
                });
                break;
        }
    });
    
    // Обработка Enter в поле ввода сообщения
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Обработка ввода для индикатора печати
        messageInput.addEventListener('input', () => {
            import('./modules/chat.js').then(module => {
                module.handleTyping();
            });
        });
    }
    
    // Глобальная функция для очистки ответа
    window.clearReply = function() {
        import('./components/ui.js').then(module => {
            module.clearReply();
        });
    };
    
    // Глобальная функция для закрытия модального окна подарков
    window.closeGiftModal = function() {
        const modal = document.getElementById('giftModal');
        if (modal) {
            modal.style.display = 'none';
            // Очищаем выбранный товар
            document.querySelectorAll('.gift-item').forEach(el => el.classList.remove('selected'));
            const messageGroup = document.getElementById('giftMessageGroup');
            if (messageGroup) messageGroup.style.display = 'none';
            const messageInput = document.getElementById('giftMessage');
            if (messageInput) messageInput.value = '';
        }
    };
    
    // Глобальная функция для отправки подарка
    let isSendingGift = false; // Флаг для защиты от двойной отправки
    
    window.sendGift = async function() {
        // Защита от двойной отправки
        if (isSendingGift) {
            return; // Уже отправляется
        }
        
        const sendButton = document.getElementById('sendGiftButton');
        const selectedItem = document.querySelector('.gift-item.selected');
        
        if (!selectedItem) {
            alert('Выберите подарок');
            return;
        }
        
        // Пробуем получить itemId разными способами
        let itemId = selectedItem.dataset.itemId || 
                     selectedItem.getAttribute('data-item-id') ||
                     selectedItem.dataset.itemid;
        
        const chatId = Storage.getCurrentChat();
        const currentUser = Storage.getCurrentUser();
        
        console.log('Отправка подарка:', { 
            itemId, 
            chatId, 
            currentUserId: currentUser?.id,
            selectedItem: selectedItem,
            dataset: selectedItem.dataset
        });
        
        if (!chatId || !currentUser) {
            alert('Ошибка: чат не найден');
            return;
        }
        
        if (!itemId || itemId === 'undefined' || itemId === 'null' || itemId === '') {
            alert('Ошибка: товар не выбран. Пожалуйста, выберите товар из списка.');
            console.error('itemId не найден или неверный:', itemId, 'dataset:', selectedItem.dataset);
            return;
        }
        
        // Блокируем повторную отправку
        window.isSendingGift = true;
        if (sendButton) {
            sendButton.disabled = true;
            sendButton.textContent = 'Отправка...';
        }
        
        try {
            const { API_BASE_URL } = await import('./utils/api.js');
            
            // Получаем информацию о чате из списка чатов пользователя
            const chats = await Storage.getChatsForUser(currentUser.id);
            const chat = chats.find(c => c.id === chatId);
            
            if (!chat || !chat.user1_id || !chat.user2_id) {
                alert('Ошибка: информация о чате не найдена');
                console.error('Чат не найден:', { chatId, chats, chat });
                return;
            }
            
            const partnerId = chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id;
            
            if (!partnerId) {
                alert('Ошибка: собеседник не найден');
                return;
            }
            
            const messageInput = document.getElementById('giftMessage');
            const message = messageInput ? messageInput.value.trim() : '';
            const messageToSend = message.length > 0 ? message : null;
            
            const requestBody = {
                fromUserId: currentUser.id,
                toUserId: partnerId,
                itemId: itemId,
                message: messageToSend
            };
            
            console.log('Отправка запроса:', requestBody);
            
            console.log('Отправка запроса на сервер:', {
                url: `${API_BASE_URL}/api/chats/${chatId}/gifts`,
                body: requestBody
            });
            
            const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/gifts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log('Ответ сервера:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Неизвестная ошибка' }));
                console.error('Ошибка сервера:', errorData);
                throw new Error(errorData.error || 'Ошибка отправки подарка');
            }
            
            const result = await response.json();
            
            // Закрываем модальное окно
            window.closeGiftModal();
            
            // Обновляем данные пользователя (включая decorations)
            const user = await Storage.getUser(currentUser.id);
            if (user) {
                Storage.setCurrentUser(user);
                const coinsElements = document.querySelectorAll('.coins-amount');
                coinsElements.forEach(el => {
                    el.textContent = user.coins || 0;
                });
            }
            
            // Перезагружаем товары магазина, если экран магазина открыт
            const shopScreen = document.getElementById('shopScreen');
            if (shopScreen && shopScreen.classList.contains('active')) {
                const { loadShopItems } = await import('./modules/shop.js');
                await loadShopItems();
            }
            
            // Перезагружаем сообщения один раз (сообщение уже создано на сервере)
            // Не нужно перезагружать дважды, так как это вызывает дублирование
            const { loadChatMessages } = await import('./modules/chat.js');
            await loadChatMessages(chatId);
            
            alert('Подарок успешно отправлен!');
        } catch (error) {
            console.error('Ошибка отправки подарка:', error);
            alert(error.message || 'Ошибка отправки подарка');
        } finally {
            // Разблокируем кнопку в любом случае
            window.isSendingGift = false;
            const sendBtn = document.getElementById('sendGiftButton');
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Отправить';
            }
        }
    };
}

/**
 * Настройка обработчиков для кнопок регистрации
 */
// Флаг для предотвращения множественных обработчиков
let registrationButtonsSetup = false;

function setupRegistrationButtons() {
    // Предотвращаем множественные обработчики
    if (registrationButtonsSetup) {
        console.log('Registration buttons already setup');
        return;
    }
    
    console.log('Setting up registration buttons...');
    
    // Используем делегирование событий через data-action атрибуты
    const authForm = document.getElementById('authScreen');
    if (!authForm) {
        console.warn('authScreen not found');
        return;
    }
    
    // Удаляем старый обработчик, если он был
    authForm.removeEventListener('click', handleRegistrationButtonClick);
    
    // Добавляем новый обработчик
    authForm.addEventListener('click', handleRegistrationButtonClick);
    
    registrationButtonsSetup = true;
    console.log('Registration buttons setup completed');
}

/**
 * Обработчик кликов на кнопки регистрации
 */
async function handleRegistrationButtonClick(e) {
    const target = e.target.closest('button[data-action]');
    if (!target) return;
    
    const action = target.getAttribute('data-action');
    if (!action) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Registration button clicked:', action);
    
    try {
        const authModule = await import('./modules/auth.js');
        
        switch(action) {
            case 'next':
                console.log('Calling nextStep');
                authModule.nextStep();
                break;
            case 'prev':
                console.log('Calling prevStep');
                authModule.prevStep();
                break;
            case 'register':
                console.log('Calling handleRegister');
                authModule.handleRegister();
                break;
        }
    } catch (error) {
        console.error('Error handling registration button:', error);
    }
}

// Очистка при закрытии
window.addEventListener('beforeunload', () => {
    const currentUser = Storage.getCurrentUser();
    if (currentUser) {
        Storage.removeOnlineUser(currentUser.id);
    }
});

