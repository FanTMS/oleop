/**
 * Модуль работы с чатами через API
 */

import { Storage } from '../utils/storage.js';
import { formatTime, createMessageElement, scrollToBottom } from '../components/ui.js';
import { hapticFeedback } from '../utils/telegram.js';
import { showRatingModal } from './rating.js';
import { getWebSocketClient } from './search.js';
import { API_BASE_URL } from '../utils/api.js';

/**
 * Загрузка списка чатов
 */
export async function loadChatsList() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;

    try {
        const chats = await Storage.getChatsForUser(currentUser.id);
        const container = document.getElementById('chatsList');

        if (!chats || chats.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h3>Нет активных чатов</h3>
                    <p>Начните поиск собеседника на главной странице</p>
                </div>
            `;
            updateChatsBadge();
            return;
        }

        // Разделяем чаты на активные и завершенные
        const activeChats = chats.filter(chat => !chat.is_completed);
        const completedChats = chats.filter(chat => chat.is_completed);

        // Сортируем: чат с администратором всегда первый
        const ADMIN_ID = 'system_admin_001';
        activeChats.sort((a, b) => {
            const aIsAdmin = a.user1_id === ADMIN_ID || a.user2_id === ADMIN_ID;
            const bIsAdmin = b.user1_id === ADMIN_ID || b.user2_id === ADMIN_ID;
            if (aIsAdmin && !bIsAdmin) return -1;
            if (!aIsAdmin && bIsAdmin) return 1;
            return 0;
        });

        container.innerHTML = '';

        // Создаем секцию активных чатов
        if (activeChats.length > 0) {
            const activeSection = document.createElement('div');
            activeSection.className = 'chats-section';

            const activeHeader = document.createElement('div');
            activeHeader.className = 'chats-section-header';
            activeHeader.textContent = 'Активные чаты';
            activeSection.appendChild(activeHeader);

            const activeList = document.createElement('div');
            activeList.className = 'chats-section-list';

            for (const chat of activeChats) {
                const chatItem = await createChatItem(chat, currentUser);
                activeList.appendChild(chatItem);
            }

            activeSection.appendChild(activeList);
            container.appendChild(activeSection);
        }

        // Создаем секцию завершенных чатов
        if (completedChats.length > 0) {
            const completedSection = document.createElement('div');
            completedSection.className = 'chats-section';

            const completedHeader = document.createElement('div');
            completedHeader.className = 'chats-section-header';
            completedHeader.textContent = 'Завершенные чаты';
            completedSection.appendChild(completedHeader);

            const completedList = document.createElement('div');
            completedList.className = 'chats-section-list';

            for (const chat of completedChats) {
                const chatItem = await createChatItem(chat, currentUser, true);
                completedList.appendChild(chatItem);
            }

            completedSection.appendChild(completedList);
            container.appendChild(completedSection);
        }

        // Если нет ни активных, ни завершенных чатов
        if (activeChats.length === 0 && completedChats.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h3>Нет чатов</h3>
                    <p>Начните поиск собеседника на главной странице</p>
                </div>
            `;
        }

        // Обновляем badge после загрузки чатов
        updateChatsBadge();
    } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
        const container = document.getElementById('chatsList');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Ошибка загрузки чатов</h3>
                <p>Попробуйте обновить страницу</p>
            </div>
        `;
    }
}

/**
 * Создание элемента чата
 */
async function createChatItem(chat, currentUser, isCompleted = false) {
    const partnerId = chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id;
    const partnerName = chat.user1_id === currentUser.id ? chat.user2_name : chat.user1_name;
    const partnerAge = chat.user1_id === currentUser.id ? chat.user2_age : chat.user1_age;

    const lastMessage = chat.lastMessage || null;
    const unreadCount = isCompleted ? 0 : Storage.getUnreadCount(chat.id);

    // Проверяем, является ли это чатом с администратором
    const ADMIN_ID = 'system_admin_001';
    const isAdminChat = partnerId === ADMIN_ID || chat.user1_id === ADMIN_ID || chat.user2_id === ADMIN_ID;

    const chatItem = document.createElement('div');
    chatItem.className = `chat-item ${isCompleted ? 'chat-item-completed' : ''} ${isAdminChat ? 'chat-item-admin' : ''}`;
    chatItem.dataset.chatId = chat.id;
    chatItem.style.cursor = 'pointer';

    // Форматируем имя партнера с украшениями и бейджем
    let formattedPartnerName = partnerName;
    const { formatUserName } = await import('../utils/decorations.js');
    if (chat.partner_decorations) {
        formattedPartnerName = await formatUserName(partnerName, chat.partner_decorations, partnerId);
    } else {
        formattedPartnerName = await formatUserName(partnerName, {}, partnerId);
    }

    chatItem.innerHTML = `
        <div class="chat-item-info">
            <div class="chat-item-name">
                ${isAdminChat ? '<span class="admin-chat-icon">🛟</span>' : ''}
                ${formattedPartnerName} 
                ${isAdminChat ? '<span class="admin-chat-badge">Поддержка</span>' : ''}
                ${isCompleted ? '<span class="chat-completed-badge">Завершен</span>' : ''}
            </div>
            <div class="chat-item-preview">${lastMessage ? lastMessage.text : 'Нет сообщений'}</div>
        </div>
        <div class="chat-item-meta">
            ${unreadCount > 0 ? `<div class="chat-item-unread">${unreadCount > 99 ? '99+' : unreadCount}</div>` : ''}
            <div class="chat-item-time">${lastMessage ? formatTime(lastMessage.created_at) : ''}</div>
        </div>
    `;

    // Добавляем обработчик клика
    chatItem.addEventListener('click', () => {
        import('./chat.js').then(module => {
            module.openChat(chat.id);
        });
    });

    return chatItem;
}

/**
 * Обновление badge чатов с учетом непрочитанных сообщений
 */
export function updateChatsBadge() {
    const badge = document.getElementById('chatsBadge');
    if (!badge) return;

    // Подсчитываем общее количество непрочитанных сообщений только для активных чатов
    let totalUnread = 0;
    const currentUser = Storage.getCurrentUser();

    if (currentUser) {
        Storage.getChatsForUser(currentUser.id).then(chats => {
            // Учитываем только активные (незавершенные) чаты
            const activeChats = chats.filter(chat => !chat.is_completed);
            activeChats.forEach(chat => {
                const unreadCount = Storage.getUnreadCount(chat.id);
                totalUnread += unreadCount;
            });

            if (totalUnread > 0) {
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }).catch(error => {
            console.error('Ошибка обновления badge:', error);
        });
    }
}

/**
 * Открытие чата
 */
export async function openChat(chatId, partnerData = null) {
    try {
        console.log('Открытие чата:', chatId, partnerData);

        const currentUser = Storage.getCurrentUser();
        if (!currentUser) {
            console.error('Пользователь не авторизован');
            return;
        }

        // Устанавливаем текущий чат
        Storage.setCurrentChat(chatId);

        // Скрываем все экраны
        const authScreen = document.getElementById('authScreen');
        const mainApp = document.getElementById('mainApp');
        const adminScreen = document.getElementById('adminScreen');
        const activeChatScreen = document.getElementById('activeChatScreen');

        console.log('Состояние экранов до переключения:', {
            authScreen: authScreen?.classList.contains('active'),
            mainApp: mainApp?.classList.contains('active'),
            adminScreen: adminScreen?.classList.contains('active'),
            activeChatScreen: activeChatScreen?.classList.contains('active')
        });

        if (authScreen) authScreen.classList.remove('active');
        if (mainApp) mainApp.classList.remove('active');
        if (adminScreen) adminScreen.classList.remove('active');

        // Показываем экран активного чата
        if (activeChatScreen) {
            activeChatScreen.classList.add('active');

            // Скрываем нижнюю навигацию на экране активного чата
            const bottomNav = document.querySelector('.bottom-nav');
            if (bottomNav) {
                bottomNav.style.display = 'none';
            }
            console.log('Экран активного чата показан, класс active:', activeChatScreen.classList.contains('active'));
            console.log('Стили экрана:', {
                display: window.getComputedStyle(activeChatScreen).display,
                visibility: window.getComputedStyle(activeChatScreen).visibility,
                opacity: window.getComputedStyle(activeChatScreen).opacity
            });
        } else {
            console.error('Экран activeChatScreen не найден!');
        }

        // Сначала получаем актуальную информацию о чате из API
        let isCompleted = false;
        try {
            const chats = await Storage.getChatsForUser(currentUser.id);
            const chat = chats.find(c => c.id === chatId);

            if (chat) {
                const partnerId = chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id;
                const partnerName = chat.user1_id === currentUser.id ? chat.user2_name : chat.user1_name;
                const partnerAge = chat.user1_id === currentUser.id ? chat.user2_age : chat.user1_age;
                const partnerInterests = chat.user1_id === currentUser.id
                    ? (chat.user2_interests ? JSON.parse(chat.user2_interests) : [])
                    : (chat.user1_interests ? JSON.parse(chat.user1_interests) : []);

                // Проверяем, является ли это чатом с администратором
                const ADMIN_ID = 'system_admin_001';
                const isAdminChat = partnerId === ADMIN_ID || chat.user1_id === ADMIN_ID || chat.user2_id === ADMIN_ID;

                // Применяем decorations к имени в заголовке чата
                const partnerDecorations = chat.user1_id === currentUser.id
                    ? (chat.user2_decorations ? JSON.parse(chat.user2_decorations) : {})
                    : (chat.user1_decorations ? JSON.parse(chat.user1_decorations) : {});

                const { formatUserName } = await import('../utils/decorations.js');
                const formattedPartnerName = await formatUserName(partnerName, partnerDecorations, partnerId);

                document.getElementById('chatPartnerName').innerHTML = formattedPartnerName;

                // Формируем информацию о партнере с интересами
                const chatPartnerInfo = document.getElementById('chatPartnerInfo');
                if (isAdminChat) {
                    chatPartnerInfo.textContent = 'Техническая поддержка';
                } else {
                    let infoText = '';
                    if (partnerInterests && partnerInterests.length > 0) {
                        const interestsText = partnerInterests.slice(0, 3).join(', ');
                        infoText = interestsText;
                        if (partnerInterests.length > 3) {
                            infoText += ` +${partnerInterests.length - 3}`;
                        }
                    }
                    chatPartnerInfo.textContent = infoText || 'Анонимный пользователь';
                }

                // Загружаем и отображаем статус партнера
                if (!isAdminChat) {
                    await updatePartnerStatus(partnerId);

                    // Обновляем статус каждые 10 секунд для актуальности
                    const statusInterval = setInterval(async () => {
                        const currentChatId = Storage.getCurrentChat();
                        if (currentChatId === chatId) {
                            await updatePartnerStatus(partnerId);
                        } else {
                            clearInterval(statusInterval);
                        }
                    }, 10000);

                    // Сохраняем interval для очистки при закрытии чата
                    window.chatStatusInterval = statusInterval;
                }

                // Скрываем кнопку игры в чате с администратором
                const gamesButton = document.querySelector('.btn-games');
                if (gamesButton) {
                    gamesButton.style.display = isAdminChat ? 'none' : 'flex';
                }

                // Проверяем статус завершенности чата
                // Убеждаемся, что для нового чата статус всегда false
                isCompleted = chat.is_completed === true || chat.is_completed === 1;
                // Дополнительная проверка: если чат только что создан, он не может быть завершен
                if (isCompleted && chat.created_at) {
                    const createdAt = new Date(chat.created_at);
                    const now = new Date();
                    // Если чат создан менее 1 секунды назад, считаем его активным
                    if (now - createdAt < 1000) {
                        isCompleted = false;
                        console.log('Чат только что создан, устанавливаем статус как активный');
                    }
                }
                console.log('Статус чата из API:', { is_completed: chat.is_completed, isCompleted, chatId, isAdminChat, created_at: chat.created_at });

                // Применяем тему чата
                await applyChatTheme(currentUser.id, partnerId);
            } else {
                // Если чат не найден в списке, используем данные партнера из WebSocket
                if (partnerData) {
                    document.getElementById('chatPartnerName').textContent = partnerData.name || 'Собеседник';
                    document.getElementById('chatPartnerInfo').textContent = 'Загрузка...';
                } else {
                    document.getElementById('chatPartnerName').textContent = 'Собеседник';
                    document.getElementById('chatPartnerInfo').textContent = 'Загрузка...';
                }
                console.log('Чат не найден в списке, используем данные партнера из WebSocket');

                // Пытаемся применить тему, если известен ID партнера
                if (partnerData && partnerData.id) {
                    await applyChatTheme(currentUser.id, partnerData.id);
                } else {
                    // Применяем только тему текущего пользователя
                    await applyChatTheme(currentUser.id, null);
                }
            }
        } catch (error) {
            console.log('Не удалось загрузить информацию о чате, используем данные из WebSocket:', error);
            if (partnerData) {
                document.getElementById('chatPartnerName').textContent = partnerData.name || 'Собеседник';
                document.getElementById('chatPartnerInfo').textContent = 'Загрузка...';

                // Пытаемся применить тему, если известен ID партнера
                if (partnerData.id) {
                    await applyChatTheme(currentUser.id, partnerData.id);
                } else {
                    await applyChatTheme(currentUser.id, null);
                }
            } else {
                document.getElementById('chatPartnerName').textContent = 'Собеседник';
                document.getElementById('chatPartnerInfo').textContent = 'Загрузка...';
                // Применяем только тему текущего пользователя
                await applyChatTheme(currentUser.id, null);
            }
        }

        // Загружаем сообщения (это также обновит информацию о завершенности)
        await loadChatMessages(chatId);

        // Проверяем завершенность чата из контейнера сообщений (актуальные данные)
        // Но только если чат был найден в списке чатов (для новых чатов используем статус из API)
        const container = document.getElementById('messagesContainer');
        if (container && container.dataset.isCompleted === 'true') {
            // Дополнительно проверяем через API для точности
            try {
                const chatInfo = await Storage.getChatInfo(chatId);
                isCompleted = chatInfo.isCompleted === true || chatInfo.isCompleted === 1;
                console.log('Статус чата из API после загрузки сообщений:', { isCompleted, chatId });
            } catch (error) {
                console.error('Ошибка проверки статуса чата:', error);
                // Если ошибка, используем значение из контейнера
                isCompleted = container.dataset.isCompleted === 'true';
            }
        } else {
            // Если чат новый и нет данных в контейнере, проверяем через API
            try {
                const chatInfo = await Storage.getChatInfo(chatId);
                isCompleted = chatInfo.isCompleted === true || chatInfo.isCompleted === 1;
                console.log('Статус нового чата из API:', { isCompleted, chatId });
            } catch (error) {
                console.error('Ошибка проверки статуса нового чата:', error);
                isCompleted = false; // По умолчанию чат активен
            }
        }

        // Отмечаем сообщения как прочитанные при открытии чата
        await Storage.markMessagesAsRead(chatId);
        updateChatsBadge();

        // Проверяем, является ли это чатом с администратором
        const ADMIN_ID = 'system_admin_001';
        let isAdminChat = false;
        try {
            const chats = await Storage.getChatsForUser(currentUser.id);
            const chat = chats.find(c => c.id === chatId);
            if (chat) {
                const partnerId = chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id;
                isAdminChat = partnerId === ADMIN_ID || chat.user1_id === ADMIN_ID || chat.user2_id === ADMIN_ID;
            }
        } catch (error) {
            console.error('Ошибка проверки чата:', error);
        }

        // Скрываем кнопку игры в чате с администратором
        const gamesButton = document.querySelector('.btn-games');
        if (gamesButton) {
            gamesButton.style.display = isAdminChat ? 'none' : 'flex';
        }

        // Блокируем поле ввода если чат завершен (но не для чата с администратором)
        if (isCompleted && !isAdminChat) {
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
        } else {
            const input = document.getElementById('messageInput');
            const sendButton = document.querySelector('[data-action="send-message"]');
            const endChatButton = document.querySelector('.btn-end-chat');

            if (input) {
                input.disabled = false;
                input.placeholder = isAdminChat ? 'Напишите администратору...' : 'Введите сообщение...';
            }
            if (sendButton) {
                sendButton.disabled = false;
            }
            // Скрываем кнопку завершения для чата с администратором
            if (endChatButton) {
                endChatButton.style.display = isAdminChat ? 'none' : 'block';
            }
        }

        // НЕ обновляем список чатов здесь, чтобы избежать повторного открытия
        // await loadChatsList();

        hapticFeedback('light');

        // Принудительно устанавливаем стили для гарантии видимости
        if (activeChatScreen) {
            activeChatScreen.style.display = 'flex';
            activeChatScreen.style.flexDirection = 'column';
            activeChatScreen.style.height = '100%';
            activeChatScreen.style.width = '100%';
            activeChatScreen.style.position = 'fixed';
            activeChatScreen.style.top = '0';
            activeChatScreen.style.left = '0';
            activeChatScreen.style.zIndex = '100';
            console.log('Принудительно установлены стили для экрана чата');
        }

        // Настраиваем обработчик новых сообщений через WebSocket
        // Обработчик уже настроен в search.js, здесь мы просто убеждаемся, что сообщения обновляются
        const wsClient = getWebSocketClient();
        if (wsClient && wsClient.onNewMessage) {
            // Сохраняем существующий обработчик
            const originalHandler = wsClient.onNewMessage;
            wsClient.onNewMessage = async (message) => {
                // Вызываем оригинальный обработчик из search.js
                await originalHandler(message);
                // Если это сообщение для текущего чата, обновляем сообщения
                if (message.chat_id === chatId) {
                    await loadChatMessages(chatId);
                }
            };
        }

        console.log('Чат успешно открыт:', chatId);
    } catch (error) {
        console.error('Ошибка открытия чата:', error);
    }
}

/**
 * Закрытие активного чата
 */
export function closeActiveChat() {
    const activeChatScreen = document.getElementById('activeChatScreen');
    const mainApp = document.getElementById('mainApp');

    console.log('Закрытие активного чата');

    // Сбрасываем тему чата при закрытии
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
        chatContainer.removeAttribute('data-theme');
    }

    // Показываем кнопку игры при закрытии чата
    const gamesButton = document.querySelector('.btn-games');
    if (gamesButton) {
        gamesButton.style.display = 'flex';
    }

    // Очищаем интервал обновления статуса
    if (window.chatStatusInterval) {
        clearInterval(window.chatStatusInterval);
        window.chatStatusInterval = null;
    }

    // Удаляем текущий чат из хранилища
    Storage.setCurrentChat(null);

    // Скрываем экран активного чата и убираем все принудительные стили
    if (activeChatScreen) {
        activeChatScreen.classList.remove('active');
        // Убираем все принудительные inline стили
        activeChatScreen.style.display = 'none';
        activeChatScreen.style.flexDirection = '';
        activeChatScreen.style.height = '';
        activeChatScreen.style.width = '';
        activeChatScreen.style.position = '';
        activeChatScreen.style.top = '';
        activeChatScreen.style.left = '';
        activeChatScreen.style.zIndex = '';
        console.log('Экран чата скрыт, стили удалены');
    }

    // Показываем главное приложение
    if (mainApp) {
        mainApp.classList.add('active');
        console.log('Главное приложение показано');
    }

    // Показываем нижнюю навигацию при возврате в главное приложение
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = 'flex';
    }

    // Переключаемся на экран чатов
    import('./navigation.js').then(module => {
        module.showScreen('chats');
    });

    // Тактильная обратная связь
    import('../utils/telegram.js').then(module => {
        module.hapticFeedback('light');
    });
}

/**
 * Загрузка сообщений чата
 */
export async function loadChatMessages(chatId) {
    try {
        const chatInfo = await Storage.getChatInfo(chatId);
        const messages = chatInfo.messages || [];
        // Убеждаемся, что для нового чата статус всегда false
        let isCompleted = chatInfo.isCompleted === true || chatInfo.isCompleted === 1;
        
        // Дополнительная проверка: если чат только что создан и нет сообщений, он не может быть завершен
        if (isCompleted && messages.length === 0) {
            console.log('Чат новый без сообщений, устанавливаем статус как активный');
            isCompleted = false;
        }
        
        const container = document.getElementById('messagesContainer');
        const currentUser = Storage.getCurrentUser();

        container.innerHTML = '';

        if (!messages || messages.length === 0) {
            container.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-icon">💬</div>
                    <h3>Начните общение</h3>
                    <p>Отправьте первое сообщение</p>
                </div>
            `;
            // Для нового чата без сообщений не показываем уведомление о завершении
            // Устанавливаем статус как активный для нового чата
            container.dataset.isCompleted = 'false';
            return;
        }

        const readMessages = Storage.getReadMessages();

        // Загружаем информацию о подарках и ответах для сообщений
        for (const msg of messages) {
            const isOwn = msg.user_id === currentUser.id;
            const messageData = {
                id: msg.id,
                userId: msg.user_id,
                username: msg.username,
                text: msg.text,
                timestamp: msg.created_at,
                time: new Date(msg.created_at).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                reply_to: msg.reply_to,
                gift_id: msg.gift_id
            };

            // Если есть ответ, получаем информацию о сообщении-ответе
            if (msg.reply_to) {
                const replyMsg = messages.find(m => m.id === msg.reply_to);
                if (replyMsg) {
                    messageData.reply = {
                        id: replyMsg.id,
                        username: replyMsg.username,
                        text: replyMsg.text
                    };
                }
            }

            // Если есть подарок, получаем информацию о подарке
            if (msg.gift_id) {
                try {
                    const giftResponse = await fetch(`${API_BASE_URL}/api/chats/${chatId}/gifts/${msg.gift_id}`);
                    if (giftResponse.ok) {
                        const giftData = await giftResponse.json();
                        if (giftData.gift) {
                            messageData.gift = giftData.gift.item;
                            messageData.gift_message = giftData.gift.message;
                        }
                    }
                } catch (error) {
                    console.error('Ошибка загрузки информации о подарке:', error);
                }
            }

            const messageEl = createMessageElement(messageData, isOwn);
            container.appendChild(messageEl);
        }

        // Добавляем уведомление о завершении чата под всеми сообщениями
        if (isCompleted) {
            const completedDiv = document.createElement('div');
            completedDiv.className = 'chat-completed-notice';
            completedDiv.textContent = 'Чат был завершен';
            container.appendChild(completedDiv);
        }

        // Отмечаем все сообщения как прочитанные при загрузке
        messages.forEach(msg => {
            if (!readMessages.includes(msg.id)) {
                readMessages.push(msg.id);
            }
        });
        localStorage.setItem(Storage.keys.readMessages, JSON.stringify(readMessages));

        // Обновляем счетчик непрочитанных для этого чата
        Storage.updateUnreadCount(chatId, 0);

        // Сохраняем информацию о завершенности чата для использования в других функциях
        container.dataset.isCompleted = isCompleted ? 'true' : 'false';

        scrollToBottom();
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
    }
}

