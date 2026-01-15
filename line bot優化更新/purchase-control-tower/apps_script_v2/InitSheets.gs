/**
 * 採購控制塔 v2 - Google Sheets 初始化
 * 自動建立所有必要的工作表與欄位
 */

/**
 * 主初始化函數 - 建立所有必要的工作表
 * 請在 Google Apps Script 編輯器中執行此函數
 */
function initializeAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  console.log('開始初始化所有工作表...');
  
  // 儲存 Spreadsheet ID 到 Script Properties
  const props = PropertiesService.getScriptProperties();
  props.setProperty(PROPS.SPREADSHEET_ID, ss.getId());
  console.log(`已儲存 Spreadsheet ID: ${ss.getId()}`);
  
  // 建立各個工作表
  initQueueSheet(ss);
  initOrderLineUserMapSheet(ss);
  initShipmentsHeaderSheet(ss);
  initShipmentsDetailSheet(ss);
  initNotificationsLogSheet(ss);
  initDiscountTemplatesSheet(ss);
  
  console.log('✅ 所有工作表初始化完成！');
  
  // 顯示提示訊息
  SpreadsheetApp.getUi().alert(
    '初始化完成',
    '所有工作表已成功建立！\n\n' +
    '請記得設定以下 Script Properties:\n' +
    '1. LINE_CHANNEL_ACCESS_TOKEN\n' +
    '2. TRACKING_URL_BASE\n\n' +
    '可透過「工具」→「指令碼編輯器」→「專案設定」→「指令碼屬性」進行設定。',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * 初始化 Queue（採購控制中心）表
 */
function initQueueSheet(ss) {
  let sheet = ss.getSheetByName(QUEUE_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(QUEUE_SHEET_NAME);
    console.log(`建立工作表: ${QUEUE_SHEET_NAME}`);
  } else {
    console.log(`工作表已存在: ${QUEUE_SHEET_NAME}`);
  }
  
  // 設定標題列
  const headers = [
    'QueueID',                    // A
    'ES_Order_No',                // B
    'Product_Name',               // C
    'SKU',                        // D
    'Color',                      // E
    'Size',                       // F
    'Qty_Ordered',                // G
    'Qty_Allocated',              // H
    'Purchase_Status',            // I
    'ExpectedShipMonth',          // J
    'ExpectedShipTen',            // K
    'ExpectedShipLabel',          // L (公式欄)
    'ListPrice',                  // M
    'ActualPurchasePrice',        // N
    'SelectedForBatch',           // O
    'Batch_ID',                   // P
    'Box_ID',                     // Q
    'Tracking_JP_to_JP',          // R
    'Tracking_JP_to_TW',          // S
    'Last_Status_Update_At',      // T
    'Last_Status_Updated_By',     // U
    'Notify_Pushed_Flag',         // V
    'ReadyToNotify',              // W (確認欄位模式：TRUE 時才推播)
    'Courier'                     // X (物流公司：SF=順豐, SCORE=Score)
  ];
  
  // 寫入標題列
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // 格式化標題列
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4A90E2');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setHorizontalAlignment('center');
  
  // 凍結標題列
  sheet.setFrozenRows(1);
  
  // 設定欄位寬度
  sheet.setColumnWidth(1, 100);  // QueueID
  sheet.setColumnWidth(2, 120);  // ES_Order_No
  sheet.setColumnWidth(3, 200);  // Product_Name
  sheet.setColumnWidth(4, 100);  // SKU
  sheet.setColumnWidth(5, 80);   // Color
  sheet.setColumnWidth(6, 60);   // Size
  sheet.setColumnWidth(9, 120);  // Purchase_Status
  sheet.setColumnWidth(12, 150); // ExpectedShipLabel
  sheet.setColumnWidth(18, 150); // Tracking_JP_to_TW
  
  // L 欄（ExpectedShipLabel）設定公式
  // 公式：=IF(AND(J2<>"",K2<>""), J2 & K2, "")
  // 從第 2 列開始預設 100 列
  for (let row = 2; row <= 101; row++) {
    sheet.getRange(row, 12).setFormula(
      `=IF(AND(J${row}<>"",K${row}<>""), J${row} & K${row}, "")`
    );
  }
  
  console.log(`✓ ${QUEUE_SHEET_NAME} 初始化完成`);
}

/**
 * 初始化 OrderLineUserMap（訂單→LINE User ID）表
 */
function initOrderLineUserMapSheet(ss) {
  let sheet = ss.getSheetByName(ORDER_USER_MAP_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(ORDER_USER_MAP_SHEET_NAME);
    console.log(`建立工作表: ${ORDER_USER_MAP_SHEET_NAME}`);
  } else {
    console.log(`工作表已存在: ${ORDER_USER_MAP_SHEET_NAME}`);
  }
  
  const headers = [
    'ES_Order_No',
    'LINE_User_ID',
    'Customer_Name',
    'LINE_Display_Name'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4A90E2');
  headerRange.setFontColor('#FFFFFF');
  
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 120);  // ES_Order_No
  sheet.setColumnWidth(2, 250);  // LINE_User_ID
  
  console.log(`✓ ${ORDER_USER_MAP_SHEET_NAME} 初始化完成`);
}

/**
 * 初始化 ShipmentsHeader（箱號頭）表
 */
function initShipmentsHeaderSheet(ss) {
  let sheet = ss.getSheetByName(SHIPMENT_HEADER_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHIPMENT_HEADER_SHEET_NAME);
    console.log(`建立工作表: ${SHIPMENT_HEADER_SHEET_NAME}`);
  } else {
    console.log(`工作表已存在: ${SHIPMENT_HEADER_SHEET_NAME}`);
  }
  
  const headers = [
    'Shipment_ID',
    'Tracking_JP_to_TW',
    'Ship_Date_JP',
    'ETA_TW',
    'Arrive_Date_TW',
    'Status',
    'Memo'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4A90E2');
  headerRange.setFontColor('#FFFFFF');
  
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 150);  // Shipment_ID
  sheet.setColumnWidth(2, 180);  // Tracking_JP_to_TW
  
  console.log(`✓ ${SHIPMENT_HEADER_SHEET_NAME} 初始化完成`);
}

