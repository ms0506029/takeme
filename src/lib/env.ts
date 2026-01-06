/**
 * 環境變數 Schema 驗證
 * 
 * 確保必要的環境變數存在且格式正確
 * 漏填時專案無法啟動，提早發現錯誤
 * 
 * 注意：在 CLI 模式下（如 generate:types）跳過驗證
 */
import { z } from 'zod'

// 定義環境變數的 Schema
const envSchema = z.object({
  // ---- Database ----
  DATABASE_URL: z.string().url({
    message: 'DATABASE_URL 必須是有效的 MongoDB 連接字串',
  }),
  
  // ---- Payload CMS ----
  PAYLOAD_SECRET: z.string().min(32, {
    message: 'PAYLOAD_SECRET 必須至少 32 個字元以確保安全性',
  }),
  
  // ---- S3/R2 Storage (選填，生產環境必填) ----
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  
  // ---- Redis (選填，生產環境建議啟用) ----
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // ---- LINE Messaging API (選填) ----
  LINE_CHANNEL_ACCESS_TOKEN: z.string().optional(),
  LINE_CHANNEL_SECRET: z.string().optional(),
  
  // ---- Stripe ----
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // ---- Environment ----
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// 檢查是否在 CLI 模式（如 generate:types、generate:importmap）
// 或在 Build 階段（Zeabur 等 PaaS 平台會在 runtime 才注入環境變數）
const isCLIMode = process.argv.some(arg => 
  arg.includes('generate:types') || 
  arg.includes('generate:importmap') ||
  arg.includes('payload')
)

// 檢查是否在 Build 階段（環境變數尚未注入）
const isBuildPhase = !process.env.DATABASE_URL && process.env.NODE_ENV !== 'development'

// 類型定義，方便其他模組使用
export type Env = z.infer<typeof envSchema>

// 匯出經過驗證的環境變數（或在 CLI/Build 模式下使用預設值）
export const env: Partial<Env> = (isCLIMode || isBuildPhase)
  ? {
      DATABASE_URL: 'mongodb://localhost:27017/build-time-dummy',
      PAYLOAD_SECRET: 'build-time-dummy-secret-at-least-32-chars-long',
    } as Env // CLI 模式或 Build 階段提供虛擬值，繞過初始化檢查
  : (() => {
      // Zeabur 等平台可能提供 MONGO_URI 或 MONGO_CONNECTION_STRING 而不是 DATABASE_URL
      // 我們在這裡進行自動對應，減少用戶手動配置的麻煩
      const databaseUrl = process.env.DATABASE_URL || process.env.MONGO_URI || process.env.MONGO_CONNECTION_STRING
      
      const envToValidate = {
        ...process.env,
        DATABASE_URL: databaseUrl,
      }

      const parseResult = envSchema.safeParse(envToValidate)
      
      if (!parseResult.success) {
        // 格式化錯誤訊息
        const errorMessages = parseResult.error.issues
          .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
          .join('\n')
        
        // eslint-disable-next-line no-console
        console.error('❌ 環境變數驗證失敗:\n' + errorMessages)
        
        throw new Error('環境變數驗證失敗，請檢查 .env 設定')
      }
      
      return parseResult.data
    })()

