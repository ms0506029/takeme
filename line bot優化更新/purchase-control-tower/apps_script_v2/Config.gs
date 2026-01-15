/**
 * 採購控制塔 v2 - 設定與常數
 * 包含所有欄位索引、狀態常數、訊息模板等
 */

// ==================== Queue（採購控制中心）欄位索引 ====================

// 全局配置物件 (修復 ReferenceError: CFG is not defined)
const CFG = {
  get SPREADSHEET_ID() {
    try {
      // 優先從 Script Properties 讀取
      const props = PropertiesService.getScriptProperties();
      const id = props.getProperty('SPREADSHEET_ID');
      if (id) return id;
      
      // 若無設定，嘗試獲取當前綁定的試算表 ID
      return SpreadsheetApp.getActiveSpreadsheet().getId();
    } catch (e) {
      console.error('無法獲取 SPREADSHEET_ID:', e);
      throw new Error('無法獲取 SPREADSHEET_ID，請確保腳本已綁定到試算表或已設定 Script Properties');
    }
  }
};

const QUEUE_COLS = {
  QUEUE_ID: 0,                    // A: QueueID
  ES_ORDER_NO: 1,                 // B: ES_Order_No
  PRODUCT_NAME: 2,                // C: Product_Name
  SKU: 3,                         // D: SKU
  COLOR: 4,                       // E: Color
  SIZE: 5,                        // F: Size
  QTY_ORDERED: 6,                 // G: Qty_Ordered
  QTY_ALLOCATED: 7,               // H: Qty_Allocated
  PURCHASE_STATUS: 8,             // I: Purchase_Status
  EXPECTED_SHIP_MONTH: 9,         // J: ExpectedShipMonth
  EXPECTED_SHIP_TEN: 10,          // K: ExpectedShipTen
  EXPECTED_SHIP_LABEL: 11,        // L: ExpectedShipLabel（公式欄）
  LIST_PRICE: 12,                 // M: ListPrice
  ACTUAL_PURCHASE_PRICE: 13,      // N: ActualPurchasePrice
  SELECTED_FOR_BATCH: 14,         // O: SelectedForBatch
  BATCH_ID: 15,                   // P: Batch_ID
  BOX_ID: 16,                     // Q: Box_ID
  TRACKING_JP_TO_JP: 17,          // R: Tracking_JP_to_JP
  TRACKING_JP_TO_TW: 18,          // S: Tracking_JP_to_TW
  LAST_STATUS_UPDATE_AT: 19,      // T: Last_Status_Update_At
  LAST_STATUS_UPDATED_BY: 20,     // U: Last_Status_Updated_By
  NOTIFY_PUSHED_FLAG: 21,         // V: Notify_Pushed_Flag
  READY_TO_NOTIFY: 22,            // W: ReadyToNotify (確認欄位模式)
  COURIER: 23,                    // X: Courier (物流公司：SF=順豐, SCORE=Score)
  PRE_MONTH: 24,                  // Y: Preorder_Month (預購月份)
  PRE_XUN: 25,                    // Z: Preorder_Xun (預購旬)
  LOCKED_BY: 26,                  // AA: Locked_By (鎖定人)
  LOCKED_AT: 27,                  // AB: Locked_At (鎖定時間)
  PURCHASE_DATE: 28,              // AC: Purchase_Date (採購日期)
  PURCHASE_MEMO: 29,              // AD: Purchase_Memo (採購備註)
  WROTE_TO_ERP: 30,               // AE: Wrote_To_ERP (已回寫ERP)
  NOTIFY_STATUS: 31,              // AF: Notification Status (已通知/未通知)
  NOTIFY_NOTE: 32,                // AG: Notification Note (備註)
  NOTIFY_AT: 33                   // AH: Notification Time (時間戳)
};

// Queue 表工作表名稱
const QUEUE_SHEET_NAME = 'Queue';

// ==================== 採購狀態定義 ====================
const PURCHASE_STATUS = {
  PENDING: '待購買',
  PURCHASED: '已購買',
  SUPPLIER_SHIPPED: '供應商已出貨',
  ARRIVED_JP: '已到日本',
  CONSOLIDATING: '集貨中',
  SHIPPED_TO_TW: '已寄出回台灣',
  ARRIVED_TW: '已到台灣',
  SHIPPED_TO_CUSTOMER: '已出貨給客人'
};

// 需要觸發 LINE 通知的狀態
const NOTIFY_STATUS_TRIGGERS = [
  PURCHASE_STATUS.SHIPPED_TO_TW,
  PURCHASE_STATUS.ARRIVED_TW
];

// ==================== OrderLineUserMap 欄位索引 ====================
const ORDER_USER_MAP_COLS = {
  ES_ORDER_NO: 0,
  LINE_USER_ID: 1,
  CUSTOMER_NAME: 2,
  LINE_DISPLAY_NAME: 3
};

const ORDER_USER_MAP_SHEET_NAME = 'OrderLineUserMap';