/**
 * Отправка сообщения
 */
export async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (!text) return;

    const currentUser = Storage.getCurrentUser();
    if (!currentUser) {
        import('./auth.js').then(module => {
            module.showAuthScreen();
        });
        return;
    }

    const chatId = Storage.getCurrentChat();
    if (!chatId) return;

    // Проверяем, завершен ли чат
    const container = document.getElementById('messagesContainer');
    if (container && container.dataset.isCompleted === 'true') {
        alert('Чат был завершен. Невозможно отправить сообщение.');
        return;
    }

    // Получаем информацию об ответе, если есть
    const replyPreview = document.getElementById('replyPreview');
    let replyToId = null;
    if (replyPreview && replyPreview.style.display !== 'none') {
        replyToId = replyPreview.dataset.replyToId || null;
    }

    try {
        await Storage.saveChatMessage(chatId, currentUser.id, text, replyToId);

        input.value = '';
        // Очищаем ответ
        if (replyPreview) {
            import('../components/ui.js').then(module => {
                module.clearReply();
            });
        }
        hapticFeedback('light');

        // Перезагружаем сообщения
        await loadChatMessages(chatId);

        // Отмечаем сообщения как прочитанные после отправки
        await Storage.markMessagesAsRead(chatId);
        updateChatsBadge();

        await loadChatsList();

        setTimeout(() => {
            scrollToBottom();
        }, 100);
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        if (error.message && error.message.includes('завершен')) {
            alert('Чат был завершен. Невозможно отправить сообщение.');
            // Перезагружаем сообщения, чтобы обновить состояние
            await loadChatMessages(chatId);
        } else {
            alert('Ошибка отправки сообщения. Попробуйте еще раз.');
        }
    }
}

