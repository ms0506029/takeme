# Active Context

**Last Updated：** 2026-01-21 16:45 (JST)

---

## 🎯 專案狀態

**專案名稱：** TakeMeJapan - Scrapbook Retro E-commerce Platform  
**當前階段：** 🚧 Phase 9 - 購物車系統開發中  
**技術棧：** Next.js 15 + Payload CMS 3.x + MongoDB + LINE Messaging API  
**線上環境：** https://takemejapan.zeabur.app  
**GitHub：** `ms0506029/takeme` (main branch)

---

## 🛒 購物車系統開發計畫 (Phase 9)

### 📋 需求總覽

| 功能 | 描述 | 參考 |
|------|------|------|
| **加入購物車觸發** | 加入商品後，側邊抽屜自動滑出 | - |
| **購物車專頁** | 完整結帳流程頁面 `/cart` | - |
| **Icon Badge** | 紅色圓點 + 商品數量 | - |
| **進度條** | 購物車 → 填寫資料 → 確認訂單 → 完成 | - |
| **空購物車** | 推薦商品區塊 (瀏覽紀錄) | - |
| **優惠提示框** | 動態讀取後台 Promotions，顯示優惠進度 | - |
| **商品推薦** | 瀏覽紀錄優先（LocalStorage） | - |
| **視覺風格** | Scrapbook Retro（繁體中文） | - |

### 用戶確認的設定
- **免運門檻**：後台動態設定，預設 ¥3,000
- **商品推薦順序**：**瀏覽紀錄優先**
- **優惠提示**：**動態讀取**後台 Promotions，顯示所有符合條件的優惠進度
- **UI 語言**：**全部繁體中文**

---

## 🔄 Phase 9 執行計畫

### Phase 9.1: 後台設定擴充 ✅ (已完成)
- [x] 在 `SiteSettings` 新增「購物車與運費設定」區塊
  - 免運門檻（預設 3000）
  - 免運提示文字
  - 基本運費
  - 空購物車設定

### Phase 9.2: Header Icon 整合 + CartDrawer
- [ ] 三個 Icon 功能接線
  - ❤️ 愛心 → 連結至 `/account/wishlist`
  - 👤 帳號 → 連結至 `/account`（或登入頁）
  - 🛒 購物車 → 開啟 CartDrawer
- [ ] 購物車 Badge（紅點 + 數量）
- [ ] CartDrawer 重構（Scrapbook Retro 風格）
- [ ] 加入商品時自動展開

### Phase 9.3: 購物車專頁 `/cart`
- [ ] 進度條組件 (CheckoutProgress)
  - 四步驟：購物車 → 填寫資料 → 確認訂單 → 完成
- [ ] 商品列表區（左側）
  - 商品圖片、名稱、變體
  - 數量調整 (+/-)
  - 刪除按鈕
- [ ] 訂單摘要區（右側）
  - 小計、運費、總金額
  - 優惠提示框
  - 預計獲得點數

### Phase 9.4: 優惠系統整合 + 商品推薦
- [ ] 優惠提示框
  - 讀取 `Promotions` Collection
  - 顯示：已套用優惠 / 差 ¥X 達到免運
- [ ] 瀏覽紀錄（LocalStorage）
  - 在商品頁記錄瀏覽
  - 在購物車頁顯示推薦

---

## 📂 關鍵資源索引

| 資源 | 路徑 | 用途 |
|------|------|------|
| **ScrapbookHeader** | `src/components/scrapbook/ScrapbookHeader.tsx` | Header 三個 Icon 位置 |
| **CartModal** | `src/components/Cart/CartModal.tsx` | 現有購物車 Modal（需重構） |
| **AddToCart** | `src/components/Cart/AddToCart.tsx` | 加入購物車按鈕 |
| **SiteSettings** | `src/globals/SiteSettings.ts` | 購物車設定（已新增） |
| **Promotions** | `src/collections/Promotions/index.ts` | 優惠活動資料 |
| **Wishlist** | `src/collections/Wishlist.ts` | 願望清單資料 |
| **UI/UX Skill** | `~/.gemini/antigravity/skills/ui-ux-pro/` | 設計規範 |

---

## 🔧 現有購物車架構

### 後端支援（已存在）
- `@payloadcms/plugin-ecommerce` - 購物車插件
- `useCart()` Hook - 購物車狀態管理
- `Promotions` Collection - 促銷活動
- `SiteSettings.cartSettings` - 購物車設定（新增）

### 前端組件（需重構）
```
src/components/Cart/
├── CartModal.tsx       → 需套用 Scrapbook Retro 風格
├── AddToCart.tsx       → 加入購物車按鈕
├── DeleteItemButton.tsx
├── EditItemQuantityButton.tsx
├── OpenCart.tsx
└── CloseCart.tsx
```

---

## 📊 已完成功能 (Phase 1-8)

- ✅ Phase 8：會員中心（7 個子頁面 + 2 個組件）
- ✅ Phase 7.5：LINE Bot 整合
- ✅ Phase 7：分析報表
- ✅ Phase 6：Admin UI 客製化
- ✅ Phase 4：Scrapbook 前端设计系统
- ✅ Phase 1-3：核心基礎設施

---

## 💡 給下一個對話視窗的提示

1. **用戶採用 Vibe Coding 方法論**，所有變更需先更新 Memory Bank
2. **Phase 9 購物車系統開發中**，從 Phase 9.2 開始執行
3. **Phase 9.1 已完成**：SiteSettings 已新增購物車與運費設定
4. **免運門檻**：預設 ¥3,000，後台可動態調整
5. **商品推薦**：瀏覽紀錄優先（LocalStorage 實作）
6. **優惠提示**：動態讀取 Promotions Collection
7. **UI 設計**：遵循 **UI/UX Pro Max** Skill，視覺風格為 **Scrapbook Retro**
8. **語言**：所有 UI 介面使用 **繁體中文**
9. **現有組件**：`CartModal.tsx` 已有功能，需重構視覺風格
10. **Header Icon**：目前三個 Icon 只有樣式，沒有功能

### 開發順序
```
Phase 9.2 → Phase 9.3 → Phase 9.4
```

### 技術要點
- 使用 `useCart()` from `@payloadcms/plugin-ecommerce/client/react`
- Scrapbook Retro：紙張紋理、硬陰影、膠帶裝飾
- Lucide React：所有 Icon
- Tailwind CSS：所有樣式
