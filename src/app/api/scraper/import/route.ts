import configPromise from '@payload-config'
import crypto from 'crypto'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * Scraper Import API
 * 將爬取的商品匯入到 Products Collection
 *
 * POST /api/scraper/import - 批次匯入商品
 *
 * 功能：
 * - 商品標題保留（用戶可自定義）
 * - 顏色名稱翻譯（日文 → 中文）- 使用 Freak Store 成熟系統邏輯
 * - SKU 自動生成（格式: FS-{hash4}-{colorCode}-{size}）- 使用 Freak Store 邏輯
 *
 * 參考：freak store批量上架系統/html_parser.py
 */

// ============================================
// Freak Store 批量上架系統 - 翻譯對照表
// 來源: freak store批量上架系統/html_parser.py
// ============================================

/**
 * 日文顏色 → SKU 縮寫代碼
 */
const COLOR_MAP: Record<string, string> = {
  'ブラック': 'BLK',
  'ホワイト': 'WHT',
  'グレー': 'GRY',
  'チャコール': 'CHC',
  'ネイビー': 'NVY',
  'ブルー': 'BLU',
  'ライトブルー': 'LBL',
  'ベージュ': 'BEI',
  'ブラウン': 'BRN',
  'カーキ': 'KHA',
  'オリーブ': 'OLV',
  'グリーン': 'GRN',
  'ダークグリーン': 'DGN',
  'イエロー': 'YEL',
  'マスタード': 'MUS',
  'オレンジ': 'ORG',
  'レッド': 'RED',
  'ピンク': 'PNK',
  'パープル': 'PUR',
  'ワイン': 'WIN',
  'アイボリー': 'IVY',
  'シルバー': 'SLV',
  'ゴールド': 'GLD',
  'ミント': 'MNT',
  'サックス': 'SAX',
  'モカ': 'MOC',
  'テラコッタ': 'TER',
  'ラベンダー': 'LAV',
  'スモーキーピンク': 'SPK',
  'スモーキーブルー': 'SBL',
  'スモーキーグリーン': 'SGN',
}

/**
 * 日文顏色 → 中文顯示名稱
 */
const COLOR_DISPLAY_MAP: Record<string, string> = {
  'ブラック': '黑色',
  'ホワイト': '白色',
  'グレー': '灰色',
  'チャコールグレー': '鐵灰',
  'ネイビー': '深藍',
  'ブルー': '藍色',
  'ライトブルー': '天空藍',
  'ベージュ': '奶茶',
  'ブラウン': '棕色',
  'カーキ': '卡其',
  'オリーブ': '軍綠',
  'グリーン': '綠色',
  'ダークグリーン': '深綠',
  'イエロー': '黃色',
  'マスタード': '奶黃',
  'オレンジ': '橘色',
  'レッド': '紅色',
  'ピンク': '淡粉',
  'パープル': '紫色',
  'ワイン': '酒紅',
  'アイボリー': '象牙白',
  'シルバー': '銀色',
  'ゴールド': '金色',
  'ミント': '薄荷綠',
  'サックス': '丹寧藍',
  'モカ': '摩卡',
  'テラコッタ': '赤土色',
  'ラベンダー': '薰衣草紫',
  'スモーキーピンク': '煙燻粉',
  'スモーキーブルー': '煙燻藍',
  'スモーキーグリーン': '煙燻綠',
  'ライトグレー': '亮灰',
  'ワインレッド': '酒紅',
  'サックスブルー': '靛藍',
  'チャコール': '炭灰',
  'ダークブラウン': '深棕',
  'ライトベージュ': '淺奶茶',
  'ダークネイビー': '深海軍藍',
  'クリーム': '奶油色',
  'キャメル': '駝色',
  'マルーン': '栗色',
  'インディゴ': '靛藍',
  'コーラル': '珊瑚色',
  'ターコイズ': '土耳其藍',
  'バーガンディ': '酒紅',
  'マゼンタ': '洋紅',
  'シアン': '青色',
}

/**
 * 尺寸表部位 日文 → 中文
 */
const DIMENSION_LABEL_MAP: Record<string, string> = {
  // 衣服／褲子
  'ウエスト': '腰圍',
  'ヒップ': '臀圍',
  '股上': '褲襠',
  '股下': '褲長',
  '着丈': '衣長',
  '肩幅': '肩寬',
  '身幅': '胸寬',
  '袖丈': '袖長',
  'そで丈': '袖長',
  // 帽子
  '内周': '頭圍',
  '深さ': '帽深',
  'つば幅': '簷寬',
  'つば長': '簷長',
  // 鞋子
  '長さ': '鞋長',
  'かかと高さ': '鞋跟高',
  // 包包
  '縦': '長',
  '横': '寬',
  '幅': '寬',
  '高さ': '長',
  '持ち手高さ': '提把高',
  'ショルダー長さ': '揹帶長度',
  'ショルダ': '揹帶長度',
  'マチ': '包包深度',
  '直徑': '直徑',
}

/**
 * 庫存狀態 日文 → 數量
 */
const STOCK_STATUS_MAP: Record<string, number> = {
  '残りわずか': 0,  // 剩餘少量 → 視為缺貨
  '在庫あり': 10,
  '取り寄せ': 5,
  '在庫なし': 0,
  '予約': 7,
  '予約する': 7,  // 預約按鈕狀態
  '残り1点': 1,
}

// 驗證 Admin 權限
async function verifyAdminAccess() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await headers()

  try {
    const { user } = await payload.auth({ headers: headersList })

    if (!user) return null

    const userRoles = (user as any).roles || []
    const isAdmin = userRoles.includes('admin') || userRoles.includes('superAdmin')

    if (!isAdmin) return null

    return user
  } catch {
    return null
  }
}

