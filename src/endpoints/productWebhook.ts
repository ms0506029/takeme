/**
 * 爬蟲 Webhook Endpoint
 * 
 * 接收爬蟲推送的商品資料，自動建立或更新商品
 * 
 * POST /api/webhook/products
 */
import type { PayloadHandler } from 'payload'

// Webhook 請求 Body 類型
interface ProductWebhookPayload {
  source: 'beams' | 'zozo' | 'freaks'
  externalId: string
  externalUrl?: string
  title: string
  description?: string
  priceInUSD?: number
  images?: string[]
  variants?: {
    sku: string
    title: string
    priceInUSD: number
    inventory?: number
    options?: Record<string, string>
  }[]
  categories?: string[]
  vendorSlug: string
}

export const productWebhookHandler: PayloadHandler = async (req) => {
  const { payload } = req

  try {
    // 驗證 Content-Type
    const contentType = req.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return Response.json(
        { error: '不支援的 Content-Type' },
        { status: 400 }
      )
    }

    // 解析請求 Body
    const body = await req.json?.() as ProductWebhookPayload

    if (!body?.externalId || !body?.title || !body?.vendorSlug || !body?.source) {
      return Response.json(
        { error: '缺少必要欄位：externalId, title, vendorSlug, source' },
        { status: 400 }
      )
    }

    // 查找商家
    const vendorResult = await payload.find({
      collection: 'vendors',
      where: {
        slug: {
          equals: body.vendorSlug,
        },
      },
      limit: 1,
    })

    if (vendorResult.docs.length === 0) {
      return Response.json(
        { error: `找不到商家：${body.vendorSlug}` },
        { status: 404 }
      )
    }

    const vendorId = vendorResult.docs[0].id

    // 檢查商品是否已存在（根據 externalId 和 source）
    const existingProduct = await payload.find({
      collection: 'products',
      where: {
        and: [
          { externalId: { equals: body.externalId } },
          { externalSource: { equals: body.source } },
        ],
      },
      limit: 1,
    })

    const now = new Date().toISOString()

    if (existingProduct.docs.length > 0) {
      // 更新現有商品
      const productId = existingProduct.docs[0].id
      
      await payload.update({
        collection: 'products',
        id: productId,
        data: {
          title: body.title,
          externalUrl: body.externalUrl,
          lastSyncedAt: now,
          syncStatus: 'synced',
          // 其他欄位可根據需要更新
        },
      })

      return Response.json({
        success: true,
        action: 'updated',
        productId,
      })
    } else {
      // 建立新商品
      const newProduct = await payload.create({
        collection: 'products',
        data: {
          title: body.title,
          vendor: vendorId,
          externalSource: body.source,
          externalId: body.externalId,
          externalUrl: body.externalUrl,
          lastSyncedAt: now,
          syncStatus: 'synced',
          _status: 'draft', // 預設為草稿狀態
        },
      })

      return Response.json({
        success: true,
        action: 'created',
        productId: newProduct.id,
      })
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Webhook Error:', error)
    
    return Response.json(
      { error: '處理請求時發生錯誤' },
      { status: 500 }
    )
  }
}
