/**
 * NotificationService - 通知紀錄管理服務
 * 負責寫入與查詢 NotificationsLog
 */

const NotificationService = (function() {
  
  /**
   * 取得 NotificationsLog 工作表
   */
  function getLogSheet() {
    return getSheet(NOTIFICATION_LOG_SHEET_NAME);
  }
  
  /**
   * 取得 OrderLineUserMap 工作表
   */
  function getUserMapSheet() {
    return getSheet(ORDER_USER_MAP_SHEET_NAME);
  }
  
  /**
   * 根據訂單編號查詢 LINE User ID
   * @param {string} orderNo - ES 訂單編號
   * @return {Object|null} { lineUserId, customerName, lineDisplayName } 或 null
   */
  function getLineUserIdByOrderNo(orderNo) {
    const sheet = getUserMapSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][ORDER_USER_MAP_COLS.ES_ORDER_NO] === orderNo) {
        return {
          lineUserId: data[i][ORDER_USER_MAP_COLS.LINE_USER_ID],
          customerName: data[i][ORDER_USER_MAP_COLS.CUSTOMER_NAME],
          lineDisplayName: data[i][ORDER_USER_MAP_COLS.LINE_DISPLAY_NAME]
        };
      }
    }
    
    return null;
  }
  
  /**
   * 寫入通知紀錄
   * @param {Object} logData - 通知紀錄資料
   */
  function writeLog(logData) {
    const sheet = getLogSheet();
    
    const row = [
      logData.timestamp || getTimestamp(),
      logData.esOrderNo || '',
      logData.queueId || '',
      logData.lineUserId || '',
      logData.trackingJPtoTW || '',
      logData.messageType || '',
      logData.messageContentShort || '',
      logData.status || 'unknown',
      logData.errorMessage || ''
    ];
    
    sheet.appendRow(row);
  }
  
  /**
   * 寫入成功的通知紀錄
   */
  function logSuccess(orderNo, queueId, lineUserId, trackingNumber, messageType, messageContent) {
    writeLog({
      esOrderNo: orderNo,
      queueId: queueId,
      lineUserId: lineUserId,
      trackingJPtoTW: trackingNumber,
      messageType: messageType,
      messageContentShort: messageContent.substring(0, 100),  // 只儲存前 100 字
      status: 'success'
    });
  }
  
  /**
   * 寫入失敗的通知紀錄
   */
  function logFailure(orderNo, queueId, lineUserId, trackingNumber, messageType, errorMessage) {
    writeLog({
      esOrderNo: orderNo,
      queueId: queueId,
      lineUserId: lineUserId,
      trackingJPtoTW: trackingNumber,
      messageType: messageType,
      status: 'failed',
      errorMessage: errorMessage
    });
  }
  
  /**
   * 查詢通知紀錄
   * @param {Object} filters - 篩選條件，例如 { orderNo: 'ES5336', status: 'success' }
   * @param {number} limit - 限制筆數（預設 100）
   * @return {Array} 通知紀錄陣列
   */
  function queryLogs(filters, limit) {
    const sheet = getLogSheet();
    const data = sheet.getDataRange().getValues();
    const results = [];
    
    const maxLimit = limit || 100;
    
    for (let i = data.length - 1; i >= 1 && results.length < maxLimit; i--) {
      const row = data[i];
      
      // 檢查篩選條件
      let match = true;
      
      if (filters) {
        if (filters.orderNo && row[NOTIFICATION_LOG_COLS.ES_ORDER_NO] !== filters.orderNo) {
          match = false;
        }
        if (filters.status && row[NOTIFICATION_LOG_COLS.STATUS] !== filters.status) {
          match = false;
        }
        if (filters.messageType && row[NOTIFICATION_LOG_COLS.MESSAGE_TYPE] !== filters.messageType) {
          match = false;
        }
      }
      
      if (match) {
        results.push({
          timestamp: row[NOTIFICATION_LOG_COLS.TIMESTAMP],
          esOrderNo: row[NOTIFICATION_LOG_COLS.ES_ORDER_NO],
          queueId: row[NOTIFICATION_LOG_COLS.QUEUE_ID],
          lineUserId: row[NOTIFICATION_LOG_COLS.LINE_USER_ID],
          trackingJPtoTW: row[NOTIFICATION_LOG_COLS.TRACKING_JP_TO_TW],
          messageType: row[NOTIFICATION_LOG_COLS.MESSAGE_TYPE],
          messageContentShort: row[NOTIFICATION_LOG_COLS.MESSAGE_CONTENT_SHORT],
          status: row[NOTIFICATION_LOG_COLS.STATUS],
          errorMessage: row[NOTIFICATION_LOG_COLS.ERROR_MESSAGE]
        });
      }
    }
    
    return results;
  }
  
  // 公開 API
  return {
    getLineUserIdByOrderNo: getLineUserIdByOrderNo,
    writeLog: writeLog,
    logSuccess: logSuccess,
    logFailure: logFailure,
    queryLogs: queryLogs
  };
  
})();
