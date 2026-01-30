import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * Scraper Settings API
 * 取得/更新爬蟲系統設定
 *
 * GET /api/scraper/settings - 取得 API Key（僅 Admin）
 * POST /api/scraper/settings - 更新設定（僅 Admin）
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

// GET: 取得設定
export async function GET() {
  try {
    const user = await verifyAdminAccess()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await getPayload({ config: configPromise })

    const settings = await payload.findGlobal({
      slug: 'scraper-settings',
    })

    // 只返回 API Key（不返回完整設定）
    const extensionSettings = (settings as any)?.extension

    return NextResponse.json({
      success: true,
      apiKey: extensionSettings?.apiKey || null,
      enabled: extensionSettings?.enabled ?? false,
    })
  } catch (error) {
    console.error('Scraper Settings GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get settings' }, { status: 500 })
  }
}

// POST: 更新設定
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAccess()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { generateNewApiKey } = body

    const payload = await getPayload({ config: configPromise })

    // 取得現有設定
    const settings = await payload.findGlobal({
      slug: 'scraper-settings',
    })

    // 如果要生成新的 API Key
    if (generateNewApiKey) {
      const newApiKey = generateApiKey()

      await payload.updateGlobal({
        slug: 'scraper-settings',
        data: {
          extension: {
            ...(settings as any)?.extension,
            apiKey: newApiKey,
            enabled: true,
          },
        },
      })

      return NextResponse.json({
        success: true,
        apiKey: newApiKey,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Scraper Settings POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 })
  }
}

// 生成隨機 API Key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'ps_' // prefix: payload scraper
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
