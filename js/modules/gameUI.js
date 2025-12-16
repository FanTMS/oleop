/**
 * Модуль UI для игр
 */

import { getAvailableGames, initGame, makeRPSChoice as makeRPSMove, makeTTTMove, getGameState, resetGame } from './games.js';
import { Storage } from '../utils/storage.js';
import { hapticFeedback } from '../utils/telegram.js';

let currentGameType = null;
let currentChatId = null;
let pendingGameRequest = null; // Хранит информацию о текущем запросе игры

/**
 * Показать меню выбора игры
 */
export function showGamesMenu() {
    const modal = document.getElementById('gamesMenuModal');
    const gamesList = document.getElementById('gamesList');
    
    if (!modal || !gamesList) return;
    
    const games = getAvailableGames();
    gamesList.innerHTML = '';
    
    games.forEach(game => {
        const gameItem = document.createElement('div');
        gameItem.className = 'game-item';
        gameItem.dataset.action = 'start-game';
        gameItem.dataset.gameId = game.id;
        
        gameItem.innerHTML = `
            <div class="game-icon">${game.icon}</div>
            <div class="game-info">
                <div class="game-name">${game.name}</div>
                <div class="game-description">${game.description}</div>
            </div>
            <div class="game-arrow">→</div>
        `;
        
        gamesList.appendChild(gameItem);
    });
    
    modal.classList.add('active');
    hapticFeedback('light');
}

/**
 * Обработка запроса на игру от собеседника
 */
export function handleGameRequest(data) {
    const { chatId, gameType, fromUserId, isBet, betAmount } = data;
    
    pendingGameRequest = {
        chatId,
        gameType,
        fromUserId,
        isBet: isBet || false,
        betAmount: betAmount || 0
    };
    
    // Показываем модальное окно с предложением игры
    showGameRequestModal(gameType, isBet, betAmount);
}

/**
 * Показать модальное окно с предложением игры
 */
function showGameRequestModal(gameType, isBet = false, betAmount = 0) {
    const gameNames = {
        'rps': 'Камень-ножницы-бумага',
        'ttt': 'Крестики-нолики'
    };
    
    const modal = document.getElementById('gameRequestModal');
    if (!modal) {
        // Создаем модальное окно если его нет
        createGameRequestModal();
    }
    
    const modalTitle = document.getElementById('gameRequestTitle');
    const modalText = document.getElementById('gameRequestText');
    const betInfo = document.getElementById('gameRequestBetInfo');
    const betAmountEl = document.getElementById('gameRequestBetAmount');
    
    if (modalTitle) {
        modalTitle.textContent = `🎮 Предложение игры`;
    }
    if (modalText) {
        modalText.textContent = `Собеседник предлагает сыграть в "${gameNames[gameType]}". Принять?`;
    }
    
    // Показываем информацию о ставке если игра на ставку
    if (isBet && betInfo && betAmountEl) {
        betInfo.style.display = 'block';
        betAmountEl.textContent = betAmount;
    } else if (betInfo) {
        betInfo.style.display = 'none';
    }
    
    const requestModal = document.getElementById('gameRequestModal');
    if (requestModal) {
        requestModal.classList.add('active');
    }
    
    hapticFeedback('medium');
}

/**
 * Создать модальное окно для запроса игры
 */
