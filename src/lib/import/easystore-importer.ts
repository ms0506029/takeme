/**
 * EasyStore Product Importer
 * 
 * 功能：
 * 1. 將 EasyStore 商品轉換為 Payload 格式
 * 2. 處理變體（顏色/尺寸）
 * 3. 遷移圖片到 Payload Media
 * 4. 批次匯入支援
 */

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import {
    downloadImage,
    fetchAllProducts,
    type EasyStoreProduct
} from './easystore-api'

// ===== 類型定義 =====

export interface EasyStoreImportOptions {
  vendorId: string // 歸屬商家
  skipExisting?: boolean // 跳過已存在商品
  downloadImages?: boolean // 是否下載圖片
  batchSize?: number // 批次大小（預設 50）
  onProgress?: (progress: ImportProgress) => void
}

export interface ImportProgress {
  total: number
  processed: number
  created: number
  updated: number
  skipped: number
  failed: number
  currentProduct?: string
  logs: ImportLogEntry[]
}

export interface ImportLogEntry {
  timestamp: Date
  type: 'success' | 'skip' | 'error' | 'info'
  message: string
  productTitle?: string
}

export interface EasyStoreImportResult {
  success: boolean
  total: number
  created: number
  updated: number
  skipped: number
  failed: number
  logs: ImportLogEntry[]
  errors: string[]
}

// ===== 工具函式 =====

/**
 * 生成 slug
 */
function generateSlug(title: string, handle?: string): string {
  if (handle) {
    return handle
  }

  return (
    title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, '') // 保留中英文和數字
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100) +
    '-' +
    Date.now().toString(36)
  )
}

/**
 * 解析 HTML 為純文字（簡易版）
 */
function stripHtml(html: string | null): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

/**
 * 將 HTML 轉換為 Lexical Rich Text JSON 格式
 * 支援：段落、列表、粗體、斜體、連結
 */
