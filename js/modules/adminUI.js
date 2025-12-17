/**
 * UI модуль для админ-панели
 */

import { checkAdminPassword, getStats, getAllUsers, getAllChats, deleteUser, deleteChat, clearAllData, createTestBot, addBotToQueue, removeAllBots, getAllBots } from './admin.js';
import { Storage } from '../utils/storage.js';
import { showScreen } from './navigation.js';
import { hapticFeedback } from '../utils/telegram.js';
import { getReports, getReportDetails, resolveReport, getAdminChats, sendAdminMessage, broadcastMessage, getAllUsers as getAllUsersAPI, updateUser, deleteUser as deleteUserAPI } from '../utils/api.js';

let currentAdminScreen = 'stats';

/**
 * Показать экран входа в админ-панель
 */
export function showAdminLogin() {
    document.getElementById('adminScreen').classList.add('active');
    document.getElementById('adminLogin').style.display = 'block';
    document.querySelector('.admin-panel').style.display = 'none';
    document.getElementById('adminPassword').value = '';
    hapticFeedback('light');
}

/**
 * Вход в админ-панель
 */
export async function loginAdmin() {
    const password = document.getElementById('adminPassword').value;

    if (!checkAdminPassword(password)) {
        alert('Неверный пароль!');
        hapticFeedback('error');
        return;
    }

    document.getElementById('adminLogin').style.display = 'none';
    document.querySelector('.admin-panel').style.display = 'block';
    
    // Проверяем права доступа и обновляем видимость элементов
    await updateAdminNavVisibility();
    
    showAdminStats();
    hapticFeedback('success');
}

/**
 * Обновить видимость элементов админ-панели в зависимости от роли
 */