function createGameRequestModal() {
    const modal = document.createElement('div');
    modal.id = 'gameRequestModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3 id="gameRequestTitle">🎮 Предложение игры</h3>
            <p id="gameRequestText">Собеседник предлагает сыграть. Принять?</p>
            <div class="modal-actions">
                <button class="btn btn-secondary" data-action="reject-game-request">Отклонить</button>
                <button class="btn btn-primary" data-action="accept-game-request">Принять</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/**
 * Обработка ответа на запрос игры
 */
export function handleGameRequestResponse(data) {
    const { accepted, gameType, chatId } = data;
    
    if (accepted) {
        // Игра принята, начинаем игру
        currentChatId = chatId || currentChatId;
        currentGameType = gameType;
        
        if (gameType === 'rps') {
            initRPSGame(currentChatId);
            // Показываем кнопки выбора
            document.querySelectorAll('.rps-choice').forEach(btn => {
                btn.style.display = '';
            });
        } else if (gameType === 'ttt') {
            initTTTGame(currentChatId);
        }
        hapticFeedback('success');
    } else {
        // Игра отклонена
        if (gameType === 'rps') {
            closeRPSGame();
        } else if (gameType === 'ttt') {
            closeTTTGame();
        }
        alert('Собеседник отклонил предложение игры');
        hapticFeedback('warning');
    }
    
    pendingGameRequest = null;
}

/**
 * Принять запрос на игру
 */
export function acceptGameRequest() {
    if (!pendingGameRequest) return;
    
    const { chatId, gameType, fromUserId, isBet, betAmount } = pendingGameRequest;
    const currentUser = Storage.getCurrentUser();
    
    // Проверяем баланс если игра на ставку
    if (isBet && betAmount > 0) {
        import('../utils/api.js').then(apiModule => {
            apiModule.apiRequest(`/users/${currentUser.id}/coins`).then(data => {
                const coins = data.coins || 0;
                if (coins < betAmount) {
                    alert(`Недостаточно монет для ставки. У вас ${coins} монет, требуется ${betAmount}`);
                    return;
                }
                acceptGameRequestInternal(chatId, gameType, fromUserId, isBet, betAmount);
            }).catch(error => {
                console.error('Ошибка проверки баланса:', error);
                alert('Ошибка проверки баланса');
            });
        });
    } else {
        acceptGameRequestInternal(chatId, gameType, fromUserId, isBet, betAmount);
    }
}

/**
 * Внутренняя функция принятия запроса на игру
 */
function acceptGameRequestInternal(chatId, gameType, fromUserId, isBet, betAmount) {
    const currentUser = Storage.getCurrentUser();
    
    // Отправляем ответ через WebSocket
    import('./search.js').then(searchModule => {
        const wsClient = searchModule.getWebSocketClient();
        if (wsClient) {
            wsClient.send({
                type: 'game_request_response',
                chatId: chatId,
                gameType: gameType,
                accepted: true,
                fromUserId: fromUserId,
                toUserId: currentUser.id,
                isBet: isBet,
                betAmount: betAmount
            });
        }
    });
    
    // Закрываем модальное окно запроса
    const requestModal = document.getElementById('gameRequestModal');
    if (requestModal) {
        requestModal.classList.remove('active');
    }
    
    // Начинаем игру
    currentChatId = chatId;
    currentGameType = gameType;
    
    if (gameType === 'rps') {
        initRPSGame(chatId);
    } else if (gameType === 'ttt') {
        initTTTGame(chatId);
    }
    
    hapticFeedback('success');
}

/**
 * Отклонить запрос на игру
 */
export function rejectGameRequest() {
    if (!pendingGameRequest) return;
    
    const { chatId, gameType, fromUserId } = pendingGameRequest;
    const currentUser = Storage.getCurrentUser();
    
    // Отправляем ответ через WebSocket
    import('./search.js').then(searchModule => {
        const wsClient = searchModule.getWebSocketClient();
        if (wsClient) {
            wsClient.send({
                type: 'game_request_response',
                chatId: chatId,
                gameType: gameType,
                accepted: false,
                fromUserId: fromUserId,
                toUserId: currentUser.id
            });
        }
    });
    
    // Закрываем модальное окно запроса
    const requestModal = document.getElementById('gameRequestModal');
    if (requestModal) {
        requestModal.classList.remove('active');
    }
    
    pendingGameRequest = null;
    hapticFeedback('light');
}

/**
 * Закрыть меню игр
 */
export function closeGamesMenu() {
    document.getElementById('gamesMenuModal').classList.remove('active');
}

/**
 * Начать игру
 */
export function startGame(gameType) {
    const chatId = Storage.getCurrentChat();
    if (!chatId) return;
    
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    currentChatId = chatId;
    currentGameType = gameType;
    
    closeGamesMenu();
    
    // Показываем модальное окно выбора типа игры (с ставкой/без ставки)
    showGameBetModal(gameType);
    
    hapticFeedback('light');
}

/**
 * Показать модальное окно выбора типа игры (с ставкой/без ставки)
 */
function showGameBetModal(gameType) {
    const modal = document.getElementById('gameBetModal');
    if (!modal) return;
    
    const gameNames = {
        'rps': 'Камень-ножницы-бумага',
        'ttt': 'Крестики-нолики'
    };
    
    const titleEl = document.getElementById('gameBetTitle');
    if (titleEl) {
        titleEl.textContent = `🎮 ${gameNames[gameType]} - Выберите тип игры`;
    }
    
    // Сбрасываем состояние
    const freeBtn = document.getElementById('betTypeFree');
    const betBtn = document.getElementById('betTypeBet');
    const betAmountGroup = document.getElementById('betAmountGroup');
    const betAmount = document.getElementById('betAmount');
    
    if (freeBtn) freeBtn.classList.add('active');
    if (betBtn) betBtn.classList.remove('active');
    if (betAmountGroup) betAmountGroup.style.display = 'none';
    if (betAmount) betAmount.value = '5';
    
    // Обработчики для кнопок выбора типа
    if (freeBtn) {
        const newFreeBtn = freeBtn.cloneNode(true);
        freeBtn.replaceWith(newFreeBtn);
        newFreeBtn.addEventListener('click', () => {
            newFreeBtn.classList.add('active');
            if (betBtn) betBtn.classList.remove('active');
            if (betAmountGroup) betAmountGroup.style.display = 'none';
        });
    }
    
    if (betBtn) {
        const newBetBtn = betBtn.cloneNode(true);
        betBtn.replaceWith(newBetBtn);
        newBetBtn.addEventListener('click', () => {
            newBetBtn.classList.add('active');
            if (freeBtn) freeBtn.classList.remove('active');
            if (betAmountGroup) betAmountGroup.style.display = 'block';
        });
    }
    
    // Обработчик подтверждения
    const confirmBtn = modal.querySelector('[data-action="confirm-game-bet"]');
    if (confirmBtn) {
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.replaceWith(newConfirmBtn);
        newConfirmBtn.addEventListener('click', () => {
            const isBet = document.getElementById('betTypeBet')?.classList.contains('active');
            let betAmountValue = 0;
            
            if (isBet) {
                betAmountValue = parseInt(document.getElementById('betAmount')?.value || '5');
                if (betAmountValue < 5 || betAmountValue > 20) {
                    alert('Сумма ставки должна быть от 5 до 20 монет');
                    return;
                }
            }
            
            modal.classList.remove('active');
            sendGameRequest(currentChatId, currentGameType, isBet, betAmountValue);
        });
    }
    
    // Обработчик отмены
    const cancelBtn = modal.querySelector('[data-action="cancel-game-bet"]');
    if (cancelBtn) {
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.replaceWith(newCancelBtn);
        newCancelBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }
    
    modal.classList.add('active');
}

/**
 * Отправить запрос на игру собеседнику
 */
function sendGameRequest(chatId, gameType, isBet = false, betAmount = 0) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    // Проверяем баланс если игра на ставку
    if (isBet) {
        import('../utils/api.js').then(apiModule => {
            apiModule.apiRequest(`/users/${currentUser.id}/coins`).then(data => {
                const coins = data.coins || 0;
                if (coins < betAmount) {
                    alert(`Недостаточно монет для ставки. У вас ${coins} монет, требуется ${betAmount}`);
                    return;
                }
                sendGameRequestInternal(chatId, gameType, isBet, betAmount);
            }).catch(error => {
                console.error('Ошибка проверки баланса:', error);
                alert('Ошибка проверки баланса');
            });
        });
    } else {
        sendGameRequestInternal(chatId, gameType, isBet, betAmount);
    }
}

