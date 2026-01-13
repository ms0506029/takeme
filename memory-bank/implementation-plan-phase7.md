# Phase 7 Implementation Plan - Admin Backend Content Optimization

**Created：** 2026-01-13  
**Status：** ✅ Approved - Ready for Execution  
**Method：** Vibe Coding (Documentation-Driven Development)

---

## ✅ 用戶確認決策

| 項目 | 決策 |
|------|------|
| **優先級** | 確認採用建議排序 |
| **LINE Login** | ✅ Channel 已設定完成 |
| **會員等級** | 提供可自定義模板，用戶可完全客製化規則 |
| **爬蟲遷移** | 完全遷移至 Payload，不保留雙軌模式 |
| **折扣同步** | 手動觸發，不使用自動排程 |
| **UI 設計** | 必須使用 UI/UX Pro Max workflow |

---

## 📋 Overview

本計畫將分階段優化 Payload Admin 後台的五大功能區塊，確保從其他電商平台（如 EasyStore）無痛轉移，並整合現有爬蟲系統。

---

## Phase 7.1: 訂單管理優化

### 7.1.1 平台訂單轉移系統

**目標：** 建立通用的訂單匯入機制，支援從 EasyStore、Shopify 等平台批量轉移歷史訂單。

**技術方案：**
```
[NEW] src/app/(payload)/admin/importers/orders/page.tsx    # Admin UI 頁面
[NEW] src/lib/import/order-importer.ts                     # 匯入邏輯核心
[NEW] src/lib/import/adapters/easystore-adapter.ts         # EasyStore 格式轉換
[NEW] src/lib/import/adapters/shopify-adapter.ts           # Shopify 格式轉換
[MODIFY] src/collections/Orders (via plugin override)      # 增加 importedFrom 欄位
```

**關鍵功能：**
1. CSV/Excel 檔案上傳與解析
2. 欄位映射介面（自動識別 + 手動調整）
3. 資料驗證與錯誤報告
4. 批量寫入與進度追蹤
5. 重複訂單檢測（by 原訂單編號）

---

### 7.1.2 遺棄購物車偵測與提醒

**目標：** 自動識別未完成結帳的購物車，並提供手動/自動提醒機制。

**技術方案：**
```
[MODIFY] src/plugins/index.ts                              # 擴展 carts collection
[NEW] src/lib/cron/abandoned-cart-cron.ts                  # 定時檢測任務
[NEW] src/lib/notifications/cart-reminder.ts               # 提醒邏輯
[MODIFY] src/components/BeforeDashboard/                   # Dashboard 顯示遺棄購物車
```

**關鍵功能：**
1. 定義「遺棄」標準（預設：閒置 > 24 小時）
2. Dashboard 即時統計（今日遺棄數 / 總金額）
3. 手動一鍵發送提醒（LINE 推播）
4. 自動化排程提醒（Zeabur Cron）
5. 提醒次數限制（避免騷擾）

**利用現有資源：**
- 已有 `isAbandoned` 和 `abandonedAt` 欄位（在 `src/plugins/index.ts` carts override 中）
- 可整合現有 LINE Messaging API

---

## Phase 7.2: 商品管理優化

### 7.2.1 商品批量匯入系統

**目標：** 從其他平台或爬蟲系統批量匯入商品。

**技術方案：**
```
[NEW] src/app/(payload)/admin/importers/products/page.tsx  # Admin UI
[NEW] src/lib/import/product-importer.ts                   # 匯入核心
[NEW] src/lib/import/adapters/easystore-product-adapter.ts # EasyStore 格式
[NEW] src/api/webhooks/product-sync/route.ts               # 爬蟲 Webhook 接收
```

**整合現有爬蟲系統：**

| 來源 | 目前目標 | 新目標 |
|------|----------|--------|
| `api_direct_processor.py` | EasyStore API | Payload CMS API |
| `sync_freak_discounts.py` | EasyStore API | Payload CMS API |

**遷移策略：**
1. 建立 Payload REST API Webhook 端點
2. 修改 Python 系統的 `config.py`，新增 Payload API 設定
3. 建立 Payload-compatible 的 Adapter 類別

### 7.2.2 折扣同步整合

**目標：** 將現有折扣同步系統與 Payload 整合。

**技術方案：**
```
[NEW] src/api/webhooks/discount-sync/route.ts              # 接收折扣更新
[MODIFY] src/collections/Products/index.ts                 # 確保有 salePrice 欄位
[NEW] src/lib/sync/discount-sync-service.ts                # 折扣處理邏輯
```

---

## Phase 7.3: 客戶管理優化

### 7.3.1 平台客戶轉移

**技術方案：**
```
[NEW] src/app/(payload)/admin/importers/customers/page.tsx # Admin UI
[NEW] src/lib/import/customer-importer.ts                  # 匯入核心
```

