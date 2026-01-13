import {
    batchSyncProducts,
    syncProduct,
    updateProductDiscount,
    type ProductSource,
    type ProductSyncData
} from '@/lib/import/product-importer'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Product Sync Webhook API
 * Phase 7.2.1 - 商品同步 Webhook
 * 
 * POST /api/webhooks/product-sync
 * 
 * 供外部爬蟲系統（Python）呼叫，同步商品至 Payload CMS
 * 
 * Headers:
 *   - x-api-key: 驗證金鑰（需在環境變數 PRODUCT_SYNC_API_KEY 設定）
 * 
 * Body:
 *   - action: 'sync' | 'batch-sync' | 'update-discount'
 *   - product: ProductSyncData (for single sync)
 *   - products: ProductSyncData[] (for batch sync)
 *   - discount: { externalId, externalSource, salePrice } (for update-discount)
 */

// 簡易 API 驗證
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env.PRODUCT_SYNC_API_KEY
  
  // 如果沒設定 API Key，允許所有請求（開發模式）
  if (!expectedKey) {
    console.warn('⚠️ PRODUCT_SYNC_API_KEY not set, allowing all requests')
    return true
  }
  
  return apiKey === expectedKey
}

export async function POST(request: NextRequest) {
  try {
    // 驗證 API Key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { action } = body
    
    switch (action) {
      case 'sync': {
        // 單一商品同步
        const product = body.product as ProductSyncData
        if (!product) {
          return NextResponse.json(
            { success: false, error: 'Missing product data' },
            { status: 400 }
          )
        }
        
        const result = await syncProduct(product)
        return NextResponse.json({
          success: result.success,
          action: result.action,
          productId: result.productId,
          message: result.message || result.error,
        })
      }
      
      case 'batch-sync': {
        // 批量商品同步
        const products = body.products as ProductSyncData[]
        if (!products || !Array.isArray(products)) {
          return NextResponse.json(
            { success: false, error: 'Missing products array' },
            { status: 400 }
          )
        }
        
        const result = await batchSyncProducts(products)
        return NextResponse.json({
          success: result.success,
          total: result.total,
          created: result.created,
          updated: result.updated,
          failed: result.failed,
          // 只返回前 20 筆結果摘要
          results: result.results.slice(0, 20).map(r => ({
            action: r.action,
            productId: r.productId,
            message: r.message || r.error,
          })),
        })
      }
      
      case 'update-discount': {
        // 更新折扣
        const { externalId, externalSource, salePrice } = body.discount || {}
        
        if (!externalId || !externalSource || salePrice === undefined) {
          return NextResponse.json(
            { success: false, error: 'Missing discount data (externalId, externalSource, salePrice)' },
            { status: 400 }
          )
        }
        
        const result = await updateProductDiscount(
          externalId,
          externalSource as ProductSource,
          salePrice
        )
        
        return NextResponse.json({
          success: result.success,
          productId: result.productId,
          message: result.message || result.error,
        })
      }
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Product sync webhook error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET 端點用於健康檢查
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Product Sync Webhook',
    version: '1.0.0',
    endpoints: {
      sync: 'POST with action: "sync" and product data',
      batchSync: 'POST with action: "batch-sync" and products array',
      updateDiscount: 'POST with action: "update-discount" and discount data',
    },
  })
}