/**
 * Внутренняя функция отправки запроса на игру
 */
function sendGameRequestInternal(chatId, gameType, isBet, betAmount) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    // Получаем WebSocket клиент
    import('./search.js').then(searchModule => {
        const wsClient = searchModule.getWebSocketClient();
        if (!wsClient) {
            console.error('WebSocket не подключен');
            return;
        }
        
        // Получаем информацию о чате для определения партнера
        Storage.getChat(chatId).then(chat => {
            if (!chat) {
                console.error('Чат не найден');
                return;
            }
            
            const partnerId = chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id;
            
            // Отправляем запрос на игру
            wsClient.send({
                type: 'game_request',
                chatId: chatId,
                gameType: gameType,
                fromUserId: currentUser.id,
                toUserId: partnerId,
                isBet: isBet,
                betAmount: betAmount
            });
            
            // Показываем статус ожидания
            showGameRequestPending(gameType);
        }).catch(error => {
            console.error('Ошибка получения чата:', error);
        });
    });
}

/**
 * Показать статус ожидания ответа на запрос игры
 */
function showGameRequestPending(gameType) {
    const gameNames = {
        'rps': 'Камень-ножницы-бумага',
        'ttt': 'Крестики-нолики'
    };
    
    const statusEl = document.getElementById('rpsGameStatus');
    if (statusEl) {
        statusEl.textContent = `Ожидание ответа на предложение игры "${gameNames[gameType]}"...`;
        statusEl.className = 'game-status opponent-turn';
    }
    
    // Показываем модальное окно игры с сообщением об ожидании
    const modal = document.getElementById('rpsGameModal');
    if (modal) {
        modal.classList.add('active');
        // Скрываем кнопки выбора до получения ответа
        document.querySelectorAll('.rps-choice').forEach(btn => {
            btn.style.display = 'none';
        });
    }
}

