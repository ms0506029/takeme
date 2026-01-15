/**
 * 採購控制塔 v2 - 主入口
 * 處理 Web App 的 doGet 與 doPost 請求
 */

/**
 * 處理 GET 請求（顯示 UI）
 */
function doGet(e) {
  try {
    // 防止在編輯器中直接執行時出錯
    if (!e || !e.parameter) {
      e = { parameter: {} };
    }
    
    const page = e.parameter.page || 'index';
    
    // 取得 Web App URL
    let appUrl = ScriptApp.getService().getUrl();
    
    // 根據 page 參數載入不同頁面
    let template;
    
    switch(page) {
      case 'control-tower':
        template = HtmlService.createTemplateFromFile('ui/control-tower');
        break;
      case 'procurement-summary':
        template = HtmlService.createTemplateFromFile('ui/procurement-summary');
        break;
      case 'shipment-management':
        template = HtmlService.createTemplateFromFile('ui/shipment-management');
        break;
      case 'order-matcher':
        template = HtmlService.createTemplateFromFile('ui/order-matcher-v2');
        break;
      case 'notification-manager':
        template = HtmlService.createTemplateFromFile('ui/notification-manager');
        break;
      case 'notification-log':
        template = HtmlService.createTemplateFromFile('ui/notification-log');
        break;
      case 'batch-management':
        template = HtmlService.createTemplateFromFile('ui/batch-management');
        break;
      case 'oos-management':
        template = HtmlService.createTemplateFromFile('ui/oos-management');
        break;
      case 'preorder-management':
        template = HtmlService.createTemplateFromFile('ui/preorder-management');
        break;
      case 'picking-view':
        template = HtmlService.createTemplateFromFile('ui/picking-view');
        break;
      case 'japan-packing':
        template = HtmlService.createTemplateFromFile('ui/japan-packing');
        break;
      case 'taiwan-picking':
        template = HtmlService.createTemplateFromFile('ui/taiwan-picking');
        break;
      case 'detailed-order-query':
        template = HtmlService.createTemplateFromFile('ui/detailed-order-query');
        break;
      case 'batch-download':
        template = HtmlService.createTemplateFromFile('ui/batch-download');
        break;
      default:
        template = HtmlService.createTemplateFromFile('ui/index');
    }
    
    // 將 appUrl 傳遞給所有頁面，確保導航連結正確
    if (template) {
      template.appUrl = appUrl;
    }
    
    return template.evaluate()
      .setTitle('採購控制塔＋倉儲物流整合系統')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    logError('doGet 錯誤', error);
    return HtmlService.createHtmlOutput(`
      <h1>系統錯誤</h1>
      <p><strong>錯誤訊息：</strong>${error.message}</p>
      <p><strong>錯誤堆疊：</strong><pre>${error.stack}</pre></p>
      <hr>
      <h3>請檢查：</h3>
      <ol>
        <li>所有 HTML 檔案是否已建立</li>
        <li>檔案名稱是否正確（例如：ui/index）</li>
        <li>是否已重新部署 Web App</li>
      </ol>
    `);
  }
}

/**
 * 公開的API處理函數 - 供HTML頁面調用
 */
