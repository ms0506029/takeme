import { manualSendRestockNotification } from '@/hooks/restockDetectionHook'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * Admin Restock Notification API
 * 後台補貨通知管理 API
 * 
 * POST /api/admin/restock-notify - 手動發送補貨通知
 * GET /api/admin/restock-notify/stats - 取得統計資料
 */

// 驗證 Admin 權限
async function isAdmin() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await headers()
  
  try {
    const { user } = await payload.auth({ headers: headersList })
    return user?.roles?.includes('admin')
  } catch {
    return false
  }
}

// POST: 手動發送補貨通知
export async function POST(request: NextRequest) {
  try {
    const admin = await isAdmin()
    
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '需要管理員權限' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { requestId, requestIds } = body
    
    // 支援單一或批量發送
    const idsToProcess = requestIds || (requestId ? [requestId] : [])
    
    if (idsToProcess.length === 0) {
      return NextResponse.json(
        { success: false, error: '請提供 requestId 或 requestIds' },
        { status: 400 }
      )
    }
    
    const results: Array<{ id: string; success: boolean; channel?: string; error?: string }> = []
    
    for (const id of idsToProcess) {
      const result = await manualSendRestockNotification(id)
      results.push({
        id,
        success: result.success,
        channel: result.channel,
        error: result.error,
      })
    }
    
    const successCount = results.filter(r => r.success).length
    const failCount = results.length - successCount
    
    return NextResponse.json({
      success: failCount === 0,
      message: `已發送 ${successCount} 則通知${failCount > 0 ? `，${failCount} 則失敗` : ''}`,
      results,
    })
  } catch (error) {
    console.error('Admin restock notify error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '發送失敗' },
      { status: 500 }
    )
  }
}

// GET: 取得補貨需求統計
export async function GET() {
  try {
    const admin = await isAdmin()
    
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '需要管理員權限' },
        { status: 403 }
      )
    }
    
    const payload = await getPayload({ config: configPromise })
    
    // 取得各狀態的統計
    const [pending, notified, cancelled] = await Promise.all([
      payload.count({
        collection: 'restock-requests',
        where: { status: { equals: 'pending' } },
      }),
      payload.count({
        collection: 'restock-requests',
        where: { status: { equals: 'notified' } },
      }),
      payload.count({
        collection: 'restock-requests',
        where: { status: { equals: 'cancelled' } },
      }),
    ])
    
    // 取得最熱門的待補貨商品
    const topPendingProducts = await payload.find({
      collection: 'restock-requests',
      where: { status: { equals: 'pending' } },
      depth: 1,
      limit: 100,
    })
    
    // 統計每個商品的申請數量
    const productCounts: Record<string, { name: string; count: number; productId: string }> = {}
    
    for (const req of topPendingProducts.docs) {
      const product = (req as any).product
      const productId = typeof product === 'object' ? product.id : product
      const productName = typeof product === 'object' ? product.title : 'Unknown'
      
      if (!productCounts[productId]) {
        productCounts[productId] = { name: productName, count: 0, productId }
      }
      productCounts[productId].count++
    }
    
    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    return NextResponse.json({
      success: true,
      stats: {
        pending: pending.totalDocs,
        notified: notified.totalDocs,
        cancelled: cancelled.totalDocs,
        total: pending.totalDocs + notified.totalDocs + cancelled.totalDocs,
      },
      topProducts,
    })
  } catch (error) {
    console.error('Admin restock stats error:', error)
    return NextResponse.json(
      { success: false, error: '取得統計失敗' },
      { status: 500 }
    )
  }
}