/**
 * Инициализация игры камень-ножницы-бумага
 */
function initRPSGame(chatId) {
    const game = initGame(chatId, 'rps');
    const modal = document.getElementById('rpsGameModal');
    const statusEl = document.getElementById('rpsGameStatus');
    const resultEl = document.getElementById('rpsResult');
    const resetBtn = document.getElementById('resetRPSBtn');
    
    if (!modal) return;
    
    statusEl.textContent = 'Выберите ваш выбор';
    resultEl.style.display = 'none';
    resetBtn.style.display = 'none';
    
    // Сбрасываем выборы
    document.querySelectorAll('.rps-choice').forEach(btn => {
        btn.classList.remove('selected', 'disabled');
        btn.disabled = false;
    });
    
    modal.classList.add('active');
}

/**
 * Сделать выбор в камень-ножницы-бумага
 */
export function makeRPSChoice(choice) {
    const chatId = Storage.getCurrentChat();
    if (!chatId) return;
    
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    const choiceBtn = document.querySelector(`.rps-choice[data-choice="${choice}"]`);
    if (choiceBtn) {
        choiceBtn.classList.add('selected');
        document.querySelectorAll('.rps-choice').forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
        });
    }
    
    // Сохраняем выбор локально
    const result = makeRPSMove(chatId, currentUser.id, choice);
    
    // Отправляем выбор через WebSocket
    import('./search.js').then(searchModule => {
        const wsClient = searchModule.getWebSocketClient();
        if (wsClient) {
            wsClient.send({
                type: 'rps_choice',
                chatId: chatId,
                userId: currentUser.id,
                choice: choice
            });
        }
    });
    
    // Если оба игрока уже сделали выбор локально, показываем результат
    if (result && result.status === 'finished') {
        displayRPSResult(result);
    } else {
        const statusEl = document.getElementById('rpsGameStatus');
        if (statusEl) {
            statusEl.textContent = 'Ожидание выбора соперника...';
        }
    }
}

/**
 * Отображение результата камень-ножницы-бумага
 */
