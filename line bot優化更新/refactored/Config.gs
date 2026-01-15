// ==========================================
// Config.gs - LINE Bot 設定模組
// 版本：v4.0 模組化架構
// 說明：集中管理所有 Token、API 端點、常數設定
// ==========================================

/**
 * LINE Bot 設定
 * 包含 Channel Access Token 和 Channel Secret
 * 🔴 敏感資訊：請勿外洩
 */
const LINE_CONFIG = {
  CHANNEL_ACCESS_TOKEN: 'E01ovFXScGEYxKd+OGsMzBnfTp9jCDPZTLk8BHsH+Pd+paKQ407IFB/QLBU7+GU25m2X3HJUlm5C91QNQ3Y8BK54Xptc9HVLZaBsT3xqk3s+ixeO6aG+EZhSU3JElcP5PD2cYbP3aYGMOfL18ZRXRwdB04t89/1O/w1cDnyilFU=',
  CHANNEL_SECRET: '282f9e2b4c7e48a96c3c2428c587a1e9'
};

/**
 * API 端點設定
 * LINE_OA_BACKEND：LINE OA 系統後端 (會員驗證、訂單查詢等)
 * OUTFIT_WALL_BACKEND：穿搭牆後端
 */
const API_ENDPOINTS = {
  LINE_OA_BACKEND: 'https://script.google.com/macros/s/AKfycbwSW1mlWgmryPxlXFIpNksCn0DG0lQb1N8T0TpQykNG7R5sV_bGecMlcJ1JQ8_J2K6E/exec',
  OUTFIT_WALL_BACKEND: 'https://script.google.com/macros/s/AKfycbw5RiNNZmKaC-NK2cwrTwoFZ9mT6YG42PZ3vJ2XhltnzXBBFO1qZuJ_XAXScbTRUxme/exec'
};

/**
 * Google Sheets 設定
 * SPREADSHEET_ID：主要資料表 ID
 */
const SPREADSHEET_ID = '1mHjJLM5sfEwGZ23BGF2SU_DHwjAiLNaVjGprloO82-U';
const MAIN_SHEET_ID = SPREADSHEET_ID; // 讓 BeamsSaleService.gs 也能正常執行

/**
 * Purchase Control Tower Spreadsheet ID
 * 🔴 用於查詢 Queue 表單的 Box_ID 欄位
 * 🔴 請替換為實際的 Tower Spreadsheet ID
 */
const TOWER_SPREADSHEET_ID = '1G6ektsuRi0ywXQ_5Uzj0vXAPOOQhc6LGYVH7D-4jsSQ';

/**
 * EasyStore API 設定
 * 用於會員驗證和訂單查詢
 */
const EASYSTORE_CONFIG = {
  STORE_URL: 'takemejapan',
  ACCESS_TOKEN: 'f232b671b6cb3bb8151c23c2bd39129a',
  BASE_API: 'https://takemejapan.easy.co/api/3.0',
  HEADERS: {
    'EasyStore-Access-Token': 'f232b671b6cb3bb8151c23c2bd39129a',
    'Content-Type': 'application/json'
  }
};

/**
 * 物流通知訊息模板
 * 當 Queue 表的 Box_ID 欄位有值時發送
 */
const TRACKING_MESSAGE_TEMPLATES = {
  // 已從日本寄出（Box_ID 有值時）
  JP_TO_TW_SHIPPED: '📦 已從日本集貨倉寄出，預計 5-7 天抵達台灣倉庫',
  
  // 已抵達台灣（備用）
  TW_ARRIVED: '✈️ 商品已抵達台灣，即將為您進行揀貨與包裝',
  
  // 已寄出給客人（備用）
  TW_TO_CUSTOMER: '🚚 商品已從台灣倉庫寄出，請留意收件'
};


/**
 * 工作表名稱定義
 * 🔴 重要：欄位新增只能往後順延，不可插入中間
 */
const SHEET_NAMES = {
  ORDERS: '訂單管理',
  LINE_USERS: 'LINE用戶對應',
  TEMPLATES: '通知模板',
  LOGS: '操作記錄',
  SYNC_RECORDS: '同步記錄'
};

/**
 * Queue 表欄位索引（Tower Spreadsheet）
 * 🔴 重要：欄位索引從 0 開始
 */