// POST: 批次匯入商品
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAccess()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productIds, options = {} } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or empty productIds array' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config: configPromise })

    // 取得爬蟲設定（定價、翻譯）
    const settings = await payload.findGlobal({
      slug: 'scraper-settings',
    })

    const results = {
      imported: 0,
      failed: 0,
      errors: [] as string[],
    }

    // 批次處理
    for (const scrapedId of productIds) {
      try {
        // 取得爬取的商品資料
        const scrapedProduct = await payload.findByID({
          collection: 'scraped-products',
          id: scrapedId,
          depth: 2,
        })

        if (!scrapedProduct) {
          results.failed++
          results.errors.push(`Product ${scrapedId} not found`)
          continue
        }

        // 檢查是否已匯入
        if ((scrapedProduct as any).importStatus === 'imported') {
          results.failed++
          results.errors.push(`Product ${scrapedId} already imported`)
          continue
        }

        // 執行匯入
        const importedProduct = await importSingleProduct(
          payload,
          scrapedProduct as any,
          settings as any,
          options,
        )

        if (importedProduct) {
          // 更新匯入狀態，並清除 Base64 數據以釋放 MongoDB 空間
          // 保留 imageUrls 結構但移除 base64 欄位
          const scrapedProductData = scrapedProduct as any
          const cleanedImageUrls = scrapedProductData.imageUrls?.map((img: any) => ({
            url: img.url,
            colorName: img.colorName,
            // 不保留 base64，釋放 MongoDB 空間
          })) || []

          await payload.update({
            collection: 'scraped-products',
            id: scrapedId,
            data: {
              importStatus: 'imported',
              importedProduct: importedProduct.id,
              imageUrls: cleanedImageUrls,
            },
          })

          console.log(`[Import] Cleaned Base64 data for ${scrapedId}, freed ~${Math.round((scrapedProductData.imageUrls?.reduce((sum: number, img: any) => sum + (img.base64?.length || 0), 0) || 0) / 1024)}KB`)

          results.imported++
        } else {
          results.failed++
          results.errors.push(`Failed to import product ${scrapedId}`)
        }
      } catch (err: any) {
        results.failed++
        const errorDetail = err.message || 'Unknown error'
        console.error(`[Import] Failed to import ${scrapedId}:`, {
          message: err.message,
          stack: err.stack,
          data: err.data,
        })
        results.errors.push(`${scrapedId}: ${errorDetail}`)
      }
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('Scraper Import error:', error)
    return NextResponse.json({ success: false, error: 'Import failed' }, { status: 500 })
  }
}

/**
 * 匯入單一商品
 */
