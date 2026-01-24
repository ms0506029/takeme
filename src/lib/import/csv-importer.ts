/**
 * CSV/Excel 商品批次匯入器
 * 
 * 功能：
 * 1. 解析 EasyStore CSV/Excel 匯出格式
 * 2. 以 Handle 分組合併變體
 * 3. 下載圖片並轉換為 WebP（品質分級）
 * 4. 批次建立 Payload 商品
 */

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import sharp from 'sharp'

// ===== 類型定義 =====

/**
 * EasyStore CSV 欄位對應
 */
export interface EasyStoreCsvRow {
  Handle: string
  Title?: string
  'Meta Description'?: string
  'Body (HTML)'?: string
  Published?: string
  Taxable?: string
  'Free Shipping'?: string
  'Track Inventory'?: string
  Image1?: string
  Image2?: string
  Image3?: string
  Image4?: string
  Image5?: string
  Image6?: string
  Image7?: string
  Image8?: string
  Image9?: string
  Image10?: string
  Image11?: string
  Image12?: string
  Collection1?: string
  Collection2?: string
  Collection3?: string
  Tags?: string
  Brands?: string
  Vendor?: string
  'Seller Note'?: string
  'Option1 Name'?: string
  'Option1 Value'?: string
  'Option2 Name'?: string
  'Option2 Value'?: string
  'Option3 Name'?: string
  'Option3 Value'?: string
  SKU?: string
  Barcode?: string
  Weight?: string
  'Weight Unit'?: string
  'Length (cm)'?: string
  'Width (cm)'?: string
  'Height (cm)'?: string
  Price?: string
  'Cost Price'?: string
  Inventory?: string
  'Inventory Policy'?: string
  'Compare At Price'?: string
  Enabled?: string
}

/**
 * 合併後的商品資料
 */
interface MergedProduct {
  handle: string
  title: string
  description: string | null
  images: string[]
  collections: string[]
  tags: string
  brand: string
  variants: VariantData[]
  published: boolean
}

interface VariantData {
  sku: string
  barcode: string
  price: number
  compareAtPrice: number
  inventory: number
  option1Name: string
  option1Value: string
  option2Name: string
  option2Value: string
  option3Name: string
  option3Value: string
}

export interface CsvImportOptions {
  vendorId: string
  downloadImages?: boolean
  imageQuality?: 'thumbnail' | 'detail' // 品質分級
  skipExisting?: boolean
  batchSize?: number
  onProgress?: (progress: CsvImportProgress) => void
}

export interface CsvImportProgress {
  phase: 'parsing' | 'processing' | 'done'
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

export interface CsvImportResult {
  success: boolean
  total: number
  created: number
  updated: number
  skipped: number
  failed: number
  logs: ImportLogEntry[]
  errors: string[]
}

// ===== 圖片品質設定 =====
const IMAGE_QUALITY_SETTINGS = {
  thumbnail: { quality: 65, maxWidth: 400 },
  detail: { quality: 80, maxWidth: 1200 },
}

// ===== 工具函式 =====

/**
 * 解析 CSV 字串
 */
export function parseCsvContent(csvContent: string): EasyStoreCsvRow[] {
  const lines = csvContent.split('\n')
  if (lines.length < 2) return []

  // 解析 header
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine)

  const rows: EasyStoreCsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    rows.push(row as unknown as EasyStoreCsvRow)
  }

  return rows
}

/**
 * 解析單行 CSV（處理引號內逗號）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * 將 CSV 行合併為商品（以 Handle 分組）
 */
