/**
 * Restock Detection Hook
 * 補貨偵測 Hook
 * 
 * 當商品庫存從 0 變為 > 0 時，通知所有申請補貨通知的用戶
 */

import { sendRestockNotification } from '@/lib/notifications/notification-service'
import configPromise from '@payload-config'
import type { CollectionAfterChangeHook } from 'payload'
import { getPayload } from 'payload'

/**
 * Product/Variant afterChange Hook
 * 偵測庫存變化並發送補貨通知
 */
export const restockDetectionHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
}) => {
  // 只處理 update 操作
  if (operation !== 'update') return doc
  
  // 檢查庫存變化
  const variants = (doc as any).variants || []
  const previousVariants = previousDoc?.variants || []
  
  // 找出從缺貨變為有庫存的變體
  const restockedVariants: Array<{
    color: string
    size: string
    sku: string
  }> = []
  
  for (const variant of variants) {
    const currentStock = variant.inventory || 0
    
    // 找到對應的舊變體
    const previousVariant = previousVariants.find(
      (pv: any) => pv.sku === variant.sku || 
        (pv.color === variant.color && pv.size === variant.size)
    )
    
    const previousStock = previousVariant?.inventory || 0
    
    // 從 0 變為 > 0
    if (previousStock === 0 && currentStock > 0) {
      restockedVariants.push({
        color: variant.color,
        size: variant.size,
        sku: variant.sku,
      })
    }
  }
  
  if (restockedVariants.length === 0) return doc
  
  console.log(`[RestockHook] Variants restocked for product ${doc.id}:`, restockedVariants)
  
  // 非同步處理通知（不阻塞主流程）
  processRestockNotifications(doc.id, doc.title, restockedVariants, doc.featuredImage)
    .catch(err => console.error('[RestockHook] Error processing notifications:', err))
  
  return doc
}

/**
 * 處理補貨通知發送
 */
async function processRestockNotifications(
  productId: string,
  productName: string,
  restockedVariants: Array<{ color: string; size: string; sku: string }>,
  productImage?: any
) {
  try {
    const payload = await getPayload({ config: configPromise })
    
    // 取得商品圖片 URL
    let imageUrl: string | undefined
    if (productImage) {
      const imageId = typeof productImage === 'object' ? productImage.id : productImage
      if (imageId) {
        const media = await payload.findByID({
          collection: 'media',
          id: imageId,
        })
        imageUrl = (media as any)?.url
      }
    }
    
    // 取得商品網址
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'https://example.com'
    const productUrl = `${baseUrl}/products/${productId}`
    
    // 對每個補貨的變體，查詢申請通知的用戶
    for (const variant of restockedVariants) {
      const requests = await payload.find({
        collection: 'restock-requests',
        where: {
          product: { equals: productId },
          status: { equals: 'pending' },
          or: [
            { 'variant.sku': { equals: variant.sku } },
            {
              and: [
                { 'variant.color': { equals: variant.color } },
                { 'variant.size': { equals: variant.size } },
              ],
            },
          ],
        },
        depth: 0,
        limit: 1000,
      })
      
      if (requests.docs.length === 0) continue
      
      console.log(`[RestockHook] Sending notifications for variant ${variant.sku} to ${requests.docs.length} users`)
      
      // 發送通知給每個用戶
      for (const request of requests.docs) {
        const customerId = typeof (request as any).customer === 'object'
          ? (request as any).customer.id
          : (request as any).customer
        
        const result = await sendRestockNotification({
          customerId,
          productId,
          productName,
          productImage: imageUrl,
          variant,
          productUrl,
        })
        
        // 更新申請狀態
        if (result.success) {
          await payload.update({
            collection: 'restock-requests',
            id: request.id,
            data: {
              status: 'notified',
              notifiedAt: new Date().toISOString(),
              notificationChannel: result.channel,
            },
          })
          console.log(`[RestockHook] Notified user ${customerId} via ${result.channel}`)
        } else {
          console.log(`[RestockHook] Failed to notify user ${customerId}: ${result.error}`)
        }
      }
    }
  } catch (error) {
    console.error('[RestockHook] Error:', error)
  }
}

/**
 * 手動發送補貨通知
 * 用於後台手動觸發通知
 */
export async function manualSendRestockNotification(requestId: string): Promise<{
  success: boolean
  channel?: string
  error?: string
}> {
  try {
    const payload = await getPayload({ config: configPromise })
    
    const request = await payload.findByID({
      collection: 'restock-requests',
      id: requestId,
      depth: 2, // 展開關聯
    })
    
    if (!request) {
      return { success: false, error: 'Request not found' }
    }
    
    const customerId = typeof (request as any).customer === 'object'
      ? (request as any).customer.id
      : (request as any).customer
    
    const product = (request as any).product
    const productId = typeof product === 'object' ? product.id : product
    const productName = typeof product === 'object' ? product.title : 'Unknown Product'
    
    // 取得商品圖片
    let imageUrl: string | undefined
    if (typeof product === 'object' && product.featuredImage) {
      const img = product.featuredImage
      imageUrl = typeof img === 'object' ? img.url : undefined
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'https://example.com'
    const productUrl = `${baseUrl}/products/${productId}`
    
    const result = await sendRestockNotification({
      customerId,
      productId,
      productName,
      productImage: imageUrl,
      variant: (request as any).variant,
      productUrl,
    })
    
    if (result.success) {
      await payload.update({
        collection: 'restock-requests',
        id: requestId,
        data: {
          status: 'notified',
          notifiedAt: new Date().toISOString(),
          notificationChannel: result.channel,
        },
      })
    }
    
    return {
      success: result.success,
      channel: result.channel,
      error: result.error,
    }
  } catch (error) {
    console.error('[RestockHook] Manual send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
