/**
 * Модуль авторизации и регистрации
 */

import { Storage } from '../utils/storage.js';
import { AVAILABLE_INTERESTS, REGISTRATION_STEPS, GENDER_LABELS } from '../utils/constants.js';
import { showError, clearError } from '../components/ui.js';
import { hapticNotification, hapticFeedback } from '../utils/telegram.js';
import { showMainApp } from './navigation.js';

// Текущий шаг регистрации
let currentStep = 1;

/**
 * Инициализация интересов
 */
export function initInterests() {
    const container = document.getElementById('interestsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    AVAILABLE_INTERESTS.forEach(interest => {
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

/**
 * Обработка изменения интересов
 */
function handleInterestChange() {
    const selectedInterests = getSelectedInterests();
    clearError();
    
    if (selectedInterests.length > 0) {
        hapticFeedback('light');
    }
}

/**
 * Получение выбранных интересов
 */
export function getSelectedInterests() {
    const checkboxes = document.querySelectorAll('#interestsContainer input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * Обновление индикатора шага
 */
function updateStepIndicator(step) {
    for (let i = 1; i <= REGISTRATION_STEPS; i++) {
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

/**
 * Показать шаг регистрации
 */
export function showStep(step) {
    // Скрываем все шаги
    for (let i = 1; i <= REGISTRATION_STEPS; i++) {
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

/**
 * Следующий шаг
 */
export function nextStep() {
    console.log('nextStep function called, currentStep:', currentStep);
    try {
        if (!validateCurrentStep()) {
            console.log('Validation failed');
            return;
        }
        
        if (currentStep < REGISTRATION_STEPS) {
            currentStep++;
            console.log('Moving to step:', currentStep);
            showStep(currentStep);
            hapticFeedback('light');
        } else {
            console.log('Already at last step');
        }
    } catch (error) {
        console.error('Error in nextStep:', error);
    }
}

/**
 * Предыдущий шаг
 */
export function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
        hapticFeedback('light');
    }
}

/**
 * Валидация текущего шага
 */
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

/**
 * Обработка регистрации
 */
export async function handleRegister() {
    if (!validateCurrentStep()) {
        return;
    }
    
    const name = document.getElementById('registerName').value.trim();
    const age = parseInt(document.getElementById('registerAge').value);
    const gender = document.getElementById('registerGender').value;
    const interests = getSelectedInterests();
    
    // Получаем telegram_id из Telegram WebApp
    let telegram_id = null;
    try {
        const { getTelegram } = await import('../utils/telegram.js');
        const tg = getTelegram();
        if (tg?.initDataUnsafe?.user?.id) {
            telegram_id = tg.initDataUnsafe.user.id.toString();
        }
    } catch (error) {
        console.error('Ошибка получения telegram_id:', error);
    }
    
    const userData = {
        name,
        age,
        gender,
        interests,
        telegram_id
    };
    
    try {
        const response = await Storage.saveUser(userData);
        const user = response.user || response;
        
        const currentUserData = {
            name: user.name,
            id: user.id,
            age: user.age,
            gender: user.gender,
            interests: user.interests || JSON.parse(user.interests),
            created_at: user.created_at || user.createdAt,
            is_admin: user.is_admin || 0
        };
        
        Storage.setCurrentUser(currentUserData);
        
        // Обновляем видимость админ-панели
        const { updateAdminNavVisibility } = await import('./navigation.js');
        await updateAdminNavVisibility(currentUserData);
        
        // Проверяем блокировку пользователя
        const { checkUserBlockStatus } = await import('../utils/api.js');
        const blockStatus = await checkUserBlockStatus(user.id);
        
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
            
            alert(`Вы заблокированы!\n\nПричина: ${blockStatus.reason}\nБлокировка до: ${blockedUntil.toLocaleString('ru-RU')}\nОсталось: ${timeLeft}`);
            Storage.clearCurrentUser();
            return;
        }
        
        hapticNotification('success');
        showMainApp();
        
        // Инициализируем WebSocket после регистрации
        import('./search.js').then(module => {
            module.initWebSocket();
        });
    } catch (error) {
        showError('Ошибка регистрации. Попробуйте еще раз.');
        console.error('Registration error:', error);
    }
}

/**
 * Очистка формы
 */
export function clearForm() {
    document.getElementById('registerName').value = '';
    document.getElementById('registerAge').value = '';
    document.getElementById('registerGender').value = '';
    
    const checkboxes = document.querySelectorAll('#interestsContainer input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    currentStep = 1;
    showStep(1);
}

/**
 * Показать экран авторизации
 */
export function showAuthScreen() {
    document.getElementById('mainApp').classList.remove('active');
    document.getElementById('activeChatScreen').classList.remove('active');
    document.getElementById('authScreen').classList.add('active');
    
    // Скрываем нижнюю навигацию на экране регистрации
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = 'none';
    }
    
    clearForm();
}

/**
 * Получить текущий шаг
 */
export function getCurrentStep() {
    return currentStep;
}

