/**
 * Notification Service
 * 通知服務
 * 
 * 支援 LINE 推播與 Email 發送
 * 策略：優先使用 LINE（免費額度內），若用戶未綁定則 fallback 至 Email
 * 
 * 使用 src/lib/line 模組的 Flex 模板
 */

import { FlexTemplates, LineService } from '@/lib/line'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

// ===== 類型定義 =====

export interface NotificationResult {
  success: boolean
  channel: 'line' | 'email' | 'none'
  error?: string
}

export interface PriceDropNotification {
  customerId: string
  productId: string
  productName: string
  productImage?: string
  oldPrice: number
  newPrice: number
  variant?: {
    color?: string
    size?: string
    sku?: string
  }
  productUrl?: string
}

export interface RestockNotification {
  customerId: string
  productId: string
  productName: string
  productImage?: string
  variant?: {
    color?: string
    size?: string
    sku?: string
  }
  productUrl?: string
}

// ===== 用戶通知偏好取得 =====

interface UserNotificationInfo {
  lineUserId?: string
  email?: string
  preferredChannel: 'line' | 'email'
}

/**
 * 取得用戶的通知資訊
 * 優先使用 LINE，若沒有綁定則使用 Email
 */
export async function getUserNotificationInfo(userId: string): Promise<UserNotificationInfo | null> {
  try {
    const payload = await getPayload({ config: configPromise })
    
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    })
    
    if (!user) return null
    
    const lineUserId = (user as any).lineUserId
    const email = user.email
    
    // 優先使用 LINE
    if (lineUserId) {
      return {
        lineUserId,
        email,
        preferredChannel: 'line',
      }
    }
    
    // Fallback 至 Email
    if (email) {
      return {
        email,
        preferredChannel: 'email',
      }
    }
    
    return null
  } catch (error) {
    console.error('[NotificationService] Failed to get user info:', error)
    return null
  }
}

// ===== LINE 推播（使用 Flex 模板） =====

/**
 * 發送 LINE 降價通知
 * 使用 FlexTemplates.priceDrop
 */
async function sendLinePriceDropNotification(
  lineUserId: string,
  data: {
    productName: string
    productImage?: string
    oldPrice: number
    newPrice: number
    variant?: { color?: string; size?: string }
    productUrl?: string
  }
): Promise<boolean> {
  try {
    const flexMessage = FlexTemplates.priceDrop(data)
    const result = await LineService.sendPush(lineUserId, flexMessage)
    return result.success
  } catch (error) {
    console.error('[NotificationService] LINE price drop error:', error)
    return false
  }
}

/**
 * 發送 LINE 補貨通知
 * 使用 FlexTemplates.restock
 */
async function sendLineRestockNotification(
  lineUserId: string,
  data: {
    productName: string
    productImage?: string
    variant?: { color?: string; size?: string }
    productUrl?: string
  }
): Promise<boolean> {
  try {
    const flexMessage = FlexTemplates.restock(data)
    const result = await LineService.sendPush(lineUserId, flexMessage)
    return result.success
  } catch (error) {
    console.error('[NotificationService] LINE restock error:', error)
    return false
  }
}

// ===== Email 發送 =====

/**
 * 發送 Email 通知
 */
