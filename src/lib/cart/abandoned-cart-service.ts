/**
 * Abandoned Cart Service
 * Phase 7.1.2 - 遺棄購物車偵測與提醒
 * 
 * 功能：
 * 1. 偵測閒置超過指定時間的購物車
 * 2. 標記為遺棄狀態
 * 3. 提供發送提醒的功能（整合 LINE 推播）
 * 4. 統計遺棄購物車金額與數量
 */

import configPromise from '@payload-config'
import { getPayload } from 'payload'

// 預設遺棄標準：24 小時未結帳
const DEFAULT_ABANDONED_THRESHOLD_HOURS = 24

export interface AbandonedCartStats {
  /** 遺棄購物車數量 */
  totalAbandoned: number
  /** 遺棄購物車總金額（分為單位） */
  totalValue: number
  /** 今日新增遺棄 */
  todayAbandoned: number
  /** 今日遺棄金額 */
  todayValue: number
  /** 待發送提醒數（尚未發送過提醒的遺棄購物車） */
  pendingReminders: number
}

export interface AbandonedCartItem {
  id: string
  customerEmail: string | null
  customerName: string | null
  customerId: string | null
  subtotal: number
  createdAt: string
  abandonedAt: string | null
  itemCount: number
  reminderSentAt: string | null
  reminderCount: number
}

/**
 * 獲取遺棄購物車統計數據
 */
export async function getAbandonedCartStats(): Promise<AbandonedCartStats> {
  try {
    const payload = await getPayload({ config: configPromise })

    // 取得所有已標記為遺棄的購物車
    const abandonedCarts = await payload.find({
      collection: 'carts',
      where: {
        isAbandoned: { equals: true },
        purchasedAt: { equals: null }, // 確保未購買
      },
      limit: 0, // 只要 count
    })

    // 計算今日遺棄
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayAbandonedCarts = await payload.find({
      collection: 'carts',
      where: {
        isAbandoned: { equals: true },
        abandonedAt: { greater_than_equal: today.toISOString() },
        purchasedAt: { equals: null },
      },
      limit: 0,
    })

    // 計算待發送提醒數（尚未發送過提醒）
    const pendingReminders = await payload.find({
      collection: 'carts',
      where: {
        isAbandoned: { equals: true },
        purchasedAt: { equals: null },
        reminderSentAt: { equals: null },
      },
      limit: 0,
    })

    // 取得所有遺棄購物車以計算金額
    const cartsWithValue = await payload.find({
      collection: 'carts',
      where: {
        isAbandoned: { equals: true },
        purchasedAt: { equals: null },
      },
      limit: 100,
    })

    const todayCartsWithValue = await payload.find({
      collection: 'carts',
      where: {
        isAbandoned: { equals: true },
        abandonedAt: { greater_than_equal: today.toISOString() },
        purchasedAt: { equals: null },
      },
      limit: 100,
    })

    // 計算總金額
    const totalValue = cartsWithValue.docs.reduce((sum, cart: any) => {
      return sum + (cart.subtotal || 0)
    }, 0)

    const todayValue = todayCartsWithValue.docs.reduce((sum, cart: any) => {
      return sum + (cart.subtotal || 0)
    }, 0)

    return {
      totalAbandoned: abandonedCarts.totalDocs,
      totalValue,
      todayAbandoned: todayAbandonedCarts.totalDocs,
      todayValue,
      pendingReminders: pendingReminders.totalDocs,
    }
  } catch (error) {
    console.error('Failed to get abandoned cart stats:', error)
    return {
      totalAbandoned: 0,
      totalValue: 0,
      todayAbandoned: 0,
      todayValue: 0,
      pendingReminders: 0,
    }
  }
}

/**
 * 掃描並標記遺棄購物車
 * @param thresholdHours 閒置多少小時後標記為遺棄
 */
