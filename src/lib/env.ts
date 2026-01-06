/**
 * 環境變數取得工具
 * 
 * 簡化版本：不再進行嚴格驗證，避免在雲端環境（如 Zeabur）啟動時失敗
 * 所有關鍵環境變數在使用時會有適當的 fallback
 */

// 類型定義，方便其他模組使用
export type Env = {
  DATABASE_URL?: string
  PAYLOAD_SECRET?: string
  S3_BUCKET?: string
  S3_ACCESS_KEY?: string
  S3_SECRET_KEY?: string
  S3_REGION?: string
  S3_ENDPOINT?: string
  UPSTASH_REDIS_REST_URL?: string
  UPSTASH_REDIS_REST_TOKEN?: string
  LINE_CHANNEL_ACCESS_TOKEN?: string
  LINE_CHANNEL_SECRET?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_PUBLISHABLE_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  NODE_ENV?: string
}

// 直接匯出 process.env 的包裝，確保在 Runtime 時才讀取
// 這樣可以避免 Next.js build-time 評估的問題
export const env: Partial<Env> = {
  get DATABASE_URL() {
    return process.env.DATABASE_URL || process.env.MONGO_URI || process.env.MONGO_CONNECTION_STRING
  },
  get PAYLOAD_SECRET() {
    return process.env.PAYLOAD_SECRET
  },
  get S3_BUCKET() {
    return process.env.S3_BUCKET
  },
  get S3_ACCESS_KEY() {
    return process.env.S3_ACCESS_KEY
  },
  get S3_SECRET_KEY() {
    return process.env.S3_SECRET_KEY
  },
  get S3_REGION() {
    return process.env.S3_REGION
  },
  get S3_ENDPOINT() {
    return process.env.S3_ENDPOINT
  },
  get UPSTASH_REDIS_REST_URL() {
    return process.env.UPSTASH_REDIS_REST_URL
  },
  get UPSTASH_REDIS_REST_TOKEN() {
    return process.env.UPSTASH_REDIS_REST_TOKEN
  },
  get LINE_CHANNEL_ACCESS_TOKEN() {
    return process.env.LINE_CHANNEL_ACCESS_TOKEN
  },
  get LINE_CHANNEL_SECRET() {
    return process.env.LINE_CHANNEL_SECRET
  },
  get STRIPE_SECRET_KEY() {
    return process.env.STRIPE_SECRET_KEY
  },
  get STRIPE_PUBLISHABLE_KEY() {
    return process.env.STRIPE_PUBLISHABLE_KEY
  },
  get STRIPE_WEBHOOK_SECRET() {
    return process.env.STRIPE_WEBHOOK_SECRET
  },
  get NODE_ENV() {
    return process.env.NODE_ENV || 'development'
  },
}
