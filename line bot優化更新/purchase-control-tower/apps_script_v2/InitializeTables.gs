/**
 * InitializeTables.gs
 * 自動初始化和擴充所有必要的資料表
 * 執行此腳本即可一鍵完成所有表格準備工作
 */

/**
 * 主要初始化函數 - 執行所有表格設置
 */
function initializeAllTables() {
  try {
    Logger.log('開始初始化所有表格...');
    
    // 取得試算表 - 使用 PropertiesService 或從 Config 取得
    let spreadsheetId;
    const props = PropertiesService.getScriptProperties();
    const savedId = props.getProperty('SPREADSHEET_ID');
    
    // 如果有定義 CFG，使用 CFG.SPREADSHEET_ID
    if (typeof CFG !== 'undefined' && CFG.SPREADSHEET_ID) {
      spreadsheetId = CFG.SPREADSHEET_ID;
    } else if (savedId) {
      spreadsheetId = savedId;
    } else {
      // 如果都沒有，提示用戶
      throw new Error('找不到試算表 ID。請先在 Config.gs 中設定 CFG.SPREADSHEET_ID 或執行綁定試算表。');
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    
    const results = {
      queueExtended: false,
      soMapCreated: false,
      skuRefCreated: false,
      batchMetaCreated: false,
      errors: []
    };
    
    // 1. 建立或擴充 Queue 表
    try {
      results.queueExtended = ensureQueueTable_(ss);
    } catch (err) {
      results.errors.push('Queue 建立/擴充失敗: ' + err.toString());
    }
    
    // 2. 建立 SO_Map 表
    try {
      results.soMapCreated = createSOMapTable_(ss);
    } catch (err) {
      results.errors.push('SO_Map 建立失敗: ' + err.toString());
    }
    
    // 3. 建立 SKU_Ref 表
    try {
      results.skuRefCreated = createSKURefTable_(ss);
    } catch (err) {
      results.errors.push('SKU_Ref 建立失敗: ' + err.toString());
    }
    
    // 4. 建立 Batch_Meta 表
    try {
      results.batchMetaCreated = createBatchMetaTable_(ss);
    } catch (err) {
      results.errors.push('Batch_Meta 建立失敗: ' + err.toString());
    }
    
    // 產生報告
    Logger.log('========== 初始化報告 ==========');
    Logger.log('Queue 狀態: ' + (results.queueExtended ? '✅ 成功更新' : '⚠️ 已存在'));
    Logger.log('SO_Map 建立: ' + (results.soMapCreated ? '✅ 成功' : '⚠️ 已存在或失敗'));
    Logger.log('SKU_Ref 建立: ' + (results.skuRefCreated ? '✅ 成功' : '⚠️ 已存在或失敗'));
    Logger.log('Batch_Meta 建立: ' + (results.batchMetaCreated ? '✅ 成功' : '⚠️ 已存在或失敗'));
    
    if (results.errors.length > 0) {
      Logger.log('錯誤：');
      results.errors.forEach(err => Logger.log('  - ' + err));
    } else {
      Logger.log('所有表格初始化完成！');
    }
    
    return results;
    
  } catch (error) {
    Logger.log('初始化失敗：' + error);
    throw error;
  }
}

/**
 * 確保 Queue 表存在並擁有正確的欄位
 * @private
 */
function ensureQueueTable_(ss) {
  let queue = ss.getSheetByName('Queue');
  let isNew = false;
  
  // 標準欄位清單 (對應 Config.gs 的 QUEUE_COLS)
  const standardColumns = [
    'QueueID',                    // A: 0
    'ES_Order_No',                // B: 1
    'Product_Name',               // C: 2
    'SKU',                        // D: 3
    'Color',                      // E: 4
    'Size',                       // F: 5
    'Qty_Ordered',                // G: 6
    'Qty_Allocated',              // H: 7
    'Purchase_Status',            // I: 8
    'ExpectedShipMonth',          // J: 9
    'ExpectedShipTen',            // K: 10
    'ExpectedShipLabel',          // L: 11
    'ListPrice',                  // M: 12
    'ActualPurchasePrice',        // N: 13
    'SelectedForBatch',           // O: 14
    'Batch_ID',                   // P: 15
    'Box_ID',                     // Q: 16
    'Tracking_JP_to_JP',          // R: 17
    'Tracking_JP_to_TW',          // S: 18
    'Last_Status_Update_At',      // T: 19
    'Last_Status_Updated_By',     // U: 20
    'Notify_Pushed_Flag',         // V: 21
    'ReadyToNotify',              // W: 22
    'Courier',                    // X: 23
    // 擴充欄位
    '預購月份',                   // Y: 24
    '預購旬',                     // Z: 25
    '鎖定人',                     // AA: 26
    '鎖定時間',                   // AB: 27
    '採購日期',                   // AC: 28
    '採購備註',                   // AD: 29
    '已回寫ERP'                   // AE: 30
  ];

  if (!queue) {
    queue = ss.insertSheet('Queue');
    isNew = true;
  }
  
  // 檢查是否為空表或需要重設標題
  const lastRow = queue.getLastRow();
  const lastCol = queue.getLastColumn();
  
  // 如果是新表或第一列是空的，寫入完整標題
  if (isNew || lastRow === 0 || (lastRow === 1 && lastCol === 0)) {
    queue.getRange(1, 1, 1, standardColumns.length).setValues([standardColumns]);
    formatHeader_(queue, standardColumns.length);
    Logger.log('Queue 表已建立並設定標準欄位');
    return true;
  }
  
  // 如果已有資料，檢查並擴充缺失的欄位
  const currentHeaders = queue.getRange(1, 1, 1, lastCol).getValues()[0];
  const currentSet = new Set(currentHeaders);
  const missingCols = standardColumns.filter(col => !currentSet.has(col));
  
  if (missingCols.length > 0) {
    const startCol = lastCol + 1;
    queue.getRange(1, startCol, 1, missingCols.length).setValues([missingCols]);
    
    // 重新格式化整個標題列
    formatHeader_(queue, lastCol + missingCols.length);
    
    Logger.log(`Queue 表已擴充 ${missingCols.length} 個欄位: ${missingCols.join(', ')}`);
    return true;
  }
  
  Logger.log('Queue 表欄位完整，無需變更');
  return false;
}

/**
 * 格式化標題列
 */
function formatHeader_(sheet, columns) {
  const range = sheet.getRange(1, 1, 1, columns);
  range.setFontWeight('bold')
       .setBackground('#f6f8fa')
       .setFontColor('#2c3e50')
       .setBorder(true, true, true, true, true, true);
  sheet.setFrozenRows(1);
}

/**
 * 建立 SO_Map 表
 * @private
 */
function createSOMapTable_(ss) {
  let soMap = ss.getSheetByName('SO_Map');
  
  if (!soMap) {
    soMap = ss.insertSheet('SO_Map');
    soMap.getRange(1, 1, 1, 2).setValues([['ES_Order_No', 'ERP_Sales_Order_No']]);
    soMap.getRange(1, 1, 1, 2)
      .setFontWeight('bold')
      .setBackground('#f6f8fa')
      .setFontColor('#2c3e50');
    soMap.setFrozenRows(1);
    
    // 自動調整欄寬
    soMap.autoResizeColumns(1, 2);
    
    Logger.log('SO_Map 表已建立');
    return true;
  } else {
    Logger.log('SO_Map 表已存在');
    return false;
  }
}

/**
 * 建立 SKU_Ref 表
 * @private
 */
function createSKURefTable_(ss) {
  let skuRef = ss.getSheetByName('SKU_Ref');
  
  if (!skuRef) {
    skuRef = ss.insertSheet('SKU_Ref');
    skuRef.getRange(1, 1, 1, 4).setValues([['商品URL', '顏色', '尺寸', 'SKU']]);
    skuRef.getRange(1, 1, 1, 4)
      .setFontWeight('bold')
      .setBackground('#f6f8fa')
      .setFontColor('#2c3e50');
    skuRef.setFrozenRows(1);
    
    // 自動調整欄寬
    skuRef.autoResizeColumns(1, 4);
    
    Logger.log('SKU_Ref 表已建立');
    return true;
  } else {
    Logger.log('SKU_Ref 表已存在');
    return false;
  }
}

/**
 * 建立 Batch_Meta 表
 * @private
 */
function createBatchMetaTable_(ss) {
  let batchMeta = ss.getSheetByName('Batch_Meta');
  
  if (!batchMeta) {
    batchMeta = ss.insertSheet('Batch_Meta');
    batchMeta.getRange(1, 1, 1, 5).setValues([['批次ID', '供應商', '匯率', '運費JPY', '建立時間']]);
    batchMeta.getRange(1, 1, 1, 5)
      .setFontWeight('bold')
      .setBackground('#f6f8fa')
      .setFontColor('#2c3e50');
    batchMeta.setFrozenRows(1);
    
    // 自動調整欄寬
    batchMeta.autoResizeColumns(1, 5);
    
    Logger.log('Batch_Meta 表已建立');
    return true;
  } else {
    Logger.log('Batch_Meta 表已存在');
    return false;
  }
}

/**
 * API 端點：一鍵初始化所有表格
 */
function apiInitializeAllTables() {
  try {
    const results = initializeAllTables();
    return {
      success: true,
      data: results
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}
