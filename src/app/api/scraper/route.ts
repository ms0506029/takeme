import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * Scraper API
 * 爬蟲系統主要 API 端點
 *
 * GET /api/scraper - 取得爬蟲系統狀態
 * POST /api/scraper - 建立新的爬取任務
 */

// 驗證 Admin 權限
async function verifyAdminAccess() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await headers()

  try {
    const { user } = await payload.auth({ headers: headersList })

    if (!user) return null

    // 檢查是否為 admin 或 superAdmin
    const userRoles = (user as any).roles || []
    const isAdmin = userRoles.includes('admin') || userRoles.includes('superAdmin')

    if (!isAdmin) return null

    return user
  } catch {
    return null
  }
}

// 驗證 Extension Token
async function verifyExtensionToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.slice(7)

  // 從 ScraperSettings 取得有效 token
  const payload = await getPayload({ config: configPromise })

  try {
    const settings = await payload.findGlobal({
      slug: 'scraper-settings',
    })

    const extensionSettings = (settings as any)?.extension
    if (!extensionSettings?.enabled) return false

    // 檢查 token 是否匹配
    return extensionSettings.apiKey === token
  } catch {
    return false
  }
}

// GET: 取得系統狀態
export async function GET(request: NextRequest) {
  try {
    // 驗證權限（Admin 或 Extension Token）
    const user = await verifyAdminAccess()
    const isValidToken = await verifyExtensionToken(request)

    if (!user && !isValidToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await getPayload({ config: configPromise })

    // 取得統計資料
    const [platforms, runningJobs, recentJobs, scrapedProducts] = await Promise.all([
      payload.find({
        collection: 'scraper-platforms',
        where: { isActive: { equals: true } },
        limit: 100,
      }),
      payload.find({
        collection: 'scraping-jobs',
        where: { status: { in: ['pending', 'running'] } },
        sort: '-createdAt',
        limit: 10,
      }),
      payload.find({
        collection: 'scraping-jobs',
        sort: '-createdAt',
        limit: 5,
      }),
      payload.count({
        collection: 'scraped-products',
        where: { importStatus: { equals: 'pending' } },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        platforms: platforms.docs.map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          enabled: p.isActive,
        })),
        stats: {
          activePlatforms: platforms.totalDocs,
          runningJobs: runningJobs.totalDocs,
          pendingProducts: scrapedProducts.totalCount,
        },
        runningJobs: runningJobs.docs,
        recentJobs: recentJobs.docs,
      },
    })
  } catch (error) {
    console.error('Scraper GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get status' }, { status: 500 })
  }
}

// POST: 建立新任務
export async function POST(request: NextRequest) {
  try {
    // 只允許 Admin 建立任務
    const user = await verifyAdminAccess()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { platform, type = 'deep', sourceUrl, config = {} } = body

    if (!platform || !sourceUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: platform, sourceUrl' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config: configPromise })

    // 驗證 platform 存在
    const platformDoc = await payload.findByID({
      collection: 'scraper-platforms',
      id: platform,
    })

    if (!platformDoc || !(platformDoc as any).isActive) {
      return NextResponse.json({ success: false, error: 'Invalid or disabled platform' }, { status: 400 })
    }

    // 建立任務
    const job = await payload.create({
      collection: 'scraping-jobs',
      data: {
        platform,
        type,
        sourceUrl,
        status: 'pending',
        progress: {
          current: 0,
          total: 0,
          percentage: 0,
        },
        config: {
          maxPages: config.maxPages || 10,
          pageDelay: config.pageDelay || 2500,
          includeVariants: config.includeVariants ?? true,
          includeImages: config.includeImages ?? true,
          translateTitles: config.translateTitles ?? true,
        },
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: '任務已建立，等待 Extension 執行',
          },
        ],
        createdBy: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: (job as any).status,
        sourceUrl: (job as any).sourceUrl,
      },
    })
  } catch (error) {
    console.error('Scraper POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create job' }, { status: 500 })
  }
}
