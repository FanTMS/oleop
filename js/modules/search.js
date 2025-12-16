/**
 * Модуль поиска собеседника через API и WebSocket
 */

import { Storage } from '../utils/storage.js';
import { WebSocketClient } from '../utils/api.js';
import { hapticNotification, hapticFeedback } from '../utils/telegram.js';
import { openChat } from './chat.js';

let wsClient = null;

/**
 * Инициализация WebSocket соединения
 */
export function initWebSocket() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser || wsClient) return;
    
    wsClient = new WebSocketClient(currentUser.id);
    
    // Обработчик решения жалобы
    wsClient.onReportResolved = (data) => {
        console.log('Жалоба обработана:', data);
        const { verdict, message } = data;
        const verdictText = verdict === 'approved' ? 'одобрена' : 'отклонена';
        const fullMessage = message ? `\n\nСообщение администратора:\n${message}` : '';
        alert(`Ваша жалоба ${verdictText}.${fullMessage}`);
    };
    
    // Обработчик найденной пары
    wsClient.onMatchFound = async (data) => {
        console.log('Найдена пара!', data);
        const { chatId, partner } = data;
        
        if (!chatId) {
            console.error('Ошибка: chatId не передан в событии match_found');
            return;
        }
        
        console.log('Данные партнера:', partner);
        console.log('Рейтинг партнера:', partner?.rating);
        
        hapticNotification('success');
        
        // Останавливаем поиск
        await stopSearching();
        
        // Скрываем статус поиска
        const searchStatus = document.getElementById('searchStatus');
        if (searchStatus) {
            searchStatus.style.display = 'none';
        }
        
        // Сохраняем данные о найденной паре для модального окна
        Storage.setCurrentChat(chatId);
        window.matchFoundData = { chatId, partner };
        
        // Показываем модальное окно найденной пары
        showMatchFoundModal(partner);
    };
    
    // Обработчик запроса на игру
    wsClient.onGameRequest = (data) => {
        console.log('Получен запрос на игру:', data);
        import('./gameUI.js').then(module => {
            module.handleGameRequest(data);
        });
    };
    
    // Обработчик ответа на запрос игры
    wsClient.onGameRequestResponse = (data) => {
        console.log('Получен ответ на запрос игры:', data);
        import('./gameUI.js').then(module => {
            module.handleGameRequestResponse(data);
        });
    };
    
    // Обработчик результата игры RPS
    wsClient.onRPSResult = (data) => {
        console.log('Получен результат игры RPS:', data);
        import('./gameUI.js').then(module => {
            module.displayRPSResult(data.result);
        });
    };
    
    // Обработчик обновления игры крестики-нолики
    wsClient.onTTTUpdate = (data) => {
        console.log('Получено обновление игры TTT:', data);
        import('./gameUI.js').then(module => {
            module.handleTTTUpdate(data);
        });
    };
    
    // Обработчик результата игры крестики-нолики
    wsClient.onTTTResult = (data) => {
        console.log('Получен результат игры TTT:', data);
        import('./gameUI.js').then(module => {
            // Данные приходят напрямую, без обертки в result
            module.displayTTTResult(data);
        });
    };
    
    // Обработчик ошибки игры крестики-нолики
    wsClient.onTTTError = (data) => {
        console.log('Ошибка игры TTT:', data);
        if (data.error) {
            alert(data.error);
        }
    };
    
    // Обработчик индикатора печати (старый формат для совместимости)
    wsClient.onTyping = (data) => {
        const { chatId } = data;
        const currentChatId = Storage.getCurrentChat();
        if (chatId === currentChatId) {
            import('./chat.js').then(module => {
                module.showTypingIndicator();
            });
        }
    };

    // Обработчик начала печати
    wsClient.onTypingStart = (data) => {
        const { chatId, userId } = data;
        import('./chat.js').then(module => {
            module.handleTypingStart(chatId, userId);
        });
    };

    // Обработчик остановки печати
    wsClient.onTypingStop = (data) => {
        const { chatId, userId } = data;
        import('./chat.js').then(module => {
            module.handleTypingStop(chatId, userId);
        });
    };
    
    // Обработчик обновления статуса пользователя
    wsClient.onUserStatusUpdate = (data) => {
        const { userId, status } = data;
        const currentChatId = Storage.getCurrentChat();
        if (currentChatId) {
            // Получаем информацию о текущем чате
            Storage.getChatsForUser(Storage.getCurrentUser()?.id).then(chats => {
                const chat = chats.find(c => c.id === currentChatId);
                if (chat) {
                    const partnerId = chat.user1_id === Storage.getCurrentUser()?.id ? chat.user2_id : chat.user1_id;
                    if (partnerId === userId) {
                        import('./chat.js').then(module => {
                            module.updatePartnerStatus(userId);
                        });
                    }
                }
            });
        }
    };

    // Обработчик завершения чата
    wsClient.onChatEnded = (data) => {
        console.log('Чат завершен:', data);
        const { chatId } = data;
        
        const currentChatId = Storage.getCurrentChat();
        
        // Если чат открыт, обновляем его состояние
        if (currentChatId === chatId) {
            import('./chat.js').then(module => {
                // Перезагружаем сообщения, чтобы показать уведомление о завершении
                module.loadChatMessages(chatId);
                
                // Блокируем поле ввода
                const input = document.getElementById('messageInput');
                const sendButton = document.querySelector('[data-action="send-message"]');
                const endChatButton = document.querySelector('.btn-end-chat');
                
                if (input) {
                    input.disabled = true;
                    input.placeholder = 'Чат был завершен';
                }
                if (sendButton) {
                    sendButton.disabled = true;
                }
                if (endChatButton) {
                    endChatButton.style.display = 'none';
                }
            });
        }
        
        // Показываем модальное окно оценки только если не пропущено
        if (!data.skipRating) {
            import('./rating.js').then(module => {
                module.showRatingModal(chatId);
            });
        }
        
        // Обновляем список чатов
        import('./chat.js').then(module => {
            module.loadChatsList();
        });
        
        hapticNotification('warning');
    };
    
    // Обработчик новых сообщений для обновления badge
    wsClient.onNewMessage = async (message) => {
        const currentChatId = Storage.getCurrentChat();
        const currentUser = Storage.getCurrentUser();
        
        if (!currentUser) return;
        
        // Проверяем, не завершен ли чат
        try {
            const chats = await Storage.getChatsForUser(currentUser.id);
            const chat = chats.find(c => c.id === message.chat_id);
            
            // Если чат завершен, не обрабатываем сообщение
            if (chat && chat.is_completed) {
                return;
            }
        } catch (error) {
            console.error('Ошибка проверки завершенности чата:', error);
        }
        
        // Если сообщение не в текущем открытом чате, увеличиваем счетчик непрочитанных
        if (message.chat_id !== currentChatId) {
            Storage.incrementUnreadCount(message.chat_id);
            
            // Показываем уведомление о новом сообщении
            hapticNotification('success');
            
            // Обновляем список чатов и badge
            import('./chat.js').then(module => {
                module.loadChatsList();
                module.updateChatsBadge();
            });
        } else {
            // Если чат открыт, добавляем сообщение в контейнер и отмечаем как прочитанное
            // Проверяем, не является ли это сообщением от текущего пользователя (чтобы избежать дублирования)
            if (message.user_id !== currentUser.id) {
                const chatModule = await import('./chat.js');
                await chatModule.loadChatMessages(message.chat_id);
                
                Storage.markMessagesAsRead(message.chat_id);
                chatModule.updateChatsBadge();
                
                // Тактильная обратная связь при получении сообщения в открытом чате
                hapticFeedback('light');
            } else {
                // Если это сообщение от текущего пользователя, просто обновляем badge
                const chatModule = await import('./chat.js');
                chatModule.updateChatsBadge();
            }
        }
    };
    
    wsClient.connect();
}

