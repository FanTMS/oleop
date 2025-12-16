// Инициализация Telegram Web App
let tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
    
    // Настройка цветовой схемы (белый деловой стиль)
    tg.setHeaderColor('#ffffff');
    tg.setBackgroundColor('#ffffff');
    
    // Включение закрытия по свайпу
    tg.enableClosingConfirmation();
    
    // Настройка основной кнопки (если нужно)
    tg.MainButton.hide();
    
    // Обработка изменения размера viewport
    tg.onEvent('viewportChanged', () => {
        tg.expand();
        updateViewportHeight();
    });
    
    // Обработка изменения темы
    tg.onEvent('themeChanged', () => {
        // Можно добавить логику для темной темы если нужно
    });
    
    // Установка начальной высоты
    updateViewportHeight();
    
    // Обновление при изменении размера окна
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', () => {
        setTimeout(updateViewportHeight, 100);
    });
}

// Функция для обновления высоты viewport
function updateViewportHeight() {
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

// Утилиты для работы с localStorage
const Storage = {
    users: 'chat_users',
    messages: 'chat_messages',
    chats: 'chat_chats',
    ratings: 'chat_ratings',
    searchQueue: 'chat_search_queue',
    currentUser: 'chat_current_user',
    currentChat: 'chat_current_chat',
    onlineUsers: 'chat_online_users',
    
    getUsers() {
        const data = localStorage.getItem(this.users);
        return data ? JSON.parse(data) : {};
    },
    
    saveUser(userData) {
        const users = this.getUsers();
        const userId = this.generateId();
        users[userId] = {
            name: userData.name,
            age: userData.age,
            gender: userData.gender,
            interests: userData.interests,
            createdAt: new Date().toISOString(),
            id: userId
        };
        localStorage.setItem(this.users, JSON.stringify(users));
        return users[userId];
    },
    
    getUser(userId) {
        const users = this.getUsers();
        return users[userId] || null;
    },
    
    getMessages() {
        const data = localStorage.getItem(this.messages);
        return data ? JSON.parse(data) : [];
    },
    
    saveMessage(message) {
        const messages = this.getMessages();
        messages.push(message);
        // Храним только последние 1000 сообщений
        if (messages.length > 1000) {
            messages.shift();
        }
        localStorage.setItem(this.messages, JSON.stringify(messages));
    },
    
    getCurrentUser() {
        const data = localStorage.getItem(this.currentUser);
        return data ? JSON.parse(data) : null;
    },
    
    setCurrentUser(user) {
        if (user) {
            localStorage.setItem(this.currentUser, JSON.stringify(user));
        } else {
            localStorage.removeItem(this.currentUser);
        }
    },
    
    addOnlineUser(userId) {
        const online = this.getOnlineUsers();
        if (!online.includes(userId)) {
            online.push(userId);
            localStorage.setItem(this.onlineUsers, JSON.stringify(online));
        }
    },
    
    removeOnlineUser(userId) {
        const online = this.getOnlineUsers();
        const index = online.indexOf(userId);
        if (index > -1) {
            online.splice(index, 1);
            localStorage.setItem(this.onlineUsers, JSON.stringify(online));
        }
    },
    
    getOnlineUsers() {
        const data = localStorage.getItem(this.onlineUsers);
        return data ? JSON.parse(data) : [];
    },
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // Работа с чатами
    getChats() {
        const data = localStorage.getItem(this.chats);
        return data ? JSON.parse(data) : {};
    },
    
    saveChat(chatId, chatData) {
        const chats = this.getChats();
        chats[chatId] = {
            ...chatData,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem(this.chats, JSON.stringify(chats));
        return chats[chatId];
    },
    
    getChat(chatId) {
        const chats = this.getChats();
        return chats[chatId] || null;
    },
    
    getChatsForUser(userId) {
        const chats = this.getChats();
        return Object.values(chats).filter(chat => 
            chat.user1Id === userId || chat.user2Id === userId
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },
    
    // Работа с рейтингами
    getRatings() {
        const data = localStorage.getItem(this.ratings);
        return data ? JSON.parse(data) : {};
    },
    
    saveRating(userId, ratedUserId, rating) {
        const ratings = this.getRatings();
        const key = `${userId}_${ratedUserId}`;
        ratings[key] = {
            userId,
            ratedUserId,
            rating,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem(this.ratings, JSON.stringify(ratings));
        return ratings[key];
    },
    
    getUserRating(userId) {
        const ratings = this.getRatings();
        const userRatings = Object.values(ratings).filter(r => r.ratedUserId === userId);
        if (userRatings.length === 0) return { average: 0, count: 0 };
        
        const sum = userRatings.reduce((acc, r) => acc + r.rating, 0);
        return {
            average: (sum / userRatings.length).toFixed(1),
            count: userRatings.length
        };
    },
    
    // Очередь поиска
    getSearchQueue() {
        const data = localStorage.getItem(this.searchQueue);
        return data ? JSON.parse(data) : [];
    },
    
    addToSearchQueue(userId) {
        const queue = this.getSearchQueue();
        if (!queue.includes(userId)) {
            queue.push(userId);
            localStorage.setItem(this.searchQueue, JSON.stringify(queue));
        }
    },
    
    removeFromSearchQueue(userId) {
        const queue = this.getSearchQueue();
        const index = queue.indexOf(userId);
        if (index > -1) {
            queue.splice(index, 1);
            localStorage.setItem(this.searchQueue, JSON.stringify(queue));
        }
    },
    
    getCurrentChat() {
        const data = localStorage.getItem(this.currentChat);
        return data ? JSON.parse(data) : null;
    },
    
    setCurrentChat(chatId) {
        if (chatId) {
            localStorage.setItem(this.currentChat, JSON.stringify(chatId));
        } else {
            localStorage.removeItem(this.currentChat);
        }
    }
};

// Управление шагами регистрации
let currentStep = 1;
const totalSteps = 4;

function updateStepIndicator(step) {
    // Обновляем индикаторы шагов
    for (let i = 1; i <= totalSteps; i++) {
        const indicator = document.querySelector(`.step-indicator[data-step="${i}"]`);
        if (indicator) {
            indicator.classList.remove('active', 'completed');
            if (i < step) {
                indicator.classList.add('completed');
            } else if (i === step) {
                indicator.classList.add('active');
            }
        }
    }
}

function showStep(step) {
    // Скрываем все шаги
    for (let i = 1; i <= totalSteps; i++) {
        const stepEl = document.getElementById(`step${i}`);
        if (stepEl) {
            stepEl.classList.remove('active');
        }
    }
    
    // Показываем нужный шаг
    const stepEl = document.getElementById(`step${step}`);
    if (stepEl) {
        stepEl.classList.add('active');
    }
    
    // Инициализируем интересы при переходе на шаг 4
    if (step === 4) {
        initInterests();
    }
    
    updateStepIndicator(step);
    clearError();
}

function nextStep() {
    // Валидация текущего шага
    if (!validateCurrentStep()) {
        return;
    }
    
    if (currentStep < totalSteps) {
        currentStep++;
        showStep(currentStep);
        
        // Вибрация
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
        
        // Вибрация
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }
}

function validateCurrentStep() {
    clearError();
    
    switch(currentStep) {
        case 1:
            const name = document.getElementById('registerName').value.trim();
            if (!name || name.length < 2) {
                showError('Имя должно содержать минимум 2 символа');
                return false;
            }
            if (name.length > 30) {
                showError('Имя не должно превышать 30 символов');
                return false;
            }
            return true;
            
        case 2:
            const age = parseInt(document.getElementById('registerAge').value);
            if (!age || age < 13 || age > 120) {
                showError('Возраст должен быть от 13 до 120 лет');
                return false;
            }
            return true;
            
        case 3:
            const gender = document.getElementById('registerGender').value;
            if (!gender) {
                showError('Выберите пол');
                return false;
            }
            return true;
            
        case 4:
            const interests = getSelectedInterests();
            if (!interests || interests.length === 0) {
                showError('Выберите минимум 1 интерес');
                return false;
            }
            if (interests.length > 10) {
                showError('Выберите не более 10 интересов');
                return false;
            }
            return true;
            
        default:
            return true;
    }
}

// Список доступных интересов
const availableInterests = [
    'Спорт', 'Музыка', 'Кино', 'Книги', 'Игры', 'Путешествия',
    'Фотография', 'Кулинария', 'Технологии', 'Искусство', 'Наука',
    'Мода', 'Автомобили', 'Животные', 'Природа', 'Йога',
    'Танцы', 'Рукоделие', 'Программирование', 'Дизайн', 'Бизнес',
    'Психология', 'История', 'Языки', 'Образование', 'Здоровье'
];

// Инициализация интересов
function initInterests() {
    const container = document.getElementById('interestsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    availableInterests.forEach(interest => {
        const interestItem = document.createElement('div');
        interestItem.className = 'interest-item';
        interestItem.dataset.interest = interest;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `interest-${interest}`;
        checkbox.value = interest;
        checkbox.addEventListener('change', handleInterestChange);
        
        const label = document.createElement('label');
        label.htmlFor = `interest-${interest}`;
        label.textContent = interest;
        
        interestItem.appendChild(checkbox);
        interestItem.appendChild(label);
        container.appendChild(interestItem);
    });
}

// Обработка изменения интересов
function handleInterestChange() {
    const selectedInterests = getSelectedInterests();
    const errorEl = document.getElementById('authError');
    
    // Убираем ошибку если интересы выбраны
    if (selectedInterests.length > 0) {
        errorEl.classList.remove('show');
    }
    
    // Вибрация при выборе
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Получение выбранных интересов
function getSelectedInterests() {
    const checkboxes = document.querySelectorAll('#interestsContainer input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// Функции для работы с формами
function clearForm() {
    document.getElementById('registerName').value = '';
    document.getElementById('registerAge').value = '';
    document.getElementById('registerGender').value = '';
    
    // Сброс интересов
    const checkboxes = document.querySelectorAll('#interestsContainer input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    currentStep = 1;
    showStep(1);
}

function showError(message) {
    const errorEl = document.getElementById('authError');
    errorEl.textContent = message;
    errorEl.classList.add('show');
    setTimeout(() => {
        errorEl.classList.remove('show');
    }, 5000);
}

function clearError() {
    document.getElementById('authError').classList.remove('show');
}

// Обработка регистрации (финальный шаг)
function handleRegister() {
    // Валидация последнего шага
    if (!validateCurrentStep()) {
        return;
    }
    
    const name = document.getElementById('registerName').value.trim();
    const age = parseInt(document.getElementById('registerAge').value);
    const gender = document.getElementById('registerGender').value;
    const interests = getSelectedInterests();
    
    // Создание пользователя
    const userData = {
        name: name,
        age: age,
        gender: gender,
        interests: interests
    };
    
    const user = Storage.saveUser(userData);
    const currentUserData = {
        name: user.name,
        id: user.id,
        age: user.age,
        gender: user.gender,
        interests: user.interests,
        createdAt: user.createdAt
    };
    
    Storage.setCurrentUser(currentUserData);
    Storage.addOnlineUser(user.id);
    
    // Вибрация (если доступна)
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
    
    showChatScreen();
}

// Переключение экранов
function showChatScreen() {
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    document.getElementById('activeChatScreen').classList.remove('active');
    
    const currentUser = Storage.getCurrentUser();
    if (currentUser) {
        updateProfilePreview();
        updateProfileScreen();
        loadChatsList();
    }
    
    // Показываем главный экран по умолчанию
    showScreen('home');
}

function showAuthScreen() {
    document.getElementById('mainApp').classList.remove('active');
    document.getElementById('activeChatScreen').classList.remove('active');
    document.getElementById('authScreen').classList.add('active');
    clearForm();
    stopSearching();
}

// Навигация между экранами приложения
function showScreen(screenName) {
    // Скрываем все экраны
    document.querySelectorAll('.app-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Показываем нужный экран
    const screenMap = {
        'home': 'homeScreen',
        'chats': 'chatsScreen',
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
        loadChatsList();
    } else if (screenName === 'profile') {
        updateProfileScreen();
    } else if (screenName === 'home') {
        updateProfilePreview();
    }
    
    // Вибрация
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Выход
function handleLogout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        const currentUser = Storage.getCurrentUser();
        if (currentUser) {
            Storage.removeOnlineUser(currentUser.id);
            Storage.removeFromSearchQueue(currentUser.id);
            Storage.setCurrentChat(null);
        }
        Storage.setCurrentUser(null);
        stopSearching();
        showAuthScreen();
        
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('warning');
        }
    }
}

// Обновление превью профиля на главной
function updateProfilePreview() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    const genderLabels = {
        'male': 'Мужской',
        'female': 'Женский',
        'other': 'Другой',
        'prefer_not_to_say': 'Не указано'
    };
    
    const rating = Storage.getUserRating(currentUser.id);
    
    document.getElementById('previewName').textContent = currentUser.name;
    document.getElementById('previewAge').textContent = `${currentUser.age} лет`;
    document.getElementById('previewGender').textContent = genderLabels[currentUser.gender] || currentUser.gender;
    document.getElementById('previewRating').textContent = rating.count > 0 ? `${rating.average} (${rating.count})` : 'Нет оценок';
    document.getElementById('previewInterests').textContent = currentUser.interests.join(', ') || 'Не указано';
}

// Обновление экрана профиля
function updateProfileScreen() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    const genderLabels = {
        'male': 'Мужской',
        'female': 'Женский',
        'other': 'Другой',
        'prefer_not_to_say': 'Не указано'
    };
    
    const rating = Storage.getUserRating(currentUser.id);
    const chats = Storage.getChatsForUser(currentUser.id);
    
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileAge').textContent = `${currentUser.age} лет`;
    document.getElementById('profileGender').textContent = genderLabels[currentUser.gender] || currentUser.gender;
    
    const ratingEl = document.getElementById('profileRating');
    ratingEl.textContent = rating.count > 0 ? rating.average : 'Нет оценок';
    
    const starsEl = document.getElementById('profileRatingStars');
    if (rating.count > 0) {
        const stars = Math.round(parseFloat(rating.average));
        starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    } else {
        starsEl.textContent = '';
    }
    
    const interestsEl = document.getElementById('profileInterests');
    interestsEl.innerHTML = '';
    currentUser.interests.forEach(interest => {
        const tag = document.createElement('span');
        tag.className = 'interest-tag';
        tag.textContent = interest;
        interestsEl.appendChild(tag);
    });
    
    document.getElementById('statTotalChats').textContent = chats.length;
    document.getElementById('statTotalRatings').textContent = rating.count;
}

// Поиск собеседника
let searchInterval = null;

function startSearching() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    document.getElementById('searchStatus').style.display = 'block';
    Storage.addToSearchQueue(currentUser.id);
    
    // Вибрация
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
    
    // Имитация поиска (в реальном приложении это будет через WebSocket/API)
    searchInterval = setInterval(() => {
        findMatch();
    }, 2000);
    
    // Пробуем найти сразу
    findMatch();
}

function stopSearching() {
    const currentUser = Storage.getCurrentUser();
    if (currentUser) {
        Storage.removeFromSearchQueue(currentUser.id);
    }
    
    document.getElementById('searchStatus').style.display = 'none';
    
    if (searchInterval) {
        clearInterval(searchInterval);
        searchInterval = null;
    }
}

function findMatch() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    const queue = Storage.getSearchQueue();
    const users = Storage.getUsers();
    
    // Ищем подходящего собеседника
    const availableUsers = queue.filter(userId => {
        if (userId === currentUser.id) return false;
        const user = users[userId];
        if (!user) return false;
        
        // Проверяем совпадение интересов
        const commonInterests = user.interests.filter(i => currentUser.interests.includes(i));
        return commonInterests.length > 0;
    });
    
    if (availableUsers.length > 0) {
        const partnerId = availableUsers[Math.floor(Math.random() * availableUsers.length)];
        createChat(currentUser.id, partnerId);
        stopSearching();
    }
}

function createChat(user1Id, user2Id) {
    const chatId = Storage.generateId();
    const chat = Storage.saveChat(chatId, {
        id: chatId,
        user1Id,
        user2Id,
        createdAt: new Date().toISOString(),
        messages: []
    });
    
    Storage.removeFromSearchQueue(user1Id);
    Storage.removeFromSearchQueue(user2Id);
    
    openChat(chatId);
}

// Загрузка списка чатов
function loadChatsList() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    const chats = Storage.getChatsForUser(currentUser.id);
    const container = document.getElementById('chatsList');
    
    if (chats.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💬</div>
                <h3>Нет активных чатов</h3>
                <p>Начните поиск собеседника на главной странице</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    chats.forEach(chat => {
        const partnerId = chat.user1Id === currentUser.id ? chat.user2Id : chat.user1Id;
        const partner = Storage.getUser(partnerId);
        if (!partner) return;
        
        const lastMessage = chat.messages && chat.messages.length > 0 
            ? chat.messages[chat.messages.length - 1] 
            : null;
        
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.onclick = () => openChat(chat.id);
        
        chatItem.innerHTML = `
            <div class="chat-item-info">
                <div class="chat-item-name">${partner.name}</div>
                <div class="chat-item-preview">${lastMessage ? lastMessage.text : 'Нет сообщений'}</div>
            </div>
            <div class="chat-item-meta">
                <div class="chat-item-time">${lastMessage ? formatTime(lastMessage.timestamp) : ''}</div>
            </div>
        `;
        
        container.appendChild(chatItem);
    });
    
    // Обновляем badge
    const badge = document.getElementById('chatsBadge');
    if (chats.length > 0) {
        badge.textContent = chats.length;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

// Открытие чата
function openChat(chatId) {
    const chat = Storage.getChat(chatId);
    if (!chat) return;
    
    const currentUser = Storage.getCurrentUser();
    const partnerId = chat.user1Id === currentUser.id ? chat.user2Id : chat.user1Id;
    const partner = Storage.getUser(partnerId);
    
    if (!partner) return;
    
    Storage.setCurrentChat(chatId);
    
    document.getElementById('mainApp').classList.remove('active');
    document.getElementById('activeChatScreen').classList.add('active');
    
    document.getElementById('chatPartnerName').textContent = partner.name;
    document.getElementById('chatPartnerInfo').textContent = `${partner.age} лет`;
    
    loadChatMessages(chatId);
    
    // Вибрация
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

function closeActiveChat() {
    Storage.setCurrentChat(null);
    document.getElementById('activeChatScreen').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    showScreen('chats');
}

// Загрузка сообщений чата
function loadChatMessages(chatId) {
    const chat = Storage.getChat(chatId);
    if (!chat) return;
    
    const messages = chat.messages || [];
    const container = document.getElementById('messagesContainer');
    const currentUser = Storage.getCurrentUser();
    
    container.innerHTML = '';
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">💬</div>
                <h3>Начните общение</h3>
                <p>Отправьте первое сообщение</p>
            </div>
        `;
        return;
    }
    
    messages.forEach(msg => {
        const isOwn = msg.userId === currentUser.id;
        const messageEl = createMessageElement(msg, isOwn);
        container.appendChild(messageEl);
    });
    
    scrollToBottom();
}

// Обновленная функция отправки сообщения
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) {
        showAuthScreen();
        return;
    }
    
    const chatId = Storage.getCurrentChat();
    if (!chatId) return;
    
    const chat = Storage.getChat(chatId);
    if (!chat) return;
    
    const message = {
        id: Storage.generateId(),
        userId: currentUser.id,
        username: currentUser.name,
        text: text,
        timestamp: new Date().toISOString(),
        time: new Date().toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })
    };
    
    // Добавляем сообщение в чат
    if (!chat.messages) chat.messages = [];
    chat.messages.push(message);
    Storage.saveChat(chatId, chat);
    
    input.value = '';
    
    // Вибрация
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
    
    loadChatMessages(chatId);
    loadChatsList();
    
    setTimeout(() => {
        scrollToBottom();
    }, 100);
}

// Завершение чата
let currentRating = 0;

function endChat() {
    if (confirm('Завершить этот чат? После завершения вы сможете оценить собеседника.')) {
        const chatId = Storage.getCurrentChat();
        if (chatId) {
            showRatingModal(chatId);
        }
    }
}

function showRatingModal(chatId) {
    const chat = Storage.getChat(chatId);
    if (!chat) return;
    
    const currentUser = Storage.getCurrentUser();
    const partnerId = chat.user1Id === currentUser.id ? chat.user2Id : chat.user1Id;
    
    document.getElementById('ratingModal').dataset.chatId = chatId;
    document.getElementById('ratingModal').dataset.partnerId = partnerId;
    document.getElementById('ratingModal').classList.add('active');
    currentRating = 0;
    updateRatingStars(0);
}

function closeRatingModal() {
    document.getElementById('ratingModal').classList.remove('active');
    const chatId = document.getElementById('ratingModal').dataset.chatId;
    if (chatId) {
        closeActiveChat();
    }
}

function setRating(rating) {
    currentRating = rating;
    updateRatingStars(rating);
    document.getElementById('submitRatingBtn').disabled = false;
    
    // Вибрация
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

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

function submitRating() {
    if (currentRating === 0) return;
    
    const modal = document.getElementById('ratingModal');
    const chatId = modal.dataset.chatId;
    const partnerId = modal.dataset.partnerId;
    const currentUser = Storage.getCurrentUser();
    
    if (chatId && partnerId && currentUser) {
        Storage.saveRating(currentUser.id, partnerId, currentRating);
        closeRatingModal();
        
        // Вибрация
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    }
}

// Старая функция loadMessages (оставлена для совместимости)
function loadMessages() {
    const chatId = Storage.getCurrentChat();
    if (chatId) {
        loadChatMessages(chatId);
    }
}

function createMessageElement(message, isOwn) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    messageDiv.dataset.id = message.id;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = message.text;
    
    const info = document.createElement('div');
    info.className = 'message-info';
    
    const author = document.createElement('span');
    author.className = 'message-author';
    author.textContent = isOwn ? 'Вы' : message.username;
    
    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = message.time;
    
    info.appendChild(author);
    info.appendChild(time);
    
    messageDiv.appendChild(bubble);
    messageDiv.appendChild(info);
    
    return messageDiv;
}

function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    container.scrollTop = container.scrollHeight;
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Обновление статистики (оставлена для совместимости)
function updateStats() {
    // Статистика теперь отображается в профиле
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = Storage.getCurrentUser();
    
    if (currentUser) {
        Storage.addOnlineUser(currentUser.id);
        showChatScreen();
    } else {
        showAuthScreen();
        // Инициализируем первый шаг
        showStep(1);
    }
    
    // Инициализация звезд рейтинга
    const starButtons = document.querySelectorAll('.star-btn');
    starButtons.forEach((btn, index) => {
        btn.addEventListener('click', () => setRating(index + 1));
    });
    
    // Обработка Enter в полях формы
    document.getElementById('registerName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nextStep();
        }
    });
    
    document.getElementById('registerAge').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nextStep();
        }
    });
    
    // Обработчик выбора пола - без автоматического перехода
    document.getElementById('registerGender').addEventListener('change', () => {
        // Убираем ошибку при выборе пола
        clearError();
        
        // Вибрация при выборе
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    });
    
    // Инициализация интересов при загрузке
    initInterests();
    
    // Обновление viewport при изменении размера
    if (tg) {
        updateViewportHeight();
        window.addEventListener('resize', updateViewportHeight);
    }
    
    // Предотвращение зума на iOS при фокусе на input
    const inputs = document.querySelectorAll('input[type="text"], input[type="number"], textarea, select');
    inputs.forEach(input => {
        // Устанавливаем font-size: 16px для предотвращения зума на iOS
        if (input.type !== 'number' && input.type !== 'checkbox') {
            input.style.fontSize = '16px';
        }
        
        // Обработка фокуса для мобильных устройств
        input.addEventListener('focus', () => {
            // Прокручиваем к элементу при фокусе на мобильных
            setTimeout(() => {
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    });
    
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
});

// Очистка при закрытии
window.addEventListener('beforeunload', () => {
    const currentUser = Storage.getCurrentUser();
    if (currentUser) {
        Storage.removeOnlineUser(currentUser.id);
    }
});


