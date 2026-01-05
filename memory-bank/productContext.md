# Product Context (PRD)

**專案名稱：** Daytona Park - Scrapbook Retro Platform  
**版本：** v4.0 (Scrapbook Collage Style)  
**核心主色：** #C9925E (Copper Bronze)  
**Last Updated：** 2026-01-03

---

## 1. 專案願景 (Vision)

打造一個具有**「現代剪貼簿」**質感的跨境電商平台，專為日本代購業務設計。視覺核心在於模擬實體筆記本的質感：使用膠帶固定、長尾夾裝飾、多層次紙張陰影，以及圓潤的幾何字體。

## 2. 解決的問題 (Problem Statement)

- 現有系統無法處理多商家權限分離
- 日本商品爬蟲資料需要高效寫入與圖片 CDN 轉存
- 促銷規則複雜（會員折扣 x 活動 x 折價券疊加）
- 庫存管理需要即時鎖定避免超賣
- **新增**：需要獨特的視覺識別系統以區隔競爭對手

## 3. 目標用戶 (Target Users)

| 角色 | 描述 |
|------|------|
| **Super Admin** | 平台管理員，管理所有商家與系統設定 |
| **Vendor** | 商家，管理自己的商品、訂單、錢包 |
| **Customer** | 終端消費者，瀏覽商品、下單、追蹤物流 |

## 4. 設計系統核心 (Design System)

| Token | Light Mode | Dark Mode | 用途 |
|-------|-----------|-----------|------|
| Primary | `#C9925E` | `#C9925E` | 銅棕色，Logo/CTA/強調 |
| Secondary | `#4A6C6F` | `#4A6C6F` | 板岩綠，次要標籤 |
| Accent | `#D65A5A` | `#D65A5A` | 復古紅，Sale/錯誤 |
| Background | `#FDFBF7` | `#1A1A1A` | 暖白紙張/深色畫布 |

**字體**：Lexend (標題) + Patrick Hand (手寫內文)

## 5. 核心功能範疇 (Scope)

### 階段一：地基與安全防護網

- Next.js + Payload CMS Monorepo 架構
- 環境變數 Schema 驗證 (Zod)
- ESLint 資安規則

### 階段二：後端核心

- 權限系統 (RBAC)
- 商品中心 (PIM) + 爬蟲欄位
- 商家系統

### 階段三：高階商業邏輯

- 促銷引擎 (疊加計算)
- 訂單狀態機 (OMS)
- 庫存鎖定 (Redis)
- LINE 推播整合

### 階段四：前端系統 (Scrapbook Style)

- Theming 架構 (CSS Variables + 雙層陰影)
- 膠帶/長尾夾裝飾效果
- 前台商城 (ISR)
- 商家/用戶後台

### 階段五：部署與 QA

- CSP 安全標頭
- XSS 防護 (DOMPurify)
- 壓力測試

## 6. 設計理念

1. **邏輯與樣式分離** - 後端專注資料，前端專注渲染
2. **模組化開發** - 禁止巨型檔案
3. **一鍵換膚** - Global CSS Variables 架構
4. **視覺卓越** - 每個頁面都應讓用戶 WOW