/**
 * Начать поиск собеседника
 */
export async function startSearching() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    // Проверяем наличие активного чата
    const hasActiveChat = await Storage.hasActiveChat();
    if (hasActiveChat) {
        alert('У вас есть активный чат. Завершите его перед началом нового поиска.');
        hapticNotification('warning');
        return;
    }
    
    // Инициализируем WebSocket если еще не инициализирован
    if (!wsClient) {
        initWebSocket();
    }
    
    document.getElementById('searchStatus').style.display = 'block';
    
    try {
        await Storage.addToSearchQueue(currentUser.id);
        
        // Отправляем команду начала поиска через WebSocket
        if (wsClient) {
            wsClient.send({
                type: 'start_search'
            });
        }
        
        hapticNotification('success');
    } catch (error) {
        console.error('Ошибка начала поиска:', error);
        document.getElementById('searchStatus').style.display = 'none';
    }
}

/**
 * Показать модальное окно найденной пары
 */
export async function showMatchFoundModal(partner) {
    const modal = document.getElementById('matchFoundModal');
    const nameEl = document.getElementById('matchPartnerName');
    const ratingEl = document.getElementById('matchPartnerRating');
    
    if (!modal || !nameEl || !ratingEl) {
        console.error('Элементы модального окна не найдены');
        return;
    }
    
    // Форматируем имя партнера с украшениями
    const { formatUserName } = await import('../utils/decorations.js');
    const partnerName = partner.name || 'Собеседник';
    const decorations = partner.decorations || {};
    const formattedName = await formatUserName(partnerName, decorations, partner.id);
    
    // Устанавливаем имя партнера с украшениями
    nameEl.innerHTML = `Ваш собеседник: ${formattedName}`;
    
    // Устанавливаем рейтинг
    let rating = 0;
    if (partner.rating !== undefined && partner.rating !== null) {
        rating = Number(partner.rating);
    }
    
    const ratingText = rating > 0 ? rating.toFixed(1) : '0.0';
    console.log('Рейтинг партнера в модальном окне:', { 
        rating, 
        ratingText, 
        partnerRating: partner.rating,
        partnerData: partner,
        decorations: decorations
    });
    ratingEl.textContent = `Рейтинг: ⭐ ${ratingText}`;
    
    // Показываем модальное окно
    modal.classList.add('active');
}