export function displayRPSResult(result) {
    const statusEl = document.getElementById('rpsGameStatus');
    const resultEl = document.getElementById('rpsResult');
    const resetBtn = document.getElementById('resetRPSBtn');
    
    const choiceLabels = {
        'rock': '🪨 Камень',
        'scissors': '✂️ Ножницы',
        'paper': '📄 Бумага'
    };
    
    let message = '';
    if (result.winner === 'draw') {
        message = 'Ничья! Оба выбрали ' + choiceLabels[result.choice1];
        statusEl.textContent = 'Ничья!';
        statusEl.className = 'game-status draw';
    } else {
        // Определяем победителя (может быть 'you', 'opponent', 'player1', 'player2')
        let won = false;
        if (result.winner === 'you') {
            won = true;
        } else if (result.winner === 'opponent') {
            won = false;
        } else {
            // Старая логика для обратной совместимости
            const currentUser = Storage.getCurrentUser();
            const chat = Storage.getChat(currentChatId);
            if (chat) {
                const isPlayer1 = chat.user1Id === currentUser.id;
                won = (result.winner === 'player1' && isPlayer1) || (result.winner === 'player2' && !isPlayer1);
            }
        }
        
        if (won) {
            if (result.isBet && result.betAmount) {
                message = `🎉 Вы победили! Выигрыш: ${result.betAmount * 2} монет`;
                statusEl.textContent = `Вы победили! +${result.betAmount * 2} монет`;
            } else {
                message = '🎉 Вы победили!';
                statusEl.textContent = 'Вы победили!';
            }
            statusEl.className = 'game-status win';
        } else {
            if (result.isBet && result.betAmount) {
                message = `😔 Вы проиграли. Потеряно: ${result.betAmount} монет`;
                statusEl.textContent = `Вы проиграли. -${result.betAmount} монет`;
            } else {
                message = '😔 Вы проиграли';
                statusEl.textContent = 'Вы проиграли';
            }
            statusEl.className = 'game-status lose';
        }
        
        // Добавляем информацию о ничьей со ставкой
        if (result.winner === 'draw' && result.isBet && result.betAmount) {
            message += ` (Ставка ${result.betAmount} монет возвращена)`;
        }
        
        // Определяем выборы игроков
        let yourChoice = result.yourChoice || result.choice1;
        let opponentChoice = result.opponentChoice || result.choice2;
        
        // Если результат пришел от сервера с явными полями, используем их
        if (result.yourChoice && result.opponentChoice) {
            yourChoice = result.yourChoice;
            opponentChoice = result.opponentChoice;
        } else {
            // Старая логика для обратной совместимости
            const currentUser = Storage.getCurrentUser();
            const chat = Storage.getChat(currentChatId);
            if (chat && result.player1Id && result.player2Id) {
                if (result.player1Id === currentUser.id) {
                    yourChoice = result.player1Choice || result.choice1;
                    opponentChoice = result.player2Choice || result.choice2;
                } else {
                    yourChoice = result.player2Choice || result.choice2;
                    opponentChoice = result.player1Choice || result.choice1;
                }
            }
        }
        
        message += `<br>Вы: ${choiceLabels[yourChoice] || '?'} | Соперник: ${choiceLabels[opponentChoice] || '?'}`;
    }
    
    resultEl.innerHTML = message;
    resultEl.style.display = 'block';
    resetBtn.style.display = 'block';
    
    // Обновляем баланс монет если игра была на ставку
    if (result.isBet && result.betAmount) {
        import('../modules/shop.js').then(shopModule => {
            shopModule.updateCoinsBalance('shopCoinsBalance');
        });
        import('../modules/navigation.js').then(navModule => {
            import('../modules/shop.js').then(shopModule => {
                shopModule.updateCoinsBalance('homeCoinsBalance');
            });
        });
    }
    
    hapticFeedback('medium');
}

/**
 * Сброс игры камень-ножницы-бумага
 */
export function resetRPSGame() {
    if (currentChatId) {
        resetGame(currentChatId, 'rps');
        initRPSGame(currentChatId);
    }
}