export async function scanAndMarkAbandonedCarts(
  thresholdHours: number = DEFAULT_ABANDONED_THRESHOLD_HOURS
): Promise<{ marked: number; errors: string[] }> {
  const payload = await getPayload({ config: configPromise })
  const errors: string[] = []
  let marked = 0

  try {
    // 計算閾值時間
    const threshold = new Date()
    threshold.setHours(threshold.getHours() - thresholdHours)

    // 找出符合條件的購物車：
    // 1. 尚未購買 (purchasedAt = null)
    // 2. 尚未標記為遺棄 (isAbandoned = false)
    // 3. 建立時間超過閾值
    const eligibleCarts = await payload.find({
      collection: 'carts',
      where: {
        purchasedAt: { equals: null },
        isAbandoned: { equals: false },
        createdAt: { less_than: threshold.toISOString() },
      },
      limit: 100,
    })

    // 批量更新
    for (const cart of eligibleCarts.docs) {
      try {
        await payload.update({
          collection: 'carts',
          id: cart.id,
          data: {
            isAbandoned: true,
            abandonedAt: new Date().toISOString(),
          },
        })
        marked++
      } catch (err) {
        errors.push(`Failed to mark cart ${cart.id}: ${err}`)
      }
    }

    return { marked, errors }
  } catch (error) {
    errors.push(`Scan failed: ${error}`)
    return { marked, errors }
  }
}

/**
 * 獲取遺棄購物車清單（含顧客資訊）
 */
export async function getAbandonedCartList(
  page: number = 1,
  limit: number = 20
): Promise<{ items: AbandonedCartItem[]; total: number; hasMore: boolean }> {
  try {
    const payload = await getPayload({ config: configPromise })

    const result = await payload.find({
      collection: 'carts',
      where: {
        isAbandoned: { equals: true },
        purchasedAt: { equals: null },
      },
      sort: '-abandonedAt',
      page,
      limit,
      depth: 1, // 展開 customer 關聯
    })

    const items: AbandonedCartItem[] = result.docs.map((cart: any) => {
      const customer = typeof cart.customer === 'object' ? cart.customer : null
      const items = cart.items || []

      return {
        id: cart.id,
        customerEmail: customer?.email || null,
        customerName: customer?.name || null,
        customerId: typeof cart.customer === 'string' ? cart.customer : customer?.id || null,
        subtotal: cart.subtotal || 0,
        createdAt: cart.createdAt,
        abandonedAt: cart.abandonedAt || null,
        itemCount: items.length,
        reminderSentAt: cart.reminderSentAt || null,
        reminderCount: cart.reminderCount || 0,
      }
    })

    return {
      items,
      total: result.totalDocs,
      hasMore: result.hasNextPage,
    }
  } catch (error) {
    console.error('Failed to get abandoned cart list:', error)
    return { items: [], total: 0, hasMore: false }
  }
}

/**
 * 發送提醒（標記 reminderSentAt）
 * 實際推播邏輯可在此處整合 LINE Messaging API
 */
export async function sendCartReminder(cartId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = await getPayload({ config: configPromise })

    // 取得購物車資訊
    const cart = await payload.findByID({
      collection: 'carts',
      id: cartId,
      depth: 1,
    })

    if (!cart) {
      return { success: false, error: 'Cart not found' }
    }

    // 更新提醒狀態
    const currentCount = (cart as any).reminderCount || 0
    await payload.update({
      collection: 'carts',
      id: cartId,
      data: {
        reminderSentAt: new Date().toISOString(),
        reminderCount: currentCount + 1,
      } as any,
    })

    // TODO: 整合 LINE Messaging API 發送推播
    // const customer = typeof cart.customer === 'object' ? cart.customer : null
    // if (customer?.lineUserId) {
    //   await sendLineMessage(customer.lineUserId, { ... })
    // }

    return { success: true }
  } catch (error) {
    console.error('Failed to send cart reminder:', error)
    return { success: false, error: String(error) }
  }
}
