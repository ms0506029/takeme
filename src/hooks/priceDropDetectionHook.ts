/**
 * Price Drop Detection Hook
 * 降價偵測 Hook
 * 
 * 當商品價格下降時，通知所有收藏該商品的用戶
 */

import { sendPriceDropNotification } from '@/lib/notifications/notification-service'
import configPromise from '@payload-config'
import type { CollectionAfterChangeHook } from 'payload'
import { getPayload } from 'payload'

/**
 * Product afterChange Hook
 * 偵測價格變化並發送降價通知
 */
export const priceDropDetectionHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
}) => {
  // 只處理 update 操作
  if (operation !== 'update') return doc
  
  // 取得當前價格與之前價格
  const currentPrice = doc.salePrice ?? doc.price
  const previousPrice = previousDoc?.salePrice ?? previousDoc?.price
  
  // 如果沒有價格資訊，跳過
  if (!currentPrice || !previousPrice) return doc
  
  // 檢查是否降價（任何降價都通知）
  if (currentPrice >= previousPrice) return doc
  
  console.log(`[PriceDropHook] Price dropped for product ${doc.id}: ${previousPrice} → ${currentPrice}`)
  
  // 非同步處理通知（不阻塞主流程）
  processPriceDropNotifications(doc.id, doc.title, previousPrice, currentPrice, doc.featuredImage)
    .catch(err => console.error('[PriceDropHook] Error processing notifications:', err))
  
  return doc
}

/**
 * 處理降價通知發送
 */
async function processPriceDropNotifications(
  productId: string,
  productName: string,
  oldPrice: number,
  newPrice: number,
  productImage?: any
) {
  try {
    const payload = await getPayload({ config: configPromise })
    
    // 查詢所有收藏此商品且開啟降價通知的用戶
    const wishlistItems = await payload.find({
      collection: 'wishlist',
      where: {
        product: { equals: productId },
        notifyOnPriceDrop: { equals: true },
      },
      depth: 0, // 不展開關聯
      limit: 1000,
    })
    
    if (wishlistItems.docs.length === 0) {
      console.log(`[PriceDropHook] No wishlist items for product ${productId}`)
      return
    }
    
    console.log(`[PriceDropHook] Sending notifications to ${wishlistItems.docs.length} users`)
    
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
    
    // 發送通知給每個用戶
    for (const item of wishlistItems.docs) {
      const customerId = typeof (item as any).customer === 'object' 
        ? (item as any).customer.id 
        : (item as any).customer
      
      // 檢查是否已通知過相同價格
      if ((item as any).lastNotifiedPrice === newPrice) {
        console.log(`[PriceDropHook] Already notified user ${customerId} for this price`)
        continue
      }
      
      const result = await sendPriceDropNotification({
        customerId,
        productId,
        productName,
        productImage: imageUrl,
        oldPrice,
        newPrice,
        variant: (item as any).variant,
        productUrl,
      })
      
      // 更新通知記錄
      if (result.success) {
        await payload.update({
          collection: 'wishlist',
          id: item.id,
          data: {
            lastNotifiedPrice: newPrice,
            lastNotifiedAt: new Date().toISOString(),
          },
        })
        console.log(`[PriceDropHook] Notified user ${customerId} via ${result.channel}`)
      } else {
        console.log(`[PriceDropHook] Failed to notify user ${customerId}: ${result.error}`)
      }
    }
  } catch (error) {
    console.error('[PriceDropHook] Error:', error)
  }
}