// Переменные для индикатора печати
let typingTimeout = null;
let lastTypingTime = 0;

/**
 * Обработка ввода текста для индикатора печати
 */
export function handleTyping() {
    const input = document.getElementById('messageInput');
    if (!input) return;

    const chatId = Storage.getCurrentChat();
    if (!chatId) return;

    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;

    const now = Date.now();

    // Отправляем событие начала печати не чаще раза в 3 секунды
    if (now - lastTypingTime > 3000) {
        lastTypingTime = now;

        import('./search.js').then(searchModule => {
            const wsClient = searchModule.getWebSocketClient();
            if (wsClient) {
                wsClient.send({
                    type: 'typing_start',
                    chatId: chatId,
                    userId: currentUser.id
                });
            }
        });
    }

    // Очищаем предыдущий таймаут
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }

    // Устанавливаем новый таймаут для остановки печати
    typingTimeout = setTimeout(() => {
        import('./search.js').then(searchModule => {
            const wsClient = searchModule.getWebSocketClient();
            if (wsClient) {
                wsClient.send({
                    type: 'typing_stop',
                    chatId: chatId,
                    userId: currentUser.id
                });
            }
        });
    }, 2000);
}

/**
 * Показать индикатор печати
 */
export function showTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'flex';
        setTimeout(() => {
            scrollToBottom();
        }, 100);
    }
}

