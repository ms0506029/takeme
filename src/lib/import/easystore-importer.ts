/**
 * EasyStore Product Importer
 *
 * 功能：
 * 1. 將 EasyStore 商品轉換為 Payload 格式
 * 2. 處理變體（顏色/尺寸）- 完整支援 variantTypes, variantOptions, variants
 * 3. 遷移圖片到 Payload Media（支援變體圖片關聯）
 * 4. 批次匯入支援
 */

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import {
    downloadImage,
    fetchAllProducts,
    type EasyStoreProduct,
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
 * 確保 slug 只包含有效字符（a-z, 0-9, -, _）
 */
function generateSlug(title: string, handle?: string): string {
  // 如果有 handle，先清理它
  const baseSlug = handle || title

  // 清理 slug：
  // 1. 轉小寫
  // 2. 將中文/日文/韓文替換為拼音或移除（這裡簡單移除）
  // 3. 只保留 a-z, 0-9, -, _
  // 4. 將空格和多個連字號替換為單個連字號
  // 5. 移除首尾連字號
  const cleanSlug = baseSlug
    .toLowerCase()
    .normalize('NFKD') // 正規化 Unicode
    .replace(/[\u0300-\u036f]/g, '') // 移除變音符號
    .replace(/[^\x00-\x7F]/g, '') // 移除非 ASCII 字符（包括中文）
    .replace(/[^a-z0-9\s-_]/g, '') // 只保留英數字和連字號
    .replace(/\s+/g, '-') // 空格轉連字號
    .replace(/-+/g, '-') // 多個連字號轉單個
    .replace(/^-+|-+$/g, '') // 移除首尾連字號
    .substring(0, 80) // 限制長度

  // 確保 slug 不為空
  if (!cleanSlug || cleanSlug.length < 2) {
    return `product-${Date.now().toString(36)}`
  }

  // 添加時間戳確保唯一性
  return `${cleanSlug}-${Date.now().toString(36)}`
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

// ===== 變體同步相關函式 =====

// 快取已建立的 variantTypes 和 variantOptions，避免重複查詢
const variantTypeCache = new Map<string, string>()
const variantOptionCache = new Map<string, string>()

/**
 * 將選項名稱轉換為 slug 格式
 */
function optionToSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) || `opt-${Date.now().toString(36)}`
}

/**
 * 標準化選項類型名稱
 * EasyStore 可能使用不同語言/格式，這裡統一處理
 */
function normalizeTypeName(name: string): string {
  const normalizations: Record<string, string> = {
    'color': '顏色',
    'colour': '顏色',
    'colors': '顏色',
    '颜色': '顏色',
    'size': '尺寸',
    'sizes': '尺寸',
    'title': '規格',
    'style': '款式',
    '款式': '款式',
    'material': '材質',
    '材質': '材質',
  }
  const lower = name.toLowerCase().trim()
  return normalizations[lower] || name.trim()
}

/**
 * 查找或建立 VariantType（如顏色、尺寸）
 */