/**
 * 初始化 ShipmentsDetail（箱內明細）表
 */
function initShipmentsDetailSheet(ss) {
  let sheet = ss.getSheetByName(SHIPMENT_DETAIL_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHIPMENT_DETAIL_SHEET_NAME);
    console.log(`建立工作表: ${SHIPMENT_DETAIL_SHEET_NAME}`);
  } else {
    console.log(`工作表已存在: ${SHIPMENT_DETAIL_SHEET_NAME}`);
  }
  
  const headers = [
    'Shipment_ID',
    'QueueID',
    'ES_Order_No',
    'SKU',
    'Color',
    'Size',
    'Qty_In_Shipment',
    'OrderSummary'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4A90E2');
  headerRange.setFontColor('#FFFFFF');
  
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(8, 300);  // OrderSummary
  
  console.log(`✓ ${SHIPMENT_DETAIL_SHEET_NAME} 初始化完成`);
}

/**
 * 初始化 NotificationsLog（通知紀錄）表
 */
function initNotificationsLogSheet(ss) {
  let sheet = ss.getSheetByName(NOTIFICATION_LOG_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(NOTIFICATION_LOG_SHEET_NAME);
    console.log(`建立工作表: ${NOTIFICATION_LOG_SHEET_NAME}`);
  } else {
    console.log(`工作表已存在: ${NOTIFICATION_LOG_SHEET_NAME}`);
  }
  
  const headers = [
    'Timestamp',
    'ES_Order_No',
    'QueueID',
    'LINE_User_ID',
    'Tracking_JP_to_TW',
    'Message_Type',
    'Message_Content_Short',
    'Status',
    'Error_Message'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4A90E2');
  headerRange.setFontColor('#FFFFFF');
  
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 160);  // Timestamp
  sheet.setColumnWidth(7, 200);  // Message_Content_Short
  
  console.log(`✓ ${NOTIFICATION_LOG_SHEET_NAME} 初始化完成`);
}

/**
 * 初始化 DiscountTemplates（折扣模板）表
 */
function initDiscountTemplatesSheet(ss) {
  let sheet = ss.getSheetByName(DISCOUNT_TEMPLATE_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(DISCOUNT_TEMPLATE_SHEET_NAME);
    console.log(`建立工作表: ${DISCOUNT_TEMPLATE_SHEET_NAME}`);
  } else {
    console.log(`工作表已存在: ${DISCOUNT_TEMPLATE_SHEET_NAME}`);
  }
  
  const headers = [
    'Template_ID',
    'Name',
    'Type'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4A90E2');
  headerRange.setFontColor('#FFFFFF');
  
  sheet.setFrozenRows(1);
  
  // 新增預設模板
  const defaultTemplate = [
    ['DEFAULT_RATIO', '滿額折扣比例分攤模板', 'RATIO_BY_AMOUNT']
  ];
  
  sheet.getRange(2, 1, 1, 3).setValues(defaultTemplate);
  
  console.log(`✓ ${DISCOUNT_TEMPLATE_SHEET_NAME} 初始化完成`);
}
