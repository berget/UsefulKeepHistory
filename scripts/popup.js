// Popup JavaScript for History Cleaner Extension

let currentSettings = {};

// 初始化popup
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    setupEventListeners();
    updateUI();
});

// 載入設定
async function loadSettings() {
    try {
        const response = await sendMessage({ action: 'getSettings' });
        if (response.settings) {
            currentSettings = response.settings;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showMessage('載入設定時發生錯誤', 'error');
    }
}

// 設定事件監聽器
function setupEventListeners() {
    // 啟用/停用切換
    const enableToggle = document.getElementById('enableToggle');
    enableToggle.addEventListener('change', (e) => {
        currentSettings.enabled = e.target.checked;
        updateUI();
    });

    // 間隔時間輸入
    const intervalInput = document.getElementById('intervalInput');
    intervalInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (value >= 1 && value <= 999) {
            currentSettings.interval = value;
        }
    });

    // 時間單位選擇
    const unitSelect = document.getElementById('unitSelect');
    unitSelect.addEventListener('change', (e) => {
        currentSettings.unit = e.target.value;
    });

    // 儲存按鈕
    const saveButton = document.getElementById('saveButton');
    saveButton.addEventListener('click', saveSettings);

    // 立即清理按鈕
    const manualCleanButton = document.getElementById('manualCleanButton');
    manualCleanButton.addEventListener('click', performManualCleanup);

    // 開啟設定頁面
    const openSettingsButton = document.getElementById('openSettings');
    openSettingsButton.addEventListener('click', openSettingsPage);
}

// 更新UI
function updateUI() {
    const enableToggle = document.getElementById('enableToggle');
    const timeSettings = document.getElementById('timeSettings');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const intervalInput = document.getElementById('intervalInput');
    const unitSelect = document.getElementById('unitSelect');
    const whitelistCount = document.getElementById('whitelistCount');

    // 更新啟用狀態
    enableToggle.checked = currentSettings.enabled || false;
    
    // 更新切換開關外觀
    const toggleContainer = enableToggle.parentElement.querySelector('div');
    const dot = toggleContainer.querySelector('.dot');
    
    if (currentSettings.enabled) {
        toggleContainer.classList.remove('bg-gray-300');
        toggleContainer.classList.add('bg-primary-500');
        dot.style.transform = 'translateX(1.5rem)';
        statusIndicator.classList.remove('bg-gray-400');
        statusIndicator.classList.add('bg-green-500');
        statusText.textContent = '已啟用';
        statusText.classList.remove('text-gray-600');
        statusText.classList.add('text-green-600');
    } else {
        toggleContainer.classList.remove('bg-primary-500');
        toggleContainer.classList.add('bg-gray-300');
        dot.style.transform = 'translateX(0)';
        statusIndicator.classList.remove('bg-green-500');
        statusIndicator.classList.add('bg-gray-400');
        statusText.textContent = '已停用';
        statusText.classList.remove('text-green-600');
        statusText.classList.add('text-gray-600');
    }

    // 更新時間設定區域
    if (currentSettings.enabled) {
        timeSettings.classList.remove('opacity-50');
        intervalInput.disabled = false;
        unitSelect.disabled = false;
    } else {
        timeSettings.classList.add('opacity-50');
        intervalInput.disabled = true;
        unitSelect.disabled = true;
    }

    // 更新輸入值
    intervalInput.value = currentSettings.interval || 60;
    unitSelect.value = currentSettings.unit || 'minutes';

    // 更新白名單計數
    const whitelistLength = currentSettings.whitelist ? currentSettings.whitelist.length : 0;
    whitelistCount.textContent = `${whitelistLength} 個網域已保護`;
}

// 儲存設定
async function saveSettings() {
    try {
        showMessage('正在儲存設定...', 'info');
        
        // 驗證輸入
        if (currentSettings.enabled) {
            if (!currentSettings.interval || currentSettings.interval < 1) {
                showMessage('請輸入有效的時間間隔（最少1分鐘）', 'error');
                return;
            }
        }

        // 儲存到chrome.storage
        await chrome.storage.sync.set(currentSettings);
        
        // 通知background script更新定時器
        await sendMessage({ action: 'updateSettings' });
        
        showMessage('設定已儲存', 'success');
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showMessage('儲存設定時發生錯誤', 'error');
    }
}

// 手動清理
async function performManualCleanup() {
    try {
        const button = document.getElementById('manualCleanButton');
        button.disabled = true;
        button.textContent = '清理中...';
        
        showMessage('正在清理瀏覽記錄...', 'info');
        
        await sendMessage({ action: 'manualCleanup' });
        
        showMessage('瀏覽記錄清理完成', 'success');
        
    } catch (error) {
        console.error('Error during manual cleanup:', error);
        showMessage('清理時發生錯誤', 'error');
    } finally {
        const button = document.getElementById('manualCleanButton');
        button.disabled = false;
        button.textContent = '立即清理';
    }
}

// 開啟設定頁面
function openSettingsPage() {
    chrome.runtime.openOptionsPage();
}

// 發送訊息到background script
function sendMessage(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else if (response && response.error) {
                reject(new Error(response.error));
            } else {
                resolve(response);
            }
        });
    });
}

// 顯示狀態訊息
function showMessage(text, type = 'info') {
    const messageEl = document.getElementById('statusMessage');
    messageEl.textContent = text;
    messageEl.className = `mt-4 p-3 rounded-lg text-sm ${getMessageClasses(type)}`;
    messageEl.classList.remove('hidden');
    
    // 3秒後自動隱藏（除非是錯誤訊息）
    if (type !== 'error') {
        setTimeout(() => {
            messageEl.classList.add('hidden');
        }, 3000);
    }
}

// 取得訊息樣式類別
function getMessageClasses(type) {
    switch (type) {
        case 'success':
            return 'bg-green-50 text-green-700 border border-green-200';
        case 'error':
            return 'bg-red-50 text-red-700 border border-red-200';
        case 'info':
        default:
            return 'bg-blue-50 text-blue-700 border border-blue-200';
    }
}
