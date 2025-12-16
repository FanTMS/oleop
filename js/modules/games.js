/**
 * Модуль игр для чата
 */

import { Storage } from '../utils/storage.js';
import { hapticFeedback } from '../utils/telegram.js';

// Состояния игр
const gameStates = {};

/**
 * Инициализация игры
 */
export function initGame(chatId, gameType) {
    const gameId = `${chatId}_${gameType}`;
    
    if (gameType === 'rps') {
        gameStates[gameId] = {
            type: 'rps',
            player1Choice: null,
            player2Choice: null,
            player1Id: null,
            player2Id: null,
            status: 'waiting'
        };
    } else if (gameType === 'ttt') {
        gameStates[gameId] = {
            type: 'ttt',
            board: Array(9).fill(null),
            currentPlayer: 'X',
            player1Id: null,
            player2Id: null,
            player1Symbol: 'X',
            player2Symbol: 'O',
            status: 'playing',
            winner: null
        };
    }
    
    return gameStates[gameId];
}

/**
 * Получить состояние игры
 */
export function getGameState(chatId, gameType) {
    const gameId = `${chatId}_${gameType}`;
    return gameStates[gameId] || null;
}

/**
 * Камень-ножницы-бумага: сделать выбор
 */
export function makeRPSChoice(chatId, userId, choice) {
    const gameId = `${chatId}_rps`;
    let game = gameStates[gameId];
    
    if (!game) {
        // Если игры нет, создаем её
        game = initGame(chatId, 'rps');
    }
    
    const chat = Storage.getChat(chatId);
    if (!chat) return null;
    
    const partnerId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
    
    // Определяем игроков
    if (!game.player1Id) {
        game.player1Id = userId;
        game.player2Id = partnerId;
    }
    
    // Сохраняем выбор текущего игрока
    if (game.player1Id === userId) {
        game.player1Choice = choice;
    } else if (game.player2Id === userId) {
        game.player2Choice = choice;
    } else {
        // Если пользователь не является участником игры, добавляем его
        if (!game.player1Id) {
            game.player1Id = userId;
            game.player1Choice = choice;
        } else if (!game.player2Id) {
            game.player2Id = userId;
            game.player2Choice = choice;
        }
    }
    
    // Проверяем, оба ли игрока сделали выбор
    if (game.player1Choice && game.player2Choice) {
        game.status = 'finished';
        const result = determineRPSWinner(game.player1Choice, game.player2Choice);
        hapticFeedback('medium');
        return result;
    }
    
    hapticFeedback('light');
    return { status: 'waiting', message: 'Ожидание выбора соперника...' };
}

/**
 * Определение победителя в камень-ножницы-бумага
 */
function determineRPSWinner(choice1, choice2) {
    if (choice1 === choice2) {
        return {
            winner: 'draw',
            message: 'Ничья!',
            choice1,
            choice2
        };
    }
    
    const wins = {
        'rock': 'scissors',
        'scissors': 'paper',
        'paper': 'rock'
    };
    
    if (wins[choice1] === choice2) {
        return {
            winner: 'player1',
            message: 'Игрок 1 победил!',
            choice1,
            choice2
        };
    } else {
        return {
            winner: 'player2',
            message: 'Игрок 2 победил!',
            choice1,
            choice2
        };
    }
}

/**
 * Крестики-нолики: сделать ход
 */
export function makeTTTMove(chatId, userId, position) {
    const gameId = `${chatId}_ttt`;
    const game = gameStates[gameId];
    
    if (!game) return null;
    
    const currentUser = Storage.getCurrentUser();
    const chat = Storage.getChat(chatId);
    if (!chat || !currentUser) return null;
    
    const partnerId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
    
    // Определяем игроков при первом ходе
    if (!game.player1Id) {
        game.player1Id = userId;
        game.player2Id = partnerId;
        game.player1Symbol = 'X';
        game.player2Symbol = 'O';
    }
    
    // Определяем символ текущего игрока
    const playerSymbol = game.player1Id === userId ? game.player1Symbol : game.player2Symbol;
    
    // Проверяем, что это ход текущего игрока
    if (game.currentPlayer !== playerSymbol) {
        return { error: 'Не ваш ход!' };
    }
    
    // Проверяем, что клетка свободна
    if (game.board[position] !== null) {
        return { error: 'Эта клетка уже занята!' };
    }
    
    // Делаем ход
    game.board[position] = playerSymbol;
    
    // Проверяем победу
    const winner = checkTTTWinner(game.board);
    if (winner) {
        game.status = 'finished';
        game.winner = winner;
        hapticFeedback('medium');
        return {
            status: 'finished',
            winner,
            board: game.board,
            message: winner === 'draw' ? 'Ничья!' : `Победил игрок ${winner}!`
        };
    }
    
    // Меняем игрока
    game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
    hapticFeedback('light');
    
    return {
        status: 'playing',
        board: game.board,
        currentPlayer: game.currentPlayer,
        message: `Ход игрока ${game.currentPlayer}`
    };
}

/**
 * Проверка победителя в крестики-нолики
 */
function checkTTTWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Горизонтальные
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Вертикальные
        [0, 4, 8], [2, 4, 6] // Диагональные
    ];
    
    for (let line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    
    // Проверка на ничью
    if (board.every(cell => cell !== null)) {
        return 'draw';
    }
    
    return null;
}

/**
 * Сброс игры
 */
export function resetGame(chatId, gameType) {
    const gameId = `${chatId}_${gameType}`;
    delete gameStates[gameId];
}

/**
 * Получить доступные игры
 */
export function getAvailableGames() {
    return [
        { id: 'rps', name: 'Камень-ножницы-бумага', icon: '✂️', description: 'Классическая игра на удачу' },
        { id: 'ttt', name: 'Крестики-нолики', icon: '⭕', description: 'Стратегическая игра 3x3' }
    ];
}

