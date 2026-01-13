import {
    getAbandonedCartList,
    getAbandonedCartStats,
    scanAndMarkAbandonedCarts,
    sendCartReminder
} from '@/lib/cart/abandoned-cart-service'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * Abandoned Carts Management API
 * Phase 7.1.2 - 遺棄購物車管理
 * 
 * GET - 取得遺棄購物車列表與統計
 * POST - 執行操作（掃描、發送提醒）
 */

export async function GET(request: NextRequest) {
  try {
    // 驗證使用者權限
    const payload = await getPayload({ config: configPromise })
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // 並行取得統計和列表
    const [stats, list] = await Promise.all([
      getAbandonedCartStats(),
      getAbandonedCartList(page, limit),
    ])

    return NextResponse.json({
      success: true,
      stats,
      ...list,
    })
  } catch (error) {
    console.error('Abandoned carts API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch abandoned carts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, cartId, thresholdHours } = body

    switch (action) {
      case 'scan': {
        // 掃描並標記遺棄購物車
        const result = await scanAndMarkAbandonedCarts(thresholdHours || 24)
        return NextResponse.json({
          success: true,
          message: `掃描完成：標記了 ${result.marked} 個遺棄購物車`,
          marked: result.marked,
          errors: result.errors,
        })
      }

      case 'remind': {
        // 發送單一購物車提醒
        if (!cartId) {
          return NextResponse.json(
            { success: false, error: 'Missing cartId' },
            { status: 400 }
          )
        }
        const result = await sendCartReminder(cartId)
        return NextResponse.json({
          success: result.success,
          message: result.success ? '提醒已發送' : result.error,
        })
      }

      case 'remind-all': {
        // 發送所有待提醒購物車
        const list = await getAbandonedCartList(1, 100)
        const pendingCarts = list.items.filter(cart => !cart.reminderSentAt)
        
        let successCount = 0
        const errors: string[] = []
        
        for (const cart of pendingCarts) {
          const result = await sendCartReminder(cart.id)
          if (result.success) {
            successCount++
          } else {
            errors.push(`Cart ${cart.id}: ${result.error}`)
          }
        }
        
        return NextResponse.json({
          success: true,
          message: `已發送 ${successCount}/${pendingCarts.length} 個提醒`,
          successCount,
          totalPending: pendingCarts.length,
          errors,
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Abandoned carts action error:', error)
    return NextResponse.json(
      { success: false, error: 'Action failed' },
      { status: 500 }
    )
  }
}
