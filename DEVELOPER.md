# UsefulKeep History — 開發者說明

自動清除 Chrome 瀏覽紀錄的擴充套件，支援排程與手動清除、指定時間範圍、網站白名單/例外，以及儲存使用者設定與通知功能，易於設定與管理。

## 主要功能

- 定時自動清理（自訂間隔）
- 白名單（保護指定網域及其子網域）
- Popup 快速控制：啟用/停用、立即清理、開啟設定
- 詳細設定頁面：管理白名單與清理規則
- 使用 Tailwind CSS 的現代化 UI

## 快速開始

開發環境與建置（macOS / Linux / Windows）：

```bash
# 安裝依賴
npm install

# 開發（若有 watch 腳本會自動 rebuild CSS）
npm run dev

# 生產建置（壓縮、產出最終 CSS）
npm run build

# （選用）生成圖示
node generate-icons.js
```

安裝到 Chrome（開發模式）

1. 開啟 Chrome，前往 `chrome://extensions/`
2. 開啟右上角「開發者模式」
3. 點選「載入未封裝項目」，選擇此專案資料夾

## 使用說明（開發者角度）

- 在 `chrome://extensions/` 使用 Inspect views 觀察 Popup 與 Options 的 console
- 使用 Extension 頁面檢視 service worker 的 log
- 常見 edge case：大量刪除需分批處理以避免阻塞、白名單比對要包含子網域判斷

## 專案結構（重點檔案）

```
manifest.json          # 擴充套件設定
popup.html             # 快速控制介面
settings.html          # 詳細設定頁面
scripts/
  background.js        # 服務工作者（Service Worker）
  popup.js             # Popup 邏輯
  settings.js          # 設定頁面邏輯
styles/
  output.css           # 建置後 CSS
src/
  input.css            # Tailwind 原始 CSS
icons/                 # 圖示資源
package.json           # NPM 腳本與依賴
```

## 權限與用途

- `history` — 讀取與刪除瀏覽記錄（用於清理功能）
- `storage` — 儲存使用者設定及白名單
- `alarms` — 定時觸發自動清理
- `activeTab` — 取得目前分頁資訊（部分 UI 功能）

## 打包與發布（簡要）

1. 執行生產建置（`npm run build`）並確認 `styles/output.css` 與 `icons/` 已更新
2. 將需要的檔案（`manifest.json`、HTML/JS/CSS、icons）打包為 zip
3. 在 Chrome Web Store 上傳並填寫隱私權與權限說明

## 貢獻與測試

- PR 前請執行 `npm run build` 並測試主要流程
- 使用清晰的 commit 與 PR 描述

---

（此檔案為開發者文件，原本的 README 已改為使用者導向說明）
