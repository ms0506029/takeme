/**
 * 訂單狀態機服務
 * 
 * 訂單狀態流程：
 * pending → paid → processing → shipped → delivered → completed
 *             ↓
 *          refunded
 * 
 * 整合 Redis 庫存鎖定機制
 */
import type { Payload } from 'payload'
import { lockInventory, redis, releaseInventory } from './redis'

// 訂單狀態類型
export type OrderStatus = 
  | 'pending'      // 待付款
  | 'paid'         // 已付款
  | 'processing'   // 處理中
  | 'shipped'      // 已出貨
  | 'delivered'    // 已送達
  | 'completed'    // 已完成
  | 'refunded'     // 已退款
  | 'cancelled'    // 已取消

// 訂單項目類型
export interface OrderItem {
  productId: string
  variantId?: string
  quantity: number
  unitPrice: number
}

// 狀態轉換規則
const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'refunded'],
  processing: ['shipped', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['completed', 'refunded'],
  completed: [],
  refunded: [],
  cancelled: [],
}

/**
 * 檢查狀態轉換是否合法
 */
export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return validTransitions[from]?.includes(to) ?? false
}

/**
 * 建立訂單（含庫存預扣）
 */
export async function createOrder(
  payload: Payload,
  items: OrderItem[],
  customerId: string,
  vendorId: string
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  // 1. 預扣庫存（Redis 鎖定，15 分鐘 TTL）
  const lockResults = await Promise.all(
    items.map(async (item) => {
      const key = item.variantId 
        ? `${item.productId}-${item.variantId}`
        : item.productId
      
      const locked = await lockInventory(key, item.quantity)
      return { key, quantity: item.quantity, locked }
    })
  )
  
  // 2. 檢查是否所有庫存都鎖定成功
  const failedLocks = lockResults.filter((r) => !r.locked)
  
  if (failedLocks.length > 0) {
    // 釋放已鎖定的庫存
    await Promise.all(
      lockResults
        .filter((r) => r.locked)
        .map((r) => releaseInventory(r.key, r.quantity))
    )
    
    return {
      success: false,
      error: `庫存不足：${failedLocks.map((f) => f.key).join(', ')}`,
    }
  }
  
  // 3. 計算訂單總額
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  
  // 4. 建立訂單記錄
  try {
    const order = await payload.create({
      collection: 'orders',
      data: {
        customer: customerId,
        vendor: vendorId,
        items: items.map((item) => ({
          product: item.productId,
          variant: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        total,
        status: 'pending',
        lockedAt: new Date().toISOString(),
      },
    })
    
    // 5. 設定訂單逾時自動取消（15 分鐘）
    if (redis) {
      await redis.set(
        `order:timeout:${order.id}`,
        JSON.stringify({ items, orderId: order.id }),
        { ex: 900 } // 15 分鐘
      )
    }
    
    return { success: true, orderId: order.id }
  } catch (error) {
    // 釋放所有鎖定的庫存
    await Promise.all(
      lockResults.map((r) => releaseInventory(r.key, r.quantity))
    )
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '建立訂單失敗',
    }
  }
}

/**
 * 訂單付款成功
 */
export async function confirmPayment(
  payload: Payload,
  orderId: string,
  paymentDetails: {
    transactionId: string
    paymentMethod: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. 查詢訂單
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
    })
    
    if (!order) {
      return { success: false, error: '訂單不存在' }
    }
    
    if ((order as { status?: string }).status !== 'pending') {
      return { success: false, error: '訂單狀態不正確' }
    }
    
    // 2. 更新訂單狀態
    await payload.update({
      collection: 'orders',
      id: orderId,
      data: {
        status: 'paid',
        paidAt: new Date().toISOString(),
        transactionId: paymentDetails.transactionId,
        paymentMethod: paymentDetails.paymentMethod,
      },
    })
    
    // 3. 清除訂單逾時 key
    if (redis) {
      await redis.del(`order:timeout:${orderId}`)
    }
    
    // 4. 正式扣除庫存（從 Redis 轉移到資料庫）
    const items = (order as {items?: Array<{product: string; variant?: string; quantity: number}>}).items || []
    for (const item of items) {
      const key = item.variant 
        ? `${item.product}-${item.variant}`
        : item.product
      
      // 釋放 Redis 鎖定（庫存已正式扣除）
      await releaseInventory(key, item.quantity)
      
      // 更新資料庫庫存
      // 注意：實際的庫存欄位需根據 ecommerce plugin 的結構調整
    }
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '付款確認失敗',
    }
  }
}

/**
 * 更新訂單狀態
 */
export async function updateOrderStatus(
  payload: Payload,
  orderId: string,
  newStatus: OrderStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
    })
    
    if (!order) {
      return { success: false, error: '訂單不存在' }
    }
    
    const currentStatus = (order as { status?: OrderStatus }).status || 'pending'
    
    if (!isValidTransition(currentStatus, newStatus)) {
      return {
        success: false,
        error: `無法從 ${currentStatus} 轉換到 ${newStatus}`,
      }
    }
    
    await payload.update({
      collection: 'orders',
      id: orderId,
      data: {
        status: newStatus,
        [`${newStatus}At`]: new Date().toISOString(),
      },
    })
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '更新狀態失敗',
    }
  }
}

/**
 * 取消訂單（釋放庫存）
 */
export async function cancelOrder(
  payload: Payload,
  orderId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
    })
    
    if (!order) {
      return { success: false, error: '訂單不存在' }
    }
    
    const currentStatus = (order as { status?: OrderStatus }).status || 'pending'
    
    // 只能取消待付款的訂單
    if (currentStatus !== 'pending') {
      return { success: false, error: '只能取消待付款的訂單' }
    }
    
    // 釋放庫存
    const items = (order as {items?: Array<{product: string; variant?: string; quantity: number}>}).items || []
    for (const item of items) {
      const key = item.variant 
        ? `${item.product}-${item.variant}`
        : item.product
      
      await releaseInventory(key, item.quantity)
    }
    
    // 更新訂單狀態
    await payload.update({
      collection: 'orders',
      id: orderId,
      data: {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelReason: reason,
      },
    })
    
    // 清除逾時 key
    if (redis) {
      await redis.del(`order:timeout:${orderId}`)
    }
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '取消訂單失敗',
    }
  }
}
