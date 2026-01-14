/**
 * LINE Service - Core Module
 * LINE 服務核心模組
 * 
 * 提供統一的 LINE Messaging API 操作介面
 * 參考 refactored/LineService.gs 的成功模式
 */


// ===== 品牌色系（參考 Config.gs） =====

export const BRAND_COLORS = {
  PRIMARY: '#C9915D',    // Take Me Japan 主色
  SUCCESS: '#1DB446',    // 成功綠
  WARNING: '#FF9800',    // 警告橘
  ERROR: '#F44336',      // 錯誤紅
  TEXT_DARK: '#333333',  // 深色文字
  TEXT_LIGHT: '#666666', // 淺色文字
  TEXT_MUTED: '#999999', // 灰色文字
}

// ===== 類型定義 =====

export interface LineMessageResult {
  success: boolean
  error?: string
}

export interface FlexBubbleOptions {
  header?: any[]
  body?: any[]
  footer?: any[]
  altText?: string
  styles?: {
    header?: any
    body?: any
    footer?: any
  }
}

// ===== 核心服務 =====

/**
 * LINE 服務模組
 */
export const LineService = {
  
  /**
   * 取得 Channel Access Token
   */
  getAccessToken(): string {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
    if (!token) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN not configured')
    }
    return token
  },
  
  /**
   * 發送 Push 訊息
   * 主動推送訊息給用戶
   */
  async sendPush(userId: string, messages: any | any[]): Promise<LineMessageResult> {
    try {
      // 跳過測試用戶
      if (!userId || userId.includes('test-') || userId.includes('DEBUG_')) {
        console.log('[LineService] Skipping test user')
        return { success: false, error: 'Test user skipped' }
      }
      
      const token = this.getAccessToken()
      const messageArray = Array.isArray(messages) ? messages : [messages]
      
      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: userId,
          messages: messageArray,
        }),
      })
      
      if (response.ok) {
        console.log(`[LineService] Push message sent to ${userId}`)
        return { success: true }
      } else {
        const errorText = await response.text()
        console.error('[LineService] Push failed:', response.status, errorText)
        return { success: false, error: `${response.status}: ${errorText}` }
      }
      
    } catch (error) {
      console.error('[LineService] Push error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  },
  
  /**
   * 發送 Reply 訊息
   * 使用 Reply Token 回覆用戶（只能用一次）
   */
  async sendReply(replyToken: string, messages: any | any[]): Promise<LineMessageResult> {
    try {
      if (!replyToken || replyToken.includes('test-') || replyToken.includes('DEBUG_')) {
        console.log('[LineService] Skipping test reply token')
        return { success: false, error: 'Test token skipped' }
      }
      
      const token = this.getAccessToken()
      const messageArray = Array.isArray(messages) ? messages : [messages]
      
      const response = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          replyToken,
          messages: messageArray,
        }),
      })
      
      if (response.ok) {
        console.log('[LineService] Reply message sent')
        return { success: true }
      } else {
        const errorText = await response.text()
        console.error('[LineService] Reply failed:', response.status, errorText)
        return { success: false, error: `${response.status}: ${errorText}` }
      }
      
    } catch (error) {
      console.error('[LineService] Reply error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  },
  
  /**
   * 取得用戶資料
   */
  async getUserProfile(userId: string): Promise<{
    displayName?: string
    pictureUrl?: string
    statusMessage?: string
  } | null> {
    try {
      const token = this.getAccessToken()
      
      const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        return await response.json()
      }
      
      return null
    } catch (error) {
      console.error('[LineService] Get profile error:', error)
      return null
    }
  },
  
  // ===== Flex Message 建構器 =====
  
  /**
   * 建構 Flex Bubble
   */
  buildFlexBubble(options: FlexBubbleOptions): any {
    const bubble: any = { type: 'bubble' }
    
    if (options.header) {
      bubble.header = {
        type: 'box',
        layout: 'vertical',
        contents: options.header,
        ...options.styles?.header,
      }
    }
    
    if (options.body) {
      bubble.body = {
        type: 'box',
        layout: 'vertical',
        contents: options.body,
        ...options.styles?.body,
      }
    }
    
    if (options.footer) {
      bubble.footer = {
        type: 'box',
        layout: 'vertical',
        contents: options.footer,
        ...options.styles?.footer,
      }
    }
    
    return {
      type: 'flex',
      altText: options.altText || '訊息通知',
      contents: bubble,
    }
  },
  
  /**
   * 建構 Flex Carousel
   */
  buildFlexCarousel(bubbles: any[], altText?: string): any {
    return {
      type: 'flex',
      altText: altText || '多項訊息通知',
      contents: {
        type: 'carousel',
        contents: bubbles,
      },
    }
  },
  
  /**
   * 建構文字元素
   */
  buildText(text: string, options: {
    size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl'
    color?: string
    weight?: 'regular' | 'bold'
    wrap?: boolean
    margin?: string
    align?: 'start' | 'center' | 'end'
  } = {}): any {
    return {
      type: 'text',
      text,
      size: options.size || 'md',
      color: options.color || BRAND_COLORS.TEXT_DARK,
      weight: options.weight || 'regular',
      wrap: options.wrap !== false,
      margin: options.margin || 'none',
      align: options.align || 'start',
    }
  },
  
  /**
   * 建構按鈕元素
   */
  buildButton(label: string, action: any, options: {
    style?: 'primary' | 'secondary' | 'link'
    color?: string
    margin?: string
  } = {}): any {
    return {
      type: 'button',
      action,
      style: options.style || 'primary',
      color: options.color || BRAND_COLORS.PRIMARY,
      margin: options.margin || 'none',
    }
  },
  
  /**
   * 建構 Postback 動作
   * 用於互動式按鈕
   */
  buildPostbackAction(label: string, data: Record<string, string>, displayText?: string): any {
    const dataString = Object.entries(data)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')
    
    return {
      type: 'postback',
      label,
      data: dataString,
      displayText: displayText || label,
    }
  },
  
  /**
   * 建構分隔線
   */
  buildSeparator(margin: string = 'xl'): any {
    return {
      type: 'separator',
      margin,
    }
  },
}

export default LineService
