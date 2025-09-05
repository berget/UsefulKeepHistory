// Background Service Worker for History Cleaner Extension

// 預設設定
const DEFAULT_SETTINGS = {
  enabled: false,
  interval: 60, // 分鐘
  unit: 'minutes', // 'minutes', 'hours', 'days'
  whitelist: []
};

// 初始化擴充套件
chrome.runtime.onInstalled.addListener(async () => {
  console.log('History Cleaner Extension installed');
  
  // 設定預設值
  const settings = await getSettings();
  if (!settings.interval) {
    await chrome.storage.sync.set(DEFAULT_SETTINGS);
  }
  
  // 建立初始定時器
  setupAlarm();
});

// 取得設定
async function getSettings() {
  try {
    const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    return result;
  } catch (error) {
    console.error('Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// 設定定時器
async function setupAlarm() {
  try {
    const settings = await getSettings();
    
    // 清除現有的定時器
    await chrome.alarms.clear('historyCleanup');
    
    if (!settings.enabled) {
      console.log('History cleanup is disabled');
      return;
    }
    
    // 計算間隔時間（以分鐘為單位）
    let intervalInMinutes = settings.interval;
    
    switch (settings.unit) {
      case 'hours':
        intervalInMinutes = settings.interval * 60;
        break;
      case 'days':
        intervalInMinutes = settings.interval * 60 * 24;
        break;
      case 'minutes':
      default:
        intervalInMinutes = settings.interval;
        break;
    }
    
    // 建立定時器
    await chrome.alarms.create('historyCleanup', {
      delayInMinutes: intervalInMinutes,
      periodInMinutes: intervalInMinutes
    });
    
    console.log(`History cleanup alarm set for every ${intervalInMinutes} minutes`);
  } catch (error) {
    console.error('Error setting up alarm:', error);
  }
}

// 監聽定時器觸發
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'historyCleanup') {
    console.log('History cleanup alarm triggered');
    await cleanupHistory();
  }
});

// 清理瀏覽記錄
async function cleanupHistory() {
  try {
    const settings = await getSettings();
    
    if (!settings.enabled) {
      console.log('History cleanup is disabled, skipping...');
      return;
    }
    
    // 計算時間範圍
    const now = Date.now();
    let startTime = 0; // 從最開始
    
    // 獲取所有瀏覽記錄
    const historyItems = await chrome.history.search({
      text: '',
      startTime: startTime,
      endTime: now,
      maxResults: 10000 // 限制結果數量以避免性能問題
    });
    
    console.log(`Found ${historyItems.length} history items`);
    
    // 過濾白名單
    const itemsToDelete = historyItems.filter(item => {
      if (!item.url) return false;
      
      try {
        const url = new URL(item.url);
        const domain = url.hostname;
        
        // 檢查是否在白名單中
        return !settings.whitelist.some(whitelistedDomain => {
          return domain === whitelistedDomain || domain.endsWith('.' + whitelistedDomain);
        });
      } catch (error) {
        console.error('Error parsing URL:', item.url, error);
        return false;
      }
    });
    
    console.log(`Deleting ${itemsToDelete.length} history items (${historyItems.length - itemsToDelete.length} whitelisted)`);
    
    // 批量刪除
    const deletePromises = itemsToDelete.map(item => {
      return chrome.history.deleteUrl({ url: item.url });
    });
    
    await Promise.allSettled(deletePromises);
    
    console.log('History cleanup completed');
    
    // 更新擴充套件徽章
    await updateBadge(itemsToDelete.length);
    
  } catch (error) {
    console.error('Error during history cleanup:', error);
  }
}

// 更新擴充套件徽章
async function updateBadge(deletedCount) {
  try {
    if (deletedCount > 0) {
      await chrome.action.setBadgeText({ text: deletedCount.toString() });
      await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
      
      // 3秒後清除徽章
      setTimeout(async () => {
        await chrome.action.setBadgeText({ text: '' });
      }, 3000);
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

// 監聽來自popup的訊息
// Use a non-async listener that calls an async IIFE and returns true synchronously.
// This ensures Chrome sees the boolean return and keeps the message channel open.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case 'updateSettings':
          await setupAlarm();
          sendResponse({ success: true });
          break;

        case 'manualCleanup':
          await cleanupHistory();
          sendResponse({ success: true });
          break;

        case 'getSettings':
          const settings = await getSettings();
          sendResponse({ settings });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  })();

  return true; // 保持訊息通道開啟以進行非同步回應
});

// 監聽設定變更
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'sync') {
    console.log('Settings changed, updating alarm...');
    await setupAlarm();
  }
});