// ==================== ShipmentsHeader 欄位索引 ====================
const SHIPMENT_HEADER_COLS = {
  SHIPMENT_ID: 0,
  TRACKING_JP_TO_TW: 1,
  SHIP_DATE_JP: 2,
  ETA_TW: 3,
  ARRIVE_DATE_TW: 4,
  STATUS: 5,
  MEMO: 6
};

const SHIPMENT_HEADER_SHEET_NAME = 'ShipmentsHeader';

// ==================== ShipmentsDetail 欄位索引 ====================
const SHIPMENT_DETAIL_COLS = {
  SHIPMENT_ID: 0,
  QUEUE_ID: 1,
  ES_ORDER_NO: 2,
  SKU: 3,
  COLOR: 4,
  SIZE: 5,
  QTY_IN_SHIPMENT: 6,
  ORDER_SUMMARY: 7
};

const SHIPMENT_DETAIL_SHEET_NAME = 'ShipmentsDetail';

// ==================== NotificationsLog 欄位索引 ====================
const NOTIFICATION_LOG_COLS = {
  TIMESTAMP: 0,
  ES_ORDER_NO: 1,
  QUEUE_ID: 2,
  LINE_USER_ID: 3,
  TRACKING_JP_TO_TW: 4,
  MESSAGE_TYPE: 5,
  MESSAGE_CONTENT_SHORT: 6,
  STATUS: 7,
  ERROR_MESSAGE: 8
};

const NOTIFICATION_LOG_SHEET_NAME = 'NotificationsLog';

// ==================== DiscountTemplates 欄位索引 ====================
const DISCOUNT_TEMPLATE_COLS = {
  TEMPLATE_ID: 0,
  NAME: 1,
  TYPE: 2
};

const DISCOUNT_TEMPLATE_SHEET_NAME = 'DiscountTemplates';

// ==================== LINE 訊息類型 ====================
const MESSAGE_TYPE = {
  JP_TO_TW_SHIPPED: 'JP_TO_TW_SHIPPED',
  TW_ARRIVED: 'TW_ARRIVED',
  TW_TO_CUSTOMER_SHIPPED: 'TW_TO_CUSTOMER_SHIPPED'
};

// ==================== 物流公司設定 ====================
const COURIER_TYPES = {
  SF: 'SF',           // 順豐
  SCORE: 'SCORE'      // Score (DEC Logistics)
};

const COURIER_NAMES = {
  SF: '順豐速運',
  SCORE: 'Score 物流'
};

// 物流查詢 URL 模板
const COURIER_TRACKING_URLS = {
  SF: 'https://htm.sf-express.com/hk/tc/dynamic_function/waybill/#search/bill-number/{{tracking}}',
  SCORE: 'https://declogistics.com.tw/h/DataDetail?key=amqeg&cont={{tracking}}'
};

// ==================== LINE 訊息模板 ====================
const LINE_MESSAGE_TEMPLATES = {
  JP_TO_TW_SHIPPED: `🚢 您的訂單 #{{orderNo}} 中的商品已從日本寄出

📦 追蹤碼：{{tracking}}

🔍 點此查看物流狀態：
{{trackingUrl}}

感謝您的耐心等候！`,

  TW_ARRIVED: `✈️ 您的訂單 #{{orderNo}} 已抵達台灣

我們將盡快為您進行揀貨與包裝，完成後將立即為您寄出。

感謝您的支持！`,

  TW_TO_CUSTOMER_SHIPPED: `📮 您的訂單 #{{orderNo}} 已出貨

📦 台灣追蹤碼：{{tracking}}

請留意您的收件地址，商品即將送達！`
};

// ==================== Script Properties 鍵名 ====================
const PROPS = {
  LINE_CHANNEL_ACCESS_TOKEN: 'LINE_CHANNEL_ACCESS_TOKEN',
  TRACKING_URL_BASE: 'TRACKING_URL_BASE',
  SPREADSHEET_ID: 'SPREADSHEET_ID'
};

// ==================== 工具函數 ====================

/**
 * 取得 Spreadsheet
 */
function getSpreadsheet() {
  const ssId = CFG.SPREADSHEET_ID;
  
  if (!ssId) {
    throw new Error('未設定 SPREADSHEET_ID，請先執行初始化');
  }
  
  return SpreadsheetApp.openById(ssId);
}

/**
 * 取得指定工作表
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error(`找不到工作表: ${sheetName}`);
  }
  
  return sheet;
}

/**
 * 替換訊息模板中的變數
 */
function fillMessageTemplate(template, vars) {
  let message = template;
  for (const key in vars) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    message = message.replace(regex, vars[key]);
  }
  return message;
}

/**
 * 取得當前時間戳記
 */
function getTimestamp() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

/**
 * 記錄 log（簡易版，可擴充到專門的 Log 表）
 */
function logInfo(message, data) {
  console.log(`[INFO] ${message}`, data || '');
}

function logError(message, error) {
  console.error(`[ERROR] ${message}`, error);
}
