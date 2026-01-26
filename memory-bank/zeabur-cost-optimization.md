# Zeabur 成本優化與效能監控實作清單 (v2.0)

**適用對象：** 月流量 50萬+ PV 之 Next.js + Payload CMS 專案
**最後更新：** 2026-01-25
**預期成本：** $15-25 USD/月（優化後）

---

## 概覽：成本優化策略

```
                    ┌─────────────────────────────────────┐
                    │         用戶請求流程                 │
                    └─────────────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────────┐
                    │      Cloudflare CDN (免費層)         │
                    │  • 靜態資源快取 (JS/CSS/Fonts)       │
                    │  • 圖片透過 R2 (零 Egress)           │
                    │  • DDoS 防護 + WAF                  │
                    └─────────────────────────────────────┘
                          │ Cache Miss          │ Cache Hit
                          ▼                     ▼
              ┌───────────────────┐      ┌─────────────┐
              │   Zeabur (付費)    │      │  直接回應   │
              │  • Next.js SSR    │      │  (零成本)   │
              │  • Payload API    │      └─────────────┘
              └───────────────────┘
                          │
                          ▼ Internal Network (免費)
              ┌───────────────────┐
              │   MongoDB Atlas   │
              │   (或 Zeabur DB)  │
              └───────────────────┘
```

---

## 第一階段：網路傳輸 (Egress) 成本削減

> Zeabur 主要收費項為網路輸出 ($0.1/GB)，此階段可節省 **60%-80%** 費用。

### 1.1 Cloudflare CDN 整合

- [ ] **DNS 指向 Cloudflare**
  - 將網域 DNS 託管至 Cloudflare
  - 開啟「橘色雲朵」代理模式
  - **效果：** 靜態資源在 Edge 端快取，不經過 Zeabur

- [ ] **設定 Cache Rules**
  ```
  規則 1: /_next/static/* → Cache Everything, Edge TTL: 1 year
  規則 2: /assets/*       → Cache Everything, Edge TTL: 1 month
  規則 3: /api/*          → Bypass Cache (動態 API)
  ```

- [ ] **啟用額外功能**
  - Brotli 壓縮（自動）
  - Auto Minify (JS/CSS/HTML)
  - Early Hints (103)

### 1.2 圖片儲存遷移至 Cloudflare R2

> **關鍵優化：R2 出站流量完全免費**

- [ ] **建立 R2 Bucket**
  ```bash
  # Cloudflare Dashboard → R2 → Create Bucket
  Bucket Name: your-project-images
  Location: Auto (或指定 APAC)
  ```

- [ ] **設定自訂域名**
  - 建立子網域：`images.yourdomain.com`
  - 在 R2 Bucket 設定 → Custom Domain → 連結子網域
  - **效果：** 圖片透過 Cloudflare CDN 分發，完全免費