export function mergeRowsToProducts(rows: EasyStoreCsvRow[]): MergedProduct[] {
  const productMap = new Map<string, MergedProduct>()

  for (const row of rows) {
    if (!row.Handle) continue

    const existing = productMap.get(row.Handle)

    if (!existing) {
      // 建立新商品
      const images: string[] = []
      for (let i = 1; i <= 12; i++) {
        const imgUrl = row[`Image${i}` as keyof EasyStoreCsvRow]
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
          images.push(imgUrl)
        }
      }

      const collections: string[] = []
      for (let i = 1; i <= 3; i++) {
        const col = row[`Collection${i}` as keyof EasyStoreCsvRow]
        if (col && typeof col === 'string' && col.trim()) {
          collections.push(col.trim())
        }
      }

      productMap.set(row.Handle, {
        handle: row.Handle,
        title: row.Title || row.Handle,
        description: row['Body (HTML)'] || null,
        images,
        collections,
        tags: row.Tags || '',
        brand: row.Brands || '',
        published: row.Published?.toLowerCase() === 'yes',
        variants: [],
      })
    }

    // 加入變體
    const product = productMap.get(row.Handle)!
    product.variants.push({
      sku: row.SKU || '',
      barcode: row.Barcode || '',
      price: parseFloat(row.Price || '0') || 0,
      compareAtPrice: parseFloat(row['Compare At Price'] || '0') || 0,
      inventory: parseInt(row.Inventory || '0', 10) || 0,
      option1Name: row['Option1 Name'] || '',
      option1Value: row['Option1 Value'] || '',
      option2Name: row['Option2 Name'] || '',
      option2Value: row['Option2 Value'] || '',
      option3Name: row['Option3 Name'] || '',
      option3Value: row['Option3 Value'] || '',
    })
  }

  return Array.from(productMap.values())
}

/**
 * HTML 轉 Lexical JSON
 */
function htmlToLexicalJson(html: string | null): Record<string, unknown> | null {
  if (!html || html.trim() === '') return null

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
    const plainText = html.replace(/<[^>]*>/g, '').trim()
    if (!plainText) return null
    paragraphs.push(plainText)
  }

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
 * 下載並優化圖片（WebP 轉換 + 品質分級）
 */
async function downloadAndOptimizeImage(
  imageUrl: string,
  quality: 'thumbnail' | 'detail' = 'detail'
): Promise<Buffer | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PayloadCMS/1.0)',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    if (inputBuffer.length === 0) {
      throw new Error('圖片內容為空')
    }

    // 使用 sharp 優化圖片
    const settings = IMAGE_QUALITY_SETTINGS[quality]
    const optimizedBuffer = await sharp(inputBuffer)
      .resize({ width: settings.maxWidth, withoutEnlargement: true })
      .webp({ quality: settings.quality })
      .toBuffer()

    return optimizedBuffer
  } catch (error) {
    console.warn(`[圖片優化] 失敗: ${imageUrl}`, error)
    return null
  }
}

/**
 * 上傳圖片到 Payload Media
 */
