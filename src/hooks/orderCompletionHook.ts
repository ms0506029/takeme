/**
 * Order Completion Hook
 * 訂單完成 Hook
 * 
 * 當訂單狀態變為「已完成」時：
 * 1. 發放點數
 * 2. 更新累計消費
 * 3. 檢查會員等級升級
 */

import {
    orderLineItemToOrderItem,
    processOrderCompletion,
    type OrderItem
} from '@/lib/points'
import type { CollectionAfterChangeHook } from 'payload'

// 定義觸發點數發放的狀態
const COMPLETED_STATUSES = ['completed', 'delivered', 'fulfilled']

// 追蹤已處理的訂單（避免重複發放）
const processedOrders = new Set<string>()

/**
 * Order afterChange Hook
 * 監聽訂單狀態變化，當狀態變為「已完成」時觸發點數發放
 */
export const orderCompletionHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  // 只處理 update 操作
  if (operation !== 'update') return doc
  
  const orderId = doc.id
  const currentStatus = doc.status as string
  const previousStatus = previousDoc?.status as string
  
  // 檢查是否從非完成狀態變為完成狀態
  const wasNotCompleted = !COMPLETED_STATUSES.includes(previousStatus)
  const isNowCompleted = COMPLETED_STATUSES.includes(currentStatus)
  
  if (!wasNotCompleted || !isNowCompleted) {
    return doc
  }
  
  // 避免重複處理
  const processKey = `${orderId}-${currentStatus}`
  if (processedOrders.has(processKey)) {
    console.log(`[OrderHook] Order ${orderId} already processed, skipping`)
    return doc
  }
  processedOrders.add(processKey)
  
  // 取得客戶 ID
  const customerId = typeof doc.customer === 'object' 
    ? doc.customer?.id 
    : doc.customer
  
  if (!customerId) {
    console.log(`[OrderHook] Order ${orderId} has no customer, skipping points`)
    return doc
  }
  
  // 準備商品資料
  const items: OrderItem[] = []
  const orderItems = doc.items as any[] || []
  
  for (const item of orderItems) {
    try {
      // 嘗試從訂單項目中提取資訊
      const orderItem = orderLineItemToOrderItem({
        product: item.product,
        quantity: item.quantity,
        price: item.price || item.unitPrice,
        originalPrice: item.originalPrice,
        salePrice: item.salePrice,
      })
      items.push(orderItem)
    } catch (err) {
      console.error(`[OrderHook] Failed to parse order item:`, err)
    }
  }
  
  // 計算訂單金額
  const orderAmount = (doc.amount as number) || (doc.total as number) || 0
  const shippingAmount = (doc.shipping?.amount as number) || (doc.shippingCost as number) || 0
  
  console.log(`[OrderHook] Processing order ${orderId} completion:`, {
    customerId,
    itemCount: items.length,
    orderAmount,
    shippingAmount,
    status: currentStatus,
  })
  
  try {
    // 執行完整的訂單完成處理流程
    const result = await processOrderCompletion(
      orderId,
      customerId,
      items,
      orderAmount,
      shippingAmount
    )
    
    console.log(`[OrderHook] Order ${orderId} processed:`, {
      pointsAwarded: result.pointsAwarded,
      levelUpgraded: result.levelUpgraded,
      newLevel: result.newLevel,
    })
    
    // 如果升級了，可以在這裡觸發通知（未來擴展）
    if (result.levelUpgraded) {
      // TODO: 發送等級升級通知
      console.log(`[OrderHook] Customer ${customerId} upgraded to ${result.newLevel}!`)
    }
  } catch (error) {
    console.error(`[OrderHook] Failed to process order ${orderId}:`, error)
    // 不拋出錯誤，避免影響訂單更新
  }
  
  return doc
}

/**
 * Order afterDelete Hook
 * 當訂單刪除時，扣回已發放的點數（可選）
 */
export const orderDeletionHook: CollectionAfterChangeHook = async ({
  doc,
  operation,
}) => {
  // 預留給未來需要時實作
  return doc
}
