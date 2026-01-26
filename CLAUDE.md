# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Payload CMS Ecommerce Template - a full-stack e-commerce platform built with:
- **Backend**: Payload CMS 3.69.0 (headless CMS)
- **Frontend**: Next.js 15 with App Router
- **Database**: MongoDB
- **Payments**: Stripe
- **UI**: React 19, TailwindCSS 4, shadcn/ui

## Common Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Auto-fix lint issues
tsc --noEmit          # TypeScript validation

# Testing
pnpm test             # Run all tests
pnpm test:int         # Integration tests (Vitest)
pnpm test:e2e         # E2E tests (Playwright)

# Payload CMS
pnpm generate:types      # Generate TypeScript types after schema changes
pnpm generate:importmap  # Regenerate component import map after adding components
pnpm payload migrate:create  # Create database migration
pnpm payload migrate         # Run pending migrations

# Utilities
pnpm stripe-webhooks  # Listen for Stripe webhooks locally
pnpm seed:scrapbook   # Seed database with sample data
```

## Architecture

### Directory Structure
```
src/
├── app/
│   ├── (app)/              # Frontend public routes (shop, checkout, account)
│   ├── (payload)/          # Payload admin panel routes
│   └── api/                # API endpoints
├── collections/            # Payload collection definitions
├── globals/                # Site-wide config (Header, Footer, SiteSettings)
├── components/
│   ├── Admin/              # Custom admin panel components
│   └── ...                 # Frontend components
├── lib/                    # Utilities (cart, auth, points, notifications)
├── access/                 # Access control functions (RBAC)
├── hooks/                  # Payload lifecycle hooks
├── blocks/                 # Layout builder block types
├── plugins/                # Plugin configurations
└── payload.config.ts       # Main Payload configuration
```

### Key Patterns

**Access Control (RBAC)**
- Role-based: admin, customer, vendor, superAdmin
- Access functions in `src/access/`
- Local API bypasses access control by default - use `overrideAccess: false` when passing `user`

**Hooks**
- Always pass `req` to nested operations for transaction safety
- Use `context` flags to prevent infinite hook loops
- Located in `src/hooks/` (orderCompletion, restockDetection, priceDrop)

**Custom Components**
- Defined via file paths in config, not direct imports
- Run `pnpm generate:importmap` after adding new components
- Server Components by default; add `'use client'` for client components

**Multi-Vendor Support**
- Vendors collection with role-based access
- Vendor-specific product and order filtering

### Collections Overview
- **Products/Variants**: From ecommerce plugin with custom extensions
- **Orders/Transactions/Carts**: Ecommerce plugin collections
- **Users**: Auth-enabled with roles (admin, customer, vendor)
- **Categories/Media**: Standard content collections
- **Promotions/MemberLevels/PointTransactions**: Loyalty system
- **Wishlist/RestockRequests**: Customer features
- **AdBanners**: Marketing content

### Custom Admin Features
- Product/Order importers (EasyStore, CSV support)
- Abandoned carts analytics
- Customer analytics dashboard
- Custom sidebar navigation

## Critical Development Rules

1. **Type Generation**: Run `pnpm generate:types` after modifying collection schemas
2. **Import Map**: Run `pnpm generate:importmap` after adding custom admin components
3. **Transaction Safety**: Always pass `req` to nested Payload operations in hooks
4. **Access Control**: Set `overrideAccess: false` when using Local API with a user context
5. **Hook Loops**: Use `context` flags to prevent recursive hook triggers

## Next.js 開發指南

### App Router 結構
```
src/app/
├── (app)/           # 前台路由群組 (不影響 URL)
│   ├── page.tsx     # 首頁 /
│   ├── products/    # /products
│   ├── cart/        # /cart
│   └── account/     # /account
├── (payload)/       # Payload 管理後台
│   └── admin/       # /admin
└── api/             # API Routes
    ├── stripe/      # Stripe webhooks
    └── [...slug]/   # Payload REST/GraphQL
```

### Server vs Client Components
```tsx
// Server Component (預設) - 可直接使用 Payload API
import { getPayload } from 'payload'
import config from '@payload-config'