### 7.3.2 多元登入系統

**目標：** 支援 LINE Login、Google Login、Email 註冊。

**技術方案：**
```
[NEW] src/app/(app)/auth/line/callback/route.ts            # LINE OAuth Callback
[NEW] src/app/(app)/auth/google/callback/route.ts          # Google OAuth Callback
[MODIFY] src/collections/Users/index.ts                    # 增加 provider 欄位
[NEW] src/lib/auth/line-auth.ts                            # LINE SDK 整合
[NEW] src/lib/auth/google-auth.ts                          # Google SDK 整合
```

**依賴套件：**
```bash
npm install @line/liff next-auth @next-auth/providers
```

### 7.3.3 會員制度與點數系統

**技術方案：**
```
[NEW] src/collections/MemberLevels.ts                      # 會員等級定義
[NEW] src/collections/PointTransactions.ts                 # 點數交易紀錄
[MODIFY] src/collections/Users/index.ts                    # 增加 level, points 欄位
[NEW] src/lib/loyalty/points-engine.ts                     # 點數計算引擎
[NEW] src/lib/loyalty/level-engine.ts                      # 等級升降邏輯
```

### 7.3.4 客戶分析

**技術方案：**
```
[NEW] src/app/(payload)/admin/views/customer-analytics/    # 分析視圖
[NEW] src/lib/analytics/customer-segments.ts               # RFM 分群邏輯
```

---

## Phase 7.4: 內容管理與網站設定優化

### 7.4.1 圖形化編輯器增強

**目標：** 讓頁面編輯更直覺，提供區塊拖拉、即時預覽。

**技術方案：**
```
[MODIFY] src/collections/Pages/index.ts                    # 優化 Block 結構
[NEW] src/components/Admin/LivePreview/                    # 即時預覽組件
[NEW] src/app/(payload)/admin/views/page-builder/          # 視覺化編輯器
```

**考量使用現有套件：**
- `@payloadcms/plugin-live-preview`（Payload 官方即時預覽）

### 7.4.2 字型與顏色自定義

**技術方案：**
```
[MODIFY] src/globals/SiteSettings.ts                       # 增加 fonts, colors 欄位
[NEW] src/components/Admin/FontPicker/                     # 字型選擇器
[NEW] src/components/Admin/ColorPicker/                    # 顏色選擇器
```

---

## 📊 優先級排序（建議）

| 階段 | 功能 | 優先級 | 預估時間 |
|------|------|--------|----------|
| 7.1.2 | 遺棄購物車偵測 | 🔴 高 | 2 天 |
| 7.1.1 | 訂單轉移 | 🔴 高 | 3 天 |
| 7.2.1 | 商品批量匯入 | 🔴 高 | 3 天 |
| 7.3.2 | 多元登入 | 🔴 高 | 2 天 |
| 7.2.2 | 折扣同步整合 | 🟡 中 | 2 天 |
| 7.3.3 | 會員點數系統 | 🟡 中 | 3 天 |
| 7.4.1 | 圖形化編輯器 | 🟡 中 | 3 天 |
| 7.3.1 | 客戶轉移 | 🟡 中 | 1 天 |
| 7.4.2 | 字型顏色系統 | 🟢 低 | 2 天 |
| 7.3.4 | 客戶分析 | 🟢 低 | 2 天 |

---

## 🔍 Verification Plan

### 自動化測試
```bash
# 單元測試（匯入邏輯）
npm run test -- --testPathPattern=import

# E2E 測試（Admin UI）
npx playwright test tests/admin-import.spec.ts
```

### 手動驗證
1. **訂單匯入**：使用 EasyStore 匯出的 CSV 檔案測試匯入流程
2. **購物車提醒**：模擬遺棄購物車，驗證 LINE 推播是否正確發送
3. **LINE Login**：在前台點擊 LINE 登入按鈕，完成 OAuth 流程
4. **爬蟲整合**：執行 Python 爬蟲，確認資料正確寫入 Payload

---

## ❓ 待用戶確認

1. **優先級調整**：上述排序是否符合您的期望？
2. **LINE Login**：是否已有 LINE Login Channel 設定？需要我協助申請嗎？
3. **會員等級規則**：您希望用什麼標準劃分等級？（消費金額 / 訂單數 / 自定義）
4. **爬蟲遷移**：是否希望保留同時支援 EasyStore + Payload 的雙軌模式，還是完全遷移至 Payload？
5. **折扣同步頻率**：希望多久同步一次？（即時 / 每小時 / 每日）

---

## 📝 下一步

待用戶確認計畫後，我會：
1. 更新 `memory-bank/progress.md`
2. 開始 Phase 7.1.2 - 遺棄購物車偵測（最高優先）
3. 嚴格執行「一步一驗收」流程
