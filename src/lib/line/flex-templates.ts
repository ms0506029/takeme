/**
 * LINE Flex Templates
 * LINE Flex 訊息模板
 * 
 * 可重用的 Flex Message 模板集合
 * 參考 refactored/MemberService.gs 和 OOSNotificationService.gs 的成功設計
 */

import { BRAND_COLORS, LineService } from './line-service'

// ===== 類型定義 =====

export interface PriceDropTemplateData {
  productName: string
  productImage?: string
  oldPrice: number
  newPrice: number
  variant?: {
    color?: string
    size?: string
  }
  productUrl?: string
}

export interface RestockTemplateData {
  productName: string
  productImage?: string
  variant?: {
    color?: string
    size?: string
  }
  productUrl?: string
}

export interface MemberBindingSuccessData {
  memberName: string
  email: string
  discountCode?: string
  shopUrl?: string
}

export interface MemberBindingFailedData {
  reason?: string
  registerUrl?: string
}

export interface OutOfStockNotificationData {
  productName: string
  orderNumber: string
  variant?: {
    color?: string
    size?: string
  }
  productId: string
  sku: string
  waitDays?: number
}

// ===== Flex Templates =====

export const FlexTemplates = {
  
  /**
   * 降價通知 Bubble
   */
  priceDrop(data: PriceDropTemplateData): any {
    const discountPercent = Math.round((1 - data.newPrice / data.oldPrice) * 100)
    const variantText = data.variant 
      ? [data.variant.color, data.variant.size].filter(Boolean).join(' / ')
      : null
    
    const bodyContents: any[] = [
      LineService.buildText(data.productName, { weight: 'bold', size: 'lg' }),
    ]
    
    if (variantText) {
      bodyContents.push(
        LineService.buildText(`規格：${variantText}`, { 
          size: 'sm', 
          color: BRAND_COLORS.TEXT_LIGHT,
          margin: 'sm',
        })
      )
    }
    
    bodyContents.push(
      LineService.buildSeparator('lg'),
      {
        type: 'box',
        layout: 'horizontal',
        margin: 'lg',
        contents: [
          {
            type: 'text',
            text: '原價',
            size: 'sm',
            color: BRAND_COLORS.TEXT_MUTED,
            flex: 1,
          },
          {
            type: 'text',
            text: `NT$${data.oldPrice.toLocaleString()}`,
            size: 'sm',
            color: BRAND_COLORS.TEXT_MUTED,
            decoration: 'line-through',
            align: 'end',
            flex: 2,
          },
        ],
      },
      {
        type: 'box',
        layout: 'horizontal',
        margin: 'sm',
        contents: [
          {
            type: 'text',
            text: '特價',
            size: 'lg',
            weight: 'bold',
            color: BRAND_COLORS.ERROR,
            flex: 1,
          },
          {
            type: 'text',
            text: `NT$${data.newPrice.toLocaleString()}`,
            size: 'xl',
            weight: 'bold',
            color: BRAND_COLORS.ERROR,
            align: 'end',
            flex: 2,
          },
        ],
      },
      {
        type: 'text',
        text: `🔥 降價 ${discountPercent}%`,
        size: 'sm',
        color: BRAND_COLORS.PRIMARY,
        margin: 'md',
        align: 'center',
      },
    )
    
    const bubble: any = {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FFF3E0',
        paddingAll: '15px',
        contents: [
          {
            type: 'text',
            text: '🔔 降價通知',
            weight: 'bold',
            size: 'lg',
            color: BRAND_COLORS.PRIMARY,
          },
          {
            type: 'text',
            text: '您收藏的商品降價了！',
            size: 'sm',
            color: BRAND_COLORS.TEXT_LIGHT,
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: bodyContents,
      },
    }
    
    // 添加商品圖片
    if (data.productImage) {
      bubble.hero = {
        type: 'image',
        url: data.productImage,
        size: 'full',
        aspectRatio: '1:1',
        aspectMode: 'cover',
      }
    }
    
    // 添加購買按鈕
    if (data.productUrl) {
      bubble.footer = {
        type: 'box',
        layout: 'vertical',
        contents: [
          LineService.buildButton('🛒 立即購買', {
            type: 'uri',
            label: '立即購買',
            uri: data.productUrl,
          }, { color: BRAND_COLORS.PRIMARY }),
        ],
      }
    }
    
    return {
      type: 'flex',
      altText: `🔔 ${data.productName} 降價 ${discountPercent}%！`,
      contents: bubble,
    }
  },
  
  /**
   * 補貨通知 Bubble
   */
  restock(data: RestockTemplateData): any {
    const variantText = data.variant 
      ? [data.variant.color, data.variant.size].filter(Boolean).join(' / ')
      : null
    
    const bodyContents: any[] = [
      LineService.buildText(data.productName, { weight: 'bold', size: 'lg' }),
    ]
    
    if (variantText) {
      bodyContents.push(
        LineService.buildText(`規格：${variantText}`, { 
          size: 'sm', 
          color: BRAND_COLORS.TEXT_LIGHT,
          margin: 'sm',
        })
      )
    }
    
    bodyContents.push(
      LineService.buildSeparator('lg'),
      {
        type: 'text',
        text: '🎉 您關注的商品已補貨！',
        weight: 'bold',
        color: BRAND_COLORS.SUCCESS,
        margin: 'lg',
        wrap: true,
      },
      {
        type: 'text',
        text: '庫存有限，把握機會！',
        size: 'sm',
        color: BRAND_COLORS.TEXT_LIGHT,
        margin: 'md',
      },
    )
    
    const bubble: any = {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#E8F5E9',
        paddingAll: '15px',
        contents: [
          {
            type: 'text',
            text: '📦 補貨通知',
            weight: 'bold',
            size: 'lg',
            color: BRAND_COLORS.SUCCESS,
          },
          {
            type: 'text',
            text: '您申請的商品已到貨！',
            size: 'sm',
            color: BRAND_COLORS.TEXT_LIGHT,
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: bodyContents,
      },
    }
    
    if (data.productImage) {
      bubble.hero = {
        type: 'image',
        url: data.productImage,
        size: 'full',
        aspectRatio: '1:1',
        aspectMode: 'cover',
      }
    }
    
    if (data.productUrl) {
      bubble.footer = {
        type: 'box',
        layout: 'vertical',
        contents: [
          LineService.buildButton('🛒 立即購買', {
            type: 'uri',
            label: '立即購買',
            uri: data.productUrl,
          }, { color: BRAND_COLORS.SUCCESS }),
        ],
      }
    }
    
    return {
      type: 'flex',
      altText: `📦 ${data.productName} 已補貨！`,
      contents: bubble,
    }
  },
  
  /**
   * 會員綁定成功 Bubble
   * 參考 MemberService._sendBindingSuccessMessage
   */
  memberBindingSuccess(data: MemberBindingSuccessData): any {
    const bodyContents: any[] = [
      {
        type: 'text',
        text: `歡迎，${data.memberName}！`,
        weight: 'bold',
        size: 'lg',
      },
      {
        type: 'text',
        text: '您的 LINE 帳號已成功綁定會員資料。',
        wrap: true,
        margin: 'md',
      },
    ]
    
    // 折扣碼區塊
    if (data.discountCode) {
      bodyContents.push(
        LineService.buildSeparator('xl'),
        {
          type: 'box',
          layout: 'vertical',
          margin: 'xl',
          backgroundColor: '#FFF8E1',
          cornerRadius: '10px',
          paddingAll: '15px',
          contents: [
            {
              type: 'text',
              text: '🎁 新會員專屬折扣碼',
              weight: 'bold',
              color: BRAND_COLORS.PRIMARY,
              align: 'center',
            },
            {
              type: 'text',
              text: data.discountCode,
              weight: 'bold',
              size: '3xl',
              align: 'center',
              margin: 'md',
              color: BRAND_COLORS.PRIMARY,
            },
            {
              type: 'text',
              text: '💰 結帳時輸入即可享優惠',
              size: 'sm',
              align: 'center',
              color: BRAND_COLORS.TEXT_LIGHT,
            },
          ],
        }
      )
    }
    
    const bubble: any = {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#E8F5E9',
        paddingAll: '15px',
        contents: [
          {
            type: 'text',
            text: '🎉 綁定成功！',
            weight: 'bold',
            size: 'xl',
            color: BRAND_COLORS.SUCCESS,
          },
          {
            type: 'text',
            text: '恭喜獲得新會員專屬優惠',
            size: 'sm',
            color: BRAND_COLORS.TEXT_LIGHT,
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: bodyContents,
      },
    }
    
    // 按鈕區
    const footerContents: any[] = []
    
    if (data.shopUrl) {
      footerContents.push(
        LineService.buildButton('🛒 立即購物', {
          type: 'uri',
          label: '立即購物',
          uri: data.shopUrl,
        }, { color: BRAND_COLORS.PRIMARY })
      )
    }
    
    footerContents.push(
      LineService.buildButton('📦 查看我的訂單', {
        type: 'message',
        label: '查看我的訂單',
        text: '📦 查詢我的訂單',
      }, { style: 'secondary', margin: 'sm' })
    )
    
    bubble.footer = {
      type: 'box',
      layout: 'vertical',
      contents: footerContents,
    }
    
    return {
      type: 'flex',
      altText: '🎉 會員綁定成功！獲得專屬折扣碼',
      contents: bubble,
    }
  },
  
  /**
   * 會員綁定失敗 Bubble
   * 參考 MemberService._sendBindingFailedMessage
   */
  memberBindingFailed(data: MemberBindingFailedData): any {
    return {
      type: 'flex',
      altText: '會員驗證結果',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#FFF3E0',
          paddingAll: '15px',
          contents: [
            {
              type: 'text',
              text: '🤔 找不到您的會員資料',
              weight: 'bold',
              size: 'lg',
              color: BRAND_COLORS.PRIMARY,
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: data.reason || '請確認您已在官網完成註冊',
              wrap: true,
              color: BRAND_COLORS.TEXT_LIGHT,
            },
            {
              type: 'text',
              text: '請選擇以下選項：',
              weight: 'bold',
              margin: 'lg',
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            LineService.buildButton('✅ 重新輸入信箱', {
              type: 'message',
              label: '重新輸入信箱',
              text: '重新綁定',
            }, { color: BRAND_COLORS.PRIMARY }),
            data.registerUrl ? LineService.buildButton('🆕 立即註冊會員', {
              type: 'uri',
              label: '立即註冊會員',
              uri: data.registerUrl,
            }, { style: 'secondary', margin: 'sm' }) : null,
            {
              type: 'text',
              text: '💡 註冊完成後，請回來重新綁定會員帳號',
              size: 'xs',
              color: BRAND_COLORS.TEXT_MUTED,
              margin: 'md',
              wrap: true,
            },
          ].filter(Boolean),
        },
      },
    }
  },
  
  /**
   * 缺貨互動通知 Bubble
   * 參考 OOSNotificationService.sendOOSNotification
   * 包含 Postback 按鈕讓顧客選擇
   */
  outOfStockInteractive(data: OutOfStockNotificationData): any {
    const variantText = data.variant 
      ? [data.variant.color, data.variant.size].filter(Boolean).join(' / ')
      : null
    
    const bodyContents: any[] = [
      {
        type: 'text',
        text: data.productName,
        weight: 'bold',
        size: 'lg',
        wrap: true,
      },
      {
        type: 'text',
        text: `訂單編號：${data.orderNumber}`,
        size: 'sm',
        color: BRAND_COLORS.TEXT_LIGHT,
        margin: 'md',
      },
    ]
    
    if (variantText) {
      bodyContents.push({
        type: 'text',
        text: `規格：${variantText}`,
        size: 'sm',
        color: BRAND_COLORS.TEXT_LIGHT,
        margin: 'sm',
      })
    }
    
    bodyContents.push(
      LineService.buildSeparator('xl'),
      {
        type: 'text',
        text: '很抱歉，您訂購的商品目前暫時缺貨。',
        wrap: true,
        margin: 'lg',
      },
      {
        type: 'text',
        text: `請問您願意等待補貨嗎？預計需要 ${data.waitDays || '2-4'} 天。`,
        wrap: true,
        margin: 'md',
        weight: 'bold',
      }
    )
    
    return {
      type: 'flex',
      altText: `⚠️ 商品缺貨通知：${data.productName}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#FFF3E0',
          paddingAll: '15px',
          contents: [
            {
              type: 'text',
              text: '⚠️ 商品缺貨通知',
              weight: 'bold',
              size: 'xl',
              color: BRAND_COLORS.WARNING,
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: bodyContents,
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            // 願意等待按鈕 (Postback)
            {
              type: 'button',
              action: LineService.buildPostbackAction(
                `🟢 願意等待（${data.waitDays || '2-4'}天）`,
                {
                  action: 'oos_wait',
                  productId: data.productId,
                  sku: data.sku,
                  orderNo: data.orderNumber,
                },
                '願意等待'
              ),
              style: 'primary',
              color: BRAND_COLORS.SUCCESS,
            },
            // 申請退款按鈕 (Postback)
            {
              type: 'button',
              action: LineService.buildPostbackAction(
                '🔴 不願等待（申請退款）',
                {
                  action: 'oos_refund',
                  productId: data.productId,
                  sku: data.sku,
                  orderNo: data.orderNumber,
                },
                '申請退款'
              ),
              margin: 'sm',
              style: 'secondary',
            },
          ],
        },
      },
    }
  },
}

export default FlexTemplates