const QUEUE_COLS = {
  ES_ORDER_NO: 1,        // B 欄 - EasyStore 訂單編號
  PRODUCT_NAME: 2,       // C 欄 - 商品名稱
  SKU: 3,                // D 欄 - SKU
  COLOR: 4,              // E 欄 - 顏色
  SIZE: 5,               // F 欄 - 尺寸
  QTY_ORDERED: 6,        // G 欄 - 訂購數量
  PURCHASE_STATUS: 8,    // I 欄 - 購買狀態
  BOX_ID: 16,            // Q 欄 - Box_ID（對應 Packing_Boxes）
  TRACKING_JP_TO_TW: 18, // S 欄 - 日本到台灣追蹤號碼
  PREORDER_MONTH: 24,    // Y 欄 - 預購月份（例如：2025-11）
  PREORDER_PERIOD: 25    // Z 欄 - 預購旬（上/中/下）
};


/**
 * Packing_Boxes 表欄位索引（Tower Spreadsheet）
 * 用於判斷物流狀態
 */
const PACKING_BOXES_COLS = {
  BOX_ID: 0,             // A 欄 - Box_ID（主鍵）
  BOX_NUMBER: 3,         // D 欄 - 箱號編號
  PACKED_AT: 7,          // H 欄 - 裝箱日期（已寄出回台灣）
  PICKED_AT: 10          // K 欄 - 揀貨日期（已抵達台灣集貨倉）
};

/**
 * 物流狀態定義
 * 根據 Packing_Boxes 表的欄位判斷
 */
const SHIPPING_STATUS = {
  // Box_ID 有值 + Packed_At 有值
  SHIPPED_TO_TW: {
    code: 'shipped_to_tw',
    label: '已寄出回台灣集貨倉',
    emoji: '📦',
    template: 'JP_TO_TW_SHIPPED'
  },
  // Picked_At 有值
  ARRIVED_TW: {
    code: 'arrived_tw',
    label: '已抵達台灣集貨倉',
    emoji: '✈️',
    template: 'TW_ARRIVED'
  }
};

/**
 * 錯誤訊息定義
 * 統一管理所有錯誤回覆文案
 */
const ERROR_MESSAGES = {
  NO_ORDERS: '📦 目前沒有訂單記錄\n\n如果您最近有下單，請稍後再試。\n\n🛒 或點選下方按鈕前往購物',
  USER_NOT_BOUND: '🔗 您還沒有綁定會員帳號\n\n請先輸入您的註冊信箱進行綁定，才能查詢訂單喔！',
  SYSTEM_ERROR: '⚠️ 系統暫時無法處理您的請求\n\n請稍後再試，或聯繫客服。',
  INVALID_ORDER: '❌ 找不到指定的訂單\n\n請檢查訂單編號是否正確。',
  API_ERROR: '🔌 API 連接失敗\n\n請稍後再試。'
};

/**
 * 成功訊息定義
 * 統一管理所有成功回覆文案
 */
const SUCCESS_MESSAGES = {
  BINDING_SUCCESS: '✅ 會員綁定成功！\n\n現在您可以查詢訂單了。',
  ORDER_FOUND: '✅ 找到您的訂單',
  NOTIFICATION_SENT: '✅ 通知已發送',
  UPDATE_SUCCESS: '✅ 更新成功'
};

/**
 * 處理中訊息定義
 * 用於回覆用戶「處理中」的狀態
 */
const PROCESSING_MESSAGES = {
  verifying: '🔍 正在驗證您的會員資料...',
  orders: '📦 正在查詢您的訂單資料...',
  tracking: '🚚 正在查詢物流資訊...',
  beams_price: '💰 正在查詢 BEAMS 商品價格...',
  calculating: '🧮 正在計算代購價格...'
};

/**
 * Rich Menu 設定
 * 定義 LINE Rich Menu 的尺寸與按鈕區域
 * 🔴 恢復為原本可運作版本（使用 message 類型）
 */
const RICH_MENU_CONFIG = {
  size: {
    width: 2500,
    height: 1686
  },
  selected: true,
  name: "Take Me Japan 主選單",
  chatBarText: "選單",
  areas: [
    // 左上：官網連結
    {
      bounds: { x: 0, y: 0, width: 833, height: 843 },
      action: {
        type: "uri",
        uri: "https://www.takemejapan.com"
      }
    },
    // 中上：Instagram
    {
      bounds: { x: 833, y: 0, width: 834, height: 843 },
      action: {
        type: "uri",
        uri: "https://www.instagram.com/take.me_japan?igsh=MWZ4NHdyeWI5ZGN3eQ%3D%3D&utm_source=qr"
      }
    },
    // 右上：我的訂單 → 使用 message 類型
    {
      bounds: { x: 1667, y: 0, width: 833, height: 843 },
      action: {
        type: "message",
        text: "📦 查詢我的訂單"
      }
    },
    // 左下：物流追蹤 → 使用 message 類型
    {
      bounds: { x: 0, y: 843, width: 833, height: 843 },
      action: {
        type: "message",
        text: "🚚 查詢物流狀態"
      }
    }
  ]
};


