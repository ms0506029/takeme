// ==========================================
// LineService.gs - LINE Messaging API 服務模組
// 版本：v4.0 模組化架構
// 說明：封裝所有 LINE Messaging API 操作
// ==========================================

/**
 * LINE 服務模組
 * 提供統一的 LINE Messaging API 操作介面
 */
const LineService = {
  
  /**
   * 發送 Reply 訊息
   * 使用 Reply Token 回覆用戶（只能用一次）
   * @param {string} replyToken - LINE Reply Token
   * @param {Object} message - 訊息物件
   * @returns {boolean} - 是否發送成功
   */
  sendReply: function(replyToken, message) {
    try {
      // 跳過測試用 Token
      if (!replyToken || replyToken.includes('test-') || replyToken.includes('DEBUG_')) {
        console.log('跳過測試用 token，不發送 LINE 訊息');
        return false;
      }
      
      const url = 'https://api.line.me/v2/bot/message/reply';
      const payload = {
        replyToken: replyToken,
        messages: Array.isArray(message) ? message : [message]
      };
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CONFIG.CHANNEL_ACCESS_TOKEN}`
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      
      if (statusCode === 200) {
        console.log('✅ Reply 訊息發送成功');
        return true;
      } else {
        console.error('❌ Reply 訊息發送失敗:', statusCode, response.getContentText());
        return false;
      }
      
    } catch (error) {
      console.error('❌ Reply 訊息發送異常:', error);
      return false;
    }
  },
  
  /**
   * 發送 Push 訊息
   * 主動推送訊息給用戶（消耗訊息配額）
   * @param {string} userId - LINE User ID
   * @param {Object} message - 訊息物件
   * @returns {boolean} - 是否發送成功
   */
  sendPush: function(userId, message) {
    try {
      // 跳過測試用戶
      if (!userId || userId.includes('test-') || userId.includes('DEBUG_')) {
        console.log('跳過測試用戶，不發送 Push 訊息');
        return false;
      }
      
      const url = 'https://api.line.me/v2/bot/message/push';
      const payload = {
        to: userId,
        messages: Array.isArray(message) ? message : [message]
      };
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CONFIG.CHANNEL_ACCESS_TOKEN}`
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      if (statusCode === 200) {
        console.log('✅ Push 訊息發送成功');
        return true;
      } else {
        console.error('❌ Push 訊息發送失敗:', statusCode, responseText);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Push 訊息發送異常:', error);
      return false;
    }
  },
  
  /**
   * 發送處理中訊息
   * 告知用戶系統正在處理中
   * @param {string} replyToken - LINE Reply Token
   * @param {string} action - 動作類型 (verifying, orders, tracking 等)
   */
  sendProcessing: function(replyToken, action) {
    const messageText = PROCESSING_MESSAGES[action] || '⏳ 處理中，請稍候...';
    
    const message = {
      type: 'text',
      text: messageText
    };
    
    this.sendReply(replyToken, message);
  },
  
  /**
   * 發送錯誤訊息 (Reply)
   * @param {string} replyToken - LINE Reply Token
   * @param {string} errorText - 錯誤說明
   */
  sendError: function(replyToken, errorText) {
    const message = {
      type: 'text',
      text: `❌ 系統暫時無法處理您的請求\n\n錯誤：${errorText}\n\n請稍後再試或聯絡客服。`
    };
    
    this.sendReply(replyToken, message);
  },
  
  /**
   * 發送錯誤訊息 (Push)
   * @param {string} userId - LINE User ID
   * @param {string} errorText - 錯誤說明
   */
  sendErrorPush: function(userId, errorText) {
    const message = {
      type: 'text',
      text: `❌ 系統暫時無法處理您的請求\n\n錯誤：${errorText}\n\n請稍後再試或聯絡客服。`
    };
    
    this.sendPush(userId, message);
  },
  
  /**
   * 建構 Flex Message Bubble
   * 提供統一的 Bubble 建構方式
   * @param {Object} options - Bubble 設定
   * @returns {Object} - Flex Message Bubble
   */
  buildFlexBubble: function(options) {
    const { header, body, footer, altText } = options;
    
    const bubble = {
      type: 'bubble'
    };
    
    if (header) {
      bubble.header = {
        type: 'box',
        layout: 'vertical',
        contents: header
      };
    }
    
    if (body) {
      bubble.body = {
        type: 'box',
        layout: 'vertical',
        contents: body
      };
    }
    
    if (footer) {
      bubble.footer = {
        type: 'box',
        layout: 'vertical',
        contents: footer
      };
    }
    
    return {
      type: 'flex',
      altText: altText || '訊息通知',
      contents: bubble
    };
  },
  
  /**
   * 建構 Flex Message Carousel
   * 用於顯示多個 Bubble
   * @param {Array} bubbles - Bubble 陣列
   * @param {string} altText - 替代文字
   * @returns {Object} - Flex Message Carousel
   */
  buildFlexCarousel: function(bubbles, altText) {
    return {
      type: 'flex',
      altText: altText || '多項訊息通知',
      contents: {
        type: 'carousel',
        contents: bubbles
      }
    };
  },
  
  /**
   * 建構文字元素
   * @param {string} text - 文字內容
   * @param {Object} options - 選項 (size, color, weight, wrap, margin)
   * @returns {Object} - Text 元素
   */
  buildText: function(text, options = {}) {
    return {
      type: 'text',
      text: text,
      size: options.size || 'md',
      color: options.color || BRAND_COLORS.TEXT_DARK,
      weight: options.weight || 'regular',
      wrap: options.wrap !== false,
      margin: options.margin || 'none',
      align: options.align || 'start'
    };
  },
  
  /**
   * 建構按鈕元素
   * @param {string} label - 按鈕文字
   * @param {Object} action - 動作設定
   * @param {Object} options - 選項 (style, color, margin)
   * @returns {Object} - Button 元素
   */
  buildButton: function(label, action, options = {}) {
    return {
      type: 'button',
      action: action,
      style: options.style || 'primary',
      color: options.color || BRAND_COLORS.PRIMARY,
      margin: options.margin || 'none'
    };
  },
  
  /**
   * 建構分隔線元素
   * @param {string} margin - 間距
   * @returns {Object} - Separator 元素
   */
  buildSeparator: function(margin = 'xl') {
    return {
      type: 'separator',
      margin: margin
    };
  },
  
  /**
   * 發送物流通知訊息（JP to TW 出貨）
   * 🔴 當 Queue 表的 Box_ID 欄位有值時使用此函數發送通知
   * 🔴 注意：不會自動發送，需要操作員確認後才發送
   * @param {string} userId - LINE User ID
   * @param {Object} shipmentData - 物流資料 { orderNumber, productName, boxId, trackingNumber }
   * @returns {boolean} - 是否發送成功
   */
  sendShippingNotification: function(userId, shipmentData) {
    const message = {
      type: 'flex',
      altText: '📦 商品已從日本寄出',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📦 商品已寄出通知',
              weight: 'bold',
              size: 'xl',
              color: BRAND_COLORS.PRIMARY
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: TRACKING_MESSAGE_TEMPLATES.JP_TO_TW_SHIPPED,
              weight: 'bold',
              wrap: true,
              color: BRAND_COLORS.SUCCESS
            },
            {
              type: 'separator',
              margin: 'lg'
            },
            {
              type: 'text',
              text: `📋 訂單編號：${shipmentData.orderNumber}`,
              size: 'sm',
              margin: 'lg'
            },
            {
              type: 'text',
              text: `🛍️ 商品：${shipmentData.productName}`,
              size: 'sm',
              margin: 'sm',
              wrap: true
            },
            {
              type: 'text',
              text: `📦 箱號：${shipmentData.boxId}`,
              size: 'sm',
              margin: 'sm',
              color: BRAND_COLORS.TEXT_LIGHT
            },
            shipmentData.trackingNumber ? {
              type: 'text',
              text: `🔢 追蹤號碼：${shipmentData.trackingNumber}`,
              size: 'sm',
              margin: 'sm',
              weight: 'bold',
              color: BRAND_COLORS.PRIMARY
            } : {
              type: 'text',
              text: '🔢 追蹤號碼：處理中',
              size: 'sm',
              margin: 'sm',
              color: BRAND_COLORS.TEXT_MUTED
            }
          ].filter(item => item) // 過濾掉 undefined
        },
        footer: shipmentData.trackingUrl ? {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '🔍 查看物流進度',
                uri: shipmentData.trackingUrl
              },
              style: 'primary',
              color: BRAND_COLORS.PRIMARY
            }
          ]
        } : undefined
      }
    };
    
    return this.sendPush(userId, message);
  }
};

// ==========================================
// 向下相容：保留舊函數名稱，內部調用 LineService
// 這些函數在完全重構後可以移除
// ==========================================

/**
 * 發送 Reply 訊息（舊版，向下相容）
 */
function sendLineMessage(replyToken, message) {
  return LineService.sendReply(replyToken, message);
}

/**
 * 發送 Push 訊息（舊版，向下相容）
 */
function sendPushMessage(userId, message) {
  return LineService.sendPush(userId, message);
}

/**
 * 發送處理中訊息（舊版，向下相容）
 */
function sendProcessingMessage(replyToken, action) {
  LineService.sendProcessing(replyToken, action);
}

/**
 * 發送錯誤訊息 Reply（舊版，向下相容）
 */
function sendErrorMessage(replyToken, errorText) {
  LineService.sendError(replyToken, errorText);
}

/**
 * 發送錯誤訊息 Push（舊版，向下相容）
 */
function sendErrorMessagePush(userId, errorText) {
  LineService.sendErrorPush(userId, errorText);
}
