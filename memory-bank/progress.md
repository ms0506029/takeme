# Progress Tracker
**Last Updated：** 2026-01-21

---

## ✅ 已完成功能

### 核心基礎
- [x] Memory Bank 初始化
- [x] Payload 參考資料分析
- [x] 專案初始化 (Next.js 15 + Payload 3.x)

### Scrapbook v4.0 設計系統
- [x] 基於 `#C9915D` 的主題色系導入
- [x] Scrapbook 六大區塊開發 (Hero, News, Ranking, etc.)
- [x] 前後端資料接通與渲染邏輯
- [x] 自動化首頁生成指令 (`seed:scrapbook`)

### Admin UI 客製化 (Phase 6)
- [x] 主題色與 Noto Sans TC 字體套用
- [x] 側邊欄分類與圖示重整
- [x] Dashboard 統計卡片與歡迎區塊
- [x] 遺棄購物車欄位擴充

### 分析報表與第三方整合 (Phase 7)
- [x] GA4 與 Meta Pixel 追蹤碼整合
- [x] 追蹤碼後台管理 Global

### LINE Bot 整合 (Phase 7.5)
- [x] LINE Webhook 端點
- [x] Flex Message 模板 (5 種)
- [x] 會員綁定流程
- [x] 願望清單/補貨通知 Collection

### 會員中心 MyPage (Phase 8) ✅
- [x] **Phase 8.1**: 會員卡片 + AccountNav 重構
- [x] **Phase 8.2**: 訂單履歷 + 點數履歷頁面
- [x] **Phase 8.3**: 收藏清單 + 補貨通知頁面
- [x] **Phase 8.4**: 基本資料 + 社群綁定 + 安全設定
- [x] **Vibe Polish**: Scrapbook Retro 視覺風格升級
- [x] **Header 修正**: Logo 對齊 + 後台編輯 siteName

---

## 🚧 進行中

### 購物車系統 (Phase 9) 🛒
- [x] **Phase 9.1**: 後台設定擴充（SiteSettings 新增購物車設定）
- [ ] **Phase 9.2**: Header Icon 整合 + CartDrawer 重構
- [ ] **Phase 9.3**: 購物車專頁 `/cart`
- [ ] **Phase 9.4**: 優惠系統整合 + 商品推薦

#### Phase 9 詳細任務
| 階段 | 任務 | 狀態 |
|------|------|------|
| 9.1 | SiteSettings 新增 `cartSettings` | ✅ |
| 9.2 | Header ❤️ Icon → `/account/wishlist` | ⬜ |
| 9.2 | Header 👤 Icon → `/account` | ⬜ |
| 9.2 | Header 🛒 Icon → CartDrawer | ⬜ |
| 9.2 | 購物車 Badge（紅點 + 數量） | ⬜ |
| 9.2 | CartDrawer Scrapbook Retro 風格 | ⬜ |
| 9.3 | 進度條組件 CheckoutProgress | ⬜ |
| 9.3 | 商品列表區（左側） | ⬜ |
| 9.3 | 訂單摘要區（右側） | ⬜ |
| 9.4 | 優惠提示框（動態讀取 Promotions） | ⬜ |
| 9.4 | 瀏覽紀錄（LocalStorage） | ⬜ |
| 9.4 | 商品推薦區塊 | ⬜ |

---

## 📋 待辦事項 (Backlog)

### 階段十：LINE Login
- [ ] 登入頁 LINE Login 按鈕
- [ ] 自動綁定 LINE User ID

### 階段十一：商品頁整合
- [ ] 商品頁愛心 Icon（加入願望清單）
- [ ] 缺貨時「補貨通知」按鈕
- [ ] 遺棄購物車 LINE 提醒

### 階段十二：部署與最後驗證
- [ ] Zeabur 部署 (Next.js + MongoDB)
- [ ] 環境變數與網域設定
- [ ] 最終全面整合測試

---

## 📊 進度統計
| 階段 | 狀態 | 完成度 |
|------|------|--------|
| 階段一：基礎設施 | 已完成 | 100% |
| 階段二：後端核心 | 已完成 | 100% |
| 階段三：商業邏輯 | 已完成 | 100% |
| 階段四：Scrapbook 前端 | 已完成 | 100% |
| 階段五：Admin 客製化 | 已完成 | 100% |
| 階段六：分析報表 | 已完成 | 100% |
| 階段七：LINE Bot 整合 | 已完成 | 100% |
| 階段八：會員中心 | 已完成 | 100% |
| **階段九：購物車系統** | **進行中** | **25%** |
| 階段十：LINE Login | 未開始 | 0% |
| 階段十一：商品頁整合 | 未開始 | 0% |

---

## 📝 最近更新日誌

### 2026-01-21
- 🚧 開始 Phase 9 購物車系統開發
- ✅ SiteSettings 新增「購物車與運費設定」區塊
  - 免運門檻（預設 3000 TWD）
  - 免運提示文字
  - 基本運費（預設 60 TWD）
  - 空購物車設定（標題、按鈕、瀏覽紀錄）
- 📝 更新 Memory Bank 記錄完整開發計畫

### 2026-01-16
- ✅ 完成 Phase 8 會員中心全部頁面（7 個子頁面）
- ✅ 新增 MemberCard 組件（條碼、等級、進度條）
- ✅ 新增 ProfileForm 組件（表單編輯）
- ✅ Scrapbook Retro 視覺風格全面升級
- ✅ 修正 Header Logo 對齊問題
- ✅ 支援後台編輯網站名稱
- ✅ 推送至 GitHub (commit: df42134)

### 2026-01-15
- ✅ 完成 LINE Bot 整合
- ✅ 完成願望清單/補貨通知 Collection
- ✅ 完成通知 Hook（降價/補貨）

---

## 🔑 Phase 9 關鍵決策記錄

| 決策項目 | 用戶選擇 | 備註 |
|----------|----------|------|
| 免運門檻來源 | 後台動態設定 | SiteSettings.cartSettings |
| 預設免運門檻 | ¥3,000 | 可在後台調整 |
| 商品推薦順序 | 瀏覽紀錄優先 | LocalStorage 實作 |
| 優惠提示類型 | 動態讀取 Promotions | 顯示所有符合條件的優惠 |
| UI 語言 | 繁體中文 | 全部介面 |
| 視覺風格 | Scrapbook Retro | 紙張紋理、硬陰影、膠帶裝飾 |