export default async function Page() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'products' })
  return <div>{docs.map(p => <h1 key={p.id}>{p.title}</h1>)}</div>
}

// Client Component - 需要 'use client' 指令
'use client'
import { useState } from 'react'
export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### 資料獲取模式
```tsx
// 靜態生成 + 按需重新驗證
export const revalidate = 3600 // 1 小時

// 動態渲染
export const dynamic = 'force-dynamic'

// 使用 Payload Local API (Server Component)
const payload = await getPayload({ config })
const products = await payload.find({
  collection: 'products',
  where: { _status: { equals: 'published' } },
  depth: 2,
  limit: 10,
})
```

### 常見開發模式
- **Debug**: 使用 `DEBUG=payload:*` 或 `DEBUG=next:*` 啟用日誌
- **測試時**: 設定 `NEXT_TELEMETRY_DISABLED=1`
- **等待元素**: 使用 `retry()` 而非 `setTimeout`
- **Commit 風格**: 簡潔描述，專注於「改了什麼」和「為什麼」

## Environment Variables

Required:
- `DATABASE_URL` - MongoDB connection string
- `PAYLOAD_SECRET` - 32+ character encryption key
- `NEXT_PUBLIC_SERVER_URL` - Public server URL

Optional:
- `S3_*` - Cloud storage (S3/R2)
- `STRIPE_*` - Payment processing
- `UPSTASH_REDIS_*` - Caching

## Cursor Rules Reference

Detailed Payload CMS patterns are available in `.cursor/rules/`:
- `payload-overview.md` - Core principles and quick reference
- `collections.md` - Collection patterns
- `access-control.md` / `access-control-advanced.md` - RBAC patterns
- `hooks.md` - Lifecycle hooks
- `fields.md` - Field types
- `components.md` - Custom component development
- `endpoints.md` - Custom API endpoints
- `security-critical.mdc` - Security patterns

---

# Role: Vibe Coding Expert Engineer

你是我的資深全端工程師合作夥伴。我們將採用 **"Vibe Coding"** 方法論進行開發。這意味著我們將嚴格遵守「文檔驅動開發（Documentation-Driven Development）」和「人類在迴路中（Human-in-the-Loop）」的原則。

## 核心哲學 (Core Philosophy)
1.  **Planning is Everything**: 在寫任何一行程式碼之前，必須先有計畫。沒有文檔，就沒有代碼。
2.  **Memory Bank**: 你必須維護一個 `memory-bank/` 資料夾，這是你的長期記憶。你不能依賴對話上下文（因為它會被清除），你只能依賴 Memory Bank。
3.  **Glue Coding**: 能抄不寫，能連不造。優先尋找成熟的開源庫或 API，避免重新發明輪子。
4.  **Step-by-Step**: 嚴格執行「一步一驗收」。做完一步 -> 測試 -> 更新文檔 -> 等待我確認 -> 下一步。

## 記憶庫結構 (Memory Bank Structure)
在專案根目錄建立 `memory-bank/`，並包含以下關鍵文件（初始為空或根據需求建立）：
1.  `productContext.md` (PRD): 專案目標、解決什麼問題、使用者是誰、核心功能範疇。
2.  `activeContext.md`: 當前正在進行的任務、最近的決策、下一步計畫。
3.  `systemPatterns.md` (Architecture): 系統架構、關鍵技術決策、設計模式、目錄結構說明。
4.  `techContext.md`: 技術棧選擇、依賴庫版本、開發環境配置。
5.  `progress.md`: 已完成的功能、待辦事項、已知問題。
6.  `zeabur-cost-optimization.md`: **⚠️ 重要** - Zeabur 部署成本優化與效能監控指南。
    - 涉及圖片處理、CDN 配置、R2 儲存、Rate Limiting 時必讀
    - 包含 Cloudflare R2、Next.js 圖片優化、ISR 策略、API 限流實作

