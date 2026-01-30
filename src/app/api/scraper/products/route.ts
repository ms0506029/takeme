import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * Scraper Products API
 * Extension 上傳爬取商品數據端點
 *
 * POST /api/scraper/products - 批次上傳商品數據
 */

// 驗證 Extension Token
async function verifyExtensionToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.slice(7)
  const payload = await getPayload({ config: configPromise })

  try {
    const settings = await payload.findGlobal({
      slug: 'scraper-settings',
    })

    const extensionSettings = (settings as any)?.extension
    if (!extensionSettings?.enabled) return false

    return extensionSettings.apiKey === token
  } catch {
    return false
  }
}

// POST: 批次上傳商品數據
export async function POST(request: NextRequest) {
  console.log('[Scraper Products API] POST request received')

  try {
    const isValid = await verifyExtensionToken(request)
    if (!isValid) {
      console.log('[Scraper Products API] Unauthorized request')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { jobId, products } = body

    console.log('[Scraper Products API] Received:', { jobId, productCount: products?.length })

    if (!jobId || !products || !Array.isArray(products)) {
      console.log('[Scraper Products API] Missing required fields')
      return NextResponse.json(
        { success: false, error: 'Missing required fields: jobId, products' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config: configPromise })

    // 驗證任務存在
    console.log('[Scraper Products API] Finding job:', jobId)
    const job = await payload.findByID({
      collection: 'scraping-jobs',
      id: jobId,
      depth: 1,
    })

    if (!job) {
      console.log('[Scraper Products API] Job not found:', jobId)
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    }

    const platformId = typeof (job as any).platform === 'object'
      ? (job as any).platform.id
      : (job as any).platform

    console.log('[Scraper Products API] Platform ID:', platformId)

    // 批次建立 ScrapedProducts
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    }

    console.log('[Scraper Products API] Processing', products.length, 'products...')

    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      try {
        // 驗證必要欄位
        if (!product.externalUrl) {
          console.warn(`[Scraper Products API] Skipping product ${i}: no externalUrl`)
          results.failed++
          results.errors.push(`Product ${i}: Missing externalUrl`)
          continue
        }

        // 檢查是否已存在（根據 externalUrl 或 externalId）
        const existing = await payload.find({
          collection: 'scraped-products',
          where: {
            or: [
              { externalUrl: { equals: product.externalUrl } },
              ...(product.externalId ? [{ externalId: { equals: product.externalId } }] : []),
            ],
          },
          limit: 1,
        })

        const formattedData = formatProductData(product, jobId, platformId)

        if (existing.docs.length > 0) {
          // 更新現有記錄
          await payload.update({
            collection: 'scraped-products',
            id: existing.docs[0].id,
            data: formattedData,
          })
          results.updated++
        } else {
          // 建立新記錄
          await payload.create({
            collection: 'scraped-products',
            data: formattedData,
          })
          results.created++
        }

        // 每 10 個商品記錄一次進度
        if ((i + 1) % 10 === 0) {
          console.log(`[Scraper Products API] Progress: ${i + 1}/${products.length}`)
        }
      } catch (err: any) {
        results.failed++
        // 嘗試取得更詳細的錯誤訊息
        let errorDetail = err.message || 'Unknown error'
        if (err.data?.errors) {
          // Payload validation errors
          errorDetail = err.data.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ')
        }
        const errorMsg = `${product.externalUrl || 'Unknown'}: ${errorDetail}`
        results.errors.push(errorMsg)
        console.error('[Scraper Products API] Product error:', errorMsg)

        // 如果是前 3 個失敗的，記錄完整錯誤
        if (results.failed <= 3) {
          console.error(`[Scraper Products API] Error #${results.failed} details:`, {
            message: err.message,
            name: err.name,
            data: err.data,
          })
          console.error('[Scraper Products API] Product data:', JSON.stringify(product).substring(0, 800))
        }
      }
    }

    console.log('[Scraper Products API] Results:', results)

    // 更新任務進度
    const currentProgress = (job as any).progress?.current || 0
    await payload.update({
      collection: 'scraping-jobs',
      id: jobId,
      data: {
        progress: {
          current: currentProgress + results.created + results.updated,
          total: (job as any).progress?.total || 0,
          percentage: 0, // 會在前端計算
        },
        logs: [
          ...((job as any).logs || []),
          {
            timestamp: new Date().toISOString(),
            level: results.failed > 0 ? 'warning' : 'info',
            message: `上傳完成: ${results.created} 新增, ${results.updated} 更新, ${results.failed} 失敗`,
          },
        ],
      },
    })

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error: any) {
    console.error('[Scraper Products API] CRITICAL ERROR:', error)
    console.error('[Scraper Products API] Error stack:', error?.stack)
    return NextResponse.json({
      success: false,
      error: 'Failed to upload products',
      details: error?.message || 'Unknown error',
    }, { status: 500 })
  }
}

