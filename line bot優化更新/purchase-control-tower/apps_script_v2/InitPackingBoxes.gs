/**
 * InitPackingBoxes.gs
 * 初始化 Packing_Boxes 工作表
 * 
 * 執行方式：在Apps Script編輯器中執行 setupPackingBoxesTable()
 */

function setupPackingBoxesTable() {
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  const sheetName = 'Packing_Boxes';
  
  // 檢查是否已存在
  let sheet = ss.getSheetByName(sheetName);
  
  if (sheet) {
    Logger.log(`⚠️ ${sheetName} 工作表已存在，跳過創建`);
    return;
  }
  
  // 創建新工作表
  sheet = ss.insertSheet(sheetName);
  
  // 設定表頭
  const headers = [
    'Box_ID',           // A: 箱號（批次ID-數字）
    'Batch_ID',         // B: 批次ID
    'JP_Order_No',      // C: 日本訂單號
    'Box_Number',       // D: 箱子序號（數字）
    'Queue_Row_Indexes',// E: Queue行索引（JSON陣列）
    'Item_Count',       // F: 箱內商品種類數
    'Total_Qty',        // G: 箱內總數量
    'Packed_At',        // H: 裝箱時間
    'Packed_By',        // I: 裝箱人
    'Shipped_At',       // J: 寄出時間
    'Picked_At',        // K: 揀貨完成時間
    'Picked_By',        // L: 揀貨人
    'Notes'             // M: 備註
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  
  // 格式化表頭
  headerRange
    .setFontWeight('bold')
    .setBackground('#C9915D')
    .setFontColor('#FFFFFF')
    .setHorizontalAlignment('center');
  
  // 設定欄寬
  sheet.setColumnWidth(1, 150);  // Box_ID
  sheet.setColumnWidth(2, 120);  // Batch_ID
  sheet.setColumnWidth(3, 120);  // JP_Order_No
  sheet.setColumnWidth(4, 80);   // Box_Number
  sheet.setColumnWidth(5, 200);  // Queue_Row_Indexes
  sheet.setColumnWidth(6, 80);   // Item_Count
  sheet.setColumnWidth(7, 80);   // Total_Qty
  sheet.setColumnWidth(8, 150);  // Packed_At
  sheet.setColumnWidth(9, 100);  // Packed_By
  sheet.setColumnWidth(10, 150); // Shipped_At
  sheet.setColumnWidth(11, 150); // Picked_At
  sheet.setColumnWidth(12, 100); // Picked_By
  sheet.setColumnWidth(13, 200); // Notes
  
  // 凍結表頭
  sheet.setFrozenRows(1);
  
  Logger.log(`✅ ${sheetName} 工作表創建成功`);
  Logger.log(`表頭：${headers.join(', ')}`);
  
  return sheet;
}

/**
 * 批次初始化所有表格（包含Packing_Boxes）
 */
function setupAllTables() {
  Logger.log('開始初始化所有表格...');
  
  // 執行原有的表格初始化
  if (typeof setupQueueTable === 'function') {
    setupQueueTable();
  }
  
  if (typeof setupBatchMetaTable === 'function') {
    setupBatchMetaTable();
  }
  
  // 初始化Packing_Boxes表格
  setupPackingBoxesTable();
  
  Logger.log('✅ 所有表格初始化完成');
}
