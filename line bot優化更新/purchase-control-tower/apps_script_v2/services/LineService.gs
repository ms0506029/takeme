/**
 * LineService - LINE Messaging API 服務
 * 負責發送 LINE 推播訊息
 */

const LineService = (function() {
  
  const LINE_API_URL = 'https://api.line.me/v2/bot/message/push';
  
  /**
   * 發送 LINE 推播訊息
   * @param {string} userId - LINE User ID
   * @param {Array|Object} messages - 訊息陣列或單一訊息物件
   * @return {Object} { success: boolean, response?: any, error?: string }
   */
  function pushMessage(userId, messages) {
    try {
      const token = ConfigService.getLineToken();
      
      // 確保 messages 是陣列
      const messageArray = Array.isArray(messages) ? messages : [messages];
      
      // 組合 payload
      const payload = {
        to: userId,
        messages: messageArray
      };
      
      // 組合 HTTP 請求選項
      const options = {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      
      // 發送請求
      const response = UrlFetchApp.fetch(LINE_API_URL, options);
      const statusCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      if (statusCode === 200) {
        logInfo('LINE 推播成功', { userId: userId });
        return {
          success: true,
          response: responseText
        };
      } else {
        logError('LINE 推播失敗', { statusCode: statusCode, response: responseText });
        return {
          success: false,
          error: `LINE API 錯誤 (${statusCode}): ${responseText}`
        };
      }
      
    } catch (error) {
      logError('LINE 推播異常', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * 發送文字訊息
   */
  function pushTextMessage(userId, text) {
    const message = {
      type: 'text',
      text: text
    };
    
    return pushMessage(userId, message);
  }
  
  /**
   * 發送物流通知訊息（日本→台灣）
   * @param {string} userId - LINE User ID
   * @param {string} orderNo - 訂單編號
   * @param {string} trackingNumber - 追蹤號碼
   * @param {string} courier - 物流公司（SF 或 SCORE）
   */
  function pushTrackingNotification(userId, orderNo, trackingNumber, courier) {
    // 根據物流公司生成對應的查詢 URL
    let trackingUrl;
    let courierName;
    
    if (courier) {
      trackingUrl = ConfigService.buildCourierTrackingUrl(courier, trackingNumber);
      courierName = ConfigService.getCourierName(courier);
    } else {
      // 如果沒有指定物流公司，使用舊版 URL（向下兼容）
      trackingUrl = ConfigService.buildTrackingUrl(trackingNumber, orderNo);
      courierName = '物流公司';
    }
    
    // 組合訊息（包含物流公司名稱）
    let messageText = `🚢 您的訂單 #${orderNo} 中的商品已從日本寄出\n\n`;
    messageText += `📦 物流公司：${courierName}\n`;
    messageText += `📦 追蹤碼：${trackingNumber}\n\n`;
    messageText += `🔍 點此查看物流狀態：\n${trackingUrl}\n\n`;
    messageText += `感謝您的耐心等候！`;
    
    return pushTextMessage(userId, messageText);
  }
  
  /**
   * 發送台灣抵達通知
   */
  function pushArrivedTWNotification(userId, orderNo) {
    const messageText = fillMessageTemplate(
      LINE_MESSAGE_TEMPLATES.TW_ARRIVED,
      {
        orderNo: orderNo
      }
    );
    
    return pushTextMessage(userId, messageText);
  }
  
  /**
   * 發送台灣出貨通知
   */
  function pushTWShippedNotification(userId, orderNo, trackingNumber) {
    const messageText = fillMessageTemplate(
      LINE_MESSAGE_TEMPLATES.TW_TO_CUSTOMER_SHIPPED,
      {
        orderNo: orderNo,
        tracking: trackingNumber || '請洽客服'
      }
    );
    
    return pushTextMessage(userId, messageText);
  }
  
  // 公開 API
  return {
    pushMessage: pushMessage,
    pushTextMessage: pushTextMessage,
    pushTrackingNotification: pushTrackingNotification,
    pushArrivedTWNotification: pushArrivedTWNotification,
    pushTWShippedNotification: pushTWShippedNotification
  };
  
})();