async function uploadImageToMedia(
  imageBuffer: Buffer,
  productTitle: string,
  payload: Awaited<ReturnType<typeof getPayload>>
): Promise<string | null> {
  try {
    const filename = `${productTitle.substring(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${Date.now()}.webp`

    const file = {
      name: filename,
      data: imageBuffer,
      mimetype: 'image/webp',
      size: imageBuffer.length,
    }

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
 * 價格轉換 TWD → USD
 */
function convertToUSD(twdPrice: number): number {
  if (isNaN(twdPrice)) return 0
  return Math.round((twdPrice / 32) * 100) / 100
}

/**
 * 查找或建立分類
 */
async function findOrCreateCategory(
  categoryName: string,
  vendorId: string,
  payload: Awaited<ReturnType<typeof getPayload>>
): Promise<string | null> {
  try {
    const existing = await payload.find({
      collection: 'categories',
      where: { title: { equals: categoryName } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      return existing.docs[0].id as string
    }

    const slug = categoryName
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50) + '-' + Date.now().toString(36)

    const newCategory = await payload.create({
      collection: 'categories',
      data: {
        title: categoryName,
        slug,
        vendor: vendorId,
      },
    })

    return newCategory.id as string
  } catch (err) {
    console.warn(`建立 Category 失敗: ${categoryName}`, err)
    return null
  }
}

// ===== 主要匯入邏輯 =====

/**
 * 從 CSV 匯入商品
 */
export async function importFromCsv(
  csvContent: string,
  options: CsvImportOptions
): Promise<CsvImportResult> {
  const {
    vendorId,
    downloadImages = true,
    imageQuality = 'detail',
    skipExisting = true,
    batchSize = 20,
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
    // 解析 CSV
    addLog('info', '開始解析 CSV 檔案...')
    onProgress?.({
      phase: 'parsing',
      total: 0,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      logs,
    })

    const rows = parseCsvContent(csvContent)
    addLog('info', `解析完成，共 ${rows.length} 行資料`)

    // 合併變體
    const products = mergeRowsToProducts(rows)
    const total = products.length
    addLog('info', `合併為 ${total} 個商品`)

    // 處理商品
    for (let i = 0; i < products.length; i++) {
      const product = products[i]

      try {
        onProgress?.({
          phase: 'processing',
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
              { slug: { equals: product.handle } },
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
        const productData: Record<string, unknown> = {
          title: product.title,
          slug: product.handle,
          vendor: vendorId,
          externalSource: 'easystore' as const,
          lastSyncedAt: new Date().toISOString(),
          syncStatus: 'synced' as const,
          _status: product.published ? 'published' : 'draft',
        }

        // 價格（使用第一個變體）
        if (product.variants.length > 0) {
          const firstVariant = product.variants[0]
          productData.priceInUSD = convertToUSD(firstVariant.price)
          productData.inventory = product.variants.reduce((sum, v) => sum + v.inventory, 0)
        }

        // 描述
        if (product.description) {
          const descriptionJson = htmlToLexicalJson(product.description)
          if (descriptionJson) {
            productData.description = descriptionJson
          }
        }

        // 分類
        if (product.collections.length > 0) {
          const categoryIds: string[] = []
          for (const col of product.collections.slice(0, 5)) {
            const categoryId = await findOrCreateCategory(col, vendorId, payload)
            if (categoryId) {
              categoryIds.push(categoryId)
            }
          }
          if (categoryIds.length > 0) {
            productData.categories = categoryIds
          }
        }

        // 圖片
        if (downloadImages && product.images.length > 0) {
          const galleryItems: Array<{ image: string }> = []
          const maxImages = 5

          for (const imgUrl of product.images.slice(0, maxImages)) {
            const optimizedBuffer = await downloadAndOptimizeImage(imgUrl, imageQuality)
            if (optimizedBuffer) {
              const mediaId = await uploadImageToMedia(optimizedBuffer, product.title, payload)
              if (mediaId) {
                galleryItems.push({ image: mediaId })
              }
            }
          }

          if (galleryItems.length > 0) {
            productData.gallery = galleryItems
            addLog('info', `圖片上傳: ${galleryItems.length} 張 (WebP ${imageQuality})`, product.title)
          }
        }

        // 變體資訊
        if (product.variants.length > 1) {
          productData.enableVariants = true
          addLog('info', `發現 ${product.variants.length} 個變體`, product.title)
        }

        // 建立或更新
        if (existing.docs.length > 0) {
          await payload.update({
            collection: 'products',
            id: existing.docs[0].id,
            data: productData as any,
          })
          addLog('success', `商品已更新`, product.title)
          updated++
        } else {
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

      // 批次間等待
      if ((i + 1) % batchSize === 0) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    addLog('info', `匯入完成！建立: ${created}, 更新: ${updated}, 跳過: ${skipped}, 失敗: ${failed}`)

    onProgress?.({
      phase: 'done',
      total,
      processed: total,
      created,
      updated,
      skipped,
      failed,
      logs,
    })

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
 * 預覽 CSV 匯入（不執行實際建立）
 */
export function previewCsvImport(csvContent: string): {
  success: boolean
  rowCount: number
  productCount: number
  products: Array<{
    handle: string
    title: string
    variantCount: number
    imageCount: number
    price: number
  }>
  error?: string
} {
  try {
    const rows = parseCsvContent(csvContent)
    const products = mergeRowsToProducts(rows)

    return {
      success: true,
      rowCount: rows.length,
      productCount: products.length,
      products: products.slice(0, 20).map(p => ({
        handle: p.handle,
        title: p.title,
        variantCount: p.variants.length,
        imageCount: p.images.length,
        price: p.variants[0]?.price || 0,
      })),
    }
  } catch (err) {
    return {
      success: false,
      rowCount: 0,
      productCount: 0,
      products: [],
      error: err instanceof Error ? err.message : '解析失敗',
    }
  }
}
