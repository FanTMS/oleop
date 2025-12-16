/**
 * Модуль магазина
 */

import { Storage } from '../utils/storage.js';
import { hapticFeedback } from '../utils/telegram.js';
import { API_BASE_URL } from '../utils/api.js';

let currentShopTab = 'items';

/**
 * Загрузить экран магазина
 */
export async function loadShopScreen() {
    await updateCoinsBalance('shopCoinsBalance');
    initShopTabs();
    await loadShopItems();
}

/**
 * Инициализация вкладок магазина
 */
function initShopTabs() {
    const tabs = document.querySelectorAll('.shop-tab');
    tabs.forEach(tab => {
        // Сохраняем состояние активной вкладки
        const wasActive = tab.classList.contains('active');
        const tabName = tab.getAttribute('data-shop-tab');

        // Удаляем старые обработчики, клонируя элемент
        const newTab = tab.cloneNode(true);

        // Восстанавливаем активное состояние
        if (wasActive) {
            newTab.classList.add('active');
        }

        tab.parentNode.replaceChild(newTab, tab);

        // Добавляем новый обработчик
        newTab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const clickedTabName = newTab.getAttribute('data-shop-tab');
            if (clickedTabName) {
                switchShopTab(clickedTabName);
            }
        });
    });
}

/**
 * Переключение вкладок магазина
 */
function switchShopTab(tabName) {
    if (!tabName) {
        console.error('Имя вкладки не указано');
        return;
    }

    currentShopTab = tabName;

    // Обновляем активные вкладки
    document.querySelectorAll('.shop-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-shop-tab') === tabName) {
            tab.classList.add('active');
        }
    });

    // Показываем нужный контент
    document.querySelectorAll('.shop-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    if (tabName === 'items') {
        const itemsList = document.getElementById('shopItemsList');
        if (itemsList) {
            itemsList.classList.add('active');
            loadShopItems();
        } else {
            console.error('Элемент shopItemsList не найден');
        }
    }

    hapticFeedback('light');
}

/**
 * Обновить баланс монет
 */
export async function updateCoinsBalance(elementId) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/coins`);
        const data = await response.json();

        const balanceEl = document.getElementById(elementId);
        if (balanceEl) {
            balanceEl.textContent = data.coins || 0;
        }
    } catch (error) {
        console.error('Ошибка получения баланса:', error);
    }
}

/**
 * Загрузить товары магазина
 */
export async function loadShopItems() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;

    try {
        // Получаем товары магазина
        const itemsResponse = await fetch(`${API_BASE_URL}/api/shop/items`);
        const itemsData = await itemsResponse.json();

        // Получаем купленные товары пользователя
        const userItemsResponse = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/items`);
        const userItemsData = await userItemsResponse.json();

        const purchasedItems = new Map();
        userItemsData.items.forEach(userItem => {
            purchasedItems.set(userItem.item_id, {
                id: userItem.id,
                is_active: userItem.is_active === 1
            });
        });

        // Отображаем товары
        const shopList = document.getElementById('shopItemsList');
        if (!shopList) return;

        shopList.innerHTML = '';

        // Фильтруем товары: показываем только обычные товары и темы
        const filteredItems = itemsData.items.filter(item => {
            if (!item) return false;
            return true;
        });

        if (filteredItems.length === 0) {
            shopList.innerHTML = '<div class="empty-state"><p>Товары временно отсутствуют</p></div>';
            return;
        }

        filteredItems.forEach(item => {
            const purchasedItem = purchasedItems.get(item.id);
            const itemEl = createShopItemElement(item, purchasedItem);
            shopList.appendChild(itemEl);
        });
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        const shopList = document.getElementById('shopItemsList');
        if (shopList) {
            shopList.innerHTML = '<div class="empty-state"><p>Ошибка загрузки товаров</p></div>';
        }
    }
}

/**
 * Создать элемент товара
 */