function apiHandler(request) {
  try {
    const action = request.action;
    const data = request.data || {};
    
    Logger.log(`API調用: ${action}, 數據: ${JSON.stringify(data)}`);
    
    // 調用統一的API處理邏輯
    const result = handleAPIRequest(action, data);
    
    Logger.log(`API返回: ${JSON.stringify(result)}`);
    // 改為返回 JSON 字串，避免 google.script.run 序列化問題導致的 null
    return JSON.stringify(result);
    
  } catch (error) {
    Logger.log(`API錯誤: ${error.message}\n堆疊: ${error.stack}`);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * 處理 POST 請求（API 調用）
 */
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const data = params.data || {};
    
    const result = handleAPIRequest(action, data);
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('doPost 錯誤: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * handleAPIRequest - 統一處理API請求的邏輯
 * 供doPost和apiHandler共用
 */
function handleAPIRequest(action, data) {
  let result = { success: false };
  
  try {
    Logger.log(`處理 API 請求: ${action}`);
    
    switch (action) {
      // 原有功能
      case 'notifyTrackingUpdate':
        result = notifyTrackingUpdateAPI(data);
        break;
      
      // 訂單匯入
      case 'importFromDrive':
        result = apiImportFromDrive(data.fileId);
        break;
      case 'importFromUpload':
        result = apiImportFromUpload(data.filename, data.base64);
        break;
      
      // Queue 查詢與統計
      case 'getStatistics':
        result = { success: true, data: QueueService.getStatistics() };
        break;
      case 'getCandidatesList':
        result = { success: true, data: QueueService.getCandidatesList() };
        break;
      case 'getOOSList':
        result = { success: true, data: QueueService.getOOSList() };
        break;
      case 'getToWriteList':
        result = { success: true, data: QueueService.getToWriteList() };
        break;
      case 'getProcurementSummary':
        result = { success: true, data: QueueService.getProcurementSummary(data.statusFilter) };
        break;
      case 'selectRowsByKey':
        result = QueueService.selectRowsByKey(data.key);
        break;
      case 'applyUnitPriceToKey':
        result = QueueService.applyUnitPriceToKey(data.key, data.price);
        break;
      case 'calculateDiscount':
        result = QueueService.calculateDiscount(data.items, data.actualPaid);
        break;
      case 'applyDiscountToQueue':
        result = QueueService.applyDiscountToQueue(data.items);
        break;
      case 'applyPreorderStatusToKey':
        result = QueueService.applyPreorderStatusToKey(data.key, data.preMonth, data.preXun);
        break;
      
      // 詳細訂單查詢
      case 'searchOrderDetails':
        result = QueryService.searchOrderDetails(data.orderNo);
        break;

      // 通知管理
      case 'getNotificationLists':
        result = { success: true, data: QueueService.getNotificationLists() };
        break;
      case 'updateNotification':
        result = QueueService.updateNotification(data.rowIndexes, data.status, data.note);
        break;
      
      // Packing System - 裝箱系統
      case 'loadItemsByJpOrder':
        const packingData = PackingService.loadItemsByJpOrder(data.jpOrderNo);
        Logger.log('loadItemsByJpOrder raw result: ' + JSON.stringify(packingData));
        result = { success: true, data: packingData };
        Logger.log('loadItemsByJpOrder wrapped result: ' + JSON.stringify(result));
        break;
      case 'createPackingBox':
        result = PackingService.createPackingBox(data);
        break;
      case 'getBoxContents':
        result = { success: true, data: PackingService.getBoxContents(data.boxNumber) };
        break;
      case 'listBoxesByBatch':
        result = { success: true, data: PackingService.listBoxesByBatch(data.batchId) };
        break;
      case 'markBoxShipped':
        result = PackingService.markBoxShipped(data.boxId, data.shippedAt);
        break;
      case 'markBoxPicked':
        result = PackingService.markBoxPicked(data.boxId, data.pickedBy, data.pickedAt);
        break;
      case 'getPackingStats':
        result = { success: true, data: PackingService.getPackingStats(data.batchId) };
        break;
      
      // Queue 標記操作
      case 'markPurchased':
        result = QueueService.markPurchased(data.rowIndexes, data.batchData);
        break;
      case 'markOOS':
        result = QueueService.markOOS(data.rowIndexes);
        break;
      case 'markPreorder':
        result = QueueService.markPreorder(data.rowIndexes, data.preMonth, data.preXun);
        break;
      
      // ECOUNT 匯出
      case 'exportMemoCSV':
        result = apiExportMemoCSV();
        break;
      case 'exportStatusCSV':
        result = apiExportStatusCSV();
        break;
      case 'exportPurchaseOrderExcel':
        result = apiExportPurchaseOrderExcel(data.batchId);
        break;
      case 'exportSelectedItemsCSV':
        result = apiExportSelectedItemsCSV(data.rowIndexes, data.supplier, data.shipping);
        break;
      case 'exportSelectedPOExcel':
        result = apiExportSelectedPOExcel(data.rowIndexes, data.formData);
        break;
      
      // 批次管理
      case 'createBatchWithPurchase':
        result = BatchService.createBatchWithPurchase(data.rowIndexes, data.batchData);
        break;
      case 'listRecentBatches':
        result = { success: true, data: BatchService.listRecentBatches(data.limit) };
        break;
      case 'getBatchesPaginated':
        result = { success: true, data: BatchService.getBatchesPaginated(data.page, data.pageSize) };
        break;
      case 'getBatchDetails':
        result = BatchService.getBatchDetails(data.batchId);
        break;
      case 'downloadBatchPO':
        result = BatchService.downloadBatchPO(data.batchId);
        break;
        
      case 'updateBatchJPOrderNo':
        result = BatchService.updateBatchJPOrderNo(data.batchId, data.jpOrderNo);
        break;
      
      // 資料遷移
      case 'runFullMigration':
        result = apiRunFullMigration();
        break;
      
      // 表格初始化
      case 'initializeAllTables':
        result = apiInitializeAllTables();
        break;
      
      default:
        result = { success: false, error: '未知的 action: ' + action };
    }
    
    return result;
    
  } catch (error) {
    Logger.log('handleAPIRequest 錯誤: ' + error.message);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * 載入 HTML 片段（用於 include）
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