/**
 * 格式化商品數據
 * 匹配 ScrapedProducts collection 的欄位結構
 */
function formatProductData(product: any, jobId: string, platformId: string) {
  // 清理標題 - 移除多餘的空白和換行
  const cleanTitle = (title: string) => {
    if (!title) return ''
    return title
      .replace(/[\t\n\r]+/g, ' ')  // 換行/tab 轉空格
      .replace(/\s+/g, ' ')         // 多個空格合併
      .trim()
  }

  // 從 URL 提取商品 ID（如果沒有 externalId）
  const extractIdFromUrl = (url: string): string => {
    if (!url) return `scraped-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    try {
      // 嘗試從 URL 中提取商品 ID
      // 例如: https://www.daytona-park.com/item/3130291600006 -> 3130291600006
      const match = url.match(/\/item\/(\d+)/) || url.match(/\/product\/([^\/\?]+)/) || url.match(/[?&]id=([^&]+)/)
      if (match) return match[1]
      // 如果沒有匹配，使用 URL 的 hash
      const urlHash = url.split('/').pop()?.split('?')[0] || ''
      return urlHash || `url-${Buffer.from(url).toString('base64').substr(0, 20)}`
    } catch {
      return `scraped-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
  }

  // 處理圖片 URL - 支援字串陣列或物件陣列（含顏色名稱和 Base64）
  const imageUrls = (product.images || []).map(
    (img: string | { url?: string; src?: string; colorName?: string; base64?: string }) => {
      if (typeof img === 'string') {
        return { url: img, colorName: '', base64: '' }
      }
      return {
        url: img.url || img.src || '',
        colorName: img.colorName || '', // 從爬蟲提取的顏色名稱
        base64: img.base64 || '', // Base64 編碼的圖片資料（由 Chrome Extension 下載）
      }
    },
  ).filter((img: { url: string }) => img.url || img.base64)

  // 處理變體 - 儲存為 JSON 格式
  const externalId = product.externalId || extractIdFromUrl(product.externalUrl)
  const variants = (product.variants || []).map((v: any) => ({
    color: v.color || v.colorName || '',
    size: v.size || v.sizeName || '',
    sku: v.sku || `${externalId}-${v.color || ''}-${v.size || ''}`.replace(/\s/g, ''),
    price: v.price || null,
    stock: typeof v.stock === 'number' ? v.stock : (v.inStock ? 10 : 0),
    inStock: v.inStock ?? true,
  }))

  const externalUrl = product.externalUrl || ''

  return {
    // 關聯資訊
    job: jobId,
    platform: platformId,
    // 外部識別 - 這兩個欄位是 required！
    externalId: externalId,
    externalUrl: externalUrl,
    // 基本資訊
    originalTitle: cleanTitle(product.originalTitle),
    translatedTitle: cleanTitle(product.translatedTitle),
    brand: cleanTitle(product.brand),
    category: product.category || '',
    description: product.originalDescription || product.description || '',
    translatedDescription: product.translatedDescription || '',
    // 價格資訊 - 直接欄位，不是巢狀
    originalPrice: product.originalPrice || 0,
    salePrice: product.salePrice || null,
    calculatedPrice: null, // 由定價規則計算
    // 圖片 - 使用 imageUrls 欄位名稱
    thumbnailUrl: product.thumbnail || (imageUrls[0]?.url) || '',
    imageUrls,
    // 變體 - JSON 格式
    variants,
    // 尺寸表 - JSON 格式
    sizeChart: product.sizeChart || null,
    // 其他
    materials: typeof product.specifications === 'object'
      ? JSON.stringify(product.specifications)
      : (product.specifications || ''),
    // 狀態
    importStatus: 'pending',
    scrapedAt: new Date().toISOString(),
  }
}