function createShopItemElement(item, purchasedItem) {
    const itemEl = document.createElement('div');
    itemEl.className = `shop-item shop-item-${item.rarity}`;
    const isPurchased = purchasedItem !== undefined;

    if (isPurchased) {
        itemEl.classList.add('purchased');
        if (purchasedItem.is_active) {
            itemEl.classList.add('active');
        }
    }

    const rarityLabels = {
        'common': 'Обычный',
        'rare': 'Редкий',
        'epic': 'Эпический',
        'legendary': 'Легендарный'
    };

    const sellPrice = Math.floor(item.price * 0.5);

    itemEl.innerHTML = `
        <div class="shop-item-icon">${item.icon}</div>
        <div class="shop-item-info">
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-description">${item.description}</div>
            <div class="shop-item-rarity">${rarityLabels[item.rarity] || 'Обычный'}</div>
            ${!isPurchased ? `<div class="shop-item-price shop-item-price-${item.rarity || 'common'}" data-item-id="${item.id}" data-price="${item.price}">
                <span class="coins-icon-small">🪙</span>
                <span class="shop-item-price-amount">${item.price}</span>
            </div>` : ''}
        </div>
        <div class="shop-item-action">
            ${isPurchased
            ? `<div class="shop-item-actions-group">
                    <button class="btn ${purchasedItem.is_active ? 'btn-secondary' : 'btn-primary'} shop-item-toggle" 
                           data-user-item-id="${purchasedItem.id}" 
                           data-item-id="${item.id}">
                        ${purchasedItem.is_active ? 'Деактивировать' : 'Активировать'}
                    </button>
                    <button class="btn btn-danger shop-item-sell" 
                           data-user-item-id="${purchasedItem.id}" 
                           data-item-id="${item.id}"
                           data-sell-price="${sellPrice}">
                        <span class="coins-icon-small">🪙</span>
                        Продать ${sellPrice}
                    </button>
                </div>`
            : ''
        }
        </div>
    `;

    if (!isPurchased) {
        // Клик на цену для покупки
        const priceEl = itemEl.querySelector('.shop-item-price');
        if (priceEl) {
            priceEl.style.cursor = 'pointer';
            priceEl.addEventListener('click', async (e) => {
                e.stopPropagation();
                // Если это именной бейдж, открываем модальное окно создания
                if (item.item_type === 'custom_badge') {
                    showCustomBadgeModal();
                } else {
                    purchaseItem(item.id, item.price);
                }
            });
        }
    } else {
        const toggleBtn = itemEl.querySelector('.shop-item-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleItem(purchasedItem.id, item.id);
            });
        }

        const sellBtn = itemEl.querySelector('.shop-item-sell');
        if (sellBtn) {
            sellBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sellPrice = parseInt(sellBtn.getAttribute('data-sell-price'));
                sellItem(purchasedItem.id, item.id, sellPrice);
            });
        }
    }

    return itemEl;
}

/**
 * Купить товар
 */
