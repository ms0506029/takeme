/**
 * Triggers - onEdit 觸發器
 * 監聽 Queue 表的編輯事件，自動觸發通知流程
 */

/**
 * onEdit 觸發器（簡單觸發器）
 * 當 Queue 表被編輯時自動執行
 */
function onEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    
    // 只處理 Queue 表
    if (sheet.getName() !== QUEUE_SHEET_NAME) {
      return;
    }
    
    // 只處理資料列（排除標題列）
    const row = range.getRow();
    if (row < 2) {
      return;
    }
    
    // 取得編輯的欄位
    const col = range.getColumn();
    
    // 🔔 新增：檢查是否為 ReadyToNotify 欄位（確認欄位模式）
    const isReadyToNotifyCol = (col === QUEUE_COLS.READY_TO_NOTIFY + 1);
    
    if (isReadyToNotifyCol) {
      // 如果編輯的是 ReadyToNotify 欄位
      const newValue = e.value;
      
      // 只有當設為 TRUE 時才觸發通知
      if (newValue === true || newValue === 'TRUE' || newValue === 'true') {
        logInfo('ReadyToNotify 設為 TRUE，準備發送通知', { row: row });
        const rowIndex = row;
        handleTrackingNotification_(rowIndex);
      }
      return;
    }
    
    // 🔴 以下為舊的自動觸發邏輯（已停用，改為手動確認模式）
    // 如果需要恢復自動模式，請取消註解以下程式碼
    
    /*
    // 檢查是否為 Tracking_JP_to_TW 或 Purchase_Status 欄位
    const isTrackingCol = (col === QUEUE_COLS.TRACKING_JP_TO_TW + 1);
    const isStatusCol = (col === QUEUE_COLS.PURCHASE_STATUS + 1);
    
    if (!isTrackingCol && !isStatusCol) {
      return;  // 不是我們關心的欄位
    }
    
    // 取得新值
    const newValue = e.value;
    
    if (!newValue) {
      return;  // 空值不處理
    }
    
    // 檢查狀態是否需要觸發通知
    if (isStatusCol && !NOTIFY_STATUS_TRIGGERS.includes(newValue)) {
      return;  // 狀態不在觸發清單中
    }
    
    // 非同步處理（避免 onEdit 超時）
    const rowIndex = row;
    handleTrackingNotification_(rowIndex);
    */
    
  } catch (error) {
    logError('onEdit 觸發器錯誤', error);
    // 不拋出異常，避免影響使用者編輯操作
  }
}

/**
 * 處理物流通知（內部函數）
 * 分離出來以避免 onEdit 超時
 */
function handleTrackingNotification_(rowIndex) {
  try {
    // 取得 Queue 資料
    const queueData = QueueService.getByRowIndex(rowIndex);
    
    // 檢查是否已經推播過
    if (queueData.notifyPushedFlag === true) {
      logInfo('此列已推播過，跳過', { rowIndex: rowIndex });
      return;
    }
    
    // 檢查必要欄位
    if (!queueData.esOrderNo) {
      logError('esOrderNo 為空，無法推播', { rowIndex: rowIndex });
      return;
    }
    
    // 呼叫通知 API
    const result = notifyTrackingUpdate({
      rowIndex: rowIndex,
      queueId: queueData.queueId,
      orderNo: queueData.esOrderNo,
      trackingNumber: queueData.trackingJPtoTW,
      purchaseStatus: queueData.purchaseStatus
    });
    
    if (result.success) {
      logInfo('通知發送成功', { rowIndex: rowIndex, orderNo: queueData.esOrderNo });
      
      // 🔔 推播成功後，自動重設 ReadyToNotify 為 FALSE
      const queueSheet = getSheet(QUEUE_SHEET_NAME);
      queueSheet.getRange(rowIndex, QUEUE_COLS.READY_TO_NOTIFY + 1).setValue(false);
      logInfo('已自動重設 ReadyToNotify 為 FALSE', { rowIndex: rowIndex });
    } else {
      logError('通知發送失敗', { rowIndex: rowIndex, error: result.error });
    }
    
  } catch (error) {
    logError('handleTrackingNotification_ 錯誤', error);
  }
}

/**
 * 物流通知主函數
 * @param {Object} data - { rowIndex, queueId, orderNo, trackingNumber, purchaseStatus }
 * @return {Object} { success: boolean, message?: string, error?: string }
 */
function notifyTrackingUpdate(data) {
  try {
    const { rowIndex, queueId, orderNo, trackingNumber, purchaseStatus } = data;
    
    logInfo('開始處理物流通知', data);
    
    // 1. 查詢 LINE User ID
    const userInfo = NotificationService.getLineUserIdByOrderNo(orderNo);
    
    if (!userInfo || !userInfo.lineUserId) {
      const errorMsg = `找不到訂單 ${orderNo} 對應的 LINE User ID`;
      logError(errorMsg);
      
      // 寫入失敗紀錄
      NotificationService.logFailure(
        orderNo,
        queueId,
        '',
        trackingNumber,
        MESSAGE_TYPE.JP_TO_TW_SHIPPED,
        errorMsg
      );
      
      return {
        success: false,
        error: errorMsg
      };
    }
    
    // 2. 根據狀態決定訊息類型
    let messageType = MESSAGE_TYPE.JP_TO_TW_SHIPPED;
    let pushResult;
    
    // 取得物流公司資訊
    const queueData = QueueService.getByRowIndex(rowIndex);
    const courier = queueData.courier;
    
    if (purchaseStatus === PURCHASE_STATUS.SHIPPED_TO_TW) {
      messageType = MESSAGE_TYPE.JP_TO_TW_SHIPPED;
      pushResult = LineService.pushTrackingNotification(
        userInfo.lineUserId,
        orderNo,
        trackingNumber,
        courier  // 傳遞物流公司
      );
    } else if (purchaseStatus === PURCHASE_STATUS.ARRIVED_TW) {
      messageType = MESSAGE_TYPE.TW_ARRIVED;
      pushResult = LineService.pushArrivedTWNotification(
        userInfo.lineUserId,
        orderNo
      );
    } else if (trackingNumber) {
      // 如果有追蹤碼但狀態不明確，預設發送追蹤通知
      messageType = MESSAGE_TYPE.JP_TO_TW_SHIPPED;
      pushResult = LineService.pushTrackingNotification(
        userInfo.lineUserId,
        orderNo,
        trackingNumber,
        courier  // 傳遞物流公司
      );
    } else {
      const errorMsg = '無法判斷訊息類型';
      logError(errorMsg, data);
      return {
        success: false,
        error: errorMsg
      };
    }
    
    // 3. 處理推播結果
    if (pushResult.success) {
      // 寫入成功紀錄
      NotificationService.logSuccess(
        orderNo,
        queueId,
        userInfo.lineUserId,
        trackingNumber,
        messageType,
        `訂單 ${orderNo} 物流通知`
      );
      
      // 標記為已推播
      QueueService.markAsNotified(rowIndex);
      
      return {
        success: true,
        message: '通知發送成功'
      };
    } else {
      // 寫入失敗紀錄
      NotificationService.logFailure(
        orderNo,
        queueId,
        userInfo.lineUserId,
        trackingNumber,
        messageType,
        pushResult.error
      );
      
      return {
        success: false,
        error: pushResult.error
      };
    }
    
  } catch (error) {
    logError('notifyTrackingUpdate 錯誤', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * API 端點：notifyTrackingUpdate
 * 供手動或外部呼叫
 */
function notifyTrackingUpdateAPI(data) {
  return notifyTrackingUpdate(data);
}
