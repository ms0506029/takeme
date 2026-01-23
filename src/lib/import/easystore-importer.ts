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
          payload
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
  payload: Awaited<ReturnType<typeof getPayload>>
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
  const firstVariant = product.variants[0]
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
  }

  // 處理圖片
  if (downloadImages && product.images.length > 0) {
    const galleryItems: Array<{ image: string }> = []

    for (const img of product.images.slice(0, 10)) {
      // 最多 10 張圖
      try {
        const mediaId = await uploadImageToMedia(img.src, product.title, payload)
        if (mediaId) {
          galleryItems.push({ image: mediaId })
        }
      } catch (err) {
        console.warn(`圖片上傳失敗: ${img.src}`, err)
      }
    }

    if (galleryItems.length > 0) {
      baseData.gallery = galleryItems
    }
  }

  // TODO: 處理變體
  // 目前 ecommerce plugin 的變體結構較複雜，暫時不處理
  // 需要建立 variantTypes 和 variantOptions

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