/**
 * Скрыть индикатор печати
 */
export function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

/**
 * Обработка события начала печати
 */
export function handleTypingStart(chatId, userId) {
    const currentChatId = Storage.getCurrentChat();
    if (chatId === currentChatId) {
        showTypingIndicator();
    }
}

/**
 * Обработка события остановки печати
 */
export function handleTypingStop(chatId, userId) {
    const currentChatId = Storage.getCurrentChat();
    if (chatId === currentChatId) {
        hideTypingIndicator();
    }
}

/**
 * Обновить статус партнера в чате
 */
export async function updatePartnerStatus(partnerId) {
    try {
        const { API_BASE_URL } = await import('../utils/api.js');

        // Получаем статус и время последней активности одним запросом
        const response = await fetch(`${API_BASE_URL}/api/users/${partnerId}/status`);
        if (!response.ok) {
            throw new Error('Ошибка получения статуса');
        }

        const data = await response.json();
        const status = data.status || 'offline';
        const lastSeen = data.last_seen || null;

        const statusElement = document.getElementById('chatPartnerStatus');
        if (!statusElement) return;

        const now = new Date();
        let statusText = '';

        if (status === 'online') {
            statusText = 'онлайн';
            statusElement.className = 'chat-partner-status status-online';
        } else if (status === 'away') {
            statusText = 'отошел';
            statusElement.className = 'chat-partner-status status-away';
        } else if (status === 'busy') {
            statusText = 'не беспокоить';
            statusElement.className = 'chat-partner-status status-busy';
        } else {
            // offline - показываем время последней активности
            if (lastSeen) {
                const lastSeenDate = new Date(lastSeen);
                const diffMs = now - lastSeenDate;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);

                // Если прошло менее 5 минут, показываем "был(а) только что"
                if (diffMins < 5) {
                    statusText = 'был(а) только что';
                } else if (diffMins < 60) {
                    statusText = `был(а) ${diffMins} ${diffMins === 1 ? 'минуту' : diffMins < 5 ? 'минуты' : 'минут'} назад`;
                } else if (diffHours < 24) {
                    statusText = `был(а) ${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'} назад`;
                } else {
                    statusText = `был(а) ${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'} назад`;
                }
            } else {
                statusText = 'офлайн';
            }
            statusElement.className = 'chat-partner-status status-offline';
        }

        statusElement.textContent = statusText;
    } catch (error) {
        console.error('Ошибка обновления статуса партнера:', error);
        const statusElement = document.getElementById('chatPartnerStatus');
        if (statusElement) {
            statusElement.textContent = 'офлайн';
            statusElement.className = 'chat-partner-status status-offline';
        }
    }
}

