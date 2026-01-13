import { getCustomerAnalytics, getSegmentColor, getSegmentLabel, type RFMSegment } from '@/lib/analytics/customer-analytics'
import { NextResponse } from 'next/server'

/**
 * Customer Analytics API
 * Phase 7.3.4 - 客戶分析端點
 * 
 * GET /api/customer-analytics
 * 返回 RFM 分群與客戶統計資料
 */

export async function GET() {
  try {
    const analytics = await getCustomerAnalytics()
    
    // 增加 segment labels 和 colors
    const segmentData = Object.entries(analytics.segmentDistribution).map(([segment, count]) => ({
      segment,
      label: getSegmentLabel(segment as RFMSegment),
      color: getSegmentColor(segment as RFMSegment),
      count,
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalCustomers: analytics.totalCustomers,
          activeCustomers: analytics.activeCustomers,
          newCustomers: analytics.newCustomers,
          averageOrderValue: analytics.averageOrderValue,
          averageOrdersPerCustomer: analytics.averageOrdersPerCustomer,
        },
        topSpenders: analytics.topSpenders,
        segmentData,
        rfmScores: analytics.rfmScores.slice(0, 100), // 限制返回數量
      },
    })
  } catch (error) {
    console.error('Customer analytics API error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get analytics' },
      { status: 500 }
    )
  }
}
