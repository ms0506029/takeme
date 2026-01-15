/**
 * API - 前端呼叫的後端 API 函數
 * 所有前端透過 google.script.run 呼叫的函數都定義在這裡
 */

// ==================== 採購彙總 API ====================

function apiGetProcurementSummary(statusFilter) {
  try {
    const summary = QueueService.getProcurementSummary(statusFilter);
    return { success: true, data: summary };
  } catch (error) {
    logError('apiGetProcurementSummary 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

function apiSelectRowsByKey(key) {
  try {
    const result = QueueService.selectRowsByKey(key);
    return result;
  } catch (error) {
    logError('apiSelectRowsByKey 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

function apiApplyUnitPriceToKey(key, price) {
  try {
    const result = QueueService.applyUnitPriceToKey(key, price);
    return result;
  } catch (error) {
    logError('apiApplyUnitPriceToKey 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

// ==================== 折扣分攤 API ====================

function apiCalculateDiscount(items, actualPaid) {
  try {
    const result = DiscountService.calculateDiscountAllocation(items, actualPaid);
    return result;
  } catch (error) {
    logError('apiCalculateDiscount 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

function apiApplyDiscountToQueue(items) {
  try {
    const result = DiscountService.applyDiscountToQueue(items);
    return result;
  } catch (error) {
    logError('apiApplyDiscountToQueue 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

// ==================== 批次管理 API ====================

function apiCreateBatch(batchName) {
  try {
    const result = BatchService.createBatch(batchName);
    return result;
  } catch (error) {
    logError('apiCreateBatch 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

function apiGetBatchItems(batchId) {
  try {
    const items = BatchService.getBatchItems(batchId);
    return { success: true, data: items };
  } catch (error) {
    logError('apiGetBatchItems 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

function apiExportBatch(batchId) {
  try {
    const result = BatchService.exportBatch(batchId);
    return result;
  } catch (error) {
    logError('apiExportBatch 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

// ==================== 批量下載 API ====================

function apiAddDownloadColumn() {
  try {
    const result = addDownloadTimestampToBatchMeta();
    return result;
  } catch (error) {
    logError('apiAddDownloadColumn 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

function apiGetBatchesByDateRange(startDate, endDate) {
  try {
    Logger.log(`[API] calling apiGetBatchesByDateRange(${startDate}, ${endDate})`);
    
    if (typeof BatchDownloadService === 'undefined') {
      throw new Error('BatchDownloadService 未定義，可能是檔案載入順序或語法錯誤');
    }
    
    const batches = BatchDownloadService.getBatchesByDateRange(startDate, endDate);
    Logger.log(`[API] getBatchesByDateRange success, count: ${batches ? batches.length : 0}`);
    return { success: true, data: batches };
    
  } catch (error) {
    Logger.log(`[API] ❌ apiGetBatchesByDateRange error: ${error.message}`);
    if (error.stack) Logger.log(error.stack);
    
    return { 
      success: false, 
      error: error.message || error.toString() 
    };
  }
}


function apiBatchDownloadPOs(batchIds) {
  try {
    const result = BatchDownloadService.batchDownloadPOs(batchIds);
    return result;
  } catch (error) {
    logError('apiBatchDownloadPOs 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

// ==================== 箱號管理 API ====================

function apiCreateShipment(headerData, queueRowIndices) {
  try {
    const result = ShipmentService.createShipment(headerData, queueRowIndices);
    return result;
  } catch (error) {
    logError('apiCreateShipment 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

// ==================== 通知管理 API ====================

function apiUpdateNotification(rowIndexes, status, note) {
  try {
    const result = QueueService.updateNotification(rowIndexes, status, note);
    return result;
  } catch (error) {
    logError('apiUpdateNotification 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

function apiGetNotificationLists() {
  try {
    const lists = QueueService.getNotificationLists();
    return { success: true, data: lists };
  } catch (error) {
    logError('apiGetNotificationLists 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

function apiGetShipmentInfo(shipmentId) {
  try {
    const info = ShipmentService.getShipmentInfo(shipmentId);
    if (info) {
      return { success: true, data: info };
    } else {
      return { success: false, error: '找不到箱號' };
    }
  } catch (error) {
    logError('apiGetShipmentInfo 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

function apiGetPickingView(shipmentId) {
  try {
    const view = ShipmentService.getPickingView(shipmentId);
    if (view) {
      return { success: true, data: view };
    } else {
      return { success: false, error: '找不到箱號' };
    }
  } catch (error) {
    logError('apiGetPickingView 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

// ==================== 訂單比對 API ====================

function apiSearchUnfilledOrders(searchCriteria) {
  try {
    const results = OrderMatcherService.searchUnfilledOrders(searchCriteria);
    return { success: true, data: results };
  } catch (error) {
    logError('apiSearchUnfilledOrders 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

function apiAutoAllocate(orderRows, arrivedQty) {
  try {
    const result = OrderMatcherService.autoAllocate(orderRows, arrivedQty);
    return result;
  } catch (error) {
    logError('apiAutoAllocate 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

function apiCommitAllocations(allocations) {
  try {
    const result = OrderMatcherService.commitAllocations(allocations);
    return result;
  } catch (error) {
    logError('apiCommitAllocations 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

// ==================== 通知紀錄 API ====================

function apiQueryNotificationLogs(filters, limit) {
  try {
    const logs = NotificationService.queryLogs(filters, limit);
    return { success: true, data: logs };
  } catch (error) {
    logError('apiQueryNotificationLogs 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

// ==================== 工具 API ====================

function apiGetWebAppUrl() {
  try {
    return { success: true, url: ScriptApp.getService().getUrl() };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ==================== 通知管理 API ====================

/**
 * 取得所有待發送的通知（ReadyToNotify = TRUE）
 */
function apiGetPendingNotifications() {
  try {
    const sheet = getSheet(QUEUE_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const pending = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const readyToNotify = row[QUEUE_COLS.READY_TO_NOTIFY];
      const notifyPushed = row[QUEUE_COLS.NOTIFY_PUSHED_FLAG];
      
      // 只取 ReadyToNotify = TRUE 且尚未推播的
      if (readyToNotify === true && notifyPushed !== true) {
        const esOrderNo = row[QUEUE_COLS.ES_ORDER_NO];
        
        // 查詢 LINE User ID
        const userInfo = NotificationService.getLineUserIdByOrderNo(esOrderNo);
        
        pending.push({
          rowIndex: i + 1,
          queueId: row[QUEUE_COLS.QUEUE_ID],
          esOrderNo: esOrderNo,
          productName: row[QUEUE_COLS.PRODUCT_NAME],
          sku: row[QUEUE_COLS.SKU],
          purchaseStatus: row[QUEUE_COLS.PURCHASE_STATUS],
          trackingJPtoTW: row[QUEUE_COLS.TRACKING_JP_TO_TW],
          lineUserId: userInfo ? userInfo.lineUserId : null,
          courier: row[QUEUE_COLS.COURIER] || ''  // 物流公司
        });
      }
    }
    
    return { success: true, data: pending };
  } catch (error) {
    logError('apiGetPendingNotifications 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 確認發送單一通知
 */
function apiConfirmNotification(rowIndex) {
  try {
    const result = notifyTrackingUpdate({
      rowIndex: rowIndex,
      queueId: null,
      orderNo: null,
      trackingNumber: null,
      purchaseStatus: null
    });
    
    return result;
  } catch (error) {
    logError('apiConfirmNotification 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 跳過通知（重設 ReadyToNotify 為 FALSE）
 */
function apiSkipNotification(rowIndex) {
  try {
    const sheet = getSheet(QUEUE_SHEET_NAME);
    sheet.getRange(rowIndex, QUEUE_COLS.READY_TO_NOTIFY + 1).setValue(false);
    
    logInfo('已跳過通知', { rowIndex: rowIndex });
    
    return { success: true };
  } catch (error) {
    logError('apiSkipNotification 錯誤', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 批次確認發送通知
 */
function apiBatchConfirmNotifications(rowIndices) {
  try {
    let successCount = 0;
    let failedCount = 0;
    
    rowIndices.forEach(rowIndex => {
      const result = notifyTrackingUpdate({
        rowIndex: rowIndex,
        queueId: null,
        orderNo: null,
        trackingNumber: null,
        purchaseStatus: null
      });
      
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    });
    
    logInfo('批次發送完成', { successCount: successCount, failedCount: failedCount });
    
    return {
      success: true,
      successCount: successCount,
      failedCount: failedCount
    };
  } catch (error) {
    logError('apiBatchConfirmNotifications 錯誤', error);
    return { success: false, error: error.toString() };
  }
}