/**
 * Завершение чата
 */
export async function endChat(skipRating = false) {
    const chatId = Storage.getCurrentChat();
    if (!chatId) return;

    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;

    // Проверяем, является ли это чатом с администратором
    try {
        const chats = await Storage.getChatsForUser(currentUser.id);
        const chat = chats.find(c => c.id === chatId);
        const ADMIN_ID = 'system_admin_001';
        const isAdminChat = chat && (chat.user1_id === ADMIN_ID || chat.user2_id === ADMIN_ID);

        if (isAdminChat) {
            alert('Чат с администратором нельзя завершить. Это ваш канал технической поддержки.');
            return;
        }
    } catch (error) {
        console.error('Ошибка проверки чата:', error);
    }

    if (!skipRating && !confirm('Завершить этот чат? После завершения вы сможете оценить собеседника.')) {
        return;
    }

    try {
        // Вызываем API endpoint для завершения чата
        const API = await import('../utils/api.js');
        await API.endChat(chatId, currentUser.id);

        // Получаем информацию о чате
        const chats = await Storage.getChatsForUser(currentUser.id);
        const chat = chats.find(c => c.id === chatId);

        if (!chat) return;

        const partnerId = chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id;

        // Отправляем уведомление о завершении чата через WebSocket
        const wsClient = getWebSocketClient();
        if (wsClient) {
            wsClient.send({
                type: 'chat_ended',
                chatId: chatId,
                fromUserId: currentUser.id,
                toUserId: partnerId,
                skipRating: skipRating
            });
        }

        // Сбрасываем счетчик непрочитанных для завершенного чата
        Storage.updateUnreadCount(chatId, 0);

        // Перезагружаем сообщения, чтобы показать уведомление о завершении
        await loadChatMessages(chatId);

        // Блокируем поле ввода
        const input = document.getElementById('messageInput');
        const sendButton = document.querySelector('[data-action="send-message"]');
        if (input) {
            input.disabled = true;
            input.placeholder = 'Чат был завершен';
        }
        if (sendButton) {
            sendButton.disabled = true;
        }

        // Скрываем кнопку завершения чата
        const endChatButton = document.querySelector('.btn-end-chat');
        if (endChatButton) {
            endChatButton.style.display = 'none';
        }

        // Обновляем badge чатов
        updateChatsBadge();

        // Показываем модальное окно оценки только если не пропущено
        if (!skipRating) {
            showRatingModal(chatId);
        } else {
            // Если чат завершен из-за жалобы, закрываем активный чат и возвращаемся в список
            closeActiveChat();
        }

        // Обновляем список чатов
        await loadChatsList();
    } catch (error) {
        console.error('Ошибка завершения чата:', error);
        alert('Ошибка завершения чата. Попробуйте еще раз.');
    }
}

