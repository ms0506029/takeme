/**
 * LINE Messaging API 服務
 * 
 * 功能：
 * - 訂單狀態更新推播
 * - 降價通知
 * - 購物車挽回提醒
 */

// LINE 推播訊息類型
interface LineTextMessage {
  type: 'text'
  text: string
}

interface LineFlexMessage {
  type: 'flex'
  altText: string
  contents: Record<string, unknown>
}

type LineMessage = LineTextMessage | LineFlexMessage

/**
 * 發送 LINE 推播訊息
 */
export async function sendLineMessage(
  userId: string,
  messages: LineMessage[]
): Promise<{ success: boolean; error?: string }> {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  
  if (!channelAccessToken) {
    return { success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN 未設定' }
  }
  
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages,
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: JSON.stringify(errorData) }
    }
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '發送失敗',
    }
  }
}

/**
 * 發送訂單狀態更新通知
 */
export async function sendOrderStatusNotification(
  lineUserId: string,
  orderId: string,
  status: string,
  orderDetails?: { total: number; itemCount: number }
): Promise<{ success: boolean }> {
  const statusMessages: Record<string, string> = {
    paid: '您的訂單已付款成功！',
    processing: '您的訂單正在處理中',
    shipped: '您的訂單已出貨！',
    delivered: '您的訂單已送達！',
    completed: '感謝您的購買！',
    refunded: '您的訂單已退款完成',
    cancelled: '您的訂單已取消',
  }
  
  const message = statusMessages[status] || `訂單狀態更新：${status}`
  
  const flexMessage: LineFlexMessage = {
    type: 'flex',
    altText: message,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📦 訂單狀態更新',
            weight: 'bold',
            size: 'lg',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: message,
            wrap: true,
          },
          {
            type: 'text',
            text: `訂單編號：${orderId}`,
            size: 'sm',
            color: '#888888',
            margin: 'md',
          },
          ...(orderDetails ? [
            {
              type: 'separator',
              margin: 'md',
            },
            {
              type: 'text',
              text: `商品數量：${orderDetails.itemCount} 件`,
              size: 'sm',
              margin: 'md',
            },
            {
              type: 'text',
              text: `訂單金額：$${orderDetails.total.toLocaleString()}`,
              size: 'sm',
            },
          ] : []),
        ],
      },
    },
  }
  
  return sendLineMessage(lineUserId, [flexMessage])
}

/**
 * 發送降價通知
 */
export async function sendPriceDropNotification(
  lineUserId: string,
  productName: string,
  originalPrice: number,
  newPrice: number,
  productUrl: string
): Promise<{ success: boolean }> {
  const discountPercent = Math.round((1 - newPrice / originalPrice) * 100)
  
  const flexMessage: LineFlexMessage = {
    type: 'flex',
    altText: `🔔 ${productName} 降價 ${discountPercent}%！`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FF6B6B',
        contents: [
          {
            type: 'text',
            text: '🔔 降價通知',
            color: '#FFFFFF',
            weight: 'bold',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: productName,
            weight: 'bold',
            wrap: true,
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: `$${originalPrice.toLocaleString()}`,
                decoration: 'line-through',
                color: '#888888',
                size: 'sm',
              },
              {
                type: 'text',
                text: `$${newPrice.toLocaleString()}`,
                color: '#FF0000',
                weight: 'bold',
              },
              {
                type: 'text',
                text: `-${discountPercent}%`,
                color: '#FF6B6B',
                size: 'sm',
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '立即查看',
              uri: productUrl,
            },
            style: 'primary',
          },
        ],
      },
    },
  }
  
  return sendLineMessage(lineUserId, [flexMessage])
}

/**
 * 發送購物車挽回提醒
 */
export async function sendCartReminderNotification(
  lineUserId: string,
  cartItems: { name: string; price: number }[],
  cartUrl: string
): Promise<{ success: boolean }> {
  const totalItems = cartItems.length
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0)
  
  const flexMessage: LineFlexMessage = {
    type: 'flex',
    altText: `🛒 您有 ${totalItems} 件商品還在購物車中！`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#4CAF50',
        contents: [
          {
            type: 'text',
            text: '🛒 購物車提醒',
            color: '#FFFFFF',
            weight: 'bold',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `您有 ${totalItems} 件商品還在購物車中`,
            wrap: true,
          },
          {
            type: 'text',
            text: `總金額：$${totalPrice.toLocaleString()}`,
            margin: 'md',
            weight: 'bold',
          },
          {
            type: 'text',
            text: '趕快結帳，免得商品被搶光囉！',
            size: 'sm',
            color: '#888888',
            margin: 'md',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '前往結帳',
              uri: cartUrl,
            },
            style: 'primary',
            color: '#4CAF50',
          },
        ],
      },
    },
  }
  
  return sendLineMessage(lineUserId, [flexMessage])
}
