/**
 * EasyStore API Client
 * 
 * 功能：
 * 1. 分頁取得所有商品
 * 2. 取得商品變體詳情
 * 3. 取得商品圖片
 * 4. 錯誤處理與重試機制
 */

// ===== 類型定義 =====

export interface EasyStoreProduct {
  id: number
  title: string
  handle: string
  body_html: string | null
  vendor: string | null
  product_type: string | null
  created_at: string
  updated_at: string
  published_at: string | null
  status: 'active' | 'draft' | 'archived'
  variants: EasyStoreVariant[]
  options: EasyStoreOption[]
  images: EasyStoreImage[]
  tags: string | null
}

export interface EasyStoreVariant {
  id: number
  product_id: number
  title: string
  price: string
  compare_at_price: string | null
  sku: string | null
  barcode: string | null
  position: number
  inventory_quantity: number
  inventory_management: string | null
  option1: string | null
  option2: string | null
  option3: string | null
  weight: number
  weight_unit: string
  requires_shipping: boolean
  taxable: boolean
  image_id: number | null
}

export interface EasyStoreOption {
  id: number
  product_id: number
  name: string
  position: number
  values: string[]
}

export interface EasyStoreImage {
  id: number
  product_id: number
  position: number
  src: string
  alt: string | null
  width: number
  height: number
  variant_ids: number[]
}

interface EasyStoreApiResponse<T> {
  [key: string]: T
}

interface PaginatedResponse<T> {
  data: T[]
  hasMore: boolean
  nextPage: number | null
}

// ===== 設定 =====

const getConfig = () => {
  const storeUrl = process.env.EASYSTORE_STORE_URL
  const accessToken = process.env.EASYSTORE_ACCESS_TOKEN

  if (!storeUrl || !accessToken) {
    throw new Error('EasyStore API 憑證未設定。請檢查 EASYSTORE_STORE_URL 和 EASYSTORE_ACCESS_TOKEN 環境變數。')
  }

  return {
    baseUrl: `https://${storeUrl}.easy.co/api/3.0`,
    headers: {
      'EasyStore-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  }
}

// ===== API 請求工具 =====

/**
 * 發送 API 請求，帶有重試機制
 */
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<T> {
  let lastError: Error | null = null

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`EasyStore API 錯誤 (${response.status}): ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      lastError = error as Error
      console.warn(`API 請求失敗 (嘗試 ${i + 1}/${retries}):`, error)

      // 等待後重試（指數退避）
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)))
      }
    }
  }

  throw lastError || new Error('API 請求失敗')
}

// ===== 公開 API =====

/**
 * 取得商品總數
 */
export async function getProductCount(): Promise<number> {
  const config = getConfig()
  const url = `${config.baseUrl}/products/count.json`

  const response = await fetchWithRetry<{ count: number }>(url, {
    method: 'GET',
    headers: config.headers,
  })

  return response.count
}

/**
 * 取得單頁商品
 */
export async function getProductsPage(
  page = 1,
  limit = 250
): Promise<PaginatedResponse<EasyStoreProduct>> {
  const config = getConfig()
  const url = `${config.baseUrl}/products.json?page=${page}&limit=${limit}`

  const response = await fetchWithRetry<EasyStoreApiResponse<EasyStoreProduct[]>>(url, {
    method: 'GET',
    headers: config.headers,
  })

  const products = response.products || []

  return {
    data: products,
    hasMore: products.length === limit,
    nextPage: products.length === limit ? page + 1 : null,
  }
}

/**
 * 取得所有商品（自動分頁）
 */
export async function fetchAllProducts(
  onProgress?: (loaded: number, total: number) => void
): Promise<EasyStoreProduct[]> {
  const allProducts: EasyStoreProduct[] = []
  let page = 1
  let hasMore = true

  // 先取得總數
  const total = await getProductCount()
  console.log(`[EasyStore] 共有 ${total} 個商品待匯入`)

  while (hasMore) {
    const response = await getProductsPage(page, 250)
    allProducts.push(...response.data)

    console.log(`[EasyStore] 已載入 ${allProducts.length}/${total} 個商品`)
    onProgress?.(allProducts.length, total)

    hasMore = response.hasMore
    page = response.nextPage || page + 1

    // 避免 Rate Limiting，每頁之間等待 500ms
    if (hasMore) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  return allProducts
}

/**
 * 取得單一商品詳情
 */
export async function getProductById(productId: number): Promise<EasyStoreProduct> {
  const config = getConfig()
  const url = `${config.baseUrl}/products/${productId}.json`

  const response = await fetchWithRetry<{ product: EasyStoreProduct }>(url, {
    method: 'GET',
    headers: config.headers,
  })

  return response.product
}

/**
 * 下載圖片並轉換為 Buffer
 * 優化版本：縮短 timeout 和減少 retry 以加快匯入速度
 */
export async function downloadImage(
  imageUrl: string,
  options: { timeout?: number; retries?: number } = {}
): Promise<Buffer> {
  const { timeout = 8000, retries = 2 } = options  // 縮短 timeout 到 8 秒，減少 retry 到 2 次
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // 建立帶有 timeout 的 AbortController
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PayloadCMS/1.0)',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('圖片內容為空')
      }

      return Buffer.from(arrayBuffer)
    } catch (error) {
      lastError = error as Error
      const errorMsg = error instanceof Error ? error.message : '未知錯誤'
      console.warn(`[圖片下載] 嘗試 ${attempt}/${retries} 失敗: ${errorMsg} - ${imageUrl}`)

      if (attempt < retries) {
        // 短暫等待後重試
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
      }
    }
  }

  throw new Error(`圖片下載失敗 (${retries} 次嘗試): ${lastError?.message || '未知錯誤'}`)
}


/**
 * 測試 API 連線
 */
export async function testConnection(): Promise<{
  success: boolean
  productCount?: number
  error?: string
}> {
  try {
    const count = await getProductCount()
    return {
      success: true,
      productCount: count,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '連線失敗',
    }
  }
}
