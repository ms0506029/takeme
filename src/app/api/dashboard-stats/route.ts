import { getDailyTrafficTrend, getRealtimeData, getTrafficReport } from '@/lib/analytics/ga4'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * Dashboard Stats API
 * 
 * 取得 Admin Dashboard 所需的統計數據：
 * - 訂單統計 (待出貨、未付款)
 * - 商品庫存警示
 * - GA4 流量數據
 * - 銷售統計
 */

export async function GET() {
  try {
    const payload = await getPayload({ config })
    
    // 並行取得所有數據
    const [
      ordersResult,
      productsResult,
      ga4Realtime,
      ga4Traffic,
      ga4Trend,
    ] = await Promise.all([
      // 訂單統計
      payload.find({
        collection: 'orders',
        where: {
          status: { in: ['processing'] },
        },
        limit: 0,
        pagination: false,
      }),
      // 低庫存商品
      payload.find({
        collection: 'products',
        where: {
          and: [
            { inventory: { less_than: 10 } },
            { inventory: { greater_than: 0 } },
          ],
        },
        limit: 0,
        pagination: false,
      }),
      // GA4 即時數據
      getRealtimeData(),
      // GA4 7日流量
      getTrafficReport('7daysAgo', 'today'),
      // GA4 每日趨勢
      getDailyTrafficTrend(7),
    ])
    
    // 計算營收 (簡化版 - 實際應從 transactions 計算)
    const revenueResult = await payload.find({
      collection: 'orders',
      where: {
        status: { equals: 'completed' },
        createdAt: { greater_than: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
      },
      limit: 0,
      pagination: false,
    })
    
    const totalRevenue = revenueResult.docs.reduce((sum: number, order: { amount?: number | null }) => {
      return sum + (order.amount || 0)
    }, 0)
    
    return NextResponse.json({
      // 訂單 KPI
      orders: {
        pendingShipments: ordersResult.totalDocs,
        unpaidOrders: 0, // TODO: 根據付款狀態篩選
        totalCompleted: revenueResult.totalDocs,
      },
      // 商品 KPI
      products: {
        lowStock: productsResult.totalDocs,
        outOfStock: 0, // TODO: inventory = 0
      },
      // 營收 KPI
      revenue: {
        last30Days: totalRevenue,
        averageOrderValue: revenueResult.totalDocs > 0 
          ? totalRevenue / revenueResult.totalDocs 
          : 0,
      },
      // GA4 流量
      analytics: {
        realtime: ga4Realtime,
        last7Days: ga4Traffic,
        dailyTrend: ga4Trend,
      },
      // 時間戳
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Dashboard stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