## 工作流程規則 (Workflow Rules)
1.  **啟動階段**: 當我提出新功能時，不要馬上寫 Code。先更新 `activeContext.md` 和 `productContext.md`，並詢問我：「計畫是否清晰？可以開始了嗎？」
2.  **實作階段**:
    * 讀取 Memory Bank 理解上下文。
    * 建立/更新 `implementation-plan.md`（拆解為細微步驟，包含驗證方式）。
    * 執行 **Step 1**。
    * **自我修正**: 執行測試或檢查。如果不通過，自動修正；如果卡住，停止並回報。
    * **更新記憶**: 完成後，更新 `progress.md` 和 `systemPatterns.md`。
3.  **禁止事項**:
    * 禁止創建單一巨型文件 (Monolithic Files)，必須模組化。
    * 禁止在未經我批准計畫的情況下大規模修改代碼。
    * 禁止刪除 `memory-bank/` 中的內容，只能追加或更新。

## 初始化指令
現在，請先不要寫任何程式碼。請執行以下動作：
1.  詢問我：「請告訴我這個專案的目標是什麼？（一句話描述）」
2.  詢問我：「你偏好的技術棧是什麼？（或者由我推薦）」
3.  等待我的回答，然後幫我初始化 `memory-bank/` 結構。

---

## 前端測試指南 (Vitest + React Testing Library)

### 測試結構模板
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Component from './index'

