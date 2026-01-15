/**
 * QueueService - Queue（採購控制中心）資料操作服務
 */

const QueueService = (function() {
  
  /**
   * 取得 Queue 工作表
   */
  function getQueueSheet() {
    return getSheet(QUEUE_SHEET_NAME);
  }
  
  /**
   * 取得所有 Queue 資料（含標題列）
   */
  function getAllData() {
    const sheet = getQueueSheet();
    const data = sheet.getDataRange().getValues();
    return data;
  }
  
  /**
   * 根據列索引取得單筆 Queue 資料
   * @param {number} rowIndex - 列索引（1-based, 1 為標題列）
   * @return {Object} Queue 資料物件
   */
  function getByRowIndex(rowIndex) {
    const sheet = getQueueSheet();
    if (rowIndex < 2) {
      throw new Error('rowIndex 必須 >= 2（第 1 列為標題列）');
    }
    
    const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
    return rowToObject(row);
  }
  
  /**
   * 根據 QueueID 取得單筆 Queue 資料
   */
  function getByQueueId(queueId) {
    const data = getAllData();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][QUEUE_COLS.QUEUE_ID] === queueId) {
        return {
          rowIndex: i + 1,  // 轉為 1-based
          data: rowToObject(data[i])
        };
      }
    }
    
    return null;
  }
  
  /**
   * 根據 ES_Order_No 取得所有相關的 Queue 行
   */
  function getByOrderNo(orderNo) {
    const data = getAllData();
    const results = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][QUEUE_COLS.ES_ORDER_NO] === orderNo) {
        results.push({
          rowIndex: i + 1,
          data: rowToObject(data[i])
        });
      }
    }
    
    return results;
  }
  
  /**
   * 將列資料轉換為物件
   */
  function rowToObject(row) {
    return {
      queueId: row[QUEUE_COLS.QUEUE_ID],
      esOrderNo: row[QUEUE_COLS.ES_ORDER_NO],
      productName: row[QUEUE_COLS.PRODUCT_NAME],
      sku: row[QUEUE_COLS.SKU],
      color: row[QUEUE_COLS.COLOR],
      size: row[QUEUE_COLS.SIZE],
      qtyOrdered: row[QUEUE_COLS.QTY_ORDERED],
      qtyAllocated: row[QUEUE_COLS.QTY_ALLOCATED],
      purchaseStatus: row[QUEUE_COLS.PURCHASE_STATUS],
      expectedShipMonth: row[QUEUE_COLS.EXPECTED_SHIP_MONTH],
      expectedShipTen: row[QUEUE_COLS.EXPECTED_SHIP_TEN],
      expectedShipLabel: row[QUEUE_COLS.EXPECTED_SHIP_LABEL],
      listPrice: row[QUEUE_COLS.LIST_PRICE],
      actualPurchasePrice: row[QUEUE_COLS.ACTUAL_PURCHASE_PRICE],
      selectedForBatch: row[QUEUE_COLS.SELECTED_FOR_BATCH],
      batchId: row[QUEUE_COLS.BATCH_ID],
      boxId: row[QUEUE_COLS.BOX_ID],
      trackingJPtoJP: row[QUEUE_COLS.TRACKING_JP_TO_JP],
      trackingJPtoTW: row[QUEUE_COLS.TRACKING_JP_TO_TW],
      lastStatusUpdateAt: row[QUEUE_COLS.LAST_STATUS_UPDATE_AT],
      lastStatusUpdatedBy: row[QUEUE_COLS.LAST_STATUS_UPDATED_BY],
      notifyStatus: row[QUEUE_COLS.NOTIFY_STATUS],
      notifyNote: row[QUEUE_COLS.NOTIFY_NOTE],
      notifyAt: row[QUEUE_COLS.NOTIFY_AT],
      notifyPushedFlag: row[QUEUE_COLS.NOTIFY_PUSHED_FLAG],
      courier: row[QUEUE_COLS.COURIER],  // 物流公司
      preMonth: row[QUEUE_COLS.PRE_MONTH], // 預購月份 (Y欄)
      preXun: row[QUEUE_COLS.PRE_XUN]      // 預購旬 (Z欄)
    };
  }
  
  /**
   * 更新指定列的指定欄位
   * @param {number} rowIndex - 列索引（1-based）
   * @param {Object} updates - 要更新的欄位，例如 { trackingJPtoTW: 'ABC123', purchaseStatus: '已寄出回台灣' }
   */
  function updateRow(rowIndex, updates) {
    const sheet = getQueueSheet();
    
    for (const key in updates) {
      let colIndex;
      
      // 對應欄位索引
      switch (key) {
        case 'purchaseStatus':
          colIndex = QUEUE_COLS.PURCHASE_STATUS + 1;
          break;
        case 'trackingJPtoTW':
          colIndex = QUEUE_COLS.TRACKING_JP_TO_TW + 1;
          break;
        case 'trackingJPtoJP':
          colIndex = QUEUE_COLS.TRACKING_JP_TO_JP + 1;
          break;
        case 'notifyPushedFlag':
          colIndex = QUEUE_COLS.NOTIFY_PUSHED_FLAG + 1;
          break;
        case 'selectedForBatch':
          colIndex = QUEUE_COLS.SELECTED_FOR_BATCH + 1;
          break;
        case 'batchId':
          colIndex = QUEUE_COLS.BATCH_ID + 1;
          break;
        case 'boxId':
          colIndex = QUEUE_COLS.BOX_ID + 1;
          break;
        case 'qtyAllocated':
          colIndex = QUEUE_COLS.QTY_ALLOCATED + 1;
          break;
        case 'actualPurchasePrice':
          colIndex = QUEUE_COLS.ACTUAL_PURCHASE_PRICE + 1;
          break;
        default:
          logError(`未知的欄位名稱: ${key}`);
          continue;
      }
      
      sheet.getRange(rowIndex, colIndex).setValue(updates[key]);
    }
    
    // 更新時間戳記
    sheet.getRange(rowIndex, QUEUE_COLS.LAST_STATUS_UPDATE_AT + 1).setValue(getTimestamp());
    sheet.getRange(rowIndex, QUEUE_COLS.LAST_STATUS_UPDATED_BY + 1).setValue('system');
  }
  
  /**
   * 更新 Notify_Pushed_Flag
   */
  function markAsNotified(rowIndex) {
    updateRow(rowIndex, { notifyPushedFlag: true });
  }
  
  /**
   * 取得採購彙總（依 SKU+Color+Size 分組）
   * @param {string} statusFilter - 狀態篩選（可選），例如 '待購買'
   * @return {Array} 彙總結果
   */
  function getProcurementSummary(statusFilter) {
    const data = getAllData();
    const summaryMap = {};
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[QUEUE_COLS.PURCHASE_STATUS];
      
      // 只顯示待購狀態的商品（過濾已購和缺貨）
      if (status !== '待購') {
        continue;
      }
      
      // 狀態篩選
      if (statusFilter && status !== statusFilter) {
        continue;
      }
      
      const sku = row[QUEUE_COLS.SKU];
      const color = row[QUEUE_COLS.COLOR] || '';
      const size = row[QUEUE_COLS.SIZE] || '';
      const key = `${sku}|${color}|${size}`;
      
      if (!summaryMap[key]) {
        summaryMap[key] = {
          key: key,
          sku: sku,
          color: color,
          size: size,
          productName: row[QUEUE_COLS.PRODUCT_NAME],
          totalQty: 0,
          orderCount: 0,
          orderSet: new Set(),
          actualPurchasePrice: row[QUEUE_COLS.ACTUAL_PURCHASE_PRICE],
          rowIndices: []
        };
      }
      
      summaryMap[key].totalQty += row[QUEUE_COLS.QTY_ORDERED] || 0;
      summaryMap[key].orderSet.add(row[QUEUE_COLS.ES_ORDER_NO]);
      summaryMap[key].rowIndices.push(i + 1);  // 1-based
    }
    
    // 轉換為陣列並計算 orderCount
    const summaryArray = Object.values(summaryMap).map(item => {
      item.orderCount = item.orderSet.size;
      delete item.orderSet;  // 移除 Set（無法序列化）
      return item;
    });
    
    return summaryArray;
  }
  
  /**
   * 選取指定 key 的所有 Queue 行（設定 SelectedForBatch = TRUE）
   */
  function selectRowsByKey(key) {
    const summary = getProcurementSummary();
    const targetItem = summary.find(item => item.key === key);
    
    if (!targetItem) {
      throw new Error(`找不到 key: ${key}`);
    }
    
    const sheet = getQueueSheet();
    
    targetItem.rowIndices.forEach(rowIndex => {
      sheet.getRange(rowIndex, QUEUE_COLS.SELECTED_FOR_BATCH + 1).setValue(true);
    });
    
    logInfo(`已選取 ${targetItem.rowIndices.length} 個 Queue 行`, { key: key });
    
    return {
      success: true,
      affectedRows: targetItem.rowIndices.length
    };
  }
  
  /**
   * 套用單價到指定 key 的所有 Queue 行
   */
  function applyUnitPriceToKey(key, price) {
    const summary = getProcurementSummary();
    const targetItem = summary.find(item => item.key === key);
    
    if (!targetItem) {
      throw new Error(`找不到 key: ${key}`);
    }
    
    const sheet = getQueueSheet();
    
    targetItem.rowIndices.forEach(rowIndex => {
      sheet.getRange(rowIndex, QUEUE_COLS.ACTUAL_PURCHASE_PRICE + 1).setValue(price);
      sheet.getRange(rowIndex, QUEUE_COLS.LAST_STATUS_UPDATE_AT + 1).setValue(getTimestamp());
    });
    
    logInfo(`已套用單價 ${price} 到 ${targetItem.rowIndices.length} 個 Queue 行`, { key: key });
    
    return {
      success: true,
      affectedRows: targetItem.rowIndices.length,
      price: price
    };
  }
  
  /**
   * 套用預購狀態到指定 key 的所有 Queue 行
   */
  function applyPreorderStatusToKey(key, preMonth, preXun) {
    const summary = getProcurementSummary();
    const targetItem = summary.find(item => item.key === key);
    
    if (!targetItem) {
      throw new Error(`找不到 key: ${key}`);
    }
    
    const sheet = getQueueSheet();
    
    targetItem.rowIndices.forEach(rowIndex => {
      sheet.getRange(rowIndex, QUEUE_COLS.PURCHASE_STATUS + 1).setValue('預購');
      sheet.getRange(rowIndex, QUEUE_COLS.PRE_MONTH + 1).setValue(preMonth);
      sheet.getRange(rowIndex, QUEUE_COLS.PRE_XUN + 1).setValue(preXun);
      sheet.getRange(rowIndex, QUEUE_COLS.LAST_STATUS_UPDATE_AT + 1).setValue(getTimestamp());
    });
    
    logInfo(`已套用預購狀態到 ${targetItem.rowIndices.length} 個 Queue 行`, { key: key, preMonth, preXun });
    
    return {
      success: true,
      affectedRows: targetItem.rowIndices.length,
      preMonth: preMonth,
      preXun: preXun
    };
  }
  
  /**
   * 取得統計資料（待購/已購/缺貨/預購數量）
   * @return {Object} { pending, locked, done, oos, preorder, toWrite }
   */
  function getStatistics() {
    const data = getAllData();
    const stats = {
      pending: 0,    // 待購
      locked: 0,     // 鎖定-購買中
      done: 0,       // 已購
      oos: 0,        // 缺貨
      preorder: 0,   // 預購
      toWrite: 0     // 已購未回寫
    };
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = (row[QUEUE_COLS.PURCHASE_STATUS] || '').toString().trim();
      const wrote = (row[QUEUE_COLS.WROTE_TO_ERP] || '').toString().trim().toLowerCase() === '是';
      
      switch (status) {
        case '待購':
          stats.pending++;
          break;
        case '鎖定-購買中':
          stats.locked++;
          break;
        case '已購':
          stats.done++;
          if (!wrote) stats.toWrite++;
          break;
        case '缺貨':
          stats.oos++;
          break;
        case '預購':
          stats.preorder++;
          break;
      }
    }
    
    return stats;
  }
  
  /**
   * 取得待處理清單（待購、鎖定、預購）
   * @return {Array} 待處理品項列表
   */
  function getCandidatesList() {
    const data = getAllData();
    const candidates = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = (row[QUEUE_COLS.PURCHASE_STATUS] || '').toString().trim();
      
      // 待購、鎖定、預購、空白狀態都顯示
      if (!status || status === '待購買' || status === '待購' || status === '鎖定-購買中' || status === '預購') {
        candidates.push({
          rowIndex: i + 1,
          esOrderNo: row[QUEUE_COLS.ES_ORDER_NO] || '',
          sku: row[QUEUE_COLS.SKU] || '',
          productName: row[QUEUE_COLS.PRODUCT_NAME] || '',
          color: row[QUEUE_COLS.COLOR] || '',
          size: row[QUEUE_COLS.SIZE] || '',
          qtyOrdered: row[QUEUE_COLS.QTY_ORDERED] || 0,
          actualPurchasePrice: row[QUEUE_COLS.ACTUAL_PURCHASE_PRICE] || '',
          purchaseStatus: status || '待購'
        });
      }
    }
    
    return candidates;
  }
  
  /**
   * 取得缺貨清單
   * @return {Array} 缺貨品項列表
   */
  function getOOSList() {
    const data = getAllData();
    const oosList = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = (row[QUEUE_COLS.PURCHASE_STATUS] || '').toString().trim();
      
      if (status === '缺貨') {
        oosList.push({
          rowIndex: i + 1,
          esOrderNo: row[QUEUE_COLS.ES_ORDER_NO] || '',
          sku: row[QUEUE_COLS.SKU] || '',
          productName: row[QUEUE_COLS.PRODUCT_NAME] || '',
          color: row[QUEUE_COLS.COLOR] || '',
          size: row[QUEUE_COLS.SIZE] || '',
          qtyOrdered: row[QUEUE_COLS.QTY_ORDERED] || 0,
          preorderMonth: row[23] || '',  // 預購月份欄位
          preorderXun: row[24] || '',     // 預購旬欄位
          purchaseStatus: status
        });
      }
    }
    
    return oosList;
  }
  
  /**
   * 取得已購未回寫清單
   * @return {Array} 已購未回寫品項列表
   */
  function getToWriteList() {
    const data = getAllData();
    const toWriteList = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = (row[QUEUE_COLS.PURCHASE_STATUS] || '').toString().trim();
      const wrote = (row[22] || '').toString().trim().toLowerCase() === '是';  // 已回寫ERP
      
      if (status === '已購' && !wrote) {
        toWriteList.push({
          rowIndex: i + 1,
          esOrderNo: row[QUEUE_COLS.ES_ORDER_NO],
          erpSoNo: '',  // 需要從 SO_Map 表查詢
          sku: row[QUEUE_COLS.SKU],
          color: row[QUEUE_COLS.COLOR],
          size: row[QUEUE_COLS.SIZE],
          qtyOrdered: row[QUEUE_COLS.QTY_ORDERED],
          purchaseMemo: row[27] || ''  // 採購備註（暫時用索引）
        });
      }
    }
    
    return toWriteList;
  }
  
  /**
   * 標記已購（可建立批次）
   * @param {Array} rowIndexes - 要標記的列索引陣列 (1-based)
   * @param {Object} batchData - 批次資料 { supplier, jpOrder, prices, rate, shipping, createBatch }
   * @return {Object} { success, updated, batchId }
   */
  function markPurchased(rowIndexes, batchData) {
    if (!rowIndexes || rowIndexes.length === 0) {
      throw new Error('請提供要標記的列索引');
    }
    
    const sheet = getQueueSheet();
    const now = getTimestamp();
    const operator = Session.getActiveUser().getEmail() || 'system';
    const date = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
    
    let batchId = null;
    
    // 如果要建立批次
    if (batchData.createBatch) {
      // 優先使用傳入的 batchId（避免時間戳不一致）
      if (batchData.batchId) {
        batchId = batchData.batchId;
      } else {
        // 如果沒有傳入，才自己生成
        const supplier = batchData.supplier || 'unknown';
        const timestamp = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd-HHmmss');
        batchId = `${supplier}-${timestamp}`;
      }
    }
    
    // 更新每一列
    rowIndexes.forEach((rowIndex, idx) => {
      const price = (batchData.prices && batchData.prices[idx]) ? batchData.prices[idx] : '';
      const preMonth = (batchData.preMonths && batchData.preMonths[idx]) ? batchData.preMonths[idx] : '';
      const preXun = (batchData.preXuns && batchData.preXuns[idx]) ? batchData.preXuns[idx] : '';
      
      const memo = `${Utilities.formatDate(new Date(), 'Asia/Tokyo', 'MM/dd')} ok`;
      
      // 採購狀態
      sheet.getRange(rowIndex, QUEUE_COLS.PURCHASE_STATUS + 1).setValue('已購');
      
      // 採購日期
      sheet.getRange(rowIndex, QUEUE_COLS.PURCHASE_DATE + 1).setValue(date);
      
      // 採購備註
      sheet.getRange(rowIndex, QUEUE_COLS.PURCHASE_MEMO + 1).setValue(memo);
      
      // 採購單價
      if (price) {
        sheet.getRange(rowIndex, QUEUE_COLS.ACTUAL_PURCHASE_PRICE + 1).setValue(price);
      }
      
      // 預購資訊 (如果有填寫)
      if (preMonth) {
        sheet.getRange(rowIndex, QUEUE_COLS.PRE_MONTH + 1).setValue(preMonth);
      }
      if (preXun) {
        sheet.getRange(rowIndex, QUEUE_COLS.PRE_XUN + 1).setValue(preXun);
      }
      
      // 鎖定人
      sheet.getRange(rowIndex, QUEUE_COLS.LOCKED_BY + 1).setValue(operator);
      
      // 鎖定時間
      sheet.getRange(rowIndex, QUEUE_COLS.LOCKED_AT + 1).setValue(now);
      
      // 批次 ID
      if (batchId) {
        sheet.getRange(rowIndex, QUEUE_COLS.BATCH_ID + 1).setValue(batchId);
      }
      
      // 更新時間戳記
      sheet.getRange(rowIndex, QUEUE_COLS.LAST_STATUS_UPDATE_AT + 1).setValue(now);
      sheet.getRange(rowIndex, QUEUE_COLS.LAST_STATUS_UPDATED_BY + 1).setValue(operator);
    });
    
    logInfo(`已標記 ${rowIndexes.length} 筆為已購`, { batchId: batchId });
    
    return {
      success: true,
      updated: rowIndexes.length,
      batchId: batchId
    };
  }
  
  /**
   * 標記缺貨
   * @param {Array} rowIndexes - 要標記的列索引陣列 (1-based)
   * @return {Object} { success, updated }
   */
  function markOOS(rowIndexes) {
    if (!rowIndexes || rowIndexes.length === 0) {
      throw new Error('請提供要標記的列索引');
    }
    
    const sheet = getQueueSheet();
    const now = getTimestamp();
    const operator = Session.getActiveUser().getEmail() || 'system';
    
    rowIndexes.forEach(rowIndex => {
      sheet.getRange(rowIndex, QUEUE_COLS.PURCHASE_STATUS + 1).setValue('缺貨');
      sheet.getRange(rowIndex, QUEUE_COLS.LAST_STATUS_UPDATE_AT + 1).setValue(now);
      sheet.getRange(rowIndex, QUEUE_COLS.LAST_STATUS_UPDATED_BY + 1).setValue(operator);
    });
    
    logInfo(`已標記 ${rowIndexes.length} 筆為缺貨`);
    
    return {
      success: true,
      updated: rowIndexes.length
    };
  }
  
  /**
   * 標記預購
   * @param {Array} rowIndexes - 要標記的列索引陣列 (1-based)
   * @param {string} preMonth - 預購月份 (格式: YYYY-MM)
   * @param {string} preXun - 預購旬 (上/中/下)
   * @return {Object} { success, updated }
   */
  function markPreorder(rowIndexes, preMonth, preXun) {
    if (!rowIndexes || rowIndexes.length === 0) {
      throw new Error('請提供要標記的列索引');
    }
    
    if (!preMonth) {
      throw new Error('請提供預購月份');
    }
    
    const sheet = getQueueSheet();
    const now = getTimestamp();
    const operator = Session.getActiveUser().getEmail() || 'system';
    
    rowIndexes.forEach(rowIndex => {
      sheet.getRange(rowIndex, QUEUE_COLS.PURCHASE_STATUS + 1).setValue('預購');
      sheet.getRange(rowIndex, QUEUE_COLS.PRE_MONTH + 1).setValue(preMonth);
      sheet.getRange(rowIndex, QUEUE_COLS.PRE_XUN + 1).setValue(preXun || '');
      sheet.getRange(rowIndex, QUEUE_COLS.LAST_STATUS_UPDATE_AT + 1).setValue(now);
      sheet.getRange(rowIndex, QUEUE_COLS.LAST_STATUS_UPDATED_BY + 1).setValue(operator);
    });
    
    logInfo(`已標記 ${rowIndexes.length} 筆為預購`, { preMonth: preMonth, preXun: preXun });
    
    return {
      success: true,
      updated: rowIndexes.length
    };
  }
  
  /**
   * 更新通知狀態
   */
  function updateNotification(rowIndexes, status, note) {
    const sheet = getQueueSheet();
    const now = getTimestamp();
    
    rowIndexes.forEach(rowIndex => {
      // 更新通知狀態
      if (status) {
        sheet.getRange(rowIndex, QUEUE_COLS.NOTIFY_STATUS + 1).setValue(status);
      }
      
      // 更新備註
      if (note !== undefined && note !== null) {
        sheet.getRange(rowIndex, QUEUE_COLS.NOTIFY_NOTE + 1).setValue(note);
      }
      
      // 如果狀態是「已通知」，更新時間戳
      if (status === '已通知') {
        sheet.getRange(rowIndex, QUEUE_COLS.NOTIFY_AT + 1).setValue(now);
      }
    });
    
    return { success: true, updated: rowIndexes.length };
  }

  /**
   * 取得通知清單（缺貨 & 預購）
   */
  function getNotificationLists() {
    const data = getAllData();
    const oosList = [];
    const preOrderList = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = (row[QUEUE_COLS.PURCHASE_STATUS] || '').toString().trim();
      const notifyStatus = (row[QUEUE_COLS.NOTIFY_STATUS] || '').toString().trim();
      
      const item = {
        rowIndex: i + 1,
        ...rowToObject(row)
      };
      
      // 缺貨清單
      if (status === '缺貨') {
        oosList.push(item);
      }
      
      // 預購清單（有填寫預購月份或旬）
      const preMonth = row[QUEUE_COLS.PRE_MONTH];
      const preXun = row[QUEUE_COLS.PRE_XUN];
      if (preMonth || preXun) {
        preOrderList.push(item);
      }
    }
    
    return {
      oos: oosList,
      preOrder: preOrderList
    };
  }
  
  // 公開 API
  return {
    getAllData: getAllData,
    getByRowIndex: getByRowIndex,
    getByQueueId: getByQueueId,
    getByOrderNo: getByOrderNo,
    updateRow: updateRow,
    markAsNotified: markAsNotified,
    getProcurementSummary: getProcurementSummary,
    selectRowsByKey: selectRowsByKey,
    applyUnitPriceToKey: applyUnitPriceToKey,
    applyPreorderStatusToKey: applyPreorderStatusToKey,
    // 新增的統一系統功能
    getStatistics: getStatistics,
    getCandidatesList: getCandidatesList,
    getOOSList: getOOSList,
    getToWriteList: getToWriteList,
    markPurchased: markPurchased,
    markOOS: markOOS,
    markPreorder: markPreorder,
    updateNotification: updateNotification,
    getNotificationLists: getNotificationLists
  };
  
})();

// ==================== 全域 API 函數 (供 google.script.run 呼叫) ====================

function apiGetStatistics() {
  return QueueService.getStatistics();
}

function apiGetCandidatesList() {
  return QueueService.getCandidatesList();
}

function apiGetOOSList() {
  return QueueService.getOOSList();
}

function apiGetToWriteList() {
  return QueueService.getToWriteList();
}

function apiMarkPurchased(rowIndexes, batchData) {
  return QueueService.markPurchased(rowIndexes, batchData);
}

function apiMarkOOS(rowIndexes) {
  return QueueService.markOOS(rowIndexes);
}

function apiMarkPreorder(rowIndexes, preMonth, preXun) {
  return QueueService.markPreorder(rowIndexes, preMonth, preXun);
}