- [ ] **Payload CMS 儲存配置**
  ```typescript
  // src/plugins/storage.ts
  import { s3Storage } from '@payloadcms/storage-s3'

  export const r2Storage = s3Storage({
    collections: {
      media: {
        prefix: 'media',
        generateFileURL: ({ filename }) =>
          `https://images.yourdomain.com/media/${filename}`,
      },
    },
    bucket: process.env.R2_BUCKET!,
    config: {
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT!, // https://<account_id>.r2.cloudflarestorage.com
    },
  })
  ```

- [ ] **環境變數設定**
  ```env
  R2_BUCKET=your-project-images
  R2_ACCESS_KEY_ID=xxx
  R2_SECRET_ACCESS_KEY=xxx
  R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
  ```

### 1.3 Next.js 圖片優化配置

- [ ] **next.config.js 完整配置**
  ```javascript
  // next.config.js
  module.exports = {
    images: {
      // 啟用現代格式 (AVIF 比 WebP 再小 20%)
      formats: ['image/avif', 'image/webp'],

      // R2 自訂域名白名單
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'images.yourdomain.com',
        },
      ],

      // 響應式尺寸 (避免傳輸過大圖片)
      deviceSizes: [640, 750, 828, 1080, 1200, 1920],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

      // 長效快取
      minimumCacheTTL: 60 * 60 * 24 * 30, // 30 天

      // 停用 dangerouslyAllowSVG 除非必要
      dangerouslyAllowSVG: false,
    },
  }
  ```

- [ ] **強制使用 next/image**
  ```typescript
  // 正確用法
  import Image from 'next/image'

  <Image
    src="https://images.yourdomain.com/media/product.jpg"
    alt="Product"
    width={600}
    height={400}
    quality={75}        // 品質壓縮
    placeholder="blur"  // 載入時顯示模糊預覽
    blurDataURL="..."   // Base64 預覽圖
  />

  // ❌ 禁止使用
  <img src="..." />
  ```

### 1.4 Payload Media Collection 優化

- [ ] **設定預設圖片尺寸**
  ```typescript
  // src/collections/Media.ts
  import type { CollectionConfig } from 'payload'

  export const Media: CollectionConfig = {
    slug: 'media',
    upload: {
      // 儲存設定 (由 storage plugin 處理)
      disableLocalStorage: true,

      // 圖片尺寸預設
      imageSizes: [
        {
          name: 'thumbnail',
          width: 300,
          height: 300,
          position: 'centre',
        },
        {
          name: 'card',
          width: 600,
          height: 400,
          position: 'centre',
        },
        {
          name: 'hero',
          width: 1200,
          height: undefined, // 保持比例
        },
      ],

      // 限制上傳大小
      staticOptions: {
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB 上限
        },
      },

      // MIME 類型白名單
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    },

    // 啟用焦點裁切
    fields: [
      {
        name: 'alt',
        type: 'text',
        required: true,
      },
    ],
  }
  ```

- [ ] **上傳前壓縮 Hook**
  ```typescript
  // src/collections/Media.ts - hooks
  import sharp from 'sharp'

  hooks: {
    beforeOperation: [
      async ({ operation, req }) => {
        if (operation === 'create' && req.file) {
          const buffer = req.file.data

          // 壓縮原圖 (品質 80, 最大寬度 2000px)
          const optimized = await sharp(buffer)
            .resize(2000, undefined, { withoutEnlargement: true })
            .jpeg({ quality: 80, progressive: true })
            .toBuffer()

          req.file.data = optimized
          req.file.size = optimized.length
        }
      },
    ],
  }
  ```

---

## 第二階段：記憶體 (Memory) 使用優化

> Zeabur 按 GB-分鐘計費，優化記憶體可直接降低每分鐘成本。

### 2.1 Internal Network 使用

- [ ] **MongoDB 內部連線**
  ```env
  # ❌ 外部連線 (計費 + 高延遲)
  DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/db

  # ✅ Zeabur 內部連線 (免費 + 低延遲)
  DATABASE_URL=mongodb://mongo.zeabur.internal:27017/db
  ```

- [ ] **Redis 內部連線 (如有使用)**
  ```env
  UPSTASH_REDIS_REST_URL=https://redis.zeabur.internal
  ```

### 2.2 MongoDB 連線池優化

- [ ] **連線參數調整**
  ```env
  DATABASE_URL=mongodb://...?maxPoolSize=10&minPoolSize=2&maxIdleTimeMS=30000&compressors=zlib
  ```

  | 參數 | 建議值 | 說明 |
  |------|--------|------|
  | `maxPoolSize` | 10 | 最大連線數 |
  | `minPoolSize` | 2 | 最小連線數 |
  | `maxIdleTimeMS` | 30000 | 閒置連線超時 |
  | `compressors` | zlib | 壓縮傳輸資料 |

### 2.3 Node.js 記憶體控制

- [ ] **限制 Build 記憶體**
  ```json
  // package.json
  {
    "scripts": {
      "build": "NODE_OPTIONS='--max-old-space-size=2048' next build"
    }
  }
  ```

- [ ] **避免 Server 端快取過多資料**
  ```typescript
  // ❌ Server 端儲存 (Memory Leak 風險)
  const recentlyViewed = new Map()

  // ✅ 移至 Client 端
  // 使用 localStorage 或 sessionStorage
  ```

- [ ] **定期清理 Payload 快取**
  ```typescript
  // 在 cron job 或 webhook 中
  await payload.db.collections['_payload_versions'].deleteMany({
    createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  })
  ```

---

## 第三階段：高流量應對策略

> 針對 54 萬 Page Views 的壓力優化。

### 3.1 ISR 分級策略

- [ ] **頁面重新驗證設定**
  ```typescript
  // src/lib/constants.ts
  export const REVALIDATE = {
    homepage: 60 * 60,           // 1 小時 (可能有促銷)
    productList: 60 * 30,        // 30 分鐘 (庫存變動)
    productDetail: 60 * 60,      // 1 小時
    categoryPage: 60 * 60 * 2,   // 2 小時
    staticPages: 60 * 60 * 24,   // 24 小時 (關於我們、FAQ)
  } as const

  // 使用範例
  // app/products/page.tsx
  export const revalidate = REVALIDATE.productList
  ```

- [ ] **On-demand Revalidation**
  ```typescript
  // src/hooks/revalidateOnChange.ts
  import { revalidatePath, revalidateTag } from 'next/cache'
  import type { CollectionAfterChangeHook } from 'payload'

  export const revalidateProductOnChange: CollectionAfterChangeHook = async ({
    doc,
    previousDoc,
    req,
  }) => {
    if (doc._status === 'published') {
      // 重新驗證商品頁
      revalidatePath(`/products/${doc.slug}`)

      // 重新驗證商品列表
      revalidateTag('products-list')

      // 如果分類變更，重新驗證分類頁
      if (doc.category !== previousDoc?.category) {
        revalidatePath(`/category/${doc.category}`)
      }
    }
  }
  ```

### 3.2 API Rate Limiting

- [ ] **安裝 Upstash Rate Limit**
  ```bash
  pnpm add @upstash/ratelimit @upstash/redis
  ```

- [ ] **Middleware 實作**
  ```typescript
  // src/middleware.ts
  import { Ratelimit } from '@upstash/ratelimit'
  import { Redis } from '@upstash/redis'
  import { NextResponse } from 'next/server'
  import type { NextRequest } from 'next/server'

  const redis = Redis.fromEnv()

  // API 限流：100 requests / 1 minute
  const apiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'ratelimit:api',
  })

  // Webhook 限流：20 requests / 1 minute
  const webhookLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    analytics: true,
    prefix: 'ratelimit:webhook',
  })

  export async function middleware(request: NextRequest) {
    const ip = request.ip ?? '127.0.0.1'
    const path = request.nextUrl.pathname

    // Webhook 限流
    if (path.startsWith('/api/webhook')) {
      const { success, limit, remaining } = await webhookLimiter.limit(ip)

      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
            }
          }
        )
      }
    }

    // 一般 API 限流
    if (path.startsWith('/api/')) {
      const { success } = await apiLimiter.limit(ip)
      if (!success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
      }
    }

    return NextResponse.next()
  }

  export const config = {
    matcher: '/api/:path*',
  }
  ```

- [ ] **Webhook Token 驗證**
  ```typescript
  // src/app/api/webhook/sync/route.ts
  import { headers } from 'next/headers'

  export async function POST(request: Request) {
    const headersList = headers()
    const token = headersList.get('x-webhook-token')

    if (token !== process.env.WEBHOOK_SECRET_TOKEN) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 處理 webhook...
  }
  ```

### 3.3 資料庫查詢優化

- [ ] **建立索引**
  ```typescript
  // src/collections/Products/index.ts
  export const Products: CollectionConfig = {
    slug: 'products',
    indexes: [
      { fields: ['slug'], unique: true },
      { fields: ['category', 'status'] },
      { fields: ['createdAt'] },
      { fields: ['price'] },
    ],
    // ...
  }
  ```

- [ ] **限制查詢深度**
  ```typescript
  // 避免過深的 relationship 展開
  const products = await payload.find({
    collection: 'products',
    depth: 1,  // 只展開一層關聯
    limit: 20,
    select: {
      title: true,
      slug: true,
      price: true,
      thumbnail: true,
      // 不選擇大型欄位
    },
  })
  ```

---

## 第四階段：預算告警與監控

### 4.1 Zeabur 帳單預警

- [ ] **設定金額告警**
  - 前往 Zeabur Dashboard → Billing → Budget Alerts
  - 設定 $20 USD 預警（80% 預算）
  - 設定 $25 USD 預警（100% 預算）

- [ ] **每週檢查項目**
  | 指標 | 健康範圍 | 告警閾值 |
  |------|----------|----------|
  | Memory Usage | < 512MB | > 1GB |
  | CPU Usage | < 50% | > 80% |
  | Egress (日) | < 5GB | > 10GB |
  | Request Count | 視業務 | 異常突增 |

### 4.2 Cloudflare Analytics 監控

- [ ] **Cache Hit Ratio 目標**
  - 目標：> 85%
  - 若低於 80%，檢查 Cache Rules 設定

- [ ] **建立自訂 Dashboard**
  ```
  關鍵指標：
  ├── Requests (總請求數)
  ├── Cached Requests (快取命中)
  ├── Bandwidth Saved (節省頻寬)
  └── Threats Mitigated (阻擋攻擊)
  ```

### 4.3 應用程式監控

- [ ] **Sentry 整合**
  ```bash
  pnpm add @sentry/nextjs
  npx @sentry/wizard@latest -i nextjs
  ```

- [ ] **自訂效能追蹤**
  ```typescript
  // src/lib/monitoring.ts
  import * as Sentry from '@sentry/nextjs'

  export function trackAPILatency(
    endpoint: string,
    duration: number
  ) {
    // 記錄 API 延遲
    Sentry.metrics.distribution('api.latency', duration, {
      tags: { endpoint },
      unit: 'millisecond',
    })

    // 超過 2 秒告警
    if (duration > 2000) {
      Sentry.captureMessage(`Slow API: ${endpoint} took ${duration}ms`, 'warning')
    }
  }
  ```

- [ ] **Core Web Vitals 追蹤**
  ```typescript
  // src/app/layout.tsx
  import { SpeedInsights } from '@vercel/speed-insights/next'

  // 或使用 web-vitals
  import { onCLS, onFID, onLCP } from 'web-vitals'

  export function reportWebVitals({ name, value }: { name: string; value: number }) {
    // 發送到分析服務
    console.log({ name, value })
  }
  ```

### 4.4 圖片載入監控

- [ ] **追蹤圖片錯誤**
  ```typescript
  // src/components/OptimizedImage.tsx
  'use client'
  import Image from 'next/image'
  import { useState } from 'react'

  export function OptimizedImage({ src, alt, ...props }) {
    const [error, setError] = useState(false)

    return (
      <Image
        src={error ? '/fallback.jpg' : src}
        alt={alt}
        onError={() => {
          setError(true)
          // 記錄錯誤
          console.error(`Image load failed: ${src}`)
        }}
        {...props}
      />
    )
  }
  ```

---

## 第五階段：部署檢查清單

### 5.1 上線前檢查

```markdown
## 基礎設施
- [ ] Cloudflare DNS 已設定並啟用代理
- [ ] R2 Bucket 已建立並設定自訂域名
- [ ] 環境變數已在 Zeabur 設定完成
- [ ] MongoDB 使用內部連線字串