async function updateAdminNavVisibility() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser || !currentUser.id) {
        return;
    }

    try {
        // Получаем данные пользователя с сервера для проверки роли
        const response = await fetch(`${window.location.origin}/api/users/${currentUser.id}`);
        if (response.ok) {
            const data = await response.json();
            const user = data.user;
            
            // Показываем кнопку управления администраторами только для супер-администратора
            const adminAdminsNav = document.getElementById('adminAdminsNav');
            if (adminAdminsNav) {
                if (user && user.admin_role === 'super_admin') {
                    adminAdminsNav.style.display = 'flex';
                } else {
                    adminAdminsNav.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Ошибка проверки прав доступа:', error);
    }
}

/**
 * Выход из админ-панели
 */
export function logoutAdmin() {
    document.getElementById('adminScreen').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    showScreen('home');
    hapticFeedback('light');
}

/**
 * Показать статистику
 */
export async function showAdminStats() {
    currentAdminScreen = 'stats';
    updateAdminNav();

    const content = document.getElementById('adminContent');
    content.innerHTML = '<div class="admin-loading">Загрузка статистики...</div>';

    try {
        const { getStats } = await import('../utils/api.js');
        const stats = await getStats();

        content.innerHTML = `
            <div class="admin-stats-grid">
                <div class="admin-stat-card">
                    <div class="admin-stat-icon">👥</div>
                    <div class="admin-stat-info">
                        <div class="admin-stat-value">${stats.totalUsers || 0}</div>
                        <div class="admin-stat-label">Всего пользователей</div>
                    </div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-icon">💬</div>
                    <div class="admin-stat-info">
                        <div class="admin-stat-value">${stats.totalChats || 0}</div>
                        <div class="admin-stat-label">Всего чатов</div>
                    </div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-icon">✨</div>
                    <div class="admin-stat-info">
                        <div class="admin-stat-value">${stats.activeChats || 0}</div>
                        <div class="admin-stat-label">Активных чатов</div>
                    </div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-icon">⭐</div>
                    <div class="admin-stat-info">
                        <div class="admin-stat-value">${stats.avgRating || '0.00'}</div>
                        <div class="admin-stat-label">Средний рейтинг</div>
                    </div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-icon">🔍</div>
                    <div class="admin-stat-info">
                        <div class="admin-stat-value">${stats.usersInQueue || 0}</div>
                        <div class="admin-stat-label">В очереди поиска</div>
                    </div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-icon">📊</div>
                    <div class="admin-stat-info">
                        <div class="admin-stat-value">${stats.totalRatings || 0}</div>
                        <div class="admin-stat-label">Всего оценок</div>
                    </div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-icon">💬</div>
                    <div class="admin-stat-info">
                        <div class="admin-stat-value">${stats.totalMessages || 0}</div>
                        <div class="admin-stat-label">Всего сообщений</div>
                    </div>
                </div>
            </div>
        `;

        setupAdminActions();
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        content.innerHTML = '<div class="admin-empty">Ошибка загрузки статистики</div>';
    }
}

/**
 * Показать пользователей
 */
export async function showAdminUsers() {
    currentAdminScreen = 'users';
    updateAdminNav();

    const content = document.getElementById('adminContent');
    content.innerHTML = '<div class="admin-loading">Загрузка пользователей...</div>';

    try {
        const { getAllUsers } = await import('../utils/api.js');
        const users = await getAllUsers();

        if (users.length === 0) {
            content.innerHTML = '<div class="admin-empty">Нет пользователей</div>';
            return;
        }

        content.innerHTML = `
            <div class="admin-list">
                ${users.map(user => `
                    <div class="admin-list-item">
                        <div class="admin-list-info">
                            <div class="admin-list-name">${user.name}</div>
                            <div class="admin-list-details">
                                ${user.age} лет • ${user.interests?.length || 0} интересов
                                <br>
                                Рейтинг: ${(user.rating_average || 0).toFixed(2)} (${user.rating_count || 0} оценок)
                                <br>
                                Монеты: ${user.coins || 0} 🪙
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-primary btn-small" data-action="edit-user" data-user-id="${user.id}">
                                Редактировать
                            </button>
                            <button class="btn btn-danger btn-small" data-action="delete-user" data-user-id="${user.id}">
                                Удалить
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        setupAdminActions();
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        content.innerHTML = '<div class="admin-empty">Ошибка загрузки пользователей</div>';
    }
}

/**
 * Показать чаты с пользователями (техподдержка)
 */
export async function showAdminChats() {
    currentAdminScreen = 'chats';
    updateAdminNav();

    const content = document.getElementById('adminContent');
    content.innerHTML = '<div class="admin-loading">Загрузка чатов...</div>';

    try {
        const chats = await getAdminChats();
        
        if (chats.length === 0) {
            content.innerHTML = '<div class="admin-empty">Нет чатов с пользователями</div>';
            return;
        }

        content.innerHTML = `
            <div class="admin-support-section">
                <div class="admin-support-header">
                    <h3>💬 Техническая поддержка</h3>
                    <button class="btn btn-primary btn-small" data-action="show-broadcast-modal">
                        📢 Массовая рассылка
                    </button>
                </div>
                <div class="admin-chats-list">
                    ${chats.map(chat => {
                        const unreadCount = chat.lastMessage && chat.lastMessage.user_id !== 'system_admin_001' ? 1 : 0;
                        return `
                            <div class="admin-chat-item ${unreadCount > 0 ? 'admin-chat-item-unread' : ''}" data-chat-id="${chat.id}" data-user-id="${chat.partner_id}">
                                <div class="admin-chat-avatar">${chat.partner_name.charAt(0).toUpperCase()}</div>
                                <div class="admin-chat-info">
                                    <div class="admin-chat-name">
                                        ${chat.partner_name}
                                        ${chat.partner_age ? `<span class="admin-chat-age">${chat.partner_age} лет</span>` : ''}
                                        ${unreadCount > 0 ? '<span class="admin-chat-badge">Новое</span>' : ''}
                                    </div>
                                    <div class="admin-chat-preview">
                                        ${chat.lastMessage ? (chat.lastMessage.text.length > 50 ? chat.lastMessage.text.substring(0, 50) + '...' : chat.lastMessage.text) : 'Нет сообщений'}
                                    </div>
                                    <div class="admin-chat-meta">
                                        ${chat.messageCount} сообщений • ${new Date(chat.updated_at).toLocaleString('ru-RU')}
                                    </div>
                                </div>
                                <button class="btn btn-primary btn-small" data-action="open-admin-chat" data-chat-id="${chat.id}" data-user-id="${chat.partner_id}">
                                    Открыть
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        setupAdminActions();
    } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
        content.innerHTML = '<div class="admin-empty">Ошибка загрузки чатов</div>';
    }
}

/**
 * Показать жалобы
 */
export async function showAdminReports() {
    currentAdminScreen = 'reports';
    updateAdminNav();

    const content = document.getElementById('adminContent');
    content.innerHTML = '<div class="admin-loading">Загрузка жалоб...</div>';

    try {
        const reports = await getReports();

        if (reports.length === 0) {
            content.innerHTML = '<div class="admin-empty">Нет жалоб</div>';
            return;
        }

        // Группируем жалобы по статусу
        const pendingReports = reports.filter(r => r.status === 'pending');
        const resolvedReports = reports.filter(r => r.status === 'resolved');
        const dismissedReports = reports.filter(r => r.status === 'dismissed');

        // Фильтруем жалобы если есть фильтр
        let filteredReports = reports;
        if (currentReportFilter) {
            filteredReports = reports.filter(r => r.status === currentReportFilter);
        }

        content.innerHTML = `
            <div class="admin-reports-section">
                <div class="admin-reports-filters">
                    <button class="btn btn-small ${!currentReportFilter ? 'btn-primary' : 'btn-secondary'}" data-action="filter-reports" data-filter="">Все (${reports.length})</button>
                    <button class="btn btn-small ${currentReportFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}" data-action="filter-reports" data-filter="pending">Ожидают (${pendingReports.length})</button>
                    <button class="btn btn-small ${currentReportFilter === 'resolved' ? 'btn-primary' : 'btn-secondary'}" data-action="filter-reports" data-filter="resolved">Одобрены (${resolvedReports.length})</button>
                    <button class="btn btn-small ${currentReportFilter === 'dismissed' ? 'btn-primary' : 'btn-secondary'}" data-action="filter-reports" data-filter="dismissed">Отклонены (${dismissedReports.length})</button>
                </div>
                <div class="admin-list">
                    ${filteredReports.length === 0 ? '<div class="admin-empty">Нет жалоб с выбранным фильтром</div>' : ''}
                    ${filteredReports.map(report => `
                        <div class="admin-list-item ${report.status === 'pending' ? 'admin-list-item-pending' : ''}" data-report-id="${report.id}">
                            <div class="admin-list-info">
                                <div class="admin-list-name">
                                    ${report.reporter_name} → ${report.reported_user_name}
                                    ${report.status === 'pending' ? '<span class="admin-badge admin-badge-pending">Ожидает</span>' : ''}
                                    ${report.status === 'resolved' ? '<span class="admin-badge admin-badge-resolved">Одобрена</span>' : ''}
                                    ${report.status === 'dismissed' ? '<span class="admin-badge admin-badge-dismissed">Отклонена</span>' : ''}
                                </div>
                                <div class="admin-list-details">
                                    Причина: ${getReasonLabel(report.reason)} • ${new Date(report.created_at).toLocaleString('ru-RU')}
                                </div>
                            </div>
                            <button class="btn btn-primary btn-small" data-action="view-report" data-report-id="${report.id}">
                                Просмотреть
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        setupAdminActions();
    } catch (error) {
        console.error('Ошибка загрузки жалоб:', error);
        content.innerHTML = '<div class="admin-empty">Ошибка загрузки жалоб</div>';
    }
}

let currentReportFilter = null;

function getReasonLabel(reason) {
    const labels = {
        'spam': 'Спам',
        'harassment': 'Оскорбления',
        'inappropriate_content': 'Неуместный контент',
        'scam': 'Мошенничество',
        'fake_profile': 'Поддельный профиль',
        'other': 'Другое'
    };
    return labels[reason] || reason;
}

/**
 * Показать детали жалобы
 */
export async function showReportDetails(reportId) {
    const content = document.getElementById('adminContent');
    content.innerHTML = '<div class="admin-loading">Загрузка деталей жалобы...</div>';

    try {
        const reportData = await getReportDetails(reportId);
        
        console.log('Данные жалобы получены:', reportData);
        
        // Проверяем структуру ответа - может быть reportData.report или просто reportData
        let report = reportData.report || reportData;
        
        if (!report) {
            console.error('Структура данных:', reportData);
            throw new Error('Данные жалобы не найдены');
        }
        
        const stats = report.reported_user_stats || {
            rating_average: report.rating_average || 0,
            rating_count: report.rating_count || 0,
            total_chats: 0,
            completed_chats: 0
        };

        content.innerHTML = `
            <div class="admin-report-details">
                <button class="btn btn-secondary btn-small" data-action="back-to-reports" style="margin-bottom: 20px;">← Назад к списку</button>
                
                <div class="admin-report-header">
                    <h3>Детали жалобы</h3>
                    <div class="admin-report-status">
                        ${report.status === 'pending' ? '<span class="admin-badge admin-badge-pending">Ожидает рассмотрения</span>' : ''}
                        ${report.status === 'resolved' ? '<span class="admin-badge admin-badge-resolved">Одобрена</span>' : ''}
                        ${report.status === 'dismissed' ? '<span class="admin-badge admin-badge-dismissed">Отклонена</span>' : ''}
                    </div>
                </div>

                <div class="admin-report-info">
                    <div class="admin-info-card">
                        <h4>Информация о жалобе</h4>
                        <div class="admin-info-row">
                            <span class="admin-info-label">Жалобщик:</span>
                            <span class="admin-info-value">${report.reporter_name} (${report.reporter_age} лет)</span>
                        </div>
                        <div class="admin-info-row">
                            <span class="admin-info-label">Нарушитель:</span>
                            <span class="admin-info-value">${report.reported_user_name} (${report.reported_user_age} лет)</span>
                        </div>
                        <div class="admin-info-row">
                            <span class="admin-info-label">Причина:</span>
                            <span class="admin-info-value">${getReasonLabel(report.reason)}</span>
                        </div>
                        <div class="admin-info-row">
                            <span class="admin-info-label">Описание:</span>
                            <span class="admin-info-value">${report.description}</span>
                        </div>
                        <div class="admin-info-row">
                            <span class="admin-info-label">Дата:</span>
                            <span class="admin-info-value">${new Date(report.created_at).toLocaleString('ru-RU')}</span>
                        </div>
                    </div>

                    <div class="admin-info-card">
                        <h4>Профиль нарушителя</h4>
                        <div class="admin-info-row">
                            <span class="admin-info-label">Имя:</span>
                            <span class="admin-info-value">${report.reported_user_name}</span>
                        </div>
                        <div class="admin-info-row">
                            <span class="admin-info-label">Возраст:</span>
                            <span class="admin-info-value">${report.reported_user_age} лет</span>
                        </div>
                        <div class="admin-info-row">
                            <span class="admin-info-label">Рейтинг:</span>
                            <span class="admin-info-value">${stats.rating_average.toFixed(1)} ⭐ (${stats.rating_count} оценок)</span>
                        </div>
                        <div class="admin-info-row">
                            <span class="admin-info-label">Всего чатов:</span>
                            <span class="admin-info-value">${stats.total_chats}</span>
                        </div>
                        <div class="admin-info-row">
                            <span class="admin-info-label">Завершенных чатов:</span>
                            <span class="admin-info-value">${stats.completed_chats}</span>
                        </div>
                    </div>
                </div>

                ${report.status === 'pending' ? `
                    <div class="admin-report-actions">
                        <div class="admin-action-buttons">
                            <button class="btn btn-primary btn-large" data-action="open-violator-chat" data-chat-id="${report.chat_id}">
                                <span class="btn-icon">💬</span>
                                Открыть чат нарушителя
                            </button>
                        </div>
                        <div class="admin-resolve-form">
                            <div class="admin-resolve-header">
                                <h4>⚖️ Обработать жалобу</h4>
                                <p class="admin-resolve-subtitle">Примите решение по жалобе и уведомите пользователя</p>
                            </div>
                            <div class="admin-resolve-content">
                                <div class="form-group-modern">
                                    <label class="form-label-modern">
                                        <span class="label-icon">📋</span>
                                        Вердикт
                                    </label>
                                    <div class="verdict-select-wrapper">
                                        <select id="reportVerdict" class="form-input-modern">
                                            <option value="approved">✅ Одобрить жалобу</option>
                                            <option value="rejected">❌ Отклонить жалобу</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group-modern">
                                    <label class="form-label-modern">
                                        <span class="label-icon">✉️</span>
                                        Сообщение пользователю
                                    </label>
                                    <textarea id="reportAdminMessage" class="form-input-modern form-textarea-modern" rows="4" placeholder="Напишите сообщение пользователю, который пожаловался..."></textarea>
                                    <div class="form-hint">Это сообщение будет отправлено пользователю, который подал жалобу</div>
                                </div>
                                <div class="form-group-modern">
                                    <label class="form-label-modern">
                                        <span class="label-icon">🔒</span>
                                        Блокировка нарушителя
                                    </label>
                                    <div class="block-input-wrapper">
                                        <input type="number" id="reportBlockDays" class="form-input-modern form-number-modern" min="0" max="365" value="0">
                                        <span class="block-days-label">дней</span>
                                    </div>
                                    <div class="form-hint">Введите 0, чтобы не блокировать пользователя</div>
                                </div>
                                <div class="admin-resolve-footer">
                                    <button class="btn btn-danger btn-large btn-resolve" data-action="resolve-report" data-report-id="${reportId}">
                                        <span class="btn-icon">⚡</span>
                                        Применить решение
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : `
                    ${report.admin_message ? `
                        <div class="admin-info-card">
                            <h4>Решение администратора</h4>
                            <div class="admin-info-row">
                                <span class="admin-info-label">Вердикт:</span>
                                <span class="admin-info-value">${report.admin_verdict === 'approved' ? 'Одобрено' : 'Отклонено'}</span>
                            </div>
                            <div class="admin-info-row">
                                <span class="admin-info-label">Сообщение:</span>
                                <span class="admin-info-value">${report.admin_message || 'Нет сообщения'}</span>
                            </div>
                            ${report.resolved_at ? `
                                <div class="admin-info-row">
                                    <span class="admin-info-label">Дата решения:</span>
                                    <span class="admin-info-value">${new Date(report.resolved_at).toLocaleString('ru-RU')}</span>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                    <button class="btn btn-primary" data-action="open-violator-chat" data-chat-id="${report.chat_id}">
                        Открыть чат нарушителя
                    </button>
                `}
            </div>
        `;

        setupAdminActions();
    } catch (error) {
        console.error('Ошибка загрузки деталей жалобы:', error);
        content.innerHTML = '<div class="admin-empty">Ошибка загрузки деталей жалобы</div>';
    }
}

/**
 * Показать управление администраторами
 */
export async function showAdminAdmins() {
    currentAdminScreen = 'admins';
    updateAdminNav();

    const content = document.getElementById('adminContent');
    const currentUser = Storage.getCurrentUser();
    
    if (!currentUser || !currentUser.id) {
        content.innerHTML = '<div class="admin-error">Ошибка: не удалось получить данные пользователя</div>';
        return;
    }

    try {
        // Проверяем, является ли пользователь супер-администратором
        const response = await fetch(`${window.location.origin}/api/admin/admins?userId=${currentUser.id}`);
        if (!response.ok) {
            if (response.status === 403) {
                content.innerHTML = `
                    <div class="admin-error">
                        <h3>⚠️ Доступ запрещен</h3>
                        <p>Управление администраторами доступно только главному администратору.</p>
                    </div>
                `;
                return;
            }
            throw new Error('Ошибка получения списка администраторов');
        }

        const data = await response.json();
        const admins = data.admins || [];

        const roleLabels = {
            'super_admin': 'Главный администратор',
            'admin': 'Администратор',
            'moderator': 'Модератор'
        };

        const roleColors = {
            'super_admin': '#FF6B6B',
            'admin': '#4ECDC4',
            'moderator': '#95E1D3'
        };

        content.innerHTML = `
            <div class="admin-admins-section">
                <div class="admin-section-header">
                    <h3>👑 Управление администраторами</h3>
                    <button class="btn btn-primary" data-action="add-admin">
                        ➕ Добавить администратора
                    </button>
                </div>
                
                <div class="admin-admins-list">
                    <h4>Список администраторов (${admins.length})</h4>
                    ${admins.length === 0 ? '<div class="admin-empty">Нет администраторов</div>' : ''}
                    ${admins.map(admin => `
                        <div class="admin-admin-item">
                            <div class="admin-admin-info">
                                <div class="admin-admin-name">
                                    ${admin.name}
                                    <span class="admin-role-badge" style="background: ${roleColors[admin.admin_role] || '#999'}">
                                        ${roleLabels[admin.admin_role] || admin.admin_role}
                                    </span>
                                    ${admin.admin_role === 'super_admin' ? '<span class="admin-super-badge">🔒</span>' : ''}
                                </div>
                                <div class="admin-admin-details">
                                    Telegram ID: ${admin.telegram_id || 'не указан'}
                                    ${admin.created_at ? `• Создан: ${new Date(admin.created_at).toLocaleDateString('ru-RU')}` : ''}
                                </div>
                            </div>
                            <div class="admin-admin-controls">
                                ${admin.admin_role !== 'super_admin' ? `
                                    <select class="admin-role-select" data-admin-id="${admin.id}" data-current-role="${admin.admin_role}">
                                        <option value="moderator" ${admin.admin_role === 'moderator' ? 'selected' : ''}>Модератор</option>
                                        <option value="admin" ${admin.admin_role === 'admin' ? 'selected' : ''}>Администратор</option>
                                    </select>
                                    <button class="btn btn-danger btn-small" data-action="remove-admin" data-admin-id="${admin.id}">
                                        🗑️ Удалить
                                    </button>
                                ` : '<span class="admin-readonly">Нельзя изменить</span>'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        setupAdminActions();
    } catch (error) {
        console.error('Ошибка загрузки администраторов:', error);
        content.innerHTML = `<div class="admin-error">Ошибка загрузки: ${error.message}</div>`;
    }
}

/**
 * Показать управление ботом
 */
export function showAdminBot() {
    currentAdminScreen = 'bot';
    updateAdminNav();

    const bots = getAllBots();
    const queue = Storage.getSearchQueue();
    const content = document.getElementById('adminContent');

    content.innerHTML = `
        <div class="admin-bot-section">
            <h3>Управление тестовыми ботами</h3>
            <p>Создайте тестового бота для проверки функционала поиска</p>
            
            <div class="admin-bot-actions">
                <button class="btn btn-primary" data-action="create-bot">
                    ➕ Создать тестового бота
                </button>
                <button class="btn btn-secondary" data-action="remove-all-bots">
                    🗑️ Удалить всех ботов
                </button>
            </div>
            
            <div class="admin-bot-list">
                <h4>Созданные боты (${bots.length})</h4>
                ${bots.length === 0 ? '<div class="admin-empty">Нет ботов</div>' : ''}
                ${bots.map(bot => {
        const inQueue = queue.includes(bot.id);
        return `
                        <div class="admin-bot-item">
                            <div class="admin-bot-info">
                                <div class="admin-bot-name">${bot.name}</div>
                                <div class="admin-bot-details">
                                    ${bot.age} лет • ${bot.interests?.length || 0} интересов
                                    ${inQueue ? '• В очереди поиска' : ''}
                                </div>
                                <div class="admin-bot-interests">
                                    ${bot.interests?.slice(0, 5).join(', ') || 'Нет интересов'}
                                </div>
                            </div>
                            <div class="admin-bot-controls">
                                ${!inQueue ? `
                                    <button class="btn btn-primary btn-small" data-action="add-bot-to-queue" data-bot-id="${bot.id}">
                                        Добавить в очередь
                                    </button>
                                ` : `
                                    <span class="bot-status">В очереди</span>
                                `}
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;

    setupAdminActions();
}

/**
 * Обновить навигацию админ-панели
 */
function updateAdminNav() {
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        const screen = item.getAttribute('data-admin-screen');
        if (screen === currentAdminScreen) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * Настройка обработчиков действий админ-панели
 */
function setupAdminActions() {
    document.body.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.getAttribute('data-action');
        if (!action) return;

        switch (action) {
            case 'edit-user':
                e.preventDefault();
                const editUserId = e.target.closest('[data-user-id]')?.getAttribute('data-user-id');
                if (editUserId) {
                    showEditUserModal(editUserId);
                }
                break;
            case 'delete-user':
                e.preventDefault();
                const userId = e.target.closest('[data-user-id]')?.getAttribute('data-user-id');
                if (userId && confirm('Удалить этого пользователя? Это действие нельзя отменить.')) {
                    deleteUserAPI(userId).then(() => {
                        showAdminUsers();
                        hapticFeedback('success');
                    }).catch(error => {
                        console.error('Ошибка удаления пользователя:', error);
                        alert('Ошибка удаления пользователя');
                        hapticFeedback('error');
                    });
                }
                break;
            case 'delete-chat':
                const chatId = e.target.closest('[data-chat-id]')?.getAttribute('data-chat-id');
                if (chatId && confirm('Удалить этот чат?')) {
                    deleteChat(chatId);
                    showAdminChats();
                    hapticFeedback('medium');
                }
                break;
            case 'clear-all-data':
                if (confirm('ВНИМАНИЕ! Это удалит ВСЕ данные. Продолжить?')) {
                    clearAllData();
                    alert('Все данные удалены');
                    showAdminStats();
                    hapticFeedback('medium');
                }
                break;
            case 'create-bot':
                const bot = createTestBot();
                addBotToQueue(bot.id);
                alert(`Бот "${bot.name}" создан и добавлен в очередь поиска`);
                showAdminBot();
                hapticFeedback('success');
                break;
            case 'add-bot-to-queue':
                const botId = e.target.closest('[data-bot-id]')?.getAttribute('data-bot-id');
                if (botId) {
                    addBotToQueue(botId);
                    showAdminBot();
                    hapticFeedback('success');
                }
                break;
            case 'remove-all-bots':
                if (confirm('Удалить всех ботов?')) {
                    removeAllBots();
                    showAdminBot();
                    hapticFeedback('medium');
                }
                break;
            case 'show-admin-reports':
                e.preventDefault();
                showAdminReports();
                break;
            case 'view-report':
                e.preventDefault();
                const reportId = e.target.closest('[data-report-id]')?.getAttribute('data-report-id');
                if (reportId) {
                    showReportDetails(reportId);
                }
                break;
            case 'back-to-reports':
                e.preventDefault();
                showAdminReports();
                break;
            case 'open-violator-chat':
                e.preventDefault();
                const violatorChatId = e.target.closest('[data-chat-id]')?.getAttribute('data-chat-id');
                if (violatorChatId) {
                    // Импортируем функцию открытия чата
                    import('../modules/chat.js').then(module => {
                        module.openChat(violatorChatId);
                        // Закрываем админ-панель
                        document.getElementById('adminScreen').classList.remove('active');
                        document.getElementById('mainApp').classList.add('active');
                    });
                }
                break;
            case 'resolve-report':
                e.preventDefault();
                const reportIdToResolve = e.target.closest('[data-report-id]')?.getAttribute('data-report-id');
                if (reportIdToResolve) {
                    const verdict = document.getElementById('reportVerdict').value;
                    const message = document.getElementById('reportAdminMessage').value.trim();
                    const blockDays = parseInt(document.getElementById('reportBlockDays').value) || 0;

                    if (confirm(`Вы уверены, что хотите ${verdict === 'approved' ? 'одобрить' : 'отклонить'} эту жалобу?`)) {
                        resolveReport(reportIdToResolve, verdict, message, blockDays).then(() => {
                            alert('Жалоба успешно обработана');
                            showReportDetails(reportIdToResolve);
                            hapticFeedback('success');
                        }).catch(error => {
                            console.error('Ошибка обработки жалобы:', error);
                            alert('Ошибка обработки жалобы');
                            hapticFeedback('error');
                        });
                    }
                }
                break;
            case 'filter-reports':
                e.preventDefault();
                const filter = e.target.closest('[data-filter]')?.getAttribute('data-filter');
                currentReportFilter = filter || null;
                showAdminReports();
                break;
            case 'open-admin-chat':
                e.preventDefault();
                const adminChatId = e.target.closest('[data-chat-id]')?.getAttribute('data-chat-id');
                const adminUserId = e.target.closest('[data-user-id]')?.getAttribute('data-user-id');
                if (adminChatId && adminUserId) {
                    showAdminChatWindow(adminChatId, adminUserId);
                }
                break;
            case 'show-broadcast-modal':
                e.preventDefault();
                showBroadcastModal();
                break;
            case 'send-broadcast':
                e.preventDefault();
                const broadcastText = document.getElementById('broadcastText')?.value.trim();
                if (broadcastText) {
                    broadcastMessage(broadcastText).then(result => {
                        alert(`Рассылка отправлена: ${result.successCount} успешно, ${result.errorCount} ошибок`);
                        const modal = document.getElementById('broadcastModal');
                        if (modal) modal.classList.remove('active');
                        const textarea = document.getElementById('broadcastText');
                        if (textarea) textarea.value = '';
                    }).catch(error => {
                        console.error('Ошибка рассылки:', error);
                        alert('Ошибка отправки рассылки');
                    });
                }
                break;
            case 'close-edit-user-modal':
                e.preventDefault();
                const editModal = e.target.closest('.modal');
                if (editModal) editModal.remove();
                break;
            case 'save-user-changes':
                // Обработчик уже установлен в showEditUserModal через addEventListener
                // Не делаем preventDefault, чтобы обработчик в модальном окне сработал
                break;
            case 'close-broadcast-modal':
                e.preventDefault();
                const broadcastModal = document.getElementById('broadcastModal');
                if (broadcastModal) broadcastModal.classList.remove('active');
                break;
            case 'send-admin-message':
                e.preventDefault();
                const sendButton = e.target.closest('[data-action="send-admin-message"]');
                if (sendButton && sendButton.disabled) return; // Предотвращаем повторную отправку
                
                const messageText = document.getElementById('adminMessageInput')?.value.trim();
                const chatWindow = document.getElementById('adminChatWindow');
                const targetUserId = chatWindow?.dataset.userId;
                if (messageText && targetUserId) {
                    // Блокируем кнопку отправки
                    if (sendButton) sendButton.disabled = true;
                    
                    sendAdminMessage(targetUserId, messageText).then(() => {
                        const input = document.getElementById('adminMessageInput');
                        if (input) input.value = '';
                        loadAdminChatMessages(chatWindow.dataset.chatId);
                    }).catch(error => {
                        console.error('Ошибка отправки сообщения:', error);
                        alert('Ошибка отправки сообщения');
                    }).finally(() => {
                        // Разблокируем кнопку отправки
                        if (sendButton) sendButton.disabled = false;
                    });
                }
                break;
            case 'close-admin-chat':
                e.preventDefault();
                const adminChatWindow = document.getElementById('adminChatWindow');
                if (adminChatWindow) adminChatWindow.classList.remove('active');
                break;
            case 'show-admin-admins':
                e.preventDefault();
                showAdminAdmins();
                break;
            case 'add-admin':
                e.preventDefault();
                showAddAdminModal();
                break;
            case 'remove-admin':
                e.preventDefault();
                const adminIdToRemove = e.target.closest('[data-admin-id]')?.getAttribute('data-admin-id');
                if (adminIdToRemove && confirm('Удалить права администратора у этого пользователя?')) {
                    removeAdmin(adminIdToRemove);
                }
                break;
        }
    });
}

// Обработчик изменения роли через select (добавляется динамически после загрузки списка)
document.addEventListener('change', async (e) => {
    if (e.target.classList.contains('admin-role-select')) {
        const select = e.target;
        const adminId = select.getAttribute('data-admin-id');
        const newRole = select.value;
        const currentRole = select.getAttribute('data-current-role');
        if (adminId && newRole !== currentRole) {
            await changeAdminRole(adminId, newRole);
        }
    }
});

let currentAdminChatId = null;
let currentAdminUserId = null;

/**
 * Показать модальное окно редактирования пользователя
 */
async function showEditUserModal(userId) {
    try {
        const users = await getAllUsersAPI();
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            alert('Пользователь не найден');
            return;
        }

        // Удаляем существующее модальное окно, если есть
        const existingModal = document.getElementById('editUserModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'editUserModal';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <h3>Редактировать пользователя: ${user.name}</h3>
                <div class="form-group">
                    <label>Рейтинг (средний):</label>
                    <input type="number" id="editUserRating" step="0.01" min="0" max="5" value="${user.rating_average || 0}" class="form-input">
                </div>
                <div class="form-group">
                    <label>Количество оценок:</label>
                    <input type="number" id="editUserRatingCount" min="0" value="${user.rating_count || 0}" class="form-input">
                </div>
                <div class="form-group">
                    <label>Монеты:</label>
                    <input type="number" id="editUserCoins" min="0" value="${user.coins || 0}" class="form-input">
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" data-action="close-edit-user-modal">Отмена</button>
                    <button class="btn btn-primary" data-action="save-user-changes" data-user-id="${userId}">Сохранить</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Обработчик сохранения изменений
        const saveBtn = modal.querySelector('[data-action="save-user-changes"]');
        if (saveBtn) {
            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const rating = parseFloat(document.getElementById('editUserRating').value) || 0;
                const ratingCount = parseInt(document.getElementById('editUserRatingCount').value) || 0;
                const coins = parseInt(document.getElementById('editUserCoins').value) || 0;
                
                // Валидация
                if (rating < 0 || rating > 5) {
                    alert('Рейтинг должен быть от 0 до 5');
                    return;
                }
                
                if (ratingCount < 0) {
                    alert('Количество оценок не может быть отрицательным');
                    return;
                }
                
                if (coins < 0) {
                    alert('Количество монет не может быть отрицательным');
                    return;
                }
                
                // Блокируем кнопку во время сохранения
                saveBtn.disabled = true;
                const originalText = saveBtn.textContent;
                saveBtn.textContent = 'Сохранение...';
                
                try {
                    await updateUser(userId, { 
                        rating_average: rating, 
                        rating_count: ratingCount, 
                        coins: coins 
                    });
                    modal.remove();
                    await showAdminUsers();
                    hapticFeedback('success');
                } catch (error) {
                    console.error('Ошибка обновления пользователя:', error);
                    alert('Ошибка обновления пользователя: ' + (error.message || error.toString() || 'Неизвестная ошибка'));
                    hapticFeedback('error');
                    // Разблокируем кнопку при ошибке
                    saveBtn.disabled = false;
                    saveBtn.textContent = originalText;
                }
            });
        }
        
        // Обработчик закрытия модального окна
        const closeBtn = modal.querySelector('[data-action="close-edit-user-modal"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                modal.remove();
            });
        }
        
        // Закрытие при клике на фон
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Закрытие по Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape' && modal.parentNode) {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
        alert('Ошибка загрузки данных пользователя: ' + (error.message || 'Неизвестная ошибка'));
    }
}

/**
 * Показать окно чата с пользователем
 */
async function showAdminChatWindow(chatId, userId) {
    currentAdminChatId = chatId;
    currentAdminUserId = userId;
    
    let chatWindow = document.getElementById('adminChatWindow');
    if (!chatWindow) {
        createAdminChatWindow();
        chatWindow = document.getElementById('adminChatWindow');
    }
    
    if (chatWindow) {
        chatWindow.dataset.chatId = chatId;
        chatWindow.dataset.userId = userId;
        
        // Получаем имя пользователя для заголовка
        try {
            const API = await import('../utils/api.js');
            const user = await API.getUser(userId);
            const headerTitle = chatWindow.querySelector('.admin-chat-header h3');
            if (headerTitle) {
                headerTitle.textContent = `Чат с ${user.name}`;
            }
        } catch (error) {
            console.error('Ошибка получения пользователя:', error);
        }
        
        chatWindow.classList.add('active');
    }
    
    await loadAdminChatMessages(chatId);
}

/**
 * Загрузить сообщения чата администратора
 */
async function loadAdminChatMessages(chatId) {
    try {
        const API = await import('../utils/api.js');
        const chatInfo = await API.getChatMessages(chatId);
        const messages = chatInfo.messages || [];
        
        const messagesContainer = document.getElementById('adminMessagesContainer');
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = '';
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = '<div class="admin-empty-message">Нет сообщений</div>';
            return;
        }
        
        messages.forEach(msg => {
            const isAdmin = msg.user_id === 'system_admin_001';
            const messageEl = document.createElement('div');
            messageEl.className = `admin-message ${isAdmin ? 'admin-message-own' : 'admin-message-user'}`;
            messageEl.innerHTML = `
                <div class="admin-message-bubble">
                    <div class="admin-message-text">${msg.text}</div>
                    <div class="admin-message-time">${new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            `;
            messagesContainer.appendChild(messageEl);
        });
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
    }
}

/**
 * Создать окно чата администратора
 */
function createAdminChatWindow() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    const chatWindow = document.createElement('div');
    chatWindow.id = 'adminChatWindow';
    chatWindow.className = 'admin-chat-window';
    chatWindow.innerHTML = `
        <div class="admin-chat-header">
            <h3>Чат с пользователем</h3>
            <button class="btn-icon" data-action="close-admin-chat">✕</button>
        </div>
        <div id="adminMessagesContainer" class="admin-messages-container"></div>
        <div class="admin-chat-input-area">
            <input type="text" id="adminMessageInput" class="admin-message-input" placeholder="Введите сообщение..." maxlength="500">
            <button class="btn btn-primary" data-action="send-admin-message">Отправить</button>
        </div>
    `;
    adminContent.appendChild(chatWindow);
}

/**
 * Показать модальное окно массовой рассылки
 */
function showBroadcastModal() {
    let modal = document.getElementById('broadcastModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'broadcastModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>📢 Массовая рассылка</h3>
                <p>Отправить сообщение всем пользователям</p>
                <div class="form-group-modern">
                    <label class="form-label-modern">Сообщение:</label>
                    <textarea id="broadcastText" class="form-input-modern form-textarea-modern" rows="5" placeholder="Введите текст рассылки..." required></textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" data-action="close-broadcast-modal">Отмена</button>
                    <button class="btn btn-primary" data-action="send-broadcast">Отправить</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.classList.add('active');
}

/**
 * Показать модальное окно добавления администратора
 */
async function showAddAdminModal() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser || !currentUser.id) {
        alert('Ошибка: не удалось получить данные пользователя');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>➕ Добавить администратора</h3>
            <div class="form-group">
                <label for="adminTelegramId">Telegram ID пользователя:</label>
                <input type="text" id="adminTelegramId" class="form-input" placeholder="Введите Telegram ID" required>
                <small>Пользователь должен быть зарегистрирован в системе</small>
            </div>
            <div class="form-group">
                <label for="adminRole">Роль:</label>
                <select id="adminRole" class="form-input" required>
                    <option value="moderator">Модератор (чаты с администратором, жалобы)</option>
                    <option value="admin">Администратор (полный доступ)</option>
                </select>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" data-action="close-add-admin-modal">Отмена</button>
                <button class="btn btn-primary" data-action="confirm-add-admin">Добавить</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Обработчики
    modal.querySelector('[data-action="close-add-admin-modal"]').addEventListener('click', () => {
        modal.remove();
    });

    modal.querySelector('[data-action="confirm-add-admin"]').addEventListener('click', async () => {
        const telegramId = document.getElementById('adminTelegramId').value.trim();
        const role = document.getElementById('adminRole').value;

        if (!telegramId) {
            alert('Введите Telegram ID');
            return;
        }

        try {
            const response = await fetch(`${window.location.origin}/api/admin/admins`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    targetTelegramId: telegramId,
                    role: role
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка добавления администратора');
            }

            alert(data.message || 'Администратор успешно добавлен');
            modal.remove();
            showAdminAdmins();
            hapticFeedback('success');
        } catch (error) {
            console.error('Ошибка добавления администратора:', error);
            alert('Ошибка: ' + error.message);
            hapticFeedback('error');
        }
    });
}

/**
 * Удалить администратора
 */
async function removeAdmin(adminId) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser || !currentUser.id) {
        alert('Ошибка: не удалось получить данные пользователя');
        return;
    }

    try {
        const response = await fetch(`${window.location.origin}/api/admin/admins/${adminId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка удаления администратора');
        }

        alert(data.message || 'Права администратора успешно удалены');
        showAdminAdmins();
        hapticFeedback('success');
    } catch (error) {
        console.error('Ошибка удаления администратора:', error);
        alert('Ошибка: ' + error.message);
        hapticFeedback('error');
    }
}

/**
 * Изменить роль администратора
 */
async function changeAdminRole(adminId, newRole) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser || !currentUser.id) {
        alert('Ошибка: не удалось получить данные пользователя');
        return;
    }

    try {
        const response = await fetch(`${window.location.origin}/api/admin/admins/${adminId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                role: newRole
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка изменения роли');
        }

        alert(data.message || 'Роль успешно изменена');
        showAdminAdmins();
        hapticFeedback('success');
    } catch (error) {
        console.error('Ошибка изменения роли:', error);
        alert('Ошибка: ' + error.message);
        hapticFeedback('error');
        // Восстанавливаем предыдущее значение
        const select = document.querySelector(`.admin-role-select[data-admin-id="${adminId}"]`);
        if (select) {
            select.value = select.getAttribute('data-current-role');
        }
    }
}

// Инициализация обработчиков при загрузке
document.addEventListener('DOMContentLoaded', () => {
    setupAdminActions();
});

