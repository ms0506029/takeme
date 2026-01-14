import {
    awardOrderPoints,
    calculateOrderPoints,
    getCampaignMultiplier,
    getLoyaltySettings,
    type OrderItem
} from '@/lib/points/points-engine'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Points API
 * 點數系統 API 端點
 * 
 * GET /api/points - 取得點數系統設定與活動狀態
 * POST /api/points/calculate - 預覽訂單點數（不實際發放）
 * POST /api/points/award - 發放訂單點數
 */

// GET: 取得當前點數系統狀態
export async function GET() {
  try {
    const settings = await getLoyaltySettings()
    
    if (!settings) {
      return NextResponse.json({
        success: true,
        enabled: false,
        message: '點數系統未啟用',
      })
    }
    
    const campaignMultiplier = getCampaignMultiplier(settings)
    const campaignActive = campaignMultiplier > 1
    
    return NextResponse.json({
      success: true,
      enabled: true,
      settings: {
        // 匯率
        exchangeRate: {
          amount: settings.pointsPerAmount,
          points: settings.pointsEarned,
          display: `每消費 ${settings.pointsPerAmount} 元可獲得 ${settings.pointsEarned} 點`,
        },
        // 折抵
        redemption: {
          pointValue: settings.pointValue,
          minPoints: settings.minPointsToRedeem,
          display: `${settings.minPointsToRedeem} 點起可折抵，1 點 = ${settings.pointValue} 元`,
        },
        // 折扣商品
        discountRule: {
          percentage: settings.discountProductRule.fixedPercentage,
          display: `折扣商品固定 ${settings.discountProductRule.fixedPercentage}% 回饋`,
        },
        // 活動
        campaign: campaignActive ? {
          active: true,
          multiplier: campaignMultiplier,
          name: settings.campaign.name,
          endDate: settings.campaign.endDate,
          display: `${settings.campaign.name || '點數加倍活動'}：${campaignMultiplier} 倍點數！`,
        } : {
          active: false,
        },
      },
    })
  } catch (error) {
    console.error('Points API GET error:', error)
    return NextResponse.json(
      { success: false, error: '無法取得點數設定' },
      { status: 500 }
    )
  }
}

// POST: 計算或發放點數
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, orderId, userId, items, orderAmount, shippingAmount } = body
    
    // 驗證必填欄位
    if (!action) {
      return NextResponse.json(
        { success: false, error: '請指定 action (calculate 或 award)' },
        { status: 400 }
      )
    }
    
    if (!userId || !items || !orderAmount) {
      return NextResponse.json(
        { success: false, error: '缺少必填欄位：userId, items, orderAmount' },
        { status: 400 }
      )
    }
    
    // 轉換 items 格式
    const orderItems: OrderItem[] = items.map((item: any) => ({
      productId: item.productId || item.id,
      quantity: item.quantity || 1,
      price: item.price || item.salePrice || item.originalPrice,
      originalPrice: item.originalPrice,
      isDiscounted: item.isDiscounted ?? (item.salePrice && item.salePrice < item.originalPrice),
    }))
    
    if (action === 'calculate') {
      // 預覽計算，不實際發放
      const result = await calculateOrderPoints(
        orderId || 'preview',
        userId,
        orderItems,
        orderAmount,
        shippingAmount || 0
      )
      
      if (!result) {
        return NextResponse.json({
          success: true,
          points: 0,
          message: '點數系統未啟用',
        })
      }
      
      return NextResponse.json({
        success: true,
        preview: true,
        points: result.totalPoints,
        breakdown: result.breakdown,
        expiresAt: result.expiresAt,
      })
    } else if (action === 'award') {
      // 實際發放點數
      if (!orderId) {
        return NextResponse.json(
          { success: false, error: 'award 動作需要 orderId' },
          { status: 400 }
        )
      }
      
      const result = await awardOrderPoints(
        orderId,
        userId,
        orderItems,
        orderAmount,
        shippingAmount || 0
      )
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        awarded: true,
        points: result.points,
      })
    } else {
      return NextResponse.json(
        { success: false, error: '無效的 action，請使用 calculate 或 award' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Points API POST error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '處理失敗' },
      { status: 500 }
    )
  }
}