## 應用程式
- [ ] next.config.js 圖片配置完成
- [ ] Payload Media 儲存指向 R2
- [ ] ISR 策略已設定
- [ ] Rate Limiting 已啟用

## 監控
- [ ] Zeabur 預算告警已設定
- [ ] Sentry 已整合
- [ ] Cloudflare Analytics 可存取

## 安全
- [ ] Webhook Token 已設定
- [ ] 敏感環境變數未暴露
- [ ] CORS 設定正確
```

### 5.2 成本追蹤表

| 月份 | Egress (GB) | Compute (GB-hr) | 總成本 | 備註 |
|------|-------------|-----------------|--------|------|
| M1 | - | - | - | 基準測量 |
| M2 | - | - | - | 優化後 |
| M3 | - | - | - | - |

---

## 附錄：預期成本計算

### 優化前 (預估)

| 項目 | 用量 | 單價 | 成本 |
|------|------|------|------|
| Egress | ~400GB | $0.1/GB | $40 |
| Compute | ~1GB × 720hr | $0.02/GB-hr | $14.4 |
| **總計** | - | - | **~$55** |

### 優化後 (目標)

| 項目 | 用量 | 單價 | 成本 |
|------|------|------|------|
| Egress (CDN後) | ~100GB | $0.1/GB | $10 |
| R2 Egress | ~300GB | **$0/GB** | $0 |
| Compute | ~0.5GB × 720hr | $0.02/GB-hr | $7.2 |
| **總計** | - | - | **~$17** |

### 節省幅度

```
優化前: $55/月
優化後: $17/月
節省:   $38/月 (69%)
```

---

## 相關文件

- [Cloudflare R2 文檔](https://developers.cloudflare.com/r2/)
- [Payload Storage Plugin](https://payloadcms.com/docs/plugins/storage)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Zeabur Pricing](https://zeabur.com/pricing)
