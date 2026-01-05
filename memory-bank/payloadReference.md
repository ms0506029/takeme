# Payload Reference Resources
**Last Updated：** 2026-01-02
**資料來源：** `payload-main/` (Payload CMS 官方原始碼庫)

---

## 1. 資料夾結構概覽

```
payload-main/
├── templates/          # 生產級專案模板
│   ├── ecommerce/      # ⭐ 電商模板 (核心參考)
│   ├── website/        # 官網模板
│   └── with-postgres/  # Postgres 模板
├── examples/           # 功能範例
│   ├── multi-tenant/   # ⭐ 多商家範例 (核心參考)
│   ├── auth/           # 權限系統範例
│   └── localization/   # 多語系範例
├── packages/           # 核心套件原始碼
│   ├── payload/        # Payload 核心
│   ├── ui/             # Admin UI (RSC)
│   ├── db-mongodb/     # MongoDB Adapter
│   ├── storage-s3/     # S3 Storage Adapter
│   └── plugin-multi-tenant/  # 多商家外掛
└── docs/               # 官方文檔
```

---

## 2. 核心參考資源

### 2.1 templates/ecommerce (電商模板)
**路徑：** `/payload-main/templates/ecommerce/`
**用途：** 生產級電商網站模板

#### 核心功能
| 功能 | 說明 |
|------|------|
| Products & Variants | 商品 SPU/SKU 管理 |
| Carts | 購物車 (含訪客購物車) |
| Orders & Transactions | 訂單與交易記錄 |
| Stripe 整合 | 金流處理 |
| Users (admin/customer) | 雙角色用戶系統 |
| Layout Builder | 頁面區塊拖拉 |
| ISR / SSR | 靜態增量生成 |
| shadcn/ui + Tailwind | UI 系統 |

#### 目錄結構
```
src/
├── access/             # 10 種權限控制函數
│   ├── isAdmin.ts
│   ├── adminOrSelf.ts
│   ├── isDocumentOwner.ts
│   └── ...
├── collections/        # 資料 Collections
│   ├── Users/
│   ├── Products/
│   ├── Categories.ts
│   └── Media.ts
├── components/         # React 元件
├── endpoints/          # 自訂 API 端點
├── globals/            # Header, Footer
└── plugins/            # 外掛配置
```

#### 關鍵程式碼參考
- **payload.config.ts** - Payload 主配置
- **access/isAdmin.ts** - 角色驗證邏輯
- **collections/Users/index.ts** - 用戶 Collection 定義

---

### 2.2 examples/multi-tenant (多商家範例)
**路徑：** `/payload-main/examples/multi-tenant/`
**用途：** 多租戶（商家）隔離範例

#### 核心概念
| 概念 | 說明 |
|------|------|
| Tenants Collection | 用於定義商家/租戶 |
| super-admin 角色 | 可管理所有商家 |
| tenant-admin 角色 | 只能管理自己的商家 |
| 資料隔離 | 透過 `tenant` 欄位過濾 |

#### 使用的外掛
```typescript
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'

plugins: [
  multiTenantPlugin<Config>({
    collections: { pages: {} },
    tenantField: { ... },
    userHasAccessToAllTenants: (user) => isSuperAdmin(user),
  }),
]
```

#### 關鍵函數
```typescript
// 判斷是否為超級管理員
export const isSuperAdmin = (user: User | null): boolean => {
  return Boolean(user?.roles?.includes('super-admin'))
}

// 取得用戶所屬的商家 ID 列表
export const getUserTenantIDs = (user: User | null): Tenant['id'][] => {
  return user?.tenants?.reduce<Tenant['id'][]>((acc, { tenant }) => {
    if (tenant) acc.push(extractID(tenant))
    return acc
  }, []) || []
}
```

---

## 3. 我們專案的整合策略

### 3.1 從 ecommerce 模板提取
- [ ] `collections/Products/` - 商品 Collection 結構
- [ ] `access/` - 全部 10 個權限控制函數
- [ ] `components/` - UI 元件參考
- [ ] `tailwind.config.mjs` - Tailwind 配置
- [ ] Stripe 整合邏輯

### 3.2 從 multi-tenant 範例提取
- [ ] `@payloadcms/plugin-multi-tenant` 整合方式
- [ ] `collections/Tenants/` - 商家 Collection
- [ ] `utilities/getUserTenantIDs.ts` - 商家 ID 取得邏輯
- [ ] 租戶隔離的 Access Control 模式

### 3.3 需要自行開發的功能
- [ ] 促銷引擎 (疊加計算)
- [ ] 庫存鎖定 (Redis 整合)
- [ ] LINE Messaging API 整合
- [ ] 爬蟲資料 Webhook 接收

---

## 4. 快速啟動命令

### 從 ecommerce 模板建立專案
```bash
pnpx create-payload-app my-ecommerce -t ecommerce
cd my-ecommerce
cp .env.example .env
pnpm install && pnpm dev
```

### 從 multi-tenant 範例建立專案
```bash
npx create-payload-app my-multi-tenant --example multi-tenant
cd my-multi-tenant
cp .env.example .env
pnpm dev
# 預設帳號：demo@payloadcms.com / demo
```

---

## 5. 官方資源
- CLAUDE.md: `/payload-main/CLAUDE.md` (AI 開發指南)
- LLMS.txt: https://payloadcms.com/llms.txt
- 官方文檔: https://payloadcms.com/docs
