# Tech Context
**Last Updated：** 2026-01-02

---

## 1. 技術棧 (Tech Stack)

### 核心框架
| 層級 | 技術 | 版本 | 用途 |
|------|------|------|------|
| **Frontend** | Next.js (App Router) | 15.x | 前端框架、SSR/ISR |
| **CMS** | Payload CMS | 3.x | Headless CMS、後端 API |
| **Database** | MongoDB Atlas | - | 文件資料庫 |
| **ORM** | Payload 內建 | - | 資料建模 |

### 樣式與 UI
| 技術 | 版本 | 用途 |
|------|------|------|
| Tailwind CSS | 3.x | 原子化 CSS |
| shadcn/ui | latest | 基礎元件庫 |
| CSS Variables | - | 主題切換系統 |

### 基礎設施
| 服務 | 用途 |
|------|------|
| AWS S3 / Cloudflare R2 | 商品圖片 CDN 儲存 |
| Upstash Redis | API Rate Limit、購物車暫存、庫存鎖定 |
| Vercel | 前端部署 |

### 外部 API 整合
| 服務 | 用途 |
|------|------|
| LINE Messaging API | 訂單通知、CRM 推播 |
| 爬蟲 Webhook | 日本商品資料接收 |

---

## 2. 開發環境

### Node.js
```
Node.js >= 20.x
pnpm >= 9.x (推薦) 或 npm
```

### 必要環境變數
```env
# Database
MONGODB_URI=

# Payload CMS
PAYLOAD_SECRET=

# S3/R2 Storage
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

# Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# LINE
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
```

---

## 3. 專案結構 (預計)
```
/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (frontend)/         # 前台路由群組
│   │   ├── (dashboard)/        # 後台路由群組
│   │   └── globals.css         # 全域 CSS Variables
│   ├── collections/            # Payload Collections
│   ├── components/             # React 元件
│   ├── lib/                    # 共用函式庫
│   └── payload.config.ts       # Payload 設定
├── memory-bank/                # Vibe Coding 記憶庫
└── .env                        # 環境變數
```

---

## 4. 依賴管理原則
1. **Glue Coding** - 優先使用成熟套件
2. **版本鎖定** - 使用 `pnpm-lock.yaml` 確保一致性
3. **安全掃描** - 定期執行 `pnpm audit`
