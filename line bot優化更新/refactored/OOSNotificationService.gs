// ==========================================
// OOSNotificationService.gs - 缺貨互動通知服務
// 版本：v4.0 模組化架構
// 說明：處理缺貨通知流程，含顧客回饋按鈕
// 🔴 注意：所有通知必須經操作員確認後才發送
// ==========================================

/**
 * 缺貨通知服務模組
 * 從 Queue 表讀取缺貨商品，生成互動式 Flex Message
 * 顧客可選擇「願意等待」或「不願等待」
 */
const OOSNotificationService = {
  
  /**
   * 取得待通知的缺貨商品列表
   * 供操作員確認後發送
   * @returns {Object} - { success, items }
   */
  getPendingOOSItems: function() {
    try {
      const spreadsheet = SpreadsheetApp.openById(TOWER_SPREADSHEET_ID);
      const queueSheet = spreadsheet.getSheetByName('Queue');
      
      if (!queueSheet) {
        return { success: false, error: '找不到 Queue 表單', items: [] };
      }
      
      const data = queueSheet.getDataRange().getValues();
      const headers = data[0];
      
      // Queue 欄位索引
      const COLS = {
        QUEUE_ID: 0,
        ES_ORDER_NO: 1,
        PRODUCT_NAME: 2,
        SKU: 3,
        COLOR: 4,
        SIZE: 5,
        PURCHASE_STATUS: 8,
        NOTIFY_STATUS: 31,      // AF 欄
        NOTIFY_PUSHED_FLAG: 21  // V 欄
      };
      
      const oosItems = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const purchaseStatus = (row[COLS.PURCHASE_STATUS] || '').toString().trim();
        const notifyPushed = row[COLS.NOTIFY_PUSHED_FLAG];
        
        // 只取缺貨且尚未發送通知的商品
        if (purchaseStatus === '缺貨' && !notifyPushed) {
          oosItems.push({
            rowIndex: i + 1,
            queueId: row[COLS.QUEUE_ID],
            esOrderNo: row[COLS.ES_ORDER_NO],
            productName: row[COLS.PRODUCT_NAME],
            sku: row[COLS.SKU],
            color: row[COLS.COLOR] || '',
            size: row[COLS.SIZE] || '',
            notifyStatus: row[COLS.NOTIFY_STATUS] || ''
          });
        }
      }
      
      console.log(`📋 找到 ${oosItems.length} 筆待通知缺貨商品`);
      
      return {
        success: true,
        items: oosItems,
        totalCount: oosItems.length
      };
      
    } catch (error) {
      console.error('❌ 取得缺貨商品失敗:', error);
      return { success: false, error: error.toString(), items: [] };
    }
  },
  
  /**
   * 發送缺貨通知給顧客
   * 🔴 此函數應由操作員確認後調用
   * @param {string} lineUserId - LINE User ID
   * @param {Object} oosData - 缺貨商品資料
   * @returns {boolean} - 是否發送成功
   */
  sendOOSNotification: function(lineUserId, oosData) {
    try {
      console.log('📤 發送缺貨通知:', oosData.productName);
      
      const message = {
        type: 'flex',
        altText: `⚠️ 商品缺貨通知：${oosData.productName}`,
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
                color: BRAND_COLORS.WARNING
              }
            ]
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: oosData.productName,
                weight: 'bold',
                size: 'lg',
                wrap: true
              },
              {
                type: 'text',
                text: `訂單編號：${oosData.esOrderNo}`,
                size: 'sm',
                color: BRAND_COLORS.TEXT_LIGHT,
                margin: 'md'
              },
              oosData.color || oosData.size ? {
                type: 'text',
                text: `規格：${[oosData.color, oosData.size].filter(Boolean).join(' / ')}`,
                size: 'sm',
                color: BRAND_COLORS.TEXT_LIGHT,
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
            ].filter(item => item)
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
                  data: `action=oos_wait&queueId=${oosData.queueId}&orderNo=${oosData.esOrderNo}`,
                  displayText: '願意等待'
                },
                style: 'primary',
                color: BRAND_COLORS.SUCCESS
              },
              {
                type: 'button',
                action: {
                  type: 'postback',
                  label: '🔴 不願等待（申請退款）',
                  data: `action=oos_refund&queueId=${oosData.queueId}&orderNo=${oosData.esOrderNo}`,
                  displayText: '申請退款'
                },
                margin: 'sm',
                style: 'secondary'
              }
            ]
          }
        }
      };
      
      const sendResult = LineService.sendPush(lineUserId, message);
      
      if (sendResult) {
        // 設定用戶狀態為等待缺貨回應
        StateService.setWaitingForOOSResponse(lineUserId, oosData);
        
        // 標記為已發送
        this._markAsNotified(oosData.rowIndex);
      }
      
      return sendResult;
      
    } catch (error) {
      console.error('❌ 發送缺貨通知失敗:', error);
      return false;
    }
  },
  
  /**
   * 處理顧客缺貨回應 (Postback)
   * @param {Object} event - LINE postback 事件
   * @param {Object} postbackData - 解析後的 postback 資料
   */
  handleOOSResponse: function(event, postbackData) {
    try {
      const userId = event.source.userId;
      const action = postbackData.action;
      const queueId = postbackData.queueId;
      const orderNo = postbackData.orderNo;
      
      console.log(`📥 處理缺貨回應: ${action}`, { queueId, orderNo });
      
      // 更新 Queue 表的採購備註
      const responseText = action === 'oos_wait' ? 
        '顧客願意等待' : 
        '顧客不願等待，申請退款';
      
      this._updateQueueNote(queueId, responseText);
      
      // 發送確認訊息給顧客
      if (action === 'oos_wait') {
        this._sendWaitConfirmation(userId, orderNo);
      } else {
        this._sendRefundConfirmation(userId, orderNo);
      }
      
      // 清除用戶狀態
      StateService.clearState(userId);
      
    } catch (error) {
      console.error('❌ 處理缺貨回應失敗:', error);
    }
  },
  
  /**
   * 標記為已發送通知
   * @param {number} rowIndex - Queue 表列索引
   * @private
   */
  _markAsNotified: function(rowIndex) {
    try {
      const spreadsheet = SpreadsheetApp.openById(TOWER_SPREADSHEET_ID);
      const queueSheet = spreadsheet.getSheetByName('Queue');
      
      // Notify_Pushed_Flag 在 V 欄 (索引 21 + 1 = 22)
      queueSheet.getRange(rowIndex, 22).setValue(true);
      
      // 更新時間戳
      const timestamp = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
      queueSheet.getRange(rowIndex, 34).setValue(timestamp); // AH 欄
      
      console.log('✅ 已標記為已發送通知');
      
    } catch (error) {
      console.error('❌ 標記通知狀態失敗:', error);
    }
  },
  
  /**
   * 更新 Queue 表的採購備註
   * @param {string} queueId - Queue ID
   * @param {string} note - 備註內容
   * @private
   */
  _updateQueueNote: function(queueId, note) {
    try {
      const spreadsheet = SpreadsheetApp.openById(TOWER_SPREADSHEET_ID);
      const queueSheet = spreadsheet.getSheetByName('Queue');
      const data = queueSheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === queueId) {
          // 更新 Notify_Note (AG 欄，索引 32 + 1 = 33)
          const timestamp = Utilities.formatDate(new Date(), 'Asia/Taipei', 'MM/dd HH:mm');
          queueSheet.getRange(i + 1, 33).setValue(`${timestamp} ${note}`);
          
          // 更新 Notify_Status (AF 欄，索引 31 + 1 = 32)
          queueSheet.getRange(i + 1, 32).setValue('已回覆');
          
          console.log(`✅ 已更新 Queue 備註: ${queueId}`);
          break;
        }
      }
      
    } catch (error) {
      console.error('❌ 更新備註失敗:', error);
    }
  },
  
  /**
   * 發送等待確認訊息
   * @param {string} userId - LINE User ID
   * @param {string} orderNo - 訂單編號
   * @private
   */
  _sendWaitConfirmation: function(userId, orderNo) {
    const message = {
      type: 'text',
      text: `✅ 感謝您的耐心等候！\n\n訂單 #${orderNo} 的缺貨商品，我們會盡快為您補貨。\n\n預計 2-4 天內會有進一步消息，請留意通知。`
    };
    
    LineService.sendPush(userId, message);
  },
  
  /**
   * 發送退款確認訊息
   * @param {string} userId - LINE User ID
   * @param {string} orderNo - 訂單編號
   * @private
   */
  _sendRefundConfirmation: function(userId, orderNo) {
    const message = {
      type: 'text',
      text: `📋 已收到您的退款申請\n\n訂單 #${orderNo} 的缺貨商品，我們會盡快為您處理退款。\n\n如有任何問題，歡迎隨時聯繫客服。`
    };
    
    LineService.sendPush(userId, message);
  },
  
  /**
   * 🆕 根據訂單編號更新顧客選擇
   * 當顧客點擊「願意等待」或「不願等待」按鈕時調用
   * @param {string} orderNumber - 訂單編號
   * @param {string} choice - 顧客選擇（'客戶選擇等待' 或 '客戶選擇退款'）
   */
  updateCustomerChoice: function(orderNumber, choice) {
    try {
      console.log(`📝 更新顧客選擇: 訂單 ${orderNumber}, 選擇: ${choice}`);
      
      const spreadsheet = SpreadsheetApp.openById(TOWER_SPREADSHEET_ID);
      const queueSheet = spreadsheet.getSheetByName('Queue');
      
      if (!queueSheet) {
        console.error('❌ 找不到 Queue 表');
        return false;
      }
      
      const data = queueSheet.getDataRange().getValues();
      const headers = data[0];
      
      // 找到「採購備註」欄位索引（如果不存在則使用 Notify_Note 欄位）
      let noteColIndex = headers.indexOf('採購備註');
      if (noteColIndex === -1) {
        // 如果沒有「採購備註」欄位，使用 Notify_Note (AG 欄，索引 32)
        noteColIndex = 32;
      }
      
      // 清理訂單編號（移除 # 前綴）
      const cleanOrderNumber = String(orderNumber).trim().replace(/^#/, '');
      
      // 時間戳記
      const timestamp = Utilities.formatDate(new Date(), 'Asia/Taipei', 'MM/dd HH:mm');
      const noteContent = `${timestamp} ${choice}`;
      
      let updatedCount = 0;
      
      // 遍歷所有行，找到匹配的訂單編號並更新
      for (let i = 1; i < data.length; i++) {
        const rowOrderNo = String(data[i][QUEUE_COLS.ES_ORDER_NO] || '').trim().replace(/^#/, '');
        const purchaseStatus = (data[i][QUEUE_COLS.PURCHASE_STATUS] || '').toString().trim();
        
        // 只更新該訂單中狀態為「缺貨」的商品
        if (rowOrderNo === cleanOrderNumber && purchaseStatus === '缺貨') {
          queueSheet.getRange(i + 1, noteColIndex + 1).setValue(noteContent);
          updatedCount++;
        }
      }
      
      console.log(`✅ 已更新 ${updatedCount} 筆缺貨商品的採購備註`);
      return true;
      
    } catch (error) {
      console.error('❌ 更新顧客選擇失敗:', error);
      return false;
    }
  }
};

// ==========================================
// 操作員 API 函數（供後台或觸發器調用）
// ==========================================

/**
 * 取得待發送的缺貨通知列表
 * 供操作員確認
 */
function apiGetPendingOOSNotifications() {
  return OOSNotificationService.getPendingOOSItems();
}

/**
 * 發送單筆缺貨通知
 * 🔴 由操作員確認後調用
 */
function apiSendOOSNotification(lineUserId, oosData) {
  return OOSNotificationService.sendOOSNotification(lineUserId, oosData);
}

/**
 * 處理缺貨回應 Postback
 */
function handleOOSPostback(event, postbackData) {
  OOSNotificationService.handleOOSResponse(event, postbackData);
}