/**
 * Обработка нажатия клавиши Enter
 */
/**
 * Показать модальное окно подарков
 */
export async function showGiftModal() {
    const modal = document.getElementById('giftModal');
    if (!modal) return;

    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;

    try {
        // Получаем товары пользователя
        const response = await fetch(`${API_BASE_URL}/api/shop/user-items/${currentUser.id}`);
        if (!response.ok) throw new Error('Ошибка загрузки товаров');

        const data = await response.json();
        const items = data.items || [];

        const container = document.getElementById('giftItemsList');
        if (!container) return;

        container.innerHTML = '';

        if (items.length === 0) {
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.minHeight = '200px';
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-secondary); margin: 0;">У вас нет товаров для подарка</p>';
            modal.style.display = 'flex';
            return;
        }

        // Сбрасываем стили контейнера для нормального отображения товаров
        container.style.display = '';
        container.style.alignItems = '';
        container.style.justifyContent = '';
        container.style.minHeight = '';

        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'gift-item';
            // Используем item_id из базы данных или id из объекта
            const itemId = item.item_id || item.id;

            if (!itemId) {
                console.error('Товар без ID:', item);
                return;
            }

            // Устанавливаем data-атрибут правильно
            itemEl.setAttribute('data-item-id', itemId);
            itemEl.dataset.itemId = itemId;

            console.log('Создан элемент подарка:', { itemId, name: item.name });

            itemEl.innerHTML = `
                <div class="gift-item-icon">${item.icon || '🎁'}</div>
                <div class="gift-item-name">${item.name || 'Подарок'}</div>
            `;

            itemEl.addEventListener('click', () => {
                document.querySelectorAll('.gift-item').forEach(el => el.classList.remove('selected'));
                itemEl.classList.add('selected');
                const messageGroup = document.getElementById('giftMessageGroup');
                if (messageGroup) messageGroup.style.display = 'block';

                console.log('Выбран подарок:', {
                    itemId: itemEl.dataset.itemId,
                    name: item.name,
                    element: itemEl
                });
            });

            container.appendChild(itemEl);
        });

        modal.style.display = 'flex';

        // Сбрасываем состояние кнопки отправки
        const sendButton = document.getElementById('sendGiftButton');
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.textContent = 'Отправить';
        }

        // Сбрасываем флаг отправки (если он существует в глобальной области)
        if (window.isSendingGift !== undefined) {
            window.isSendingGift = false;
        }

        // Обработчик закрытия модального окна при клике вне его
        const closeOnOutsideClick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                modal.removeEventListener('click', closeOnOutsideClick);
            }
        };
        modal.addEventListener('click', closeOnOutsideClick);
    } catch (error) {
        console.error('Ошибка загрузки товаров для подарка:', error);
        alert('Ошибка загрузки товаров');
    }
}