async function importSingleProduct(
  payload: any,
  scrapedProduct: any,
  settings: any,
  options: any,
): Promise<any> {
  // ScrapedProducts 欄位對應：
  // - originalPrice (number) - 原價
  // - salePrice (number) - 特價
  // - calculatedPrice (number) - 計算後售價
  // - imageUrls (array) - 圖片列表 [{url, colorName}]
  // - variants (json) - 變體資料
  // - description (text) - 原始描述
  // - translatedDescription (text) - 翻譯描述

  // 1. 使用已計算的售價或重新計算
  const calculatedPrice = scrapedProduct.calculatedPrice || calculatePrice(
    scrapedProduct.originalPrice || 0,
    settings?.pricing || {},
  )

  // 2. 獲取商品標題（優先使用已翻譯的標題）
  const translatedTitle = getProductTitle(scrapedProduct)

  // 3. 生成 Slug（使用原始英文標題以確保 URL 友善）
  const slug = generateSlug(scrapedProduct.originalTitle, scrapedProduct.externalId)

  // 4. 檢查是否已存在（根據 externalUrl 或 slug）
  const existing = await payload.find({
    collection: 'products',
    where: {
      or: [
        { slug: { equals: slug } },
        { externalUrl: { equals: scrapedProduct.externalUrl } },
      ],
    },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    // 更新現有商品
    if (options.updateExisting) {
      // 重新生成描述（包含新的尺寸表）
      const updateDescriptionHtml = generateProductDescriptionHtml(scrapedProduct.sizeChart)
      const updateDescriptionLexical = htmlToLexicalJson(updateDescriptionHtml)

      const updateData: Record<string, any> = {
        title: translatedTitle,
        priceInTWDEnabled: true,
        priceInTWD: calculatedPrice,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'synced',
      }

      // 只有當有尺寸表數據時才更新描述
      if (scrapedProduct.sizeChart && Object.keys(scrapedProduct.sizeChart).length > 0) {
        updateData.description = updateDescriptionLexical
        console.log(`[Import] Updating product with size chart data`)
      }

      return payload.update({
        collection: 'products',
        id: existing.docs[0].id,
        data: updateData,
      })
    }
    return existing.docs[0]
  }

  // 5. 處理圖片（下載或引用）- 使用 imageUrls 欄位
  // 準備圖片來源列表
  let imageSources = scrapedProduct.imageUrls || []

  console.log(`[Import] ScrapedProduct 圖片資料:`, {
    hasImageUrls: !!scrapedProduct.imageUrls,
    isArray: Array.isArray(scrapedProduct.imageUrls),
    imageUrlsLength: scrapedProduct.imageUrls?.length || 0,
    firstImage: scrapedProduct.imageUrls?.[0] ? {
      hasUrl: !!scrapedProduct.imageUrls[0].url,
      url: scrapedProduct.imageUrls[0].url?.substring(0, 50) + '...',
      hasBase64: !!scrapedProduct.imageUrls[0].base64,
      base64Length: scrapedProduct.imageUrls[0].base64?.length || 0,
      colorName: scrapedProduct.imageUrls[0].colorName,
    } : 'no images in imageUrls',
    thumbnailUrl: scrapedProduct.thumbnailUrl || 'none',
  })

  // 如果 imageUrls 為空但有 thumbnailUrl，使用 thumbnailUrl 作為備用
  if ((!imageSources || imageSources.length === 0) && scrapedProduct.thumbnailUrl) {
    console.log(`[Import] imageUrls 為空，使用 thumbnailUrl 作為備用: ${scrapedProduct.thumbnailUrl}`)
    imageSources = [{ url: scrapedProduct.thumbnailUrl, colorName: '', base64: '' }]
  }

  const processedImages = await processImages(payload, imageSources)

  // 6. 處理變體（variants 是 JSON 欄位）
  // 包含顏色翻譯和 SKU 生成（使用 Freak Store 邏輯）
  const variantData = await processVariants(
    payload,
    scrapedProduct.variants || [],
    calculatedPrice,
    scrapedProduct.originalTitle || '', // 傳入原始商品名稱供 SKU 生成使用
  )

  // 6.1 建立圖片顏色映射（日文顏色 → 變體選項 ID）
  // 需要從 variantData.colorOptionMap 中查找對應的選項 ID

  // 6.5 取得預設 vendor（第一個可用的商家）- 必填欄位
  let defaultVendorId: string | null = null
  try {
    const vendors = await payload.find({
      collection: 'vendors',
      limit: 1,
    })
    if (vendors.docs.length > 0) {
      defaultVendorId = vendors.docs[0].id
    }
  } catch (err) {
    console.error('Failed to get default vendor:', err)
  }

  // vendor 是必填欄位，如果沒有商家則無法匯入
  if (!defaultVendorId) {
    throw new Error('No vendor found. Please create at least one vendor before importing products.')
  }

  // gallery 是必填欄位 (minRows: 1)，如果沒有圖片則無法匯入
  if (processedImages.length === 0) {
    const imageUrlsCount = scrapedProduct.imageUrls?.length || 0
    const hasBase64 = scrapedProduct.imageUrls?.some((img: any) => img.base64) || false
    const hasThumbnail = !!scrapedProduct.thumbnailUrl

    // 詳細診斷：檢查第一張圖片的 base64 資料
    const firstImg = scrapedProduct.imageUrls?.[0]
    const firstImgDiag = firstImg ? {
      base64Type: typeof firstImg.base64,
      base64Length: firstImg.base64?.length || 0,
      base64First50: firstImg.base64?.substring(0, 50) || 'N/A',
      base64StartsWithData: firstImg.base64?.startsWith('data:') || false,
    } : 'no first image'

    throw new Error(
      `無法處理圖片。原始資料: imageUrls=${imageUrlsCount}張, 有Base64=${hasBase64}, thumbnailUrl=${hasThumbnail ? '有' : '無'}。` +
      `第一張圖片診斷: ${JSON.stringify(firstImgDiag)}。` +
      `可能原因: 1) Base64格式不正確 2) 圖片URL下載失敗`
    )
  }

  // 7. 建立商品
  // 生成商品描述：固定模板 + 動態尺寸表
  const descriptionHtml = generateProductDescriptionHtml(scrapedProduct.sizeChart)
  const descriptionLexical = htmlToLexicalJson(descriptionHtml)

  const originalPriceJPY = scrapedProduct.originalPrice || 0

  console.log(`[Import] Creating product:`, {
    title: translatedTitle,
    slug,
    calculatedPrice,
    originalPriceJPY,
    vendorId: defaultVendorId,
    imagesCount: processedImages.length,
    variantsCount: variantData.variants.length,
  })

  const newProduct = await payload.create({
    collection: 'products',
    data: {
      title: translatedTitle,
      slug,
      _status: 'draft', // 預設為草稿
      // 價格設定 - 使用 ecommerce plugin 的價格欄位結構
      priceInTWDEnabled: true,
      priceInTWD: calculatedPrice,
      // 原價 JPY 供參考
      priceInJPYEnabled: true,
      priceInJPY: originalPriceJPY,
      // 商品描述：固定模板 + 動態尺寸表
      description: descriptionLexical,
      // 建立 gallery，並關聯圖片到對應的顏色變體選項
      // 注意：先建立產品，稍後再更新圖片的變體關聯（避免變體選項尚未建立）
      gallery: processedImages.map((img) => ({
        image: img.mediaId,
        // 暫時不設定 variantOption，等變體建立完成後再更新
      })),
      ...(variantData.variantTypes.length > 0 && {
        enableVariants: true,
        variantTypes: variantData.variantTypes,
      }),
      // Vendor（必填）- 已在上方驗證存在
      vendor: defaultVendorId,
      // 外部來源資料
      externalSource: 'freaks', // Daytona Park is FREAK'S STORE
      externalId: scrapedProduct.externalId,
      externalUrl: scrapedProduct.externalUrl,
      lastSyncedAt: new Date().toISOString(),
      syncStatus: 'synced',
    },
  })

  // 8. 建立變體（如果有）
  if (variantData.variants.length > 0) {
    console.log(`[Import] Creating ${variantData.variants.length} variants for product ${newProduct.id}`)

    for (const variant of variantData.variants) {
      try {
        console.log(`[Import] Creating variant:`, {
          title: variant.title,
          options: variant.options,
          optionsCount: variant.options?.length,
          inventory: variant.inventory,
          sku: variant.sku,
        })

        await payload.create({
          collection: 'variants',
          data: {
            ...variant,
            product: newProduct.id,
          },
        })
      } catch (variantError: any) {
        console.error(`[Import] Failed to create variant:`, {
          error: variantError.message,
          variant: variant.title,
          options: variant.options,
        })
        // Continue with other variants instead of failing completely
      }
    }
  }

  // 9. 更新 gallery 圖片的顏色關聯
  // 使用 colorOptionMap 將圖片連結到對應的變體選項
  if (Object.keys(variantData.colorOptionMap).length > 0 && processedImages.length > 0) {
    console.log(`[Import] Updating gallery with color associations...`)
    console.log(`[Import] colorOptionMap:`, variantData.colorOptionMap)

    const updatedGallery = processedImages.map((img) => {
      const galleryItem: { image: string; variantOption?: string } = {
        image: img.mediaId,
      }

      // 如果圖片有顏色名稱，查找對應的變體選項 ID
      if (img.colorName && variantData.colorOptionMap[img.colorName]) {
        galleryItem.variantOption = variantData.colorOptionMap[img.colorName]
        console.log(`[Import] Linked image ${img.mediaId} to color option: ${img.colorName} -> ${galleryItem.variantOption}`)
      }

      return galleryItem
    })

    // 更新商品的 gallery
    try {
      await payload.update({
        collection: 'products',
        id: newProduct.id,
        data: {
          gallery: updatedGallery,
        },
      })
      console.log(`[Import] Successfully updated gallery with ${updatedGallery.filter(g => g.variantOption).length} color-linked images`)
    } catch (galleryError: any) {
      console.error(`[Import] Failed to update gallery:`, galleryError.message)
    }
  }

  return newProduct
}

/**
 * 計算售價
 * @param originalPriceJPY 原價（日圓）
 * @param pricingSettings 定價設定（包含 tiers 和 defaultExchangeRate）
 */
function calculatePrice(originalPriceJPY: number, pricingSettings: any): number {
  if (!originalPriceJPY) {
    return 0
  }

  const tiers = pricingSettings?.tiers || []
  const defaultExchangeRate = pricingSettings?.defaultExchangeRate || 0.21

  if (tiers.length === 0) {
    // 沒有 tiers，使用簡單計算
    return Math.ceil(originalPriceJPY * defaultExchangeRate)
  }

  // 找到適用的價格層級
  // 注意：Tier 2 的 maxPrice 可能是 null（表示無上限）
  const tier = tiers.find(
    (t: any) => {
      const inMin = originalPriceJPY >= (t.minPrice || 0)
      const inMax = t.maxPrice === null || t.maxPrice === undefined || originalPriceJPY <= t.maxPrice
      return inMin && inMax
    },
  ) || tiers[tiers.length - 1]

  if (!tier) {
    return Math.ceil(originalPriceJPY * defaultExchangeRate)
  }

  // 計算：(原價 × 匯率 × 稅率乘數) + 手續費 + 運費
  // 匯率優先使用 tier.exchangeRate，否則使用 defaultExchangeRate
  const exchangeRate = tier.exchangeRate || defaultExchangeRate
  const taxMultiplier = tier.taxMultiplier || 1
  const handlingFee = tier.handlingFee || 0
  // 使用 shippingFee（設定中的實際欄位名稱）
  const shippingFee = tier.shippingFee || tier.internationalShipping || 0

  const basePrice = originalPriceJPY * exchangeRate * taxMultiplier
  const totalPrice = basePrice + handlingFee + shippingFee

  // 進位（預設進位到 10 的倍數）
  const roundTo = tier.roundTo || 10
  return Math.ceil(totalPrice / roundTo) * roundTo
}

/**
 * 日文商品名稱翻譯對照表
 * 常見服飾類商品關鍵字
 */
const TITLE_TRANSLATION_MAP: Record<string, string> = {
  // 服裝類型
  'ブルゾン': '夾克',
  'ジャケット': '外套',
  'コート': '大衣',
  'パーカー': '連帽衫',
  'スウェット': '衛衣',
  'カーディガン': '針織開衫',
  'ベスト': '背心',
  'シャツ': '襯衫',
  'Tシャツ': 'T恤',
  'ポロシャツ': 'Polo衫',
  'ニット': '針織衫',
  'セーター': '毛衣',
  'パンツ': '褲子',
  'ズボン': '褲子',
  'ジーンズ': '牛仔褲',
  'デニム': '丹寧',
  'スカート': '裙子',
  'ワンピース': '連身裙',
  'ドレス': '洋裝',
  'ショーツ': '短褲',
  'ショートパンツ': '短褲',
  // 風格/特徵
  'ビッグシルエット': '寬版',
  'オーバーサイズ': '寬鬆版型',
  'スリム': '修身',
  'ワイド': '寬版',
  'ルーズ': '寬鬆',
  'ロング': '長版',
  'ショート': '短版',
  'ミリタリー': '軍裝風',
  'カジュアル': '休閒',
  'フォーマル': '正式',
  'ヴィンテージ': '復古',
  'クラシック': '經典',
  'モダン': '現代',
  // 材質/圖案
  'リップストップ': '防撕裂布',
  'カモフラージュ': '迷彩',
  'ストライプ': '條紋',
  'チェック': '格紋',
  'ドット': '圓點',
  'フラワー': '花卉',
  'ボーダー': '橫條紋',
  'コットン': '棉質',
  'ウール': '羊毛',
  'リネン': '亞麻',
  'ポリエステル': '聚酯纖維',
  'ナイロン': '尼龍',
  'レザー': '皮革',
  'スウェード': '麂皮',
  // 細節
  'スピンドル': '束繩',
  'フード': '連帽',
  'ジップ': '拉鏈',
  'ボタン': '鈕扣',
  'ポケット': '口袋',
  '柄': '圖案',
  '無地': '素面',
}

/**
 * 翻譯商品標題（日文 → 中文）
 * 使用關鍵字替換方式翻譯
 */
function translateTitle(japaneseTitle: string): string {
  if (!japaneseTitle) return ''

  let translated = japaneseTitle

  // 按照關鍵字長度排序（先翻譯長的，避免部分匹配問題）
  const sortedKeys = Object.keys(TITLE_TRANSLATION_MAP).sort((a, b) => b.length - a.length)

  for (const jp of sortedKeys) {
    const zh = TITLE_TRANSLATION_MAP[jp]
    translated = translated.replace(new RegExp(jp, 'g'), zh)
  }

  return translated
}

/**
 * 獲取商品標題（優先翻譯後的標題）
 */
function getProductTitle(scrapedProduct: any): string {
  // 優先使用已翻譯的標題
  if (scrapedProduct.translatedTitle) {
    return scrapedProduct.translatedTitle
  }

  // 自動翻譯原始標題
  if (scrapedProduct.originalTitle) {
    const translated = translateTitle(scrapedProduct.originalTitle)
    // 如果有翻譯變化，使用翻譯版本
    if (translated !== scrapedProduct.originalTitle) {
      return translated
    }
  }

  // Fallback 使用原始標題
  return scrapedProduct.originalTitle || ''
}

/**
 * 翻譯顏色名稱（日文 → 中文）
 * 使用 Freak Store 批量上架系統的 COLOR_DISPLAY_MAP
 */
function translateColor(japaneseColor: string): string {
  if (!japaneseColor) return ''

  // 1. 精確匹配
  const exactMatch = COLOR_DISPLAY_MAP[japaneseColor]
  if (exactMatch) return exactMatch

  // 2. 部分匹配（檢查日文顏色是否包含在輸入中）
  for (const [jp, zh] of Object.entries(COLOR_DISPLAY_MAP)) {
    if (japaneseColor.includes(jp)) {
      return zh
    }
  }

  // 3. 無法翻譯則返回原文
  return japaneseColor
}

/**
 * 獲取顏色代碼（用於 SKU）
 * 使用 Freak Store 批量上架系統的 COLOR_MAP
 * 格式：3字元大寫代碼（BLK, WHT, NVY 等）
 */
function simplifyColorName(colorName: string): string {
  if (!colorName) return 'UNK'

  // 1. 精確匹配
  const exactCode = COLOR_MAP[colorName]
  if (exactCode) return exactCode

  // 2. 部分匹配
  for (const [jp, code] of Object.entries(COLOR_MAP)) {
    if (colorName.includes(jp)) {
      return code
    }
  }

  // 3. 無法匹配返回 UNK
  return 'UNK'
}

/**
 * 生成短哈希值
 * 使用 MD5 取前4位大寫
 * 來源: Freak Store html_parser.py - short_hash()
 */
function shortHash(text: string, length: number = 4): string {
  const hash = crypto.createHash('md5').update(text, 'utf8').digest('hex')
  return hash.substring(0, length).toUpperCase()
}

/**
 * 生成 SKU
 * 格式: FS-{hash4}-{colorCode}-{size}
 * 來源: Freak Store html_parser.py - generate_sku()
 *
 * @param productName 商品名稱（原始日文）
 * @param color 顏色（原始日文）
 * @param size 尺寸
 */
function generateSKU(productName: string, color: string, size: string): string {
  const prefix = 'FS' // Freak Store prefix
  const colorCode = simplifyColorName(color)
  const hashPart = shortHash(`${productName}-${color}-${size}`)
  return `${prefix}-${hashPart}-${colorCode}-${size}`
}

/**
 * 翻譯尺寸表部位名稱
 * 使用 Freak Store 批量上架系統的 DIMENSION_LABEL_MAP
 * 註：此函數保留供未來處理尺寸表描述時使用
 */
function _translateDimensionLabel(japaneseLabel: string): string {
  if (!japaneseLabel) return ''

  const translated = DIMENSION_LABEL_MAP[japaneseLabel]
  return translated || japaneseLabel
}

// Export for potential future use in description processing
export { _translateDimensionLabel as translateDimensionLabel }

/**
 * Freak Store 商品描述 HTML 模板
 * 來源: freak store批量上架系統/config.py - DEFAULT_HTML_TEMPLATE
 */
const DEFAULT_HTML_TEMPLATE = `<p style="box-sizing: inherit;"><strong><span style="color: rgb(235, 107, 86);">＊此商品為「</span><span style="box-sizing: inherit; color: rgb(235, 107, 86);">預購商品</span><span style="color: rgb(235, 107, 86);">」，付款完成後訂單才成立！</span></strong></p>
<ul style='font-size: 16px; font-style: normal; font-variant-caps: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration: none; box-sizing: inherit; caret-color: rgba(51, 51, 51, 0.75); color: rgba(51, 51, 51, 0.75); font-weight: 700; letter-spacing: 0.6px; font-family: HelveticaNeue, "Helvetica Neue", Helvetica, Arial, sans-serif;'>
<li style="box-sizing: inherit;">現貨：<span style="box-sizing: inherit; font-weight: 700;">２</span>天內寄出，約<span style="box-sizing: inherit; font-weight: 700;">２-３</span>天到貨。</li>
<li style="box-sizing: inherit;">預購：下單後約 7<span style="box-sizing: inherit; font-weight: 700;">-14 個工作天(不包含週末例假)安排出貨</span>，約<span style="box-sizing: inherit; font-weight: 700;">２-３</span>天到貨。</li>
</ul>
<p><span style="font-size: 18px;"><strong><span style="color: rgb(201, 145, 93);">商品規格</span></strong></span></p>
<p>尺寸表</p>
<p>{size_table}</p>
<p></p>
<p data-empty="true"><strong><span style="font-size: 18px; color: rgb(201, 145, 93);">⚠️ 購物須知</span></strong></p>
<ol>
<li>下單前請確認價錢、尺寸、顏色、數量。</li>
<li>代購商品屬客製化給付，不適用於七天鑑賞期。</li>
<li>售出後若無重大瑕疵，一律無法提供退換貨。</li>
<li>為保護雙方權益，開箱前請全程錄影。</li>
</ol>
<ul>
<li><span style="font-size: 14px;">下單前請詳閱</span><span style="font-size: 18px;">&nbsp;<a href="https://takemejapan.easy.co/pages/%E8%B3%BC%E8%B2%B7%E9%A0%88%E7%9F%A5%E5%8F%8A%E9%80%80%E8%B2%A8%E8%B3%87%E8%A8%8A" rel="noopener noreferrer" target="_blank">購物須知</a> 、 <a href="https://takemejapan.easy.co/pages/%E9%80%80%E6%8F%9B%E8%B2%A8%E8%AA%AA%E6%98%8E" rel="noopener noreferrer" target="_blank">退換貨說明</a>&nbsp;</span></li>
<li><span style="font-size: 14px;">對商品有任何疑問請先諮詢</span><span style="font-size: 18px;">&nbsp;</span><a href="https://line.me/R/ti/p/@968mrafh"><strong><span style="font-size: 18px; color: rgb(255, 255, 255); background-color: rgb(65, 168, 95);">LINE線上客服</span></strong></a>&nbsp;&nbsp;&nbsp;( 客服時間：12:00-21:00 )</li>
</ul>`

/**
 * 解析尺寸表資料為可讀格式
 * 來源: freak store批量上架系統/html_parser.py - parse_size_table_html()
 *
 * @param sizeChart 尺寸表資料（JSON 或 HTML 字串）
 * @returns 格式化的尺寸表文字
 */
function parseSizeChart(sizeChart: any): string {
  if (!sizeChart) return '尺寸表資訊請參考商品圖片'

  // 如果是字串（HTML 或已格式化的文字）
  if (typeof sizeChart === 'string') {
    // 如果已經是格式化的文字（包含 cm），直接返回
    if (sizeChart.includes('cm') || sizeChart.includes('：')) {
      return sizeChart
    }
    // 嘗試解析 HTML
    return sizeChart
  }

  // 如果是 JSON 物件陣列（Daytona Park 格式）
  // 格式: [{ size: 'M', measurements: { '着丈': 70, '身幅': 55 } }, ...]
  if (Array.isArray(sizeChart)) {
    const lines: string[] = []

    for (const row of sizeChart) {
      if (row.size && row.measurements) {
        const parts: string[] = []
        for (const [key, value] of Object.entries(row.measurements)) {
          // 翻譯測量項目名稱
          const translatedKey = DIMENSION_LABEL_MAP[key] || key
          parts.push(`${translatedKey} ${value}`)
        }
        lines.push(`${row.size}：${parts.join(' / ')}cm`)
      }
    }

    if (lines.length > 0) {
      return lines.join('<br/>')
    }
  }

  // 如果是 JSON 物件（直接 key-value 格式）
  if (typeof sizeChart === 'object') {
    const lines: string[] = []

    for (const [size, measurements] of Object.entries(sizeChart)) {
      if (typeof measurements === 'object' && measurements !== null) {
        const parts: string[] = []
        for (const [key, value] of Object.entries(measurements as Record<string, any>)) {
          const translatedKey = DIMENSION_LABEL_MAP[key] || key
          parts.push(`${translatedKey} ${value}`)
        }
        lines.push(`${size}：${parts.join(' / ')}cm`)
      }
    }

    if (lines.length > 0) {
      return lines.join('<br/>')
    }
  }

  return '尺寸表資訊請參考商品圖片'
}

/**
 * 生成商品描述 HTML
 * 結合固定模板 + 動態尺寸表
 */
function generateProductDescriptionHtml(sizeChart: any): string {
  const sizeTableContent = parseSizeChart(sizeChart)
  return DEFAULT_HTML_TEMPLATE.replace('{size_table}', sizeTableContent)
}

/**
 * 將 HTML 轉換為 Payload CMS Lexical JSON 格式
 * 簡化版本：將 HTML 作為純文字段落處理
 */
function htmlToLexicalJson(html: string): any {
  // 移除 HTML 標籤，保留純文字（簡化處理）
  // 實際上 Payload 的 richText 編輯器會自動處理 HTML
  const textContent = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // 將文字分割成段落
  const paragraphs = textContent.split('\n\n').filter(p => p.trim())

  const children = paragraphs.map(paragraph => ({
    type: 'paragraph',
    version: 1,
    children: paragraph.split('\n').map(line => ({
      type: 'text',
      text: line.trim(),
      format: 0,
      detail: 0,
      mode: 'normal',
      style: '',
      version: 1,
    })).reduce((acc: any[], item, index, array) => {
      acc.push(item)
      // 在每行之間加入換行（除了最後一行）
      if (index < array.length - 1) {
        acc.push({ type: 'linebreak', version: 1 })
      }
      return acc
    }, []),
  }))

  return {
    root: {
      type: 'root',
      children: children.length > 0 ? children : [{
        type: 'paragraph',
        version: 1,
        children: [{
          type: 'text',
          text: '',
          format: 0,
          detail: 0,
          mode: 'normal',
          style: '',
          version: 1,
        }],
      }],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

/**
 * 將日文庫存狀態轉換為數量
 * 使用 Freak Store 批量上架系統的 STOCK_STATUS_MAP
 */
function getStockQuantity(stockStatus: string): number {
  if (!stockStatus) return 10 // 預設庫存

  const qty = STOCK_STATUS_MAP[stockStatus]
  return qty !== undefined ? qty : 10
}

/**
 * 生成 Slug
 */
function generateSlug(title: string, externalId?: string): string {
  // 移除中文和特殊字符，只保留英數字和連字號
  let slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 移除特殊字符
    .replace(/\s+/g, '-') // 空格轉連字號
    .replace(/-+/g, '-') // 合併多個連字號
    .replace(/^-|-$/g, '') // 移除首尾連字號

  // 如果 slug 太短或全是中文，使用外部 ID
  if (slug.length < 3 && externalId) {
    slug = `product-${externalId}`
  }

  // 加入時間戳確保唯一
  const timestamp = Date.now().toString(36)
  return `${slug}-${timestamp}`
}

/**
 * 圖片處理結果
 */
type ProcessedImage = {
  mediaId: string
  colorName: string // 原始日文顏色名稱
}

/**
 * 從 Base64 字串提取 MIME 類型和資料
 */
function parseBase64Image(base64String: string): { mimetype: string; data: Buffer } | null {
  try {
    // 詳細日誌：檢查輸入
    console.log(`[Import] parseBase64Image called with string of length: ${base64String?.length || 0}`)

    if (!base64String) {
      console.error('[Import] Base64 string is empty or undefined')
      return null
    }

    // 檢查格式
    const startsCorrectly = base64String.startsWith('data:')
    const hasBase64Marker = base64String.includes(';base64,')
    console.log(`[Import] Format check: startsWithData=${startsCorrectly}, hasBase64Marker=${hasBase64Marker}`)
    console.log(`[Import] First 80 chars: ${base64String.substring(0, 80)}`)

    // 格式: data:image/jpeg;base64,/9j/4AAQSkZ...
    const matches = base64String.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) {
      console.error('[Import] Invalid base64 format - regex did not match')
      console.error(`[Import] String preview: "${base64String.substring(0, 100)}..."`)
      return null
    }

    const mimetype = matches[1]
    const base64Data = matches[2]
    console.log(`[Import] Parsed mimetype: ${mimetype}, base64Data length: ${base64Data.length}`)

    const data = Buffer.from(base64Data, 'base64')
    console.log(`[Import] Created buffer of size: ${data.length} bytes`)

    return { mimetype, data }
  } catch (err) {
    console.error('[Import] Failed to parse base64:', err)
    return null
  }
}

/**
 * 處理圖片（含顏色關聯）
 * 支援兩種模式：
 * 1. Base64 模式：圖片已由 Chrome Extension 下載並編碼為 Base64
 * 2. URL 模式：後端直接下載圖片（可能因地理限制失敗）
 *
 * 注意：暫不支援重複檢測，每次匯入都會建立新圖片
 */
async function processImages(
  payload: any,
  images: any[],
  maxImages: number = 40,
): Promise<ProcessedImage[]> {
  const processedImages: ProcessedImage[] = []

  // 計算有多少圖片帶有 Base64 資料
  const imagesWithBase64 = images.filter((img) => img.base64)
  console.log(
    `[Import] Processing ${images.length} images (${imagesWithBase64.length} with Base64, max ${maxImages})`,
  )

  // 詳細顯示圖片資訊
  for (let i = 0; i < Math.min(images.length, 3); i++) {
    const img = images[i]
    console.log(`[Import] Image ${i + 1} details:`, {
      hasUrl: !!img.url,
      urlPreview: img.url?.substring(0, 50),
      hasBase64: !!img.base64,
      base64Type: typeof img.base64,
      base64Length: img.base64?.length || 0,
      base64Preview: img.base64?.substring(0, 50),
      colorName: img.colorName || 'none',
    })
  }

  let imageIndex = 0
  for (const image of images.slice(0, maxImages)) {
    imageIndex++
    try {
      const url = image.originalUrl || image.url
      const colorName = image.colorName || '' // 日文顏色名稱
      const base64 = image.base64

      console.log(`[Import] Processing image ${imageIndex}/${Math.min(images.length, maxImages)}:`, {
        hasUrl: !!url,
        hasBase64: !!base64,
        base64Type: typeof base64,
        base64Length: base64?.length || 0,
      })

      // 取得檔名
      const urlParts = (url || '').split('/')
      let filename = urlParts[urlParts.length - 1]?.split('?')[0] || `image-${Date.now()}.jpg`

      // 方式 1：使用 Base64 資料（優先，由 Chrome Extension 提供）
      if (base64) {
        console.log(`[Import] Image ${imageIndex}: Attempting to parse base64 (length: ${base64.length})`)
        const parsed = parseBase64Image(base64)
        if (!parsed) {
          console.log(`[Import] Image ${imageIndex}: Failed to parse base64 for: ${filename}`)
          continue
        }
        console.log(`[Import] Image ${imageIndex}: Successfully parsed base64, buffer size: ${parsed.data.length}`)

        // 根據 MIME 類型調整副檔名
        const extMap: Record<string, string> = {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/gif': '.gif',
          'image/webp': '.webp',
        }
        const ext = extMap[parsed.mimetype] || '.jpg'
        if (!filename.includes('.')) {
          filename = `${filename}${ext}`
        }

        console.log(
          `[Import] Processing Base64 image: ${filename} (${Math.round(parsed.data.length / 1024)}KB, color: ${colorName || 'none'})`,
        )

        // 使用 Payload Local API 上傳
        const media = await payload.create({
          collection: 'media',
          data: {
            alt: colorName || filename, // 使用顏色名稱作為 alt
          },
          file: {
            data: parsed.data,
            mimetype: parsed.mimetype,
            name: filename,
            size: parsed.data.length,
          },
        })

        console.log(`[Import] Created media ID: ${media.id} for color: ${colorName || 'none'}`)

        processedImages.push({
          mediaId: media.id,
          colorName, // 保留原始日文顏色名稱，後續用於關聯變體選項
        })
        continue
      }

      // 方式 2：URL 下載（Fallback，可能因地理限制失敗）
      if (!url) {
        console.log(`[Import] Skipping image with no URL and no Base64`)
        continue
      }

      // 檢查是否是佔位符圖片
      if (url.includes('picsum.photos') || url.includes('placeholder')) {
        console.log(`[Import] Skipping placeholder image: ${url}`)
        continue
      }

      console.log(`[Import] Downloading image from URL: ${url} (color: ${colorName || 'none'})`)

      // 下載圖片 - 嘗試多種方式
      let response: Response | null = null
      let downloadError = ''

      // 方式 1: 帶 Referer 的請求
      try {
        response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'ja,en;q=0.9',
            'Referer': 'https://www.daytona-park.com/',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
            'sec-ch-ua-platform': '"macOS"',
          },
        })
        if (!response.ok) {
          downloadError = `Status ${response.status}`
          response = null
        }
      } catch (err: any) {
        downloadError = err.message
      }

      // 方式 2: 簡單請求（某些 CDN 不需要特殊 headers）
      if (!response) {
        try {
          console.log(`[Import] 嘗試簡單下載方式...`)
          response = await fetch(url)
          if (!response.ok) {
            downloadError = `Simple fetch status ${response.status}`
            response = null
          }
        } catch (err: any) {
          downloadError += `, Simple: ${err.message}`
        }
      }

      if (!response) {
        console.log(`[Import] ❌ 圖片下載失敗: ${url} - ${downloadError}`)
        continue
      }

      const buffer = await response.arrayBuffer()
      console.log(`[Import] Downloaded ${buffer.byteLength} bytes from ${url}`)

      // 使用 Payload Local API 上傳
      const media = await payload.create({
        collection: 'media',
        data: {
          alt: colorName || filename, // 使用顏色名稱作為 alt
        },
        file: {
          data: Buffer.from(buffer),
          mimetype: response.headers.get('content-type') || 'image/jpeg',
          name: filename,
          size: buffer.byteLength,
        },
      })

      console.log(`[Import] Created media ID: ${media.id} for color: ${colorName || 'none'}`)

      processedImages.push({
        mediaId: media.id,
        colorName, // 保留原始日文顏色名稱，後續用於關聯變體選項
      })
    } catch (err: any) {
      console.error(`[Import] Image ${imageIndex}: Failed to process:`, {
        message: err.message,
        name: err.name,
        stack: err.stack?.substring(0, 500),
        data: err.data,
      })
      // 將錯誤訊息記錄下來以便診斷
      if (!processedImages.hasOwnProperty('_errors')) {
        (processedImages as any)._errors = []
      }
      (processedImages as any)._errors.push(`Image ${imageIndex}: ${err.message}`)
    }
  }

  // 輸出所有錯誤
  if ((processedImages as any)._errors?.length > 0) {
    console.error(`[Import] Image processing errors:`, (processedImages as any)._errors)
  }

  console.log(`[Import] ===== 圖片處理總結 =====`)
  console.log(`[Import] 輸入: ${images.length} 張圖片`)
  console.log(`[Import] 成功處理: ${processedImages.length} 張`)
  console.log(`[Import] 失敗: ${images.length - processedImages.length} 張`)
  if (processedImages.length === 0 && images.length > 0) {
    console.log(`[Import] ⚠️ 警告: 所有圖片都處理失敗！請檢查:`)
    console.log(`[Import]    1. 圖片是否有 Base64 資料 (由 Chrome Extension 下載)`)
    console.log(`[Import]    2. 圖片 URL 是否可以從伺服器端存取 (可能被地理限制)`)
  }
  return processedImages
}