/**
 * 品牌主色定義
 * 用於 Flex Message 的一致性視覺設計
 */
const BRAND_COLORS = {
  PRIMARY: '#C9915D',    // Take Me Japan 主色
  SUCCESS: '#1DB446',    // 成功綠
  WARNING: '#FF9800',    // 警告橘
  ERROR: '#F44336',      // 錯誤紅
  TEXT_DARK: '#333333',  // 深色文字
  TEXT_LIGHT: '#666666', // 淺色文字
  TEXT_MUTED: '#999999'  // 灰色文字
};

/**
 * 關鍵字白名單
 * 只有這些關鍵字會觸發自動回覆
 */
const STRICT_KEYWORDS = [
  { keyword: '你好', type: 'exact' },
  { keyword: '您好', type: 'exact' },
  { keyword: 'hi', type: 'exact' },
  { keyword: 'hello', type: 'exact' },
  { keyword: '幫助', type: 'exact' },
  { keyword: '客服', type: 'exact' },
  { keyword: '選單', type: 'exact' },
  { keyword: 'menu', type: 'exact' },
  { keyword: '開始', type: 'exact' },
  { keyword: 'start', type: 'exact' },
  { keyword: '功能', type: 'exact' },
  { keyword: '服務', type: 'exact' }
];

/**
 * 商品資訊偵測正則表達式
 * 用於判斷用戶是否在詢問商品資訊（轉交人工客服）
 */
const PRODUCT_INFO_PATTERNS = [
  /尺寸|size/i,
  /顏色|color|カラー/i,
  /數量|quantity/i,
  /\d+號|\d+cm|\d+ml/i,
  /[SMLXL]{1,3}$/i,
  /\d+\s*(件|個|條|雙)/i
];

// ==========================================
// BEAMS 會員限定促銷活動設定
// 活動期間：2025/12/26 - 2025/12/31 21:59 (台灣時間)
// ==========================================

/**
 * BEAMS 促銷活動設定
 */
const BEAMS_CONFIG = {
  // ============================================================
  // 🔴 功能總開關 🔴
  // 設為 true 啟用活動，設為 false 暫停活動（不會刪除任何程式碼）
  // ============================================================
  ENABLED: false,  // ← 下次活動時改回 true 即可重新啟用
  
  // Cloud Function 爬蟲服務 URL
  // 🔴 部署 Cloud Function 後請更新此 URL
  SCRAPER_URL: 'https://asia-northeast1-linebot-todoaccounting-2025.cloudfunctions.net/scrapeBeamsProduct',
  
  // 報價公式參數
  // 公式：日幣 × 0.7 × 0.21 + $460
  PRICE_FORMULA: {
    DISCOUNT_RATE: 0.7,      // 30% OFF
    EXCHANGE_RATE: 0.21,     // 日幣轉台幣匯率
    SERVICE_FEE: 460         // 服務費
  },
  
  // 活動結束時間（台灣時間 2025/12/31 21:59）
  CAMPAIGN_END: new Date('2025-12-31T21:59:00+08:00'),
  
  // 觸發關鍵字
  TRIGGER_KEYWORDS: ['想了解beams活動', '想了解BEAMS活動', 'BEAMS活動', 'beams活動', 'beams', 'BEAMS'],
  
  // 工作表名稱
  SHEETS: {
    PRODUCT_CACHE: 'BEAMS_Product_Cache',
    ORDERS: 'BEAMS_Sale_Orders',
    CATEGORIES: 'BEAMS_Categories'
  },
  
  // 截圖儲存資料夾 ID
  SCREENSHOT_FOLDER_ID: '1wJqVx4pTGy75ArojPpOBoV9Iy9bCUu3E',
  
  // URL 識別正則 (更寬鬆的匹配，支援有無結尾斜槓)
  URL_PATTERN: /beams\.co\.jp\/.*item\/.*\/(\d+)/
};
