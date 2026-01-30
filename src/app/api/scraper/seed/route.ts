import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { allPlatformSeeds, type PlatformSeed } from '@/lib/scraper/platform-seeds'

/**
 * Scraper Seed API
 * 初始化平台配置和翻譯對照表
 *
 * POST /api/scraper/seed - 執行初始化
 */

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

// POST: 執行初始化
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAccess()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { seedPlatforms = true, seedSettings = true, forceUpdate = false } = body

    const payload = await getPayload({ config: configPromise })
    const results = {
      platforms: { created: 0, updated: 0, skipped: 0 },
      settings: { updated: false },
    }

    // 初始化平台
    if (seedPlatforms) {
      for (const platformSeed of allPlatformSeeds) {
        try {
          // 檢查是否已存在
          const existing = await payload.find({
            collection: 'scraper-platforms',
            where: { slug: { equals: platformSeed.slug } },
            limit: 1,
          })

          const platformData = formatPlatformData(platformSeed)

          if (existing.docs.length > 0) {
            if (forceUpdate) {
              // 更新現有記錄
              await payload.update({
                collection: 'scraper-platforms',
                id: existing.docs[0].id,
                data: platformData,
              })
              results.platforms.updated++
            } else {
              results.platforms.skipped++
            }
          } else {
            // 建立新記錄
            await payload.create({
              collection: 'scraper-platforms',
              data: platformData,
            })
            results.platforms.created++
          }
        } catch (err) {
          console.error(`Failed to seed platform ${platformSeed.name}:`, err)
        }
      }
    }

    // 初始化全域設定
    if (seedSettings) {
      try {
        const existingSettings = await payload.findGlobal({
          slug: 'scraper-settings',
        })

        // 如果還沒有 API Key，生成一個
        const currentApiKey = (existingSettings as any)?.extension?.apiKey
        const newApiKey = currentApiKey || generateApiKey()

        await payload.updateGlobal({
          slug: 'scraper-settings',
          data: {
            extension: {
              enabled: true,
              apiKey: newApiKey,
            },
          },
        })

        results.settings.updated = true
      } catch (err) {
        console.error('Failed to update settings:', err)
      }
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('Scraper Seed error:', error)
    return NextResponse.json({ success: false, error: 'Seed failed' }, { status: 500 })
  }
}

// 格式化平台資料 - 匹配 ScraperPlatforms collection 結構
function formatPlatformData(seed: PlatformSeed) {
  return {
    name: seed.name,
    slug: seed.slug,
    baseUrl: seed.baseUrl,
    isActive: seed.enabled,
    // URL 模式 - group 結構
    urlPatterns: {
      listing: seed.urlPatterns.listing,
      product: seed.urlPatterns.product,
    },
    // 列表頁選擇器 - group 結構
    listingSelectors: {
      productCard: seed.listingSelectors.productCard,
      productLink: seed.listingSelectors.productUrl,
      productId: '', // 由 URL 提取
      thumbnail: seed.listingSelectors.productImage,
      title: seed.listingSelectors.productTitle,
      brand: seed.listingSelectors.brand || '',
      price: seed.listingSelectors.productPrice,
      originalPrice: seed.listingSelectors.salePrice || '',
      nextPage: seed.settings.pagination?.nextButton || '',
      pageParam: seed.settings.pagination?.pageParam || 'p',
      totalCount: '',
    },
    // 啟用深層爬取
    supportDeepScrape: true,
    // 商品頁選擇器 - group 結構
    productSelectors: {
      title: seed.productSelectors.title,
      brand: seed.productSelectors.brand || '',
      price: seed.productSelectors.price,
      description: seed.productSelectors.description,
      images: seed.productSelectors.images,
      variants: seed.productSelectors.variants?.variantList || '',
      variantColor: seed.productSelectors.variants?.color || '',
      variantSize: seed.productSelectors.variants?.size || '',
      stockStatus: seed.productSelectors.stock || '',
      sizeChart: '',
      materials: seed.productSelectors.specifications || '',
    },
    // 進階設定 - group 結構
    settings: {
      pageDelay: seed.settings.pageDelay,
      requestDelay: seed.settings.requestDelay,
      maxRetries: 3,
      requiresLogin: false,
      userAgent: '',
    },
    // 定價 - group 結構
    pricing: {
      useGlobalPricing: true,
      currency: seed.pricing.sourceCurrency as 'JPY' | 'USD' | 'TWD',
      customPricingTiers: [], // 使用全局設定
    },
  }
}

// 生成 API Key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'ps_'
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