/**
 * 處理變體
 * - 顏色翻譯（日文 → 中文）- 使用 Freak Store COLOR_DISPLAY_MAP
 * - SKU 自動生成 - 使用 Freak Store 格式: FS-{hash4}-{colorCode}-{size}
 */
async function processVariants(
  payload: any,
  variants: any[],
  basePrice: number,
  productName: string, // 原始商品名稱，用於 SKU 生成
): Promise<{
  variantTypes: any[]
  variants: any[]
  colorOptionMap: Record<string, string> // 日文顏色 → 變體選項 ID
}> {
  if (!variants || variants.length === 0) {
    return { variantTypes: [], variants: [], colorOptionMap: {} }
  }

  // 收集所有顏色和尺寸
  // colorMap: 原始日文顏色 → 翻譯後的中文顏色
  const colorMap = new Map<string, string>()
  const sizes = new Set<string>()

  for (const v of variants) {
    if (v.color) {
      // 使用 Freak Store 的 COLOR_DISPLAY_MAP 翻譯顏色
      const translatedColor = translateColor(v.color)
      colorMap.set(v.color, translatedColor)
    }
    if (v.size) sizes.add(v.size)
  }

  const variantTypes: any[] = []
  const variantTypeMap: Record<string, { typeId: string; options: Record<string, string> }> = {}
  // 日文顏色 → 變體選項 ID（用於圖片關聯）
  const colorOptionMap: Record<string, string> = {}

  // 建立顏色變體類型（使用翻譯後的中文）
  if (colorMap.size > 0) {
    const colorType = await getOrCreateVariantType(payload, '顏色')
    const colorOptions: Record<string, string> = {}

    for (const [original, translated] of colorMap) {
      // 使用翻譯後的顏色名稱建立選項
      const option = await getOrCreateVariantOption(payload, colorType.id, translated)
      colorOptions[original] = option.id // 用原文作為 key，方便後續匹配
      colorOptionMap[original] = option.id // 同時記錄到 colorOptionMap
    }

    variantTypes.push(colorType.id)
    variantTypeMap['color'] = { typeId: colorType.id, options: colorOptions }
  }

  // 建立尺寸變體類型
  if (sizes.size > 0) {
    const sizeType = await getOrCreateVariantType(payload, '尺寸')
    const sizeOptions: Record<string, string> = {}

    for (const size of sizes) {
      const option = await getOrCreateVariantOption(payload, sizeType.id, size)
      sizeOptions[size] = option.id
    }

    variantTypes.push(sizeType.id)
    variantTypeMap['size'] = { typeId: sizeType.id, options: sizeOptions }
  }

  // 建立變體資料
  const variantData: any[] = []

  console.log(`[Import] Processing ${variants.length} variants`)
  console.log(`[Import] variantTypeMap:`, {
    color: variantTypeMap['color']
      ? {
          typeId: variantTypeMap['color'].typeId,
          optionKeys: Object.keys(variantTypeMap['color'].options),
        }
      : 'not set',
    size: variantTypeMap['size']
      ? {
          typeId: variantTypeMap['size'].typeId,
          optionKeys: Object.keys(variantTypeMap['size'].options),
        }
      : 'not set',
  })

  for (const v of variants) {
    const options: string[] = []

    if (v.color && variantTypeMap['color']) {
      const optionId = variantTypeMap['color'].options[v.color]
      if (optionId) {
        options.push(optionId)
      } else {
        console.warn(`[Import] Color option not found for: ${v.color}`)
      }
    }

    if (v.size && variantTypeMap['size']) {
      const optionId = variantTypeMap['size'].options[v.size]
      if (optionId) {
        options.push(optionId)
      } else {
        console.warn(`[Import] Size option not found for: ${v.size}`)
      }
    }

    // 使用 Freak Store 邏輯生成 SKU
    // 格式: FS-{hash4}-{colorCode}-{size}
    // 使用原始日文顏色來生成 SKU（與 Freak Store 一致）
    const sku = generateSKU(productName, v.color || '', v.size || '')

    const variantPrice = v.price || basePrice
    const translatedColor = colorMap.get(v.color) || v.color || ''

    // 計算庫存：如果有日文庫存狀態，使用 STOCK_STATUS_MAP 轉換
    let inventory = 10 // 預設庫存
    if (typeof v.stock === 'number') {
      inventory = v.stock
    } else if (typeof v.stock === 'string') {
      // 日文庫存狀態轉換
      inventory = getStockQuantity(v.stock)
    } else if (v.inStock !== undefined) {
      inventory = v.inStock ? 10 : 0
    }

    variantData.push({
      options,
      // 標題格式：翻譯後的顏色 - 尺寸（如：黑色 - M）
      title: `${translatedColor}${v.size ? ' - ' + v.size : ''}`.trim() || sku,
      // SKU (Freak Store 格式)
      sku,
      // 使用 ecommerce plugin 的價格結構
      priceInTWDEnabled: true,
      priceInTWD: variantPrice,
      // 庫存
      inventory,
    })
  }

  return { variantTypes, variants: variantData, colorOptionMap }
}

/**
 * 取得或建立變體類型
 * variantTypes collection 需要 label 和 name 兩個欄位
 */
async function getOrCreateVariantType(payload: any, label: string): Promise<any> {
  const existing = await payload.find({
    collection: 'variantTypes',
    where: { label: { equals: label } },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    return existing.docs[0]
  }

  // 生成 name（英文小寫，移除特殊字符）
  const name = label
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-|-$/g, '') || 'option'

  return payload.create({
    collection: 'variantTypes',
    data: { label, name },
  })
}

/**
 * 取得或建立變體選項
 * variantOptions collection 需要 variantType, label, value 三個欄位
 */
async function getOrCreateVariantOption(
  payload: any,
  variantTypeId: string,
  label: string,
): Promise<any> {
  const existing = await payload.find({
    collection: 'variantOptions',
    where: {
      and: [
        { variantType: { equals: variantTypeId } },
        { label: { equals: label } },
      ],
    },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    return existing.docs[0]
  }

  // 生成 value（英文小寫，移除特殊字符）
  const value = label
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-|-$/g, '') || 'value'

  return payload.create({
    collection: 'variantOptions',
    data: {
      variantType: variantTypeId,
      label,
      value,
    },
  })
}
