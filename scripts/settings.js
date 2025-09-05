// Settings page JavaScript for History Cleaner Extension

let currentSettings = {};

// 初始化設定頁面
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    setupEventListeners();
    updateUI();
    renderWhitelist();
});

// 載入設定
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get({
            enabled: false,
            interval: 60,
            unit: 'minutes',
            whitelist: []
        });
        currentSettings = result;
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
            updateNextCleanupInfo();
        }
    });

    // 時間單位選擇
    const unitSelect = document.getElementById('unitSelect');
    unitSelect.addEventListener('change', (e) => {
        currentSettings.unit = e.target.value;
        updateNextCleanupInfo();
    });

    // 新增網域輸入
    const newDomainInput = document.getElementById('newDomainInput');
    newDomainInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addDomain();
        }
    });

    // 新增網域按鈕
    const addDomainButton = document.getElementById('addDomainButton');
    addDomainButton.addEventListener('click', addDomain);

    // 建議網域按鈕
    const suggestedDomains = document.querySelectorAll('.suggested-domain');
    suggestedDomains.forEach(button => {
        button.addEventListener('click', (e) => {
            const domain = e.target.dataset.domain;
            addDomainToWhitelist(domain);
        });
    });

    // 儲存按鈕
    const saveButton = document.getElementById('saveButton');
    saveButton.addEventListener('click', saveSettings);

    // 立即清理按鈕
    const manualCleanButton = document.getElementById('manualCleanButton');
    manualCleanButton.addEventListener('click', performManualCleanup);
}

// 更新UI
function updateUI() {
    const enableToggle = document.getElementById('enableToggle');
    const timeSettings = document.getElementById('timeSettings');
    const intervalInput = document.getElementById('intervalInput');
    const unitSelect = document.getElementById('unitSelect');

    // 更新啟用狀態
    enableToggle.checked = currentSettings.enabled || false;
    
    // 更新切換開關外觀
    const toggleContainer = enableToggle.parentElement.querySelector('#switch-button');
    const dot = toggleContainer.querySelector('.dot');
    
    if (currentSettings.enabled) {
        toggleContainer.classList.remove('bg-gray-200', 'group-hover:bg-gray-300');
        toggleContainer.classList.add('bg-blue-600');
        dot.classList.remove('translate-x-1');
        dot.classList.add('translate-x-6');
    } else {
        toggleContainer.classList.remove('bg-blue-600');
        toggleContainer.classList.add('bg-gray-200', 'group-hover:bg-gray-300');
        dot.classList.remove('translate-x-6');
        dot.classList.add('translate-x-1');
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

    updateNextCleanupInfo();
}

// 更新下次清理資訊
function updateNextCleanupInfo() {
    const nextCleanupInfo = document.getElementById('nextCleanupInfo');
    
    if (!currentSettings.enabled) {
        nextCleanupInfo.textContent = '自動清理已停用';
        return;
    }

    const interval = currentSettings.interval || 60;
    const unit = currentSettings.unit || 'minutes';
    
    let intervalText = '';
    switch (unit) {
        case 'minutes':
            intervalText = `${interval} 分鐘`;
            break;
        case 'hours':
            intervalText = `${interval} 小時`;
            break;
        case 'days':
            intervalText = `${interval} 天`;
            break;
    }
    
    nextCleanupInfo.textContent = `將每 ${intervalText} 自動清理一次瀏覽記錄`;
}

// 新增網域
function addDomain() {
    const input = document.getElementById('newDomainInput');
    const domain = input.value.trim().toLowerCase();
    
    if (!domain) {
        showMessage('請輸入網域名稱', 'error');
        return;
    }
    
    // 移除協議和www前綴
    const cleanDomain = domain
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]; // 只取域名部分
    
    if (!isValidDomain(cleanDomain)) {
        showMessage('請輸入有效的網域名稱', 'error');
        return;
    }
    
    addDomainToWhitelist(cleanDomain);
    input.value = '';
}

// 驗證網域格式
function isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/;
    return domainRegex.test(domain);
}

// 新增網域到白名單
function addDomainToWhitelist(domain) {
    if (!currentSettings.whitelist) {
        currentSettings.whitelist = [];
    }
    
    if (currentSettings.whitelist.includes(domain)) {
        showMessage(`網域 "${domain}" 已經在白名單中`, 'error');
        return;
    }
    
    currentSettings.whitelist.push(domain);
    renderWhitelist();
    showMessage(`網域 "${domain}" 已新增到白名單`, 'success');
}

// 從白名單移除網域
function removeDomainFromWhitelist(domain) {
    if (!currentSettings.whitelist) return;
    
    const index = currentSettings.whitelist.indexOf(domain);
    if (index > -1) {
        currentSettings.whitelist.splice(index, 1);
        renderWhitelist();
        showMessage(`網域 "${domain}" 已從白名單移除`, 'success');
    }
}

// 渲染白名單
function renderWhitelist() {
    const container = document.getElementById('whitelistContainer');
    const emptyMessage = document.getElementById('emptyWhitelist');
    const countElement = document.getElementById('whitelistCount');
    
    if (!currentSettings.whitelist || currentSettings.whitelist.length === 0) {
        container.innerHTML = '';
        emptyMessage.classList.remove('hidden');
        countElement.textContent = '0 個網域';
        return;
    }
    
    emptyMessage.classList.add('hidden');
    countElement.textContent = `${currentSettings.whitelist.length} 個網域`;
    
    container.innerHTML = currentSettings.whitelist.map(domain => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div class="flex items-center">
                <div class="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span class="font-medium text-gray-800">${domain}</span>
            </div>
            <button onclick="removeDomainFromWhitelist('${domain}')" 
                    class="text-red-500 hover:text-red-700 text-sm font-medium">
                移除
            </button>
        </div>
    `).join('');
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
    messageEl.className = `mt-6 p-4 rounded-lg text-sm ${getMessageClasses(type)}`;
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

// 全域函數供HTML調用
window.removeDomainFromWhitelist = removeDomainFromWhitelist;