/**
 * Перейти в чат найденной пары
 */
export async function goToMatchedChat() {
    const modal = document.getElementById('matchFoundModal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    if (window.matchFoundData) {
        const { chatId, partner } = window.matchFoundData;
        
        // Обновляем список чатов перед открытием, чтобы получить актуальную информацию
        const { loadChatsList } = await import('./chat.js');
        await loadChatsList();
        
        // Небольшая задержка для гарантии обновления данных
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await openChat(chatId, partner);
        delete window.matchFoundData;
    }
}

/**
 * Остановить поиск
 */
export async function stopSearching() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    try {
        await Storage.removeFromSearchQueue(currentUser.id);
        
        // Отправляем команду остановки поиска через WebSocket
        if (wsClient) {
            wsClient.send({
                type: 'stop_search'
            });
        }
        
        document.getElementById('searchStatus').style.display = 'none';
    } catch (error) {
        console.error('Ошибка остановки поиска:', error);
    }
}

/**
 * Создание чата между двумя пользователями
 */
export async function createChat(user1Id, user2Id) {
    try {
        const { createChat: createChatAPI } = await import('../utils/api.js');
        const chat = await createChatAPI(user1Id, user2Id);
        
        // Открываем чат
        openChat(chat.id);
        
        // Обновляем список чатов
        import('./chat.js').then(module => {
            module.loadChatsList();
        });
    } catch (error) {
        console.error('Ошибка создания чата:', error);
    }
}

/**
 * Получить WebSocket клиент
 */
export function getWebSocketClient() {
    return wsClient;
}
