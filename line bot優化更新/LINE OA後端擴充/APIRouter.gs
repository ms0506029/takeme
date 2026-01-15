// ==========================================
// APIRouter.gs - API 路由擴充
// 版本：v1.0
// 說明：擴充 doGet 處理新的整合 API 端點
// 使用方式：將此檔案內容加入現有 LINE OA 後端的 doGet switch 區塊
// ==========================================

/**
 * 處理整合 API 請求
 * 在現有 doGet 的 switch(action) 中加入以下 case
 */

// ==================== 加入 doGet switch 區塊 ====================
// case 'getOrdersWithQueueStatus':
//   result = getOrdersWithQueueStatus(e.parameter);
//   break;
//
// case 'getPendingOOSNotifications':
//   result = getPendingOOSNotifications();
//   break;
//
// case 'getPendingShippingNotifications':
//   result = getPendingShippingNotifications();
//   break;
//
// case 'getCustomerBindings':
//   result = getCustomerBindings(e.parameter);
//   break;
//
// case 'markNotificationSent':
//   result = markNotificationSent(e.parameter.queueId, e.parameter.notifyType);
//   break;
//
// case 'updateCustomerFeedback':
//   result = updateCustomerFeedback(e.parameter.queueId, e.parameter.note);
//   break;

/**
 * 整合 API 路由處理函數
 * 可選擇將此函數加入現有 doGet，或獨立成新的 Web App
 */
function handleIntegrationAPI(e) {
  const action = e.parameter.action || '';
  let result;
  
  switch (action) {
    case 'getOrdersWithQueueStatus':
      result = getOrdersWithQueueStatus(e.parameter);
      break;
      
    case 'getPendingOOSNotifications':
      result = getPendingOOSNotifications();
      break;
      
    case 'getPendingShippingNotifications':
      result = getPendingShippingNotifications();
      break;
      
    case 'getCustomerBindings':
      result = getCustomerBindings(e.parameter);
      break;
      
    case 'markNotificationSent':
      result = markNotificationSent(e.parameter.queueId, e.parameter.notifyType);
      break;
      
    case 'updateCustomerFeedback':
      result = updateCustomerFeedback(e.parameter.queueId, e.parameter.note);
      break;
      
    case 'sendOOSNotification':
      // 發送缺貨通知（需配合 LINE Bot）
      result = sendOOSNotificationFromBackend(e.parameter);
      break;
      
    case 'sendShippingNotification':
      // 發送物流通知（需配合 LINE Bot）
      result = sendShippingNotificationFromBackend(e.parameter);
      break;
      
    default:
      result = { success: false, error: '未知的 action: ' + action };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 從後台發送缺貨通知
 * @param {Object} params - { queueId, lineUserId, productName, esOrderNo }
 */
function sendOOSNotificationFromBackend(params) {
  try {
    const { queueId, lineUserId, productName, esOrderNo, color, size } = params;
    
    if (!lineUserId) {
      return { success: false, error: '缺少 LINE User ID' };
    }
    
    // 建立 Flex Message
    const message = {
      type: 'flex',
      altText: `⚠️ 商品缺貨通知：${productName}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#FFF3E0',
          contents: [
            {
              type: 'text',
              text: '⚠️ 商品缺貨通知',
              weight: 'bold',
              size: 'xl',
              color: '#e17055'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: productName,
              weight: 'bold',
              size: 'lg',
              wrap: true
            },
            {
              type: 'text',
              text: `訂單編號：${esOrderNo}`,
              size: 'sm',
              color: '#666666',
              margin: 'md'
            },
            (color || size) ? {
              type: 'text',
              text: `規格：${[color, size].filter(Boolean).join(' / ')}`,
              size: 'sm',
              color: '#666666',
              margin: 'sm'
            } : null,
            {
              type: 'separator',
              margin: 'xl'
            },
            {
              type: 'text',
              text: '很抱歉，您訂購的商品目前暫時缺貨。',
              wrap: true,
              margin: 'lg'
            },
            {
              type: 'text',
              text: '請問您願意等待補貨嗎？預計需要 2-4 天。',
              wrap: true,
              margin: 'md',
              weight: 'bold'
            }
          ].filter(Boolean)
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'postback',
                label: '🟢 願意等待（2-4天）',
                data: `action=oos_wait&queueId=${queueId}&orderNo=${esOrderNo}`,
                displayText: '願意等待'
              },
              style: 'primary',
              color: '#00b894'
            },
            {
              type: 'button',
              action: {
                type: 'postback',
                label: '🔴 不願等待（申請退款）',
                data: `action=oos_refund&queueId=${queueId}&orderNo=${esOrderNo}`,
                displayText: '申請退款'
              },
              margin: 'sm',
              style: 'secondary'
            }
          ]
        }
      }
    };
    
    // 發送 LINE Push
    const sendResult = _sendLinePush(lineUserId, message);
    
    if (sendResult) {
      // 標記為已發送
      markNotificationSent(queueId, 'OOS');
      return { success: true, message: '缺貨通知已發送' };
    } else {
      return { success: false, error: 'LINE 發送失敗' };
    }
    
  } catch (error) {
    console.error('❌ sendOOSNotificationFromBackend 失敗:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 從後台發送物流通知
 * @param {Object} params - { queueId, lineUserId, productName, esOrderNo, boxId, trackingNo }
 */
function sendShippingNotificationFromBackend(params) {
  try {
    const { queueId, lineUserId, productName, esOrderNo, boxId, trackingNo } = params;
    
    if (!lineUserId) {
      return { success: false, error: '缺少 LINE User ID' };
    }
    
    // 建立 Flex Message
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
              color: '#C9915D'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📦 已從日本集貨倉寄出，預計 5-7 天抵達台灣倉庫',
              weight: 'bold',
              wrap: true,
              color: '#00b894'
            },
            {
              type: 'separator',
              margin: 'lg'
            },
            {
              type: 'text',
              text: `📋 訂單編號：${esOrderNo}`,
              size: 'sm',
              margin: 'lg'
            },
            {
              type: 'text',
              text: `🛍️ 商品：${productName}`,
              size: 'sm',
              margin: 'sm',
              wrap: true
            },
            {
              type: 'text',
              text: `📦 箱號：${boxId}`,
              size: 'sm',
              margin: 'sm',
              color: '#666666'
            },
            trackingNo ? {
              type: 'text',
              text: `🔢 追蹤號碼：${trackingNo}`,
              size: 'sm',
              margin: 'sm',
              weight: 'bold',
              color: '#C9915D'
            } : null
          ].filter(Boolean)
        }
      }
    };
    
    // 發送 LINE Push
    const sendResult = _sendLinePush(lineUserId, message);
    
    if (sendResult) {
      // 標記為已發送
      markNotificationSent(queueId, 'SHIPPING');
      return { success: true, message: '物流通知已發送' };
    } else {
      return { success: false, error: 'LINE 發送失敗' };
    }
    
  } catch (error) {
    console.error('❌ sendShippingNotificationFromBackend 失敗:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 發送 LINE Push 訊息
 * @param {string} userId - LINE User ID
 * @param {Object} message - 訊息物件
 */
function _sendLinePush(userId, message) {
  try {
    const url = 'https://api.line.me/v2/bot/message/push';
    const payload = {
      to: userId,
      messages: [message]
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
    return response.getResponseCode() === 200;
    
  } catch (error) {
    console.error('❌ LINE Push 失敗:', error);
    return false;
  }
}
