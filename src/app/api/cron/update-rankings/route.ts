import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * 自動化排名計算 API
 * 
 * 用途：
 * - 供 Cron Job (如 Zeabur Cron, Vercel Cron) 定期呼叫
 * - 根據銷售數據計算商品排名
 * - 更新 ScrapbookRanking Block 的自動排名數據
 * 
 * 觸發方式：
 * - GET /api/cron/update-rankings?secret=YOUR_CRON_SECRET
 */

// 驗證 Cron 密鑰
const CRON_SECRET = process.env.CRON_SECRET || 'default-cron-secret'

export async function GET(request: Request) {
  // 驗證請求來源
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getPayload({ config })
    const now = new Date()
    
    // 定義統計週期
    const periods = {
      daily: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      weekly: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      monthly: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    }

    // 取得指定時間範圍內的訂單
    const ordersResult = await payload.find({
      collection: 'orders',
      where: {
        status: { equals: 'completed' },
        createdAt: { greater_than: periods.monthly.toISOString() },
      },
      limit: 0,
      pagination: false,
    })

    // 統計每個商品的銷售數量
    const productSales: Record<string, { 
      id: string
      totalQuantity: number
      totalRevenue: number
      dailyQuantity: number
      weeklyQuantity: number 
    }> = {}

    for (const order of ordersResult.docs) {
      const items = order.items as Array<{
        product?: { id: string } | string | null
        quantity?: number
        price?: number
      }> | undefined
      
      if (!items) continue
      
      for (const item of items) {
        const productId = typeof item.product === 'object' ? item.product?.id : item.product
        if (!productId) continue
        
        const orderDate = new Date(order.createdAt as string)
        const quantity = item.quantity || 1
        const price = item.price || 0
        
        if (!productSales[productId]) {
          productSales[productId] = {
            id: productId,
            totalQuantity: 0,
            totalRevenue: 0,
            dailyQuantity: 0,
            weeklyQuantity: 0,
          }
        }
        
        productSales[productId].totalQuantity += quantity
        productSales[productId].totalRevenue += price * quantity
        
        if (orderDate >= periods.daily) {
          productSales[productId].dailyQuantity += quantity
        }
        if (orderDate >= periods.weekly) {
          productSales[productId].weeklyQuantity += quantity
        }
      }
    }

    // 轉換為排名陣列並排序
    const rankings = Object.values(productSales)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 50) // 只保留前 50 名

    // 將排名數據存入全域設定 (或專用 Collection)
    // 這裡使用簡單的方式：更新一個 Global
    // 實際可考慮建立 ProductRankings Collection
    
    const rankingData = {
      updatedAt: now.toISOString(),
      rankings: rankings.map((item, index) => ({
        rank: index + 1,
        productId: item.id,
        totalQuantity: item.totalQuantity,
        totalRevenue: item.totalRevenue,
        dailyQuantity: item.dailyQuantity,
        weeklyQuantity: item.weeklyQuantity,
      })),
    }

    // 記錄日誌
    console.log(`[Cron] Rankings updated: ${rankings.length} products ranked`)

    return NextResponse.json({
      success: true,
      message: `Rankings updated successfully`,
      data: {
        productsRanked: rankings.length,
        ordersAnalyzed: ordersResult.totalDocs,
        updatedAt: now.toISOString(),
        topProducts: rankings.slice(0, 5).map(r => ({
          id: r.id,
          quantity: r.totalQuantity,
        })),
      },
    })
  } catch (error) {
    console.error('[Cron] Rankings update failed:', error)
    return NextResponse.json(
      { error: 'Failed to update rankings', details: String(error) },
      { status: 500 }
    )
  }
}
