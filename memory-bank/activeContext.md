# Active Context

**Last Updated：** 2026-01-16 00:30 (JST)

---

## 🎯 專案狀態

**專案名稱：** TakeMeJapan - Scrapbook Retro E-commerce Platform  
**當前階段：** ✅ Phase 8 - 會員中心 (MyPage) 全部完成！  
**技術棧：** Next.js 15 + Payload CMS 3.x + MongoDB + LINE Messaging API  
**線上環境：** https://takemejapan.zeabur.app  
**GitHub：** `ms0506029/takeme` (main branch)

---

## ✅ 今日完成功能（2026-01-16）

### Phase 8: 會員專屬頁面 (MyPage)

#### Phase 8.1: 會員卡片 + Layout
| 組件 | 路徑 | 功能 |
|------|------|------|
| **MemberCard** | `src/components/account/MemberCard.tsx` | 條碼生成、等級顯示、升級進度條 |
| **AccountNav** | `src/components/AccountNav/index.tsx` | 完整導航、10 個項目、分組顯示 |
| **memberNumber 欄位** | `src/collections/Users/index.ts` | 自動生成 13 位會員編號 |

#### Phase 8.2: 訂單 + 點數履歷
| 頁面 | 路徑 | 功能 |
|------|------|------|
| **訂單履歷** | `account/orders/page.tsx` | 訂單狀態標籤、商品預覽 |
| **點數履歷** | `account/points/page.tsx` | 統計卡片、交易列表 |

#### Phase 8.3: 收藏 + 補貨通知
| 頁面 | 路徑 | 功能 |
|------|------|------|
| **收藏清單** | `account/wishlist/page.tsx` | 降價標籤、通知狀態 |
| **補貨通知** | `account/restock-requests/page.tsx` | 狀態統計、通知管道 |

#### Phase 8.4: 帳戶設定
| 頁面 | 路徑 | 功能 |
|------|------|------|
| **基本資料** | `account/profile/page.tsx` | 表單編輯 + 帳戶摘要 |
| **社群綁定** | `account/social/page.tsx` | LINE/Google 綁定管理 |
| **安全設定** | `account/settings/page.tsx` | 密碼變更 + 帳戶刪除警告 |

### Vibe Polish: Scrapbook Retro 視覺升級
- MemberCard 加入膠帶裝飾效果
- 全站使用 `shadow-retro` 硬陰影
- 紙張紋理背景 (Grained Paper)
- 所有按鈕/連結補上 `cursor-pointer`

### Header 對齊修正
- Logo 使用 `absolute left-1/2 -translate-x-1/2` 實現精確置中
- ScrapbookHeader 支援從後台讀取 `siteName`

---

## 📂 關鍵資源索引

| 資源 | 路徑 | 用途 |
|------|------|------|
| **會員卡片** | `src/components/account/MemberCard.tsx` | 條碼 + 等級 + 進度條 |
| **ProfileForm** | `src/components/account/ProfileForm.tsx` | 資料編輯表單 |
| **LINE Bot 參考** | `line bot優化更新/refactored/` | GAS 版本成功邏輯 |
| **LINE 模組** | `src/lib/line/` | Payload 版 LINE 整合 |
| **通知服務** | `src/lib/notifications/` | LINE 優先 + Email fallback |
| **UI/UX Workflow** | `.agent/workflows/ui-ux-pro-max.md` | 設計系統搜尋工具 |
| **Vibe Workflow** | `.agent/workflows/vibe.md` | 核心開發協議 |

---

## 🔧 會員中心路由架構

```
/account                     → 儀表板 (MemberCard + 快捷入口 + 最近訂單)
├── /orders                  → 訂單履歷
├── /points                  → 點數履歷
├── /wishlist                → 收藏清單
├── /restock-requests        → 補貨通知
├── /profile                 → 基本資料編輯
├── /social                  → 社群綁定管理
└── /settings                → 安全設定
```

---

## 🚀 下一步（Phase 9）

1. **商品頁愛心 Icon 整合**
   - 點擊加入/移除願望清單
   - 實時狀態更新

2. **缺貨時「補貨通知」按鈕**
   - 庫存為 0 時顯示
   - 一鍵申請通知

3. **遺棄購物車提醒**
   - 識別未結帳購物車
   - LINE 推播提醒

4. **LINE Login 整合**
   - 登入頁 LINE Login 按鈕
   - 自動綁定 LINE User ID

---

## 💡 給下一個對話視窗的提示

- 用戶採用 **Vibe Coding** 方法論，所有變更需先更新 Memory Bank
- **Phase 8 會員中心已全部完成**，共 7 個子頁面 + 2 個組件
- **LINE Bot 整合已完成**，Webhook 在 `/api/line/webhook`
- **願望清單/補貨通知後端已完成**，待商品頁前端整合
- 通知發送優先使用 **LINE**，fallback 至 **Email (Resend)**
- UI 設計需遵循 **UI/UX Pro Max** workflow（禁用 Emoji Icon，使用 Lucide SVG）
- 視覺風格為 **Scrapbook Retro**（紙張紋理、硬陰影、膠帶裝飾）
- 所有回覆使用 **繁體中文**
- **後台可編輯網站名稱**：設定 → 網站設定 → 品牌識別 → 網站名稱