/**
 * Закрыть игру камень-ножницы-бумага
 */
export function closeRPSGame() {
    document.getElementById('rpsGameModal').classList.remove('active');
    if (currentChatId) {
        resetGame(currentChatId, 'rps');
    }
}

/**
 * Инициализация игры крестики-нолики
 */
function initTTTGame(chatId) {
    const modal = document.getElementById('tttGameModal');
    const boardEl = document.getElementById('tttBoard');
    const statusEl = document.getElementById('tttGameStatus');
    const resultEl = document.getElementById('tttResult');
    const resetBtn = document.getElementById('resetTTTBtn');
    
    if (!modal || !boardEl) return;
    
    // Создаем доску
    boardEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('button');
        cell.className = 'ttt-cell';
        cell.dataset.position = i;
        cell.dataset.action = 'ttt-move';
        cell.textContent = '';
        cell.disabled = false;
        cell.classList.remove('disabled');
        boardEl.appendChild(cell);
    }
    
    statusEl.textContent = 'Ожидание начала игры...';
    statusEl.className = 'game-status';
    resultEl.style.display = 'none';
    if (resetBtn) {
        resetBtn.style.display = 'none';
    }
    
    // Инициализируем пустую доску
    updateTTTBoard(Array(9).fill(null));
    modal.classList.add('active');
}

/**
 * Сделать ход в крестики-нолики
 */
export function makeTTTChoice(position) {
    const chatId = Storage.getCurrentChat();
    if (!chatId) return;
    
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    // Отправляем ход через WebSocket
    import('./search.js').then(searchModule => {
        const wsClient = searchModule.getWebSocketClient();
        if (wsClient) {
            wsClient.send({
                type: 'ttt_move',
                chatId: chatId,
                userId: currentUser.id,
                position: position
            });
        }
    });
    
    hapticFeedback('light');
}

/**
 * Обновление доски крестики-нолики
 */
function updateTTTBoard(board) {
    const cells = document.querySelectorAll('.ttt-cell');
    cells.forEach((cell, index) => {
        const value = board[index];
        cell.textContent = value || '';
        if (value !== null) {
            cell.disabled = true;
            cell.classList.add('disabled');
        }
    });
}


/**
 * Обработка обновления игры крестики-нолики от сервера
 */
export function handleTTTUpdate(data) {
    const { board, currentPlayer, currentPlayerName, currentPlayerSymbolLabel, player1Id, player2Id, player1Name, player2Name, player1Symbol, player2Symbol } = data;
    
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    // Обновляем доску
    updateTTTBoard(board);
    
    // Определяем символ текущего игрока
    const playerSymbol = player1Id === currentUser.id ? player1Symbol : player2Symbol;
    const playerName = player1Id === currentUser.id ? player1Name : player2Name;
    const opponentName = player1Id === currentUser.id ? player2Name : player1Name;
    const playerSymbolLabel = playerSymbol === 'X' ? 'крестик' : 'нолик';
    
    // Обновляем статус
    const statusEl = document.getElementById('tttGameStatus');
    if (statusEl) {
        if (currentPlayer === playerSymbol) {
            statusEl.textContent = `Ход игрока ${playerName}, фигура: ${playerSymbolLabel}`;
            statusEl.className = 'game-status your-turn';
        } else {
            statusEl.textContent = `Ход игрока ${currentPlayerName}, фигура: ${currentPlayerSymbolLabel}`;
            statusEl.className = 'game-status opponent-turn';
        }
    }
    
    // Обновляем состояние клеток
    const isMyTurn = currentPlayer === playerSymbol;
    const cells = document.querySelectorAll('.ttt-cell');
    cells.forEach((cell, index) => {
        const value = board[index];
        if (value !== null) {
            // Клетка занята
            cell.disabled = true;
            cell.classList.add('disabled');
        } else {
            // Клетка свободна - можно ходить только если ваш ход
            cell.disabled = !isMyTurn;
            if (isMyTurn) {
                cell.classList.remove('disabled');
            } else {
                cell.classList.add('disabled');
            }
        }
    });
}

