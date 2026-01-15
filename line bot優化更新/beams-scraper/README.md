# BEAMS Scraper - 部署指南

## 本地測試

```bash
# 安裝依賴
npm install

# 設定環境變數
export BEAMS_EMAIL="eddc9104@gmail.com"
export BEAMS_PASSWORD="your_password"

# 啟動本地測試
npm start
```

## 部署至 Cloud Functions

### 1. 設定 GCP 專案
```bash
gcloud config set project linebot-todoaccounting-2025
```

### 2. 設定環境變數（安全方式）
```bash
# 使用 Secret Manager 儲存密碼
gcloud secrets create beams-password --data-file=-
# 輸入密碼後按 Ctrl+D
```

### 3. 部署
```bash
gcloud functions deploy scrapeBeamsProduct \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --memory 1024MB \
  --timeout 60s \
  --region asia-northeast1 \
  --set-env-vars BEAMS_EMAIL=eddc9104@gmail.com \
  --set-secrets BEAMS_PASSWORD=beams-password:latest
```

### 4. 測試
```bash
curl -X POST https://asia-northeast1-linebot-todoaccounting-2025.cloudfunctions.net/scrapeBeamsProduct \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.beams.co.jp/item/beams/tops/11130412147/"}'
```

## API 規格

### POST /scrapeBeamsProduct

**Request Body**:
```json
{
  "url": "https://www.beams.co.jp/item/beams/tops/11130412147/"
}
```

**Response**:
```json
{
  "success": true,
  "productId": "11130412147",
  "productName": "BEAMS ロゴ ベーシック フーディ",
  "category": "BEAMS",
  "hasDiscount": true,
  "originalPrice": 13200,
  "url": "...",
  "scrapedAt": "2025-12-26T06:00:00.000Z",
  "elapsedMs": 3500
}
```
