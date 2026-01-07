/**
 * Meta Conversions API (CAPI) 服務
 * 
 * 用於伺服器端事件追蹤，繞過瀏覽器隱私限制
 * 文檔: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

// Meta Pixel ID (從用戶提供的程式碼取得)
const PIXEL_ID = process.env.META_PIXEL_ID || '894614306245367'
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN

interface UserData {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  city?: string
  country?: string
  clientIpAddress?: string
  clientUserAgent?: string
  fbc?: string // Facebook Click ID (from _fbc cookie)
  fbp?: string // Facebook Browser ID (from _fbp cookie)
}

interface CustomData {
  value?: number
  currency?: string
  contentIds?: string[]
  contentType?: string
  contentName?: string
  contentCategory?: string
  numItems?: number
  orderId?: string
}

interface EventParams {
  eventName: 'Purchase' | 'AddToCart' | 'ViewContent' | 'InitiateCheckout' | 'CompleteRegistration' | 'Lead'
  eventTime?: number
  eventSourceUrl?: string
  userData: UserData
  customData?: CustomData
}

/**
 * 雜湊使用者資料 (Meta 要求 SHA-256)
 */
async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value.toLowerCase().trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 準備使用者資料 (雜湊敏感欄位)
 */
async function prepareUserData(userData: UserData): Promise<Record<string, string>> {
  const prepared: Record<string, string> = {}

  if (userData.email) {
    prepared.em = await hashValue(userData.email)
  }
  if (userData.phone) {
    prepared.ph = await hashValue(userData.phone.replace(/\D/g, ''))
  }
  if (userData.firstName) {
    prepared.fn = await hashValue(userData.firstName)
  }
  if (userData.lastName) {
    prepared.ln = await hashValue(userData.lastName)
  }
  if (userData.city) {
    prepared.ct = await hashValue(userData.city)
  }
  if (userData.country) {
    prepared.country = await hashValue(userData.country)
  }
  if (userData.clientIpAddress) {
    prepared.client_ip_address = userData.clientIpAddress
  }
  if (userData.clientUserAgent) {
    prepared.client_user_agent = userData.clientUserAgent
  }
  if (userData.fbc) {
    prepared.fbc = userData.fbc
  }
  if (userData.fbp) {
    prepared.fbp = userData.fbp
  }

  return prepared
}

/**
 * 發送事件至 Meta Conversions API
 */
export async function sendMetaEvent(params: EventParams): Promise<boolean> {
  if (!ACCESS_TOKEN) {
    console.warn('[Meta CAPI] ACCESS_TOKEN not configured, skipping event')
    return false
  }

  try {
    const eventData = {
      event_name: params.eventName,
      event_time: params.eventTime || Math.floor(Date.now() / 1000),
      event_source_url: params.eventSourceUrl,
      action_source: 'website',
      user_data: await prepareUserData(params.userData),
      custom_data: params.customData ? {
        value: params.customData.value,
        currency: params.customData.currency || 'TWD',
        content_ids: params.customData.contentIds,
        content_type: params.customData.contentType || 'product',
        content_name: params.customData.contentName,
        content_category: params.customData.contentCategory,
        num_items: params.customData.numItems,
        order_id: params.customData.orderId,
      } : undefined,
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [eventData],
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('[Meta CAPI] Failed to send event:', error)
      return false
    }

    const result = await response.json()
    console.log(`[Meta CAPI] Event ${params.eventName} sent successfully:`, result)
    return true
  } catch (error) {
    console.error('[Meta CAPI] Error sending event:', error)
    return false
  }
}

/**
 * 便捷方法：發送 Purchase 事件
 */
export async function trackPurchase(
  orderId: string,
  value: number,
  currency: string,
  productIds: string[],
  userData: UserData
): Promise<boolean> {
  return sendMetaEvent({
    eventName: 'Purchase',
    userData,
    customData: {
      value,
      currency,
      contentIds: productIds,
      contentType: 'product',
      numItems: productIds.length,
      orderId,
    },
  })
}

/**
 * 便捷方法：發送 AddToCart 事件
 */
export async function trackAddToCart(
  productId: string,
  productName: string,
  value: number,
  userData: UserData
): Promise<boolean> {
  return sendMetaEvent({
    eventName: 'AddToCart',
    userData,
    customData: {
      value,
      currency: 'TWD',
      contentIds: [productId],
      contentType: 'product',
      contentName: productName,
      numItems: 1,
    },
  })
}

/**
 * 便捷方法：發送 ViewContent 事件
 */
export async function trackViewContent(
  productId: string,
  productName: string,
  category: string,
  value: number,
  userData: UserData
): Promise<boolean> {
  return sendMetaEvent({
    eventName: 'ViewContent',
    userData,
    customData: {
      value,
      currency: 'TWD',
      contentIds: [productId],
      contentType: 'product',
      contentName: productName,
      contentCategory: category,
    },
  })
}

/**
 * 便捷方法：發送 InitiateCheckout 事件
 */
export async function trackInitiateCheckout(
  productIds: string[],
  value: number,
  userData: UserData
): Promise<boolean> {
  return sendMetaEvent({
    eventName: 'InitiateCheckout',
    userData,
    customData: {
      value,
      currency: 'TWD',
      contentIds: productIds,
      contentType: 'product',
      numItems: productIds.length,
    },
  })
}