/**
 * Отображение результата крестики-нолики
 */
export function displayTTTResult(result) {
    const statusEl = document.getElementById('tttGameStatus');
    const resultEl = document.getElementById('tttResult');
    const resetBtn = document.getElementById('resetTTTBtn');
    
    const currentUser = Storage.getCurrentUser();
    if (!statusEl || !resultEl || !currentUser) return;
    
    // Обновляем доску
    if (result.board) {
        updateTTTBoard(result.board);
    }
    
    let message = '';
    let statusText = '';
    
    // Определяем, выиграл ли текущий игрок
    const isWinner = result.winner === 'draw' ? false : 
                     (result.winner === 'player1' && result.player1Id === currentUser.id) ||
                     (result.winner === 'player2' && result.player2Id === currentUser.id);
    
    if (result.winner === 'draw') {
        if (result.isBet && result.betAmount) {
            message = `🤝 Ничья! Ставка ${result.betAmount} монет возвращена`;
            statusText = `Ничья! Ставка возвращена`;
        } else {
            message = '🤝 Ничья!';
            statusText = 'Ничья!';
        }
        statusEl.className = 'game-status draw';
    } else if (isWinner) {
        if (result.isBet && result.betAmount) {
            message = `🎉 Вы победили! Выигрыш: ${result.betAmount * 2} монет (${result.winnerSymbol === 'X' ? 'крестик' : 'нолик'})`;
            statusText = `Победил: ${result.winnerName} (${result.winnerSymbol === 'X' ? 'крестик' : 'нолик'}) +${result.betAmount * 2} монет`;
        } else {
            message = `🎉 Вы победили! (${result.winnerSymbol === 'X' ? 'крестик' : 'нолик'})`;
            statusText = `Победил: ${result.winnerName} (${result.winnerSymbol === 'X' ? 'крестик' : 'нолик'})`;
        }
        statusEl.className = 'game-status win';
    } else {
        if (result.isBet && result.betAmount) {
            message = `😔 Вы проиграли. Потеряно: ${result.betAmount} монет`;
            statusText = `Победил: ${result.winnerName} (${result.winnerSymbol === 'X' ? 'крестик' : 'нолик'}) -${result.betAmount} монет`;
        } else {
            message = `😔 Вы проиграли`;
            statusText = `Победил: ${result.winnerName} (${result.winnerSymbol === 'X' ? 'крестик' : 'нолик'})`;
        }
        statusEl.className = 'game-status lose';
    }
    
    statusEl.textContent = statusText;
    resultEl.textContent = message;
    resultEl.style.display = 'block';
    
    if (resetBtn) {
        resetBtn.style.display = 'block';
    }
    
    // Отключаем все клетки
    document.querySelectorAll('.ttt-cell').forEach(cell => {
        cell.disabled = true;
        cell.classList.add('disabled');
    });
    
    // Обновляем баланс монет если игра была на ставку
    if (result.isBet && result.betAmount) {
        import('../modules/shop.js').then(shopModule => {
            shopModule.updateCoinsBalance('shopCoinsBalance');
        });
    }
    
    hapticFeedback('medium');
}

/**
 * Сброс игры крестики-нолики
 */
export function resetTTTGame() {
    if (currentChatId) {
        // Отправляем запрос на новую игру через WebSocket
        const currentUser = Storage.getCurrentUser();
        if (currentUser) {
            import('./search.js').then(searchModule => {
                const wsClient = searchModule.getWebSocketClient();
                if (wsClient) {
                    // Просто переинициализируем игру на клиенте
                    // Сервер создаст новую игру при первом ходе
                    initTTTGame(currentChatId);
                }
            });
        }
    }
}

/**
 * Закрыть игру крестики-нолики
 */
export function closeTTTGame() {
    document.getElementById('tttGameModal').classList.remove('active');
    if (currentChatId) {
        resetGame(currentChatId, 'ttt');
    }
}

