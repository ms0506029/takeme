# Active Context

**Last Updated：** 2026-01-08 22:53 (JST)

---

## 🎯 專案狀態

**專案名稱：** TakeMeJapan - Scrapbook Retro E-commerce Platform  
**當前階段：** 🎨 Admin UI 美化修復 (Phase 6 持續中)  
**技術棧：** Next.js 15 + Payload CMS 3.x + MongoDB + Chart.js  
**線上環境：** https://takemejapan.zeabur.app  
**GitHub：** `ms0506029/takeme` (main branch)

---

## ⚠️ 當前任務

### Admin UI 美化與工作流修正

**問題描述**：Admin UI 雖已中文化，但自定義美化樣式（Scrapbook 風格/品牌色）未生效。先前嘗試修改 `custom.scss` 因使用舊版 Payload 2.x 選擇器而無效，且未遵循標準工作流。

**修正計畫**：
1.  **恢復工作流**：建立 Implementation Plan，經審核後再執行。
2.  **技術修正**：改用 Payload 3.0 CSS Variables 覆寫預設樣式。
3.  **視覺目標**：套用品牌色 `#C9915D` (或 `#C9925E` 依 PRD)，修正字體為 `Noto Sans TC`。

---

## ✅ 已完成階段摘要

| Phase | 內容 | 狀態 |
|-------|------|------|
| 1 | 主題系統 & Scrapbook 區塊 | ✅ 完成 |
| 2 | 商品區塊 (Marquee, ProductGrid, Collage) | ✅ 完成 |
| 3 | GA4 Dashboard 整合 | ✅ 完成 |
| 4 | 銷售 & 行銷自動化 (Cron, Meta CAPI, GMC Feed) | ✅ 完成 |
| 5 | 多商家 & 權限控制 | ✅ 完成 |
| 6 | Admin UI 中文化 ✅ / 美化 ✅ | 驗收中 |

### 重要完成項目
- **Google Merchant Center Feed**：`/api/product-feed.xml` 已設定完成
- **Meta CAPI**：Pixel ID `894614306245367` 已整合
- **GA4 Dashboard**：Service Account 已配置
- **商家 Dashboard**：VendorDashboard 組件已完成

---

## 📂 關鍵檔案索引

| 類型 | 路徑 |
|------|------|
| Admin 樣式 | `src/app/(payload)/custom.scss` ⬅️ 待修復 |
| Admin Layout | `src/app/(payload)/layout.tsx` |
| Dashboard 組件 | `src/components/BeforeDashboard/` |
| 商家 Dashboard | `src/components/VendorDashboard/` |
| Plugin 配置 | `src/plugins/index.ts` |
| 商品 Collection | `src/collections/Products/index.ts` |
| GMC Feed API | `src/app/api/product-feed.xml/route.ts` |
| Meta CAPI 服務 | `src/lib/marketing/meta-capi.ts` |
| GA4 服務 | `src/lib/analytics/ga4.ts` |

---

## 🔧 Collections 中英對照

| 英文 Slug | 中文標籤 | 檔案位置 |
|-----------|----------|----------|
| users | 用戶 | `src/collections/Users/index.ts` |
| vendors | 商家 | `src/collections/Vendors/index.ts` |
| products | 商品 | `src/collections/Products/index.ts` |
| orders | 訂單 | `src/plugins/index.ts` (override) |
| carts | 購物車 | `src/plugins/index.ts` (override) |
| categories | 商品分類 | `src/collections/Categories.ts` |
| pages | 頁面 | `src/collections/Pages/index.ts` |
| media | 媒體庫 | `src/collections/Media.ts` |
| promotions | 促銷活動 | `src/collections/Promotions/index.ts` |

---

## 🚀 下一步

1. **修復 Admin UI 美化**：調查 SCSS 載入與 Payload CSS 變數覆蓋
2. **Payload Admin 設定**：
   - 設定 GA4 Measurement ID
   - 設定 Meta Pixel ID
3. **新增商品**：測試 GMC Feed 是否正常抓取
4. **Zeabur Cron**：設定每日排名更新任務

---

## 📝 快速啟動指令

```bash
# 啟動開發伺服器
npm run dev

# 訪問後台
http://localhost:3000/admin

# 線上環境
https://takemejapan.zeabur.app/admin
```

---

## 💡 給下一個對話視窗的提示

- **美化未生效**：檢查 `custom.scss` 選擇器是否正確覆蓋 Payload 預設樣式
- **GMC 顯示錯誤**：正常，因為目前無商品
- **GA4 無數據**：需在 Payload Admin > Settings > Tracking Scripts 設定
