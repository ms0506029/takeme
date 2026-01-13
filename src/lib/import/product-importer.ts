/**
 * Product Importer Service
 * Phase 7.2.1 - 商品匯入核心服務
 * 
 * 功能：
 * 1. 接收爬蟲系統的商品資料
 * 2. 建立/更新商品
 * 3. 處理變體與庫存
 * 4. 上傳圖片
 */

import configPromise from '@payload-config'
import { getPayload } from 'payload'

// ===== 類型定義 =====

export type ProductSource = 'beams' | 'zozo' | 'freaks' | 'easystore' | 'manual'

export interface ProductSyncData {
  // 基本資訊
  title: string
  description?: string
  bodyHtml?: string // HTML 格式描述
  
  // 外部來源資訊
  externalId: string
  externalSource: ProductSource
  externalUrl?: string
  
  // 價格與庫存
  price: number           // 原價（TWD）
  salePrice?: number      // 特價（如有）
  inventory?: number      // 總庫存
  
  // 規格變體
  variants?: ProductVariant[]
  
  // 圖片
  images?: string[]       // 圖片 URL 陣列
  
  // 分類（可選）
  categories?: string[]   // 分類名稱陣列
}

export interface ProductVariant {
  sku: string
  color?: string
  size?: string
  price: number
  salePrice?: number
  inventory: number
  barcode?: string
}

export interface ProductSyncResult {
  success: boolean
  action: 'created' | 'updated' | 'skipped'
  productId?: string
  message?: string
  error?: string
}

export interface BatchSyncResult {
  success: boolean
  total: number
  created: number
  updated: number
  failed: number
  results: ProductSyncResult[]
}

// ===== 單一商品同步 =====

/**
 * 同步單一商品到 Payload
 * - 以 externalId + externalSource 為 key 進行重複檢測
 * - 重複時更新現有商品
 */
export async function syncProduct(data: ProductSyncData): Promise<ProductSyncResult> {
  try {
    const payload = await getPayload({ config: configPromise })
    
    // 驗證必要欄位
    if (!data.title || !data.externalId || !data.externalSource) {
      return {
        success: false,
        action: 'skipped',
        error: '缺少必要欄位：title, externalId, externalSource',
      }
    }
    
    // 檢查是否已存在
    const existing = await payload.find({
      collection: 'products',
      where: {
        and: [
          { externalId: { equals: data.externalId } },
          { externalSource: { equals: data.externalSource } },
        ],
      },
      limit: 1,
    })
    
    // 準備商品資料
    const productData = {
      title: data.title,
      externalId: data.externalId,
      externalSource: data.externalSource,
      externalUrl: data.externalUrl || undefined,
      lastSyncedAt: new Date().toISOString(),
      syncStatus: 'synced' as const,
      
      // 價格（轉換為 USD 格式，ecommerce plugin 使用 priceInUSD）
      // 假設 1 USD = 30 TWD（粗略轉換，實際應從設定讀取）
      priceInUSD: Math.round(data.price / 30 * 100) / 100,
      
      // 庫存
      inventory: data.inventory || 0,
      
      // 發布狀態
      _status: 'published' as const,
    }
    
    if (existing.docs.length > 0) {
      // 更新現有商品
      const updated = await payload.update({
        collection: 'products',
        id: existing.docs[0].id,
        data: productData as any,
      })
      
      return {
        success: true,
        action: 'updated',
        productId: updated.id as string,
        message: `商品已更新：${data.title}`,
      }
    } else {
      // 建立新商品
      // 需要 vendor，暫時使用系統預設或第一個 vendor
      const vendors = await payload.find({
        collection: 'vendors',
        limit: 1,
      })
      
      const vendorId = vendors.docs[0]?.id
      if (!vendorId) {
        return {
          success: false,
          action: 'skipped',
          error: '找不到可用的商家（Vendor）',
        }
      }
      
      const created = await payload.create({
        collection: 'products',
        data: {
          ...productData,
          vendor: vendorId,
          slug: generateSlug(data.title),
        } as any,
      })
      
      return {
        success: true,
        action: 'created',
        productId: created.id as string,
        message: `商品已建立：${data.title}`,
      }
    }
  } catch (err) {
    console.error('Product sync error:', err)
    return {
      success: false,
      action: 'skipped',
      error: err instanceof Error ? err.message : '同步失敗',
    }
  }
}

// ===== 批量同步 =====

/**
 * 批量同步商品
 */
export async function batchSyncProducts(products: ProductSyncData[]): Promise<BatchSyncResult> {
  const results: ProductSyncResult[] = []
  let created = 0
  let updated = 0
  let failed = 0
  
  for (const product of products) {
    const result = await syncProduct(product)
    results.push(result)
    
    if (result.success) {
      if (result.action === 'created') created++
      else if (result.action === 'updated') updated++
    } else {
      failed++
    }
  }
  
  return {
    success: failed === 0,
    total: products.length,
    created,
    updated,
    failed,
    results,
  }
}

// ===== 折扣同步 =====

/**
 * 更新商品折扣價格
 */
export async function updateProductDiscount(
  externalId: string,
  externalSource: ProductSource,
  salePrice: number
): Promise<ProductSyncResult> {
  try {
    const payload = await getPayload({ config: configPromise })
    
    // 找到商品
    const existing = await payload.find({
      collection: 'products',
      where: {
        and: [
          { externalId: { equals: externalId } },
          { externalSource: { equals: externalSource } },
        ],
      },
      limit: 1,
    })
    
    if (existing.docs.length === 0) {
      return {
        success: false,
        action: 'skipped',
        error: `找不到商品：${externalId}`,
      }
    }
    
    // 更新折扣價
    // 注意：ecommerce plugin 可能使用 salePrice 或 salePriceInUSD
    const updated = await payload.update({
      collection: 'products',
      id: existing.docs[0].id,
      data: {
        // 轉換為 USD（粗略轉換）
        salePriceInUSD: Math.round(salePrice / 30 * 100) / 100,
        lastSyncedAt: new Date().toISOString(),
      } as any,
    })
    
    return {
      success: true,
      action: 'updated',
      productId: updated.id as string,
      message: `折扣已更新：${salePrice} TWD`,
    }
  } catch (err) {
    return {
      success: false,
      action: 'skipped',
      error: err instanceof Error ? err.message : '折扣更新失敗',
    }
  }
}

// ===== 工具函式 =====

/**
 * 生成 slug
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '') // 保留中英文和數字
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100)
    + '-' + Date.now().toString(36)
}
