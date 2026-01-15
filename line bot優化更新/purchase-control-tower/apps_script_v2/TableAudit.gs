/**
 * TableAudit.gs
 * 審核和修復所有工作表結構
 * 
 * 執行函數：
 * 1. auditAllTables() - 檢查所有表格結構
 * 2. fixBatchMetaTable() - 修復Batch_Meta表（添加JP_Order_No欄位）
 * 3. rebuildAllTables() - 重建所有表格（危險！會清空數據）
 */

/**
 * 審核所有表格結構
 * 檢查每個表格的欄位是否正確
 */
function auditAllTables() {
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  const report = [];
  
  // 1. 檢查Queue表
  report.push('========== Queue 表 ==========');
  const queueSheet = ss.getSheetByName('Queue');
  if (queueSheet) {
    const queueHeaders = queueSheet.getRange(1, 1, 1, queueSheet.getLastColumn()).getValues()[0];
    report.push(`✅ Queue 存在，共 ${queueHeaders.length} 欄`);
    report.push(`表頭: ${queueHeaders.join(' | ')}`);
  } else {
    report.push('❌ Queue 不存在');
  }
  
  // 2. 檢查Batch_Meta表
  report.push('\n========== Batch_Meta 表 ==========');
  const batchMetaSheet = ss.getSheetByName('Batch_Meta');
  if (batchMetaSheet) {
    const batchHeaders = batchMetaSheet.getRange(1, 1, 1, batchMetaSheet.getLastColumn()).getValues()[0];
    report.push(`✅ Batch_Meta 存在，共 ${batchHeaders.length} 欄`);
    report.push(`表頭: ${batchHeaders.join(' | ')}`);
    report.push(`當前結構: [批次ID, 供應商, 匯率, 運費JPY, 建立時間]`);
    
    // 檢查是否缺少JP_Order_No
    if (!batchHeaders.includes('日本訂單號') && !batchHeaders.includes('JP_Order_No')) {
      report.push('⚠️  WARNING: 缺少「日本訂單號」欄位！');
      report.push('💡 需要執行 fixBatchMetaTable() 來修復');
    }
  } else {
    report.push('❌ Batch_Meta 不存在');
  }
  
  // 3. 檢查Packing_Boxes表
  report.push('\n========== Packing_Boxes 表 ==========');
  const packingSheet = ss.getSheetByName('Packing_Boxes');
  if (packingSheet) {
    const packingHeaders = packingSheet.getRange(1, 1, 1, packingSheet.getLastColumn()).getValues()[0];
    report.push(`✅ Packing_Boxes 存在，共 ${packingHeaders.length} 欄`);
    report.push(`表頭: ${packingHeaders.join(' | ')}`);
    
    // 確認JP_Order_No位置
    const jpIndex = packingHeaders.indexOf('JP_Order_No');
    if (jpIndex >= 0) {
      report.push(`✅ JP_Order_No 在第 ${jpIndex + 1} 欄（索引 ${jpIndex}）`);
    } else {
      report.push('❌ 找不到 JP_Order_No 欄位');
    }
  } else {
    report.push('❌ Packing_Boxes 不存在');
    report.push('💡 需要執行 setupPackingBoxesTable()');
  }
  
  // 輸出報告
  const fullReport = report.join('\n');
  Logger.log(fullReport);
  return fullReport;
}

/**
 * 修復Batch_Meta表 - 添加日本訂單號欄位
 * 此函數會在現有數據後面添加新欄位，不會丟失數據
 */