export function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

/**
 * Применить тему чата на основе активных тем участников
 */
async function applyChatTheme(currentUserId, partnerId) {
    try {
        const chatContainer = document.querySelector('.chat-container');
        if (!chatContainer) return;

        // Получаем активные темы обоих пользователей
        let currentUserTheme = null;
        let partnerTheme = null;

        if (currentUserId) {
            currentUserTheme = await getUserActiveChatTheme(currentUserId);
        }

        if (partnerId) {
            partnerTheme = await getUserActiveChatTheme(partnerId);
        }

        // Выбираем тему: сначала партнера (если есть), потом текущего пользователя, иначе сброс
        const selectedTheme = partnerTheme || currentUserTheme || null;

        if (selectedTheme) {
            chatContainer.setAttribute('data-theme', selectedTheme);
        } else {
            chatContainer.removeAttribute('data-theme');
        }
    } catch (error) {
        console.error('Ошибка применения темы чата:', error);
    }
}

/**
 * Получить активную тему чата пользователя
 */
async function getUserActiveChatTheme(userId) {
    if (!userId) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}/items`);
        const data = await response.json();

        if (!data.items) return null;

        // Ищем активную тему чата
        const chatTheme = data.items.find(item =>
            item.item_type === 'chat_theme' && item.is_active === 1
        );

        return chatTheme ? chatTheme.item_value : null;
    } catch (error) {
        console.error('Ошибка получения темы пользователя:', error);
        return null;
    }
}