async function getOrCreateVariantType(
  typeName: string,
  payload: Awaited<ReturnType<typeof getPayload>>
): Promise<string> {
  const normalizedName = normalizeTypeName(typeName)
  const cacheKey = normalizedName.toLowerCase()

  // 檢查快取
  if (variantTypeCache.has(cacheKey)) {
    return variantTypeCache.get(cacheKey)!
  }

  try {
    // 查找現有的 VariantType
    const existing = await payload.find({
      collection: 'variantTypes',
      where: {
        or: [
          { label: { equals: normalizedName } },
          { name: { equals: cacheKey } },
        ],
      },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      const id = existing.docs[0].id as string
      variantTypeCache.set(cacheKey, id)
      return id
    }

    // 建立新的 VariantType
    const newType = await payload.create({
      collection: 'variantTypes',
      data: {
        label: normalizedName,
        name: cacheKey,
      },
    })

    const id = newType.id as string
    variantTypeCache.set(cacheKey, id)
    return id
  } catch (err) {
    console.error(`建立 VariantType 失敗: ${normalizedName}`, err)
    throw err
  }
}

/**
 * 查找或建立 VariantOption（如白色、FREE、S、M）
 */
async function getOrCreateVariantOption(
  variantTypeId: string,
  optionLabel: string,
  payload: Awaited<ReturnType<typeof getPayload>>
): Promise<string> {
  const cacheKey = `${variantTypeId}:${optionLabel.toLowerCase().trim()}`

  // 檢查快取
  if (variantOptionCache.has(cacheKey)) {
    return variantOptionCache.get(cacheKey)!
  }

  try {
    // 查找現有的 VariantOption
    const existing = await payload.find({
      collection: 'variantOptions',
      where: {
        and: [
          { variantType: { equals: variantTypeId } },
          { label: { equals: optionLabel.trim() } },
        ],
      },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      const id = existing.docs[0].id as string
      variantOptionCache.set(cacheKey, id)
      return id
    }

    // 建立新的 VariantOption
    const newOption = await payload.create({
      collection: 'variantOptions',
      data: {
        variantType: variantTypeId,
        label: optionLabel.trim(),
        value: optionToSlug(optionLabel),
      },
    })

    const id = newOption.id as string
    variantOptionCache.set(cacheKey, id)
    return id
  } catch (err) {
    console.error(`建立 VariantOption 失敗: ${optionLabel}`, err)
    throw err
  }
}

/**
 * 建立產品變體 (Variant)
 */
async function createProductVariant(
  productId: string,
  optionIds: string[],
  price: number,
  inventory: number,
  title: string,
  payload: Awaited<ReturnType<typeof getPayload>>
): Promise<string> {
  try {
    const variant = await payload.create({
      collection: 'variants',
      data: {
        title,
        product: productId,
        options: optionIds,
        inventory,
        priceInUSDEnabled: true,
        priceInUSD: price,
        _status: 'published',
      },
    })
    return variant.id as string
  } catch (err) {
    console.error(`建立 Variant 失敗: ${title}`, err)
    throw err
  }
}

/**
 * 從變體的 name 欄位解析選項值
 * EasyStore 格式："白色, FREE" 或 "黑色, M" 或 "Default Title"
 */
function parseVariantName(name: string | undefined): string[] {
  if (!name || name === 'Default Title' || name === 'undefined') {
    return []
  }
  // 以逗號分隔，去除空白
  return name.split(',').map((s) => s.trim()).filter(Boolean)
}

/**
 * 自動判斷選項類型名稱
 * 位置 0 通常是顏色，位置 1 通常是尺寸
 */
function inferOptionTypeName(position: number, value: string): string {
  // 常見尺寸值
  const sizePatterns = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'FREE', 'F', 'ONE SIZE']
  const upperValue = value.toUpperCase()

  if (sizePatterns.some((p) => upperValue === p || upperValue.includes(p))) {
    return '尺寸'
  }

  // 位置判斷：第一個通常是顏色，第二個是尺寸
  if (position === 0) return '顏色'
  if (position === 1) return '尺寸'
  return `規格${position + 1}`
}

/**
 * 處理 EasyStore 選項和變體，建立完整的變體結構
 *
 * 支援兩種資料格式：
 * 1. 有 product.options 的格式（舊版）
 * 2. 只有 variant.name 的格式（目前 EasyStore API 返回的格式）
 *
 * @returns 包含 variantTypeIds 和圖片-選項映射
 */
async function processVariants(
  product: EasyStoreProduct,
  productId: string,
  payload: Awaited<ReturnType<typeof getPayload>>,
  currencySettings: CurrencySettings,
  addLog?: LogFunction
): Promise<{
  variantTypeIds: string[]
  imageOptionMap: Map<number, string> // image_id -> variantOptionId
  variantCount: number
}> {
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0

  if (!hasVariants) {
    return { variantTypeIds: [], imageOptionMap: new Map(), variantCount: 0 }
  }

  // 檢查是否只有一個變體且沒有實際選項
  if (product.variants.length === 1) {
    const singleVariant = product.variants[0]
    const variantName = (singleVariant as any).name as string | undefined
    const parsedOptions = parseVariantName(variantName)

    if (parsedOptions.length === 0) {
      // 單一變體沒有選項，跳過變體處理
      return { variantTypeIds: [], imageOptionMap: new Map(), variantCount: 0 }
    }
  }

  const variantTypeIds: string[] = []
  const optionValueToId: Map<string, string> = new Map() // "0:白色" -> optionId
  const imageOptionMap: Map<number, string> = new Map()
  const variantTypeByPosition: Map<number, string> = new Map() // position -> variantTypeId

  try {
    // Step 1: 從所有變體中收集選項值，建立 VariantTypes 和 VariantOptions
    // 先遍歷一次收集所有選項
    const optionsByPosition: Map<number, Set<string>> = new Map()

    for (const variant of product.variants) {
      // 嘗試從 name 欄位解析選項（EasyStore 實際格式）
      const variantName = (variant as any).name as string | undefined
      const parsedOptions = parseVariantName(variantName)

      // 也嘗試從 option1/option2/option3 解析（舊版格式）
      const legacyOptions = [variant.option1, variant.option2, variant.option3].filter(Boolean) as string[]

      const optionValues = parsedOptions.length > 0 ? parsedOptions : legacyOptions

      for (let i = 0; i < optionValues.length; i++) {
        const value = optionValues[i].trim()
        if (!value) continue

        if (!optionsByPosition.has(i)) {
          optionsByPosition.set(i, new Set())
        }
        optionsByPosition.get(i)!.add(value)
      }
    }

    // 建立 VariantTypes 和 VariantOptions
    for (const [position, values] of optionsByPosition.entries()) {
      // 從第一個值推斷類型名稱
      const firstValue = Array.from(values)[0]
      const typeName = inferOptionTypeName(position, firstValue)

      const variantTypeId = await getOrCreateVariantType(typeName, payload)
      variantTypeIds.push(variantTypeId)
      variantTypeByPosition.set(position, variantTypeId)

      // 為每個值建立 VariantOption
      for (const value of values) {
        const optionId = await getOrCreateVariantOption(variantTypeId, value, payload)
        const key = `${position}:${value.toLowerCase().trim()}`
        optionValueToId.set(key, optionId)
      }
    }

    if (optionsByPosition.size > 0) {
      const typeNames = Array.from(optionsByPosition.entries())
        .map(([pos]) => {
          const firstVal = Array.from(optionsByPosition.get(pos)!)[0]
          return inferOptionTypeName(pos, firstVal)
        })
      addLog?.('info', `建立規格類型: ${typeNames.join(', ')}`, product.title)
    }

    // Step 2: 建立每個 Variant
    let createdCount = 0
    for (const variant of product.variants) {
      // 從 name 欄位解析選項
      const variantName = (variant as any).name as string | undefined
      const parsedOptions = parseVariantName(variantName)
      const legacyOptions = [variant.option1, variant.option2, variant.option3].filter(Boolean) as string[]
      const optionValues = parsedOptions.length > 0 ? parsedOptions : legacyOptions

      if (optionValues.length === 0) {
        continue
      }

      // 收集此變體的所有選項 ID
      const optionIds: string[] = []

      for (let i = 0; i < optionValues.length; i++) {
        const optionValue = optionValues[i].trim()
        const key = `${i}:${optionValue.toLowerCase().trim()}`
        const optionId = optionValueToId.get(key)

        if (optionId) {
          optionIds.push(optionId)

          // 記錄圖片-選項映射（用於第一個選項，通常是顏色）
          if (i === 0 && variant.image_id) {
            imageOptionMap.set(variant.image_id, optionId)
          }
        }
      }

      if (optionIds.length === 0) {
        addLog?.('info', `變體缺少選項: ${variantName || variant.title}`, product.title)
        continue
      }

      // 價格轉換（根據 SiteSettings 幣別設定）
      const variantPrice = convertPrice(variant.price, currencySettings)

      // 使用變體的 name 作為標題，或構建一個
      const variantTitle = variantName || variant.title || `${product.title} - ${optionValues.join(' / ')}`

      // 建立變體
      await createProductVariant(
        productId,
        optionIds,
        variantPrice,
        variant.inventory_quantity || 0,
        variantTitle,
        payload
      )
      createdCount++
    }

    if (createdCount > 0) {
      addLog?.('info', `建立 ${createdCount} 個變體`, product.title)
    }

    return { variantTypeIds, imageOptionMap, variantCount: createdCount }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '變體處理失敗'
    addLog?.('error', `變體同步失敗: ${errorMsg}`, product.title)
    return { variantTypeIds, imageOptionMap: new Map(), variantCount: 0 }
  }
}

type LogFunction = (
  type: 'success' | 'skip' | 'error' | 'info',
  message: string,
  productTitle?: string
) => void

// ===== 幣別設定快取 =====
export interface CurrencySettings {
  defaultCurrency: string
  easyStoreCurrency: string
  enableCurrencyConversion: boolean
  exchangeRates: Array<{
    fromCurrency: string
    rate: number
  }>
}

let currencySettingsCache: CurrencySettings | null = null

/**
 * 從 SiteSettings 讀取幣別設定
 */
export async function getCurrencySettings(
  payload: Awaited<ReturnType<typeof getPayload>>
): Promise<CurrencySettings> {
  // 使用快取避免重複查詢
  if (currencySettingsCache) {
    return currencySettingsCache
  }

  try {
    const siteSettings = await payload.findGlobal({
      slug: 'siteSettings',
    })

    const currency = (siteSettings as any)?.currency || {}

    currencySettingsCache = {
      defaultCurrency: currency.defaultCurrency || 'TWD',
      easyStoreCurrency: currency.easyStoreCurrency || 'TWD',
      enableCurrencyConversion: currency.enableCurrencyConversion || false,
      exchangeRates: currency.exchangeRates || [],
    }

    return currencySettingsCache
  } catch (err) {
    console.warn('無法讀取幣別設定，使用預設值 (TWD)', err)
    return {
      defaultCurrency: 'TWD',
      easyStoreCurrency: 'TWD',
      enableCurrencyConversion: false,
      exchangeRates: [],
    }
  }
}

/**
 * 清除幣別設定快取（匯入結束時呼叫）
 */
export function clearCurrencySettingsCache(): void {
  currencySettingsCache = null
}

/**
 * 價格轉換
 *
 * 根據 SiteSettings 的幣別設定進行轉換：
 * - 如果來源幣別與目標幣別相同，不轉換
 * - 如果啟用轉換且有匯率設定，進行轉換
 * - 否則直接返回原價
 */
function convertPrice(
  price: string | number,
  settings: CurrencySettings
): number {
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(numericPrice)) return 0

  // 如果來源幣別與目標幣別相同，不轉換
  if (settings.easyStoreCurrency === settings.defaultCurrency) {
    return Math.round(numericPrice * 100) / 100
  }

  // 如果未啟用轉換，直接返回原價
  if (!settings.enableCurrencyConversion) {
    return Math.round(numericPrice * 100) / 100
  }

  // 查找匯率
  const exchangeRate = settings.exchangeRates.find(
    (rate) => rate.fromCurrency === settings.easyStoreCurrency
  )

  if (exchangeRate && exchangeRate.rate > 0) {
    // 轉換：原價 × 匯率 = 目標幣別金額
    const converted = numericPrice * exchangeRate.rate
    return Math.round(converted * 100) / 100
  }

  // 找不到匯率，返回原價並記錄警告
  console.warn(
    `找不到 ${settings.easyStoreCurrency} -> ${settings.defaultCurrency} 的匯率設定，使用原價`
  )
  return Math.round(numericPrice * 100) / 100
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
    // 載入幣別設定
    const currencySettings = await getCurrencySettings(payload)
    addLog(
      'info',
      `幣別設定: EasyStore=${currencySettings.easyStoreCurrency}, 網站=${currencySettings.defaultCurrency}, 轉換=${currencySettings.enableCurrencyConversion ? '啟用' : '停用'}`
    )

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
          currencySettings,
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
 * 準備商品基本資料（轉換 EasyStore -> Payload 格式）
 * 注意：變體同步在商品建立後另行處理
 */
async function prepareProductData(
  product: EasyStoreProduct,
  vendorId: string,
  downloadImages: boolean,
  payload: Awaited<ReturnType<typeof getPayload>>,
  currencySettings: CurrencySettings,
  addLog?: LogFunction,
  imageOptionMap?: Map<number, string> // image_id -> variantOptionId 映射
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
    _status: product.status === 'draft' || product.status === 'archived' ? 'draft' : 'published',
  }

  // 價格（使用第一個變體的價格，根據 SiteSettings 幣別設定轉換）
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0
  const firstVariant = hasVariants ? product.variants[0] : null

  if (firstVariant) {
    // 使用 priceInUSD 欄位存儲價格（欄位名稱保持相容，實際幣別由 SiteSettings 決定）
    baseData.priceInUSD = convertPrice(firstVariant.price, currencySettings)

    // 庫存（所有變體的總和）
    baseData.inventory = product.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0)
  } else {
    baseData.priceInUSD = 0
    baseData.inventory = 0
    addLog?.('info', `商品無變體資料，使用預設值 (價格=0, 庫存=0)`, product.title)
  }

  // 檢查是否有變體選項
  const optionCount = Array.isArray(product.options) ? product.options.length : 0
  const variantCount = hasVariants ? product.variants.length : 0

  if (variantCount > 1 && optionCount > 0) {
    baseData.enableVariants = true
  }

  // 處理圖片 - 並行下載（支援變體圖片關聯）
  if (downloadImages && product.images.length > 0) {
    const galleryItems: Array<{ image: string; variantOption?: string }> = []
    let successCount = 0
    let failCount = 0
    const maxImages = 10 // 增加到 10 張以支援更多變體圖片
    const imagesToProcess = product.images.slice(0, maxImages)

    // 並行處理圖片（每批 3 張）
    const batchSize = 3
    for (let i = 0; i < imagesToProcess.length; i += batchSize) {
      const batch = imagesToProcess.slice(i, i + batchSize)
      const results = await Promise.allSettled(
        batch.map((img) => uploadImageToMedia(img.url || img.src || '', product.title, payload))
      )

      for (let j = 0; j < results.length; j++) {
        const result = results[j]
        const imgData = batch[j]

        if (result.status === 'fulfilled' && result.value) {
          const galleryItem: { image: string; variantOption?: string } = {
            image: result.value,
          }

          // 如果有圖片-選項映射，關聯圖片到對應的變體選項
          if (imageOptionMap && imgData.id) {
            const variantOptionId = imageOptionMap.get(imgData.id)
            if (variantOptionId) {
              galleryItem.variantOption = variantOptionId
            }
          }

          galleryItems.push(galleryItem)
          successCount++
        } else {
          failCount++
        }
      }
    }

    if (galleryItems.length > 0) {
      baseData.gallery = galleryItems
      const linkedCount = galleryItems.filter((g) => g.variantOption).length
      if (linkedCount > 0) {
        addLog?.(
          'info',
          `圖片上傳: ${successCount} 成功 (${linkedCount} 張關聯變體), ${failCount} 失敗`,
          product.title
        )
      } else {
        addLog?.('info', `圖片上傳: ${successCount} 成功, ${failCount} 失敗`, product.title)
      }
    } else if (failCount > 0) {
      addLog?.('info', `圖片下載失敗 (${failCount} 張)，商品仍會建立`, product.title)
    }
  }

  // 同步 body_html → description (Rich Text)
  if (product.body_html) {
    const descriptionJson = htmlToLexicalJson(product.body_html)
    if (descriptionJson) {
      baseData.description = descriptionJson
    }
  }

  // 同步 tags → categories
  const tags = parseTags(product.tags)
  if (tags.length > 0) {
    const categoryIds: string[] = []
    for (const tag of tags.slice(0, 10)) {
      const categoryId = await findOrCreateCategory(tag, vendorId, payload)
      if (categoryId) {
        categoryIds.push(categoryId)
      }
    }
    if (categoryIds.length > 0) {
      baseData.categories = categoryIds
    }
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

/**
 * 匯入單一商品（供 SSE streaming 使用）
 * 完整同步流程：
 * 1. 建立/更新商品基本資料
 * 2. 處理變體（建立 variantTypes, variantOptions, variants）
 * 3. 更新商品關聯變體類型
 * 4. 更新圖片-變體選項關聯
 */
export async function importSingleProduct(
  product: EasyStoreProduct,
  vendorId: string,
  downloadImages: boolean,
  payload: Awaited<ReturnType<typeof getPayload>>,
  existingId?: string,
  addLog?: LogFunction,
  currencySettingsOverride?: CurrencySettings
): Promise<{ action: 'created' | 'updated'; productId: string; variantCount: number }> {
  // 載入或使用傳入的幣別設定
  const currencySettings = currencySettingsOverride || await getCurrencySettings(payload)

  // 檢查是否有多個變體（可能需要建立變體資料）
  const hasMultipleVariants = Array.isArray(product.variants) && product.variants.length > 1

  // Step 1: 準備並建立/更新商品基本資料（先不含圖片，等變體處理完再加）
  const productData = await prepareProductData(product, vendorId, false, payload, currencySettings, addLog)

  let productId: string
  let action: 'created' | 'updated'

  if (existingId) {
    // 更新現有商品
    const updated = await payload.update({
      collection: 'products',
      id: existingId,
      data: productData as any,
    })
    productId = updated.id as string
    action = 'updated'

    // 刪除舊的變體（避免重複建立）
    if (hasMultipleVariants) {
      const oldVariants = await payload.find({
        collection: 'variants',
        where: { product: { equals: productId } },
        limit: 1000,
      })
      if (oldVariants.docs.length > 0) {
        for (const v of oldVariants.docs) {
          await payload.delete({
            collection: 'variants',
            id: v.id as string,
          })
        }
        addLog?.('info', `刪除 ${oldVariants.docs.length} 個舊變體`, product.title)
      }
    }
  } else {
    // 建立新商品
    const created = await payload.create({
      collection: 'products',
      data: productData as any,
    })
    productId = created.id as string
    action = 'created'
  }

  // Step 2: 處理變體（如果有多個變體）
  // processVariants 內部會檢查是否有有效的選項值
  let variantCount = 0
  let imageOptionMap: Map<number, string> = new Map()
  let variantTypeIds: string[] = []

  if (hasMultipleVariants) {
    const variantResult = await processVariants(product, productId, payload, currencySettings, addLog)
    variantTypeIds = variantResult.variantTypeIds
    imageOptionMap = variantResult.imageOptionMap
    variantCount = variantResult.variantCount

    // Step 3: 更新商品，關聯 variantTypes 和啟用變體
    if (variantTypeIds.length > 0) {
      await payload.update({
        collection: 'products',
        id: productId,
        data: {
          variantTypes: variantTypeIds,
          enableVariants: true,
        },
      })
    }
  }

  // Step 4: 處理圖片（帶有變體選項關聯）
  if (downloadImages && product.images.length > 0) {
    const galleryData = await processImagesWithVariantLinks(
      product,
      imageOptionMap,
      payload,
      addLog
    )

    if (galleryData.length > 0) {
      await payload.update({
        collection: 'products',
        id: productId,
        data: {
          gallery: galleryData,
        },
      })
    }
  }

  return { action, productId, variantCount }
}

/**
 * 處理商品圖片並關聯變體選項
 *
 * 優化策略：
 * 1. 優先匯入每個顏色的代表圖片（有 image_id 映射的）
 * 2. 如果還有配額，再從剩餘圖片中選取
 * 3. 確保每個顏色都有一張代表圖
 */
async function processImagesWithVariantLinks(
  product: EasyStoreProduct,
  imageOptionMap: Map<number, string>,
  payload: Awaited<ReturnType<typeof getPayload>>,
  addLog?: LogFunction
): Promise<Array<{ image: string; variantOption?: string }>> {
  const galleryItems: Array<{ image: string; variantOption?: string }> = []
  let successCount = 0
  let failCount = 0
  let linkedCount = 0

  const maxImages = 150 // 增加上限以容納更多圖片

  // 優先排序：先處理有變體關聯的圖片（顏色代表圖），再處理其他圖片
  const linkedImageIds = new Set(imageOptionMap.keys())
  const linkedImages = product.images.filter((img) => linkedImageIds.has(img.id))
  const otherImages = product.images.filter((img) => !linkedImageIds.has(img.id))

  // 合併：先放顏色代表圖，再放其他圖片
  const sortedImages = [...linkedImages, ...otherImages]
  const imagesToProcess = sortedImages.slice(0, maxImages)

  addLog?.(
    'info',
    `圖片排序: ${linkedImages.length} 張顏色代表圖, ${otherImages.length} 張其他圖片`,
    product.title,
  )

  // 並行處理圖片（每批 3 張）
  const batchSize = 3
  for (let i = 0; i < imagesToProcess.length; i += batchSize) {
    const batch = imagesToProcess.slice(i, i + batchSize)
    const results = await Promise.allSettled(
      batch.map((img) => uploadImageToMedia(img.url || img.src || '', product.title, payload)),
    )

    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      const imgData = batch[j]

      if (result.status === 'fulfilled' && result.value) {
        const galleryItem: { image: string; variantOption?: string } = {
          image: result.value,
        }

        // 關聯圖片到變體選項
        if (imgData.id && imageOptionMap.has(imgData.id)) {
          galleryItem.variantOption = imageOptionMap.get(imgData.id)
          linkedCount++
        }

        galleryItems.push(galleryItem)
        successCount++
      } else {
        failCount++
      }
    }
  }

  if (successCount > 0 || failCount > 0) {
    const linkedInfo = linkedCount > 0 ? ` (${linkedCount} 張關聯變體)` : ''
    const failInfo = failCount > 0 ? `, ${failCount} 失敗` : ''
    addLog?.('info', `圖片: ${successCount} 成功${linkedInfo}${failInfo}`, product.title)
  }

  return galleryItems
}