async function sendEmailNotification(
  email: string,
  message: {
    type: 'price_drop' | 'restock'
    subject: string
    body: string
    productName: string
    productImage?: string
    actionUrl?: string
  }
): Promise<boolean> {
  try {
    // 使用 Resend 或 其他 Email 服務
    const resendApiKey = process.env.RESEND_API_KEY
    
    if (!resendApiKey) {
      console.error('[NotificationService] RESEND_API_KEY not configured')
      return false
    }
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'notifications@example.com',
        to: email,
        subject: message.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${message.type === 'price_drop' ? '#FF5551' : '#27AE60'}">
              ${message.type === 'price_drop' ? '🔔 降價通知' : '📦 補貨通知'}
            </h2>
            ${message.productImage ? `<img src="${message.productImage}" alt="${message.productName}" style="max-width: 100%; height: auto;">` : ''}
            <h3>${message.productName}</h3>
            <p>${message.body}</p>
            ${message.actionUrl ? `<a href="${message.actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: ${message.type === 'price_drop' ? '#FF5551' : '#27AE60'}; color: white; text-decoration: none; border-radius: 6px;">查看商品</a>` : ''}
          </div>
        `,
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[NotificationService] Email API error:', errorText)
      return false
    }
    
    console.log(`[NotificationService] Email sent to ${email}`)
    return true
  } catch (error) {
    console.error('[NotificationService] Email send error:', error)
    return false
  }
}

// ===== 高階通知函式 =====

/**
 * 發送降價通知
 */
export async function sendPriceDropNotification(
  notification: PriceDropNotification
): Promise<NotificationResult> {
  const userInfo = await getUserNotificationInfo(notification.customerId)
  
  if (!userInfo) {
    return { success: false, channel: 'none', error: 'User not found or no contact method' }
  }
  
  const discountPercent = Math.round((1 - notification.newPrice / notification.oldPrice) * 100)
  const variantText = notification.variant 
    ? ` (${notification.variant.color || ''} ${notification.variant.size || ''})`.trim()
    : ''
  
  // 優先嘗試 LINE (使用 Flex 模板)
  if (userInfo.preferredChannel === 'line' && userInfo.lineUserId) {
    const success = await sendLinePriceDropNotification(userInfo.lineUserId, {
      productName: notification.productName,
      productImage: notification.productImage,
      oldPrice: notification.oldPrice,
      newPrice: notification.newPrice,
      variant: notification.variant,
      productUrl: notification.productUrl,
    })
    
    if (success) {
      return { success: true, channel: 'line' }
    }
    
    // LINE 失敗，嘗試 Email fallback
    if (userInfo.email) {
      const emailSuccess = await sendEmailNotification(userInfo.email, {
        type: 'price_drop',
        subject: `🔔 ${notification.productName} 降價通知`,
        body: `降價 ${discountPercent}%！原價 NT$${notification.oldPrice} → 現價 NT$${notification.newPrice}${variantText}`,
        productName: notification.productName,
        productImage: notification.productImage,
        actionUrl: notification.productUrl,
      })
      return { success: emailSuccess, channel: emailSuccess ? 'email' : 'none' }
    }
  }
  
  // 直接使用 Email
  if (userInfo.email) {
    const success = await sendEmailNotification(userInfo.email, {
      type: 'price_drop',
      subject: `🔔 ${notification.productName} 降價通知`,
      body: `降價 ${discountPercent}%！原價 NT$${notification.oldPrice} → 現價 NT$${notification.newPrice}${variantText}`,
      productName: notification.productName,
      productImage: notification.productImage,
      actionUrl: notification.productUrl,
    })
    return { success, channel: success ? 'email' : 'none' }
  }
  
  return { success: false, channel: 'none', error: 'No valid notification channel' }
}

/**
 * 發送補貨通知
 */
export async function sendRestockNotification(
  notification: RestockNotification
): Promise<NotificationResult> {
  const userInfo = await getUserNotificationInfo(notification.customerId)
  
  if (!userInfo) {
    return { success: false, channel: 'none', error: 'User not found or no contact method' }
  }
  
  const variantText = notification.variant 
    ? ` (${notification.variant.color || ''} ${notification.variant.size || ''})`.trim()
    : ''
  
  // 優先嘗試 LINE (使用 Flex 模板)
  if (userInfo.preferredChannel === 'line' && userInfo.lineUserId) {
    const success = await sendLineRestockNotification(userInfo.lineUserId, {
      productName: notification.productName,
      productImage: notification.productImage,
      variant: notification.variant,
      productUrl: notification.productUrl,
    })
    
    if (success) {
      return { success: true, channel: 'line' }
    }
    
    // LINE 失敗，嘗試 Email fallback
    if (userInfo.email) {
      const emailSuccess = await sendEmailNotification(userInfo.email, {
        type: 'restock',
        subject: `📦 ${notification.productName} 補貨通知`,
        body: `您關注的商品${variantText}已補貨！庫存有限，把握機會！`,
        productName: notification.productName,
        productImage: notification.productImage,
        actionUrl: notification.productUrl,
      })
      return { success: emailSuccess, channel: emailSuccess ? 'email' : 'none' }
    }
  }
  
  // 直接使用 Email
  if (userInfo.email) {
    const success = await sendEmailNotification(userInfo.email, {
      type: 'restock',
      subject: `📦 ${notification.productName} 補貨通知`,
      body: `您關注的商品${variantText}已補貨！庫存有限，把握機會！`,
      productName: notification.productName,
      productImage: notification.productImage,
      actionUrl: notification.productUrl,
    })
    return { success, channel: success ? 'email' : 'none' }
  }
  
  return { success: false, channel: 'none', error: 'No valid notification channel' }
}