async function purchaseItem(itemId, price) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;

    if (!confirm(`Купить этот товар за ${price} монет?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/shop/purchase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                itemId: itemId
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            hapticFeedback('success');
            alert('Товар успешно куплен!');
            await updateCoinsBalance('shopCoinsBalance');
            await loadShopItems();
        } else {
            hapticFeedback('error');
            alert(data.error || 'Ошибка покупки товара');
        }
    } catch (error) {
        console.error('Ошибка покупки товара:', error);
        hapticFeedback('error');
        alert('Ошибка покупки товара');
    }
}

/**
 * Продать предмет
 */
async function sellItem(userItemId, itemId, sellPrice) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;

    if (!confirm(`Продать этот предмет за ${sellPrice} монет?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/shop/items/${userItemId}/sell`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            hapticFeedback('success');
            alert(`Предмет продан за ${sellPrice} монет!`);
            await updateCoinsBalance('shopCoinsBalance');
            await loadShopItems();
        } else {
            hapticFeedback('error');
            alert(data.error || 'Ошибка продажи предмета');
        }
    } catch (error) {
        console.error('Ошибка продажи предмета:', error);
        hapticFeedback('error');
        alert('Ошибка продажи предмета');
    }
}

/**
 * Активировать/деактивировать предмет
 */
async function toggleItem(userItemId, itemId) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/shop/items/${userItemId}/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            hapticFeedback('success');
            await loadShopItems();
        } else {
            hapticFeedback('error');
            alert(data.error || 'Ошибка переключения предмета');
        }
    } catch (error) {
        console.error('Ошибка переключения предмета:', error);
        hapticFeedback('error');
        alert('Ошибка переключения предмета');
    }
}

/**
 * Показать модальное окно создания именного бейджа
 */
export function showCustomBadgeModal() {
    const modal = document.getElementById('customBadgeModal');
    if (!modal) return;
    
    // Сбрасываем форму
    const textInput = document.getElementById('customBadgeText');
    const colorButtons = document.querySelectorAll('.badge-color-btn');
    
    if (textInput) textInput.value = '';
    
    // Устанавливаем первый цвет как выбранный
    colorButtons.forEach((btn, index) => {
        btn.classList.remove('selected');
        if (index === 0) btn.classList.add('selected');
    });
    
    // Обработчики выбора цвета
    colorButtons.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', function() {
            document.querySelectorAll('.badge-color-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    modal.style.display = 'flex';
}

/**
 * Закрыть модальное окно создания именного бейджа
 */
export function closeCustomBadgeModal() {
    const modal = document.getElementById('customBadgeModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Создать именной бейдж
 */
window.createCustomBadge = async function() {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;
    
    const textInput = document.getElementById('customBadgeText');
    const selectedColorBtn = document.querySelector('.badge-color-btn.selected');
    
    if (!textInput || !selectedColorBtn) return;
    
    const badgeText = textInput.value.trim();
    const badgeColor = selectedColorBtn.getAttribute('data-color');
    
    if (!badgeText || badgeText.length === 0) {
        alert('Введите текст бейджа');
        return;
    }
    
    if (badgeText.length > 20) {
        alert('Текст бейджа не должен превышать 20 символов');
        return;
    }
    
    try {
        const { API_BASE_URL } = await import('../utils/api.js');
        
        // Сначала покупаем товар
        const purchaseResponse = await fetch(`${API_BASE_URL}/api/shop/purchase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                itemId: 'custom_badge'
            })
        });
        
        const purchaseData = await purchaseResponse.json();
        
        if (!purchaseResponse.ok || !purchaseData.success) {
            throw new Error(purchaseData.error || 'Ошибка покупки товара');
        }
        
        // Затем создаем именной бейдж
        const createResponse = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/custom-badge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                badge_text: badgeText,
                badge_color: badgeColor
            })
        });
        
        const createData = await createResponse.json();
        
        if (!createResponse.ok || !createData.success) {
            throw new Error(createData.error || 'Ошибка создания бейджа');
        }
        
        hapticFeedback('success');
        alert('Именной бейдж успешно создан!');
        closeCustomBadgeModal();
        await updateCoinsBalance('shopCoinsBalance');
        await loadShopItems();
        
        // Обновляем профиль если он открыт
        const profileScreen = document.getElementById('profileScreen');
        if (profileScreen && profileScreen.classList.contains('active')) {
            const profileModule = await import('./profile.js');
            if (profileModule.loadUserBadge) {
                await profileModule.loadUserBadge(currentUser.id);
            }
        }
    } catch (error) {
        console.error('Ошибка создания именного бейджа:', error);
        hapticFeedback('error');
        alert(error.message || 'Ошибка создания именного бейджа');
    }
};

// Глобальная функция для закрытия модального окна
window.closeCustomBadgeModal = closeCustomBadgeModal;