function fixBatchMetaTable() {
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Batch_Meta');
  
  if (!sheet) {
    Logger.log('❌ Batch_Meta 表不存在，請先創建');
    return;
  }
  
  // 獲取當前表頭
  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Logger.log(`當前表頭: ${currentHeaders.join(', ')}`);
  
  // 檢查是否已有日本訂單號欄位
  if (currentHeaders.includes('日本訂單號') || currentHeaders.includes('JP_Order_No')) {
    Logger.log('✅ 日本訂單號欄位已存在，無需修復');
    return;
  }
  
  // 在第5欄（索引4）插入日本訂單號（在建立時間之前）
  Logger.log('開始修復 Batch_Meta 表...');
  
  // 插入新欄
  sheet.insertColumnBefore(5); // 在第5欄前插入
  
  // 設定新欄位表頭
  sheet.getRange(1, 5).setValue('日本訂單號');
  sheet.getRange(1, 5).setFontWeight('bold').setBackground('#f6f8fa');
  
  // 更新表頭為完整版本
  const newHeaders = ['批次ID', '供應商', '匯率', '運費JPY', '日本訂單號', '建立時間'];
  sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
  sheet.getRange(1, 1, 1, newHeaders.length).setFontWeight('bold').setBackground('#f6f8fa');
  
  Logger.log('✅ Batch_Meta 表修復完成');
  Logger.log(`新表頭: ${newHeaders.join(', ')}`);
  Logger.log('⚠️  注意：現有批次的日本訂單號欄位為空，需要手動補填或從UI重新輸入');
  
  return {
    success: true,
    message: '已添加日本訂單號欄位',
    newHeaders: newHeaders
  };
}

/**
 * 創建標準Batch_Meta表（如果不存在）
 * 包含所有必要欄位
 */
function createStandardBatchMetaTable() {
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Batch_Meta');
  
  if (sheet) {
    Logger.log('⚠️  Batch_Meta 已存在，請使用 fixBatchMetaTable() 修復');
    return;
  }
  
  // 創建新工作表
  sheet = ss.insertSheet('Batch_Meta');
  
  // 設定完整表頭
  const headers = ['批次ID', '供應商', '匯率', '運費JPY', '日本訂單號', '建立時間'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#f6f8fa')
    .setHorizontalAlignment('center');
  
  // 設定欄寬
  sheet.setColumnWidth(1, 120); // 批次ID
  sheet.setColumnWidth(2, 100); // 供應商
  sheet.setColumnWidth(3, 80);  // 匯率
  sheet.setColumnWidth(4, 100); // 運費JPY
  sheet.setColumnWidth(5, 130); // 日本訂單號
  sheet.setColumnWidth(6, 150); // 建立時間
  
  // 凍結表頭
  sheet.setFrozenRows(1);
  
  Logger.log('✅ Batch_Meta 表創建成功（標準版）');
  Logger.log(`表頭: ${headers.join(', ')}`);
  
  return sheet;
}

/**
 * 重建所有表格（危險！）
 * 會刪除並重新創建所有表格，數據會丟失！
 * 僅用於開發測試或全新初始化
 */
function rebuildAllTables() {
  const confirm = Browser.msgBox(
    '⚠️  警告',
    '此操作會刪除並重建所有表格，所有數據將丟失！\n\n確定要繼續嗎？',
    Browser.Buttons.YES_NO
  );
  
  if (confirm !== 'yes') {
    Logger.log('操作已取消');
    return;
  }
  
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  const tablesToRebuild = ['Queue', 'Batch_Meta', 'Packing_Boxes'];
  
  tablesToRebuild.forEach(tableName => {
    const sheet = ss.getSheetByName(tableName);
    if (sheet) {
      ss.deleteSheet(sheet);
      Logger.log(`🗑️  已刪除 ${tableName}`);
    }
  });
  
  // 重新創建
  Logger.log('\n開始重建表格...');
  
  // 1. Queue表
  if (typeof setupQueueTable === 'function') {
    setupQueueTable();
  } else {
    Logger.log('❌ setupQueueTable 函數不存在');
  }
  
  // 2. Batch_Meta表（使用新版本）
  createStandardBatchMetaTable();
  
  // 3. Packing_Boxes表
  if (typeof setupPackingBoxesTable === 'function') {
    setupPackingBoxesTable();
  } else {
    Logger.log('❌ setupPackingBoxesTable 函數不存在');
  }
  
  Logger.log('\n✅ 所有表格重建完成');
}

/**
 * 獲取Batch_Meta完整欄位索引（修復後）
 * 供其他服務使用
 */
const BATCH_META_COLS = {
  BATCH_ID: 0,      // A: 批次ID
  SUPPLIER: 1,      // B: 供應商
  RATE: 2,          // C: 匯率
  SHIPPING: 3,      // D: 運費JPY
  JP_ORDER_NO: 4,   // E: 日本訂單號 ← 新增
  CREATED_AT: 5     // F: 建立時間
};
