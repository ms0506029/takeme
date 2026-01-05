# Vercel 部署指南

## 部署步驟

### 1. 連結 GitHub Repository
```bash
# 確保專案已推送至 GitHub
git push origin main
```

### 2. 前往 Vercel Dashboard
訪問 [vercel.com/new](https://vercel.com/new) 並連結您的 GitHub repository。

### 3. 配置環境變數
在 Vercel Project Settings > Environment Variables 中設定以下變數：

| 變數名 | 必填 | 說明 |
|-------|------|------|
| `DATABASE_URL` | ✅ | MongoDB Atlas 連接字串 |
| `PAYLOAD_SECRET` | ✅ | 32 字元以上的加密密鑰 |
| `NEXT_PUBLIC_SERVER_URL` | ✅ | 您的 Vercel 網址 (如 `https://daytona-park.vercel.app`) |
| `PAYLOAD_PUBLIC_SERVER_URL` | ✅ | 同上 |
| `S3_BUCKET` | 建議 | 檔案儲存用 |
| `S3_ACCESS_KEY` | 建議 | S3 存取金鑰 |
| `S3_SECRET_KEY` | 建議 | S3 密鑰 |
| `S3_REGION` | 建議 | 通常為 `auto` |
| `S3_ENDPOINT` | 建議 | R2/S3 端點 URL |
| `STRIPE_SECRET_KEY` | 選填 | Stripe 付款密鑰 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 選填 | Stripe 公開金鑰 |

### 4. 部署設定
Vercel 會自動偵測 Next.js 專案並使用正確的建置設定：
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 5. 點擊 Deploy
等待部署完成，Vercel 會自動提供一個網址。

---

## 注意事項

### MongoDB Atlas IP Whitelist
確保在 MongoDB Atlas 中將 `0.0.0.0/0` 加入 IP Access List，允許 Vercel 的動態 IP 連接。

### 環境變數同步
- **開發環境**: 使用 `.env` 檔案
- **生產環境**: 使用 Vercel Environment Variables
- 兩者變數名稱應保持一致

### 首次部署後
1. 訪問 `/admin` 建立第一個管理員帳號
2. 設定商品、頁面等基本資料
3. 測試 Stripe 付款流程（使用測試金鑰）

---

## 疑難排解

### 500 Internal Server Error
- 檢查 `DATABASE_URL` 是否正確
- 確認 MongoDB Atlas IP Whitelist

### 樣式不顯示
- 確保 `npm run build` 在本地成功
- 檢查 Vercel Build Logs

### 圖片無法上傳
- 確認 S3/R2 設定正確
- 檢查 CORS 設定