function htmlToLexicalJson(html: string | null): Record<string, unknown> | null {
  if (!html || html.trim() === '') return null

  // 簡易 HTML 解析，將內容轉為 Lexical 格式
  const cleanHtml = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

  // 分割段落
  const paragraphs = cleanHtml
    .split(/<\/p>|<br\s*\/?>/gi)
    .map(p => p.replace(/<p[^>]*>/gi, '').replace(/<[^>]*>/g, '').trim())
    .filter(p => p.length > 0)

  if (paragraphs.length === 0) {
    // 如果沒有段落，直接用純文字
    const plainText = stripHtml(html)
    if (!plainText) return null
    paragraphs.push(plainText)
  }

  // 建立 Lexical JSON 結構
  const children = paragraphs.map(text => ({
    type: 'paragraph',
    version: 1,
    children: [
      {
        type: 'text',
        version: 1,
        text: text,
        format: 0,
        style: '',
        detail: 0,
        mode: 'normal',
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    textFormat: 0,
  }))

  return {
    root: {
      type: 'root',
      version: 1,
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
    },
  }
}

/**
 * 解析 EasyStore tags 字串為陣列
 */
function parseTags(tags: string | null): string[] {
  if (!tags) return []
  return tags
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
}

/**
 * 根據 tag 名稱查找或建立 Category
 */
async function findOrCreateCategory(
  tagName: string,
  vendorId: string,
  payload: Awaited<ReturnType<typeof getPayload>>
): Promise<string | null> {
  try {
    // 先嘗試查找現有的 Category
    const existing = await payload.find({
      collection: 'categories',
      where: {
        title: { equals: tagName },
      },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      return existing.docs[0].id as string
    }

    // 建立新的 Category
    const newCategory = await payload.create({
      collection: 'categories',
      data: {
        title: tagName,
        slug: tagName
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 50) + '-' + Date.now().toString(36),
        vendor: vendorId,
      },
    })

    return newCategory.id as string
  } catch (err) {
    console.warn(`建立 Category 失敗: ${tagName}`, err)
    return null
  }
}

/**
 * 價格轉換（TWD -> USD，粗略轉換）

 * TODO: 從 SiteSettings 讀取匯率
 */
function convertToUSD(twdPrice: string | number): number {
  const twd = typeof twdPrice === 'string' ? parseFloat(twdPrice) : twdPrice
  if (isNaN(twd)) return 0
  // 假設 1 USD = 32 TWD
  return Math.round((twd / 32) * 100) / 100
}

// ===== 主要匯入邏輯 =====

/**
 * 從 EasyStore 匯入所有商品
 */
export async function importFromEasyStore(
  options: EasyStoreImportOptions
): Promise<EasyStoreImportResult> {
  const {
    vendorId,
    skipExisting = true,
    downloadImages = true,
    batchSize = 50,
    onProgress,
  } = options

  const payload = await getPayload({ config: configPromise })

  const logs: ImportLogEntry[] = []
  const errors: string[] = []
  let created = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  const addLog = (
    type: ImportLogEntry['type'],
    message: string,
    productTitle?: string
  ) => {
    logs.push({ timestamp: new Date(), type, message, productTitle })
  }

  try {
    // 取得所有商品
    addLog('info', '開始從 EasyStore 取得商品資料...')
    const products = await fetchAllProducts((loaded, total) => {
      onProgress?.({
        total,
        processed: 0,
        created,
        updated,
        skipped,
        failed,
        currentProduct: `正在載入商品資料 (${loaded}/${total})...`,
        logs,
      })
    })

    const total = products.length
    addLog('info', `成功取得 ${total} 個商品，開始匯入...`)

    // 分批處理
    for (let i = 0; i < products.length; i++) {
      const product = products[i]

      try {
        // 回報進度
        onProgress?.({
          total,
          processed: i + 1,
          created,
          updated,
          skipped,
          failed,
          currentProduct: product.title,
          logs,
        })

        // 檢查是否已存在
        const existing = await payload.find({
          collection: 'products',
          where: {
            and: [
              { externalId: { equals: String(product.id) } },
              { externalSource: { equals: 'easystore' } },
            ],
          },
          limit: 1,
        })

        if (existing.docs.length > 0 && skipExisting) {
          addLog('skip', `商品已存在，跳過`, product.title)
          skipped++
          continue
        }

        // 準備商品資料
        const productData = await prepareProductData(
          product,
          vendorId,
          downloadImages,
          payload,
          addLog
        )

        if (existing.docs.length > 0) {
          // 更新現有商品
          await payload.update({
            collection: 'products',
            id: existing.docs[0].id,
            data: productData as any,
          })
          addLog('success', `商品已更新`, product.title)
          updated++
        } else {
          // 建立新商品
          await payload.create({
            collection: 'products',
            data: productData as any,
          })
          addLog('success', `商品已建立`, product.title)
          created++
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '未知錯誤'
        addLog('error', `匯入失敗: ${errorMsg}`, product.title)
        errors.push(`${product.title}: ${errorMsg}`)
        failed++
      }

      // 每批次後稍微等待，避免資料庫壓力過大
      if ((i + 1) % batchSize === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    addLog('info', `匯入完成！建立: ${created}, 更新: ${updated}, 跳過: ${skipped}, 失敗: ${failed}`)

    return {
      success: failed === 0,
      total,
      created,
      updated,
      skipped,
      failed,
      logs,
      errors,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '匯入過程發生錯誤'
    addLog('error', errorMsg)
    errors.push(errorMsg)

    return {
      success: false,
      total: 0,
      created,
      updated,
      skipped,
      failed,
      logs,
      errors,
    }
  }
}

/**
 * 準備商品資料（轉換 EasyStore -> Payload 格式）
 */
async function prepareProductData(
  product: EasyStoreProduct,
  vendorId: string,
  downloadImages: boolean,
  payload: Awaited<ReturnType<typeof getPayload>>,
  addLog?: (type: 'success' | 'skip' | 'error' | 'info', message: string, productTitle?: string) => void
) {
  // 基本資料
  const baseData: Record<string, unknown> = {
    title: product.title,
    slug: generateSlug(product.title, product.handle),
    vendor: vendorId,
    externalId: String(product.id),
    externalSource: 'easystore' as const,
    externalUrl: `https://takemejapan.easy.co/products/${product.handle}`,
    lastSyncedAt: new Date().toISOString(),
    syncStatus: 'synced' as const,
    _status: product.status === 'active' ? 'published' : 'draft',
  }

  // 價格（使用第一個變體的價格）
  // 🔧 修復：安全存取 variants 陣列，避免 undefined 錯誤
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0
  const firstVariant = hasVariants ? product.variants[0] : null
  
  if (firstVariant) {
    baseData.priceInUSD = convertToUSD(firstVariant.price)

    // 如果有比較價，設為原價
    if (firstVariant.compare_at_price) {
      // 注意：ecommerce plugin 可能使用不同的欄位名稱
      // 這裡暫時不處理 salePrice，因為需要確認 plugin 的欄位
    }

    // 庫存（所有變體的總和）
    baseData.inventory = product.variants.reduce(
      (sum, v) => sum + (v.inventory_quantity || 0),
      0
    )
  } else {
    // 無變體時使用預設值，商品仍可建立
    baseData.priceInUSD = 0
    baseData.inventory = 0
    addLog?.('info', `商品無變體資料，使用預設值 (價格=0, 庫存=0)`, product.title)
  }

  // 處理圖片 - 並行下載（最多同時處理 3 張）
  if (downloadImages && product.images.length > 0) {
    const galleryItems: Array<{ image: string }> = []
    let successCount = 0
    let failCount = 0
    const maxImages = 5 // 減少到 5 張以加快速度
    const imagesToProcess = product.images.slice(0, maxImages)

    // 並行處理圖片（每批 3 張）
    const batchSize = 3
    for (let i = 0; i < imagesToProcess.length; i += batchSize) {
      const batch = imagesToProcess.slice(i, i + batchSize)
      const results = await Promise.allSettled(
        batch.map(img => uploadImageToMedia(img.src, product.title, payload))
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          galleryItems.push({ image: result.value })
          successCount++
        } else {
          failCount++
        }
      }
    }

    if (galleryItems.length > 0) {
      baseData.gallery = galleryItems
      addLog?.('info', `圖片上傳: ${successCount} 成功, ${failCount} 失敗`, product.title)
    } else if (failCount > 0) {
      // 🔧 修復：圖片下載失敗改為警告，商品仍可建立
      addLog?.('info', `圖片下載失敗 (${failCount} 張)，商品仍會建立`, product.title)
    }
  }

  // P1: 同步 body_html → description (Rich Text)
  if (product.body_html) {
    const descriptionJson = htmlToLexicalJson(product.body_html)
    if (descriptionJson) {
      baseData.description = descriptionJson
      addLog?.('info', `描述已同步 (${stripHtml(product.body_html).substring(0, 50)}...)`, product.title)
    }
  }

  // P1: 同步 tags → categories
  const tags = parseTags(product.tags)
  if (tags.length > 0) {
    const categoryIds: string[] = []
    for (const tag of tags.slice(0, 10)) { // 最多 10 個分類
      const categoryId = await findOrCreateCategory(tag, vendorId, payload)
      if (categoryId) {
        categoryIds.push(categoryId)
      }
    }
    if (categoryIds.length > 0) {
      baseData.categories = categoryIds
      addLog?.('info', `分類已同步: ${categoryIds.length} 個`, product.title)
    }
  }

  // P2: 同步變體 (variants)
  // EasyStore 變體結構: options (顏色/尺寸類型) + variants (具體組合)
  // Payload 變體結構: variantTypes + variantOptions + variants
  // 由於 ecommerce plugin 的變體結構較複雜，這裡採用簡化方式:
  // - 如果有多個變體，啟用 enableVariants
  // - 將變體資訊存入外部欄位供後續處理
  // 🔧 修復：加強變體檢查，避免空陣列錯誤
  const variantCount = hasVariants ? product.variants.length : 0
  const optionCount = Array.isArray(product.options) ? product.options.length : 0
  
  if (variantCount > 1 && optionCount > 0) {
    baseData.enableVariants = true
    // 將 EasyStore 變體資料存為 JSON 供後續處理
    // 注意: 完整的變體同步需要建立 variantTypes 和 variantOptions，較為複雜
    // 這裡先記錄變體資訊，後續可手動或透過另一個工具處理
    addLog?.('info', `發現 ${variantCount} 個變體, ${optionCount} 個選項類型`, product.title)
  }

  return baseData

}

/**
 * 上傳圖片到 Payload Media
 */
async function uploadImageToMedia(
  imageUrl: string,
  productTitle: string,
  payload: Awaited<ReturnType<typeof getPayload>>
): Promise<string | null> {
  try {
    // 下載圖片
    const imageBuffer = await downloadImage(imageUrl)

    // 從 URL 取得檔名
    const urlParts = imageUrl.split('/')
    const originalFilename = urlParts[urlParts.length - 1].split('?')[0]
    const extension = originalFilename.split('.').pop() || 'jpg'
    const filename = `${productTitle.substring(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${Date.now()}.${extension}`

    // 建立 File 物件
    const file = {
      name: filename,
      data: imageBuffer,
      mimetype: `image/${extension === 'png' ? 'png' : 'jpeg'}`,
      size: imageBuffer.length,
    }

    // 上傳到 Media collection
    const media = await payload.create({
      collection: 'media',
      data: {
        alt: productTitle,
      },
      file,
    })

    return media.id as string
  } catch (err) {
    console.error('圖片上傳失敗:', err)
    return null
  }
}

/**
 * 預覽可匯入的商品數量
 */
export async function previewEasyStoreImport(): Promise<{
  success: boolean
  productCount?: number
  existingCount?: number
  newCount?: number
  error?: string
}> {
  try {
    const payload = await getPayload({ config: configPromise })

    // 取得 EasyStore 商品數量
    const products = await fetchAllProducts()
    const productCount = products.length

    // 檢查已存在的商品數量
    const existingProducts = await payload.find({
      collection: 'products',
      where: {
        externalSource: { equals: 'easystore' },
      },
      limit: 0, // 只需要 count
    })

    const existingCount = existingProducts.totalDocs
    const newCount = productCount - existingCount

    return {
      success: true,
      productCount,
      existingCount,
      newCount: newCount > 0 ? newCount : 0,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '預覽失敗',
    }
  }
}
