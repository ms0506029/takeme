import { trackPurchase } from '@/lib/marketing/meta-capi'
import type { CollectionAfterChangeHook } from 'payload'

/**
 * Orders Collection - afterChange Hook
 * 
 * 當訂單狀態變更為 'completed' 時，發送 Meta CAPI Purchase 事件
 */
export const sendMetaConversion: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
}) => {
  // 只處理更新操作
  if (operation !== 'update') return doc
  
  // 檢查狀態是否從非 completed 變為 completed
  const wasCompleted = previousDoc?.status === 'completed'
  const isNowCompleted = doc.status === 'completed'
  
  if (!wasCompleted && isNowCompleted) {
    try {
      // 取得訂單資訊
      const orderId = doc.id as string
      const orderTotal = (doc.amount as number) || 0
      const currency = 'TWD'
      
      // 取得商品 ID 列表
      const items = doc.items as Array<{
        product?: { id: string } | string | null
      }> | undefined
      
      const productIds = items?.map(item => {
        return typeof item.product === 'object' ? item.product?.id : item.product
      }).filter(Boolean) as string[] || []
      
      // 取得用戶資訊
      const customer = doc.customer as { 
        email?: string
        name?: string
      } | null
      
      const userData = {
        email: customer?.email,
        firstName: customer?.name?.split(' ')[0],
        lastName: customer?.name?.split(' ').slice(1).join(' '),
      }
      
      // 發送 Meta CAPI 事件
      await trackPurchase(orderId, orderTotal, currency, productIds, userData)
      
      console.log(`[Meta CAPI] Purchase event sent for order ${orderId}`)
    } catch (error) {
      console.error('[Meta CAPI] Failed to send purchase event:', error)
      // 不阻止訂單處理，只記錄錯誤
    }
  }
  
  return doc
}
