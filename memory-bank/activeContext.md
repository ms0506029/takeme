# Active Context

**Last Updated：** 2026-01-04

---

## 🎯 專案狀態

**專案名稱：** Daytona Park - Scrapbook Retro Platform  
**當前階段：** 📊 報表與分析功能開發 (Phase 7)  
**技術棧：** Next.js 15 + Payload CMS 3.69.0 + MongoDB + Chart.js

---

## ⚠️ 當前任務

### 分析報表功能 (Phase 7)

**狀態**：規劃中
- **Phase 1**: 建立「分析報表」Admin View 頁面
- **Phase 2**: 實作統計圖表（銷售額、訂單數、排名表格）
- **Phase 3**: 整合 Google Analytics 4
- **Phase 4**: 整合 Meta Pixel

---

## ✅ 已完成階段摘要

### Admin UI 客製化 (Phase 6)
- **視覺基礎**：主題色 `#C9915D` (EasyStore 風格) + Noto Sans TC 字體。
- **側邊欄導覽**：依功能分組（訂單管理、商品管理、客戶管理等）。
- **Dashboard**：自訂歡迎區塊與實統計卡片。
- **遺棄購物車**：Carts Collection 擴充遺棄時間與狀態欄位。

### Scrapbook v4.0 設計系統 (Phase 2-5)
- **Blocks 整合**：Ranking, News, CheckList, Hero, PromoBadge, IconsNav。
- **自動化**：Seed script 成功生成完整首頁佈局。

---

## 📂 關鍵檔案索引

| 類型 | 路徑 |
|------|------|
| Admin 樣式 | `src/app/(payload)/custom.scss` |
| Dashboard 組件 | `src/components/BeforeDashboard/` |
| Plugin 配置 | `src/plugins/index.ts` |
| 商品 Collection | `src/collections/Products/index.ts` |
| 首頁生成腳本 | `src/scripts/seedScrapbook.ts` |

---

## 🚀 下一步

1. **實作分析報表**：建立專用的 Admin View 連結。
2. **部署準備**：規劃 Zeabur 部署流程 (Phase 8)。
3. **數據整合**：申請 GA4 / Meta Pixel API 權限。

---

## 📝 快速啟動指令

```bash
# 啟動開發伺服器 (Port 3001)
npm run dev

# 訪問後台
http://localhost:3001/admin
```