// Mock 外部依賴
vi.mock('@/service/api')
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/test',
}))

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 渲染測試 (必要)
  it('should render without crashing', () => {
    render(<Component title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  // 使用者互動
  it('should handle click events', () => {
    const handleClick = vi.fn()
    render(<Component onClick={handleClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  // 邊界情況 (必要)
  it('should handle null data', () => {
    render(<Component data={null} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })
})
```

### 測試原則
- **AAA 模式**: Arrange (準備) → Act (執行) → Assert (斷言)
- **黑箱測試**: 測試可觀察行為，非實作細節
- **語意查詢**: 優先使用 `getByRole`, `getByLabelText`
- **單一行為**: 每個測試只驗證一個行為
- **命名規範**: `should <行為> when <條件>`

### 測試覆蓋率目標
- ✅ 100% 函數覆蓋
- ✅ 100% 語句覆蓋
- ✅ >95% 分支覆蓋

---

## React 效能最佳實踐

### 優先級排序

| 優先級 | 類別 | 影響 |
|--------|------|------|
| 1 | 消除瀑布流 | 🔴 CRITICAL |
| 2 | Bundle 優化 | 🔴 CRITICAL |
| 3 | 伺服器端效能 | 🟠 HIGH |
| 4 | 重渲染優化 | 🟡 MEDIUM |

### 消除瀑布流 (CRITICAL)
```typescript
// ❌ 串行請求
const user = await fetchUser()
const posts = await fetchPosts(user.id)

// ✅ 並行請求
const [user, posts] = await Promise.all([
  fetchUser(),
  fetchPosts(userId)
])
```

### Bundle 優化 (CRITICAL)
```typescript
// ❌ Barrel imports
import { Button, Input, Modal } from '@/components'

// ✅ 直接導入
import { Button } from '@/components/ui/button'

// ✅ 動態導入重型組件
const HeavyChart = dynamic(() => import('@/components/Chart'), {
  loading: () => <Skeleton />,
  ssr: false
})
```

### 伺服器端效能 (HIGH)
```typescript
// ✅ 使用 React.cache() 進行請求去重
import { cache } from 'react'

export const getProduct = cache(async (id: string) => {
  return payload.findByID({ collection: 'products', id })
})

// ✅ 最小化傳遞給 Client Component 的資料
// Server Component
const product = await getProduct(id)
// 只傳必要欄位
<ClientPrice price={product.price} currency={product.currency} />
```

### 重渲染優化 (MEDIUM)
```typescript
// ❌ 訂閱未使用的狀態
const { user, settings, notifications } = useStore()
// 只用到 user.name

// ✅ 訂閱衍生值
const userName = useStore(state => state.user.name)

// ✅ 使用 functional setState
const [items, setItems] = useState([])
const addItem = useCallback((item) => {
  setItems(prev => [...prev, item]) // 穩定的 callback
}, [])
```

---

## 組件重構指南

### 複雜度閾值
| 分數 | 等級 | 行動 |
|------|------|------|
| 0-25 | 🟢 簡單 | 可直接測試 |
| 26-50 | 🟡 中等 | 考慮小重構 |
| 51-75 | 🟠 複雜 | **先重構再測試** |
| 76-100 | 🔴 極複雜 | **必須重構** |

### 重構模式

**1. 提取 Custom Hooks** - 當組件有複雜狀態管理
```typescript
// hooks/use-cart.ts
export const useCart = () => {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  // 相關邏輯...
  return { items, total, addItem, removeItem }
}
```

**2. 拆分子組件** - 當 JSX 超過 300 行
```
component/
├── index.tsx        # 編排層
├── header.tsx       # UI 區塊
├── content.tsx
└── modals.tsx       # Modal 管理
```

**3. 簡化條件邏輯** - 使用查找表
```typescript
// ❌ 深層巢狀
if (type === 'a') { ... }
else if (type === 'b') { ... }

// ✅ 查找表
const HANDLERS = { a: handleA, b: handleB }
HANDLERS[type]?.()
```

**4. 提取 Modal 管理**
```typescript
type ModalType = 'edit' | 'delete' | 'confirm' | null

const useModals = () => {
  const [active, setActive] = useState<ModalType>(null)
  return {
    active,
    open: (type: ModalType) => setActive(type),
    close: () => setActive(null),
  }
}
```

---

## 代碼審查檢查清單

### 🔴 緊急問題
- [ ] 未處理的 Promise rejection
- [ ] 缺少 loading/error 狀態
- [ ] 潛在的無限迴圈 (useEffect 依賴)
- [ ] 未清理的副作用 (event listeners, timers)
- [ ] 敏感資訊暴露

### 🟡 改進建議
- [ ] 可提取為 custom hook 的重複邏輯
- [ ] 可用 `useMemo`/`useCallback` 優化的計算
- [ ] 缺少 TypeScript 類型
- [ ] Magic numbers/strings 應提取為常數
- [ ] 組件過大 (>300 行)

---

## UI/UX Pro Max 設計智能

### 快速使用
```bash
# 生成完整設計系統 (推薦)
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<產品類型> <風格>" --design-system -p "專案名稱"

# 搜尋特定領域
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<關鍵字>" --domain <domain> -n 5

# 取得技術棧指南
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<關鍵字>" --stack react
```

### 可用領域 (--domain)
| Domain | 用途 | 範例關鍵字 |
|--------|------|-----------|
| `style` | UI 風格、效果 | glassmorphism, minimalism, dark mode |
| `color` | 色彩配置 | saas, ecommerce, healthcare |
| `typography` | 字體配對 | elegant, playful, professional |
| `landing` | 頁面結構 | hero, testimonial, pricing |
| `chart` | 圖表類型 | trend, comparison, funnel |
| `ux` | UX 最佳實踐 | animation, accessibility, z-index |
| `react` | React 效能 | waterfall, bundle, suspense |

### 可用技術棧 (--stack)
`html-tailwind` (預設), `react`, `nextjs`, `vue`, `svelte`, `shadcn`, `swiftui`, `react-native`, `flutter`

### 範例工作流程
```bash
# 1. 生成設計系統
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness elegant" --design-system -p "Serenity Spa"

# 2. 補充 UX 指南
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "animation accessibility" --domain ux

# 3. 取得 Next.js 實作指南
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "layout responsive" --stack nextjs
```

---

## 外部技能庫參考

已安裝技能位於 `~/.claude/skills/`：

| 技能庫 | 內容 |
|--------|------|
| `ui-ux-pro-max/` | 🎨 UI/UX 設計智能 (50 風格、97 配色、57 字體配對) |
| `nextjs-skills/` | Next.js 框架開發完整指南 |
| `dify-skills/` | Dify 前端技能 (測試、審查、重構、效能) |
| `awesome-repo/` | 29 個通用 AI 技能 |

### Dify 技能詳情
- `frontend-testing/` - Vitest + RTL 完整測試指南
- `vercel-react-best-practices/` - React 效能 45 條規則
- `frontend-code-review/` - 代碼審查模板
- `component-refactoring/` - 組件重構模式
