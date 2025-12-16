/**
 * Константы приложения
 */

// Доступные интересы
export const AVAILABLE_INTERESTS = [
    'Спорт', 'Музыка', 'Кино', 'Книги', 'Игры', 'Путешествия',
    'Фотография', 'Кулинария', 'Технологии', 'Искусство', 'Наука',
    'Мода', 'Автомобили', 'Животные', 'Природа', 'Йога',
    'Танцы', 'Рукоделие', 'Программирование', 'Дизайн', 'Бизнес',
    'Психология', 'История', 'Языки', 'Образование', 'Здоровье'
];

// Метки для пола
export const GENDER_LABELS = {
    'male': 'Мужской',
    'female': 'Женский',
    'other': 'Другой',
    'prefer_not_to_say': 'Не указано'
};

// Количество шагов регистрации
export const REGISTRATION_STEPS = 4;

// Настройки поиска
export const SEARCH_CONFIG = {
    interval: 2000, // Интервал проверки в мс
    minCommonInterests: 1 // Минимальное количество общих интересов
};

// Настройки чата
export const CHAT_CONFIG = {
    maxMessageLength: 500,
    maxMessagesInHistory: 1000
};

// Настройки рейтинга
export const RATING_CONFIG = {
    min: 1,
    max: 5
};

// ID системного администратора
export const ADMIN_ID = 'system_admin_001';

