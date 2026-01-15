/**
 * BEAMS 折扣商品 URL 管理服務
 * 
 * 功能：
 * 1. 接收 F12 Console 腳本發送的商品 URL
 * 2. 儲存到 Google Sheets
 * 3. 提供快速查詢功能，判斷商品是否在折扣清單中
 * 
 * 檔案位置：refactored/BeamsUrlService.gs
 */

// ============================================================
// 設定區
// ============================================================
const BEAMS_URL_CONFIG = {
  // 折扣商品 URL 清單的工作表名稱
  SHEET_NAME: 'BEAMS_Discount_URLs',
  
  // 快取有效時間（10 分鐘）
  CACHE_EXPIRY_SECONDS: 600,
  
  // 快取 Key
  CACHE_KEY: 'beams_discount_urls'
};

// ============================================================
// 初始化工作表
// ============================================================
function initBeamsUrlSheet() {
  // 使用 SPREADSHEET_ID 直接開啟試算表（避免 getActiveSpreadsheet() 返回 null）
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(BEAMS_URL_CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(BEAMS_URL_CONFIG.SHEET_NAME);
    
    // 設定標題列
    const headers = ['URL', '商品 ID', '更新時間', '狀態'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // 格式化標題
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#4285f4')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    
    // 設定欄寬
    sheet.setColumnWidth(1, 400);  // URL
    sheet.setColumnWidth(2, 150);  // 商品 ID
    sheet.setColumnWidth(3, 180);  // 更新時間
    sheet.setColumnWidth(4, 100);  // 狀態
    
    // 凍結標題列
    sheet.setFrozenRows(1);
    
    Logger.log('✅ 已建立 BEAMS_Discount_URLs 工作表');
  }
  
  return sheet;
}

// ============================================================
// 接收並儲存 URL（供 F12 Console 腳本呼叫）
// 支援增量同步模式
// ============================================================
function addBeamsUrls(urls, pageNumber, isLastBatch, mode) {
  const sheet = initBeamsUrlSheet();
  const timestamp = new Date().toISOString();
  
  // 增量模式：先檢查現有資料，只新增不存在的
  let urlsToAdd = urls;
  let skippedCount = 0;
  
  if (mode === 'incremental') {
    // 載入現有的所有商品 ID
    const existingIds = new Set(loadAllBeamsProductIds());
    
    // 過濾掉已存在的 URL
    urlsToAdd = urls.filter(url => {
      const match = url.match(/\/item\/.*\/(\d+)/);
      if (match) {
        const productId = match[1];
        if (existingIds.has(productId)) {
          skippedCount++;
          return false; // 跳過已存在的
        }
      }
      return true;
    });
    
    Logger.log(`📊 增量同步：${urls.length} 個 URL 中，${skippedCount} 個已存在，${urlsToAdd.length} 個為新增`);
  }
  
  // 準備資料
  const rows = urlsToAdd.map(url => {
    // 從 URL 中提取商品 ID
    const match = url.match(/\/item\/.*\/(\d+)/);
    const productId = match ? match[1] : '';
    
    return [url, productId, timestamp, '有效'];
  });
  
  // 批量寫入
  if (rows.length > 0) {
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, rows.length, 4).setValues(rows);
    Logger.log(`✅ 已新增 ${rows.length} 個 URL（第 ${pageNumber} 頁）`);
  } else {
    Logger.log(`ℹ️ 第 ${pageNumber} 頁沒有新 URL 需要新增`);
  }
  
  // 如果是最後一批，清除快取並記錄完成時間
  if (isLastBatch) {
    clearBeamsUrlCache();
    Logger.log('🎉 所有 URL 同步完成！');
    
    // 記錄同步統計
    const totalRows = sheet.getLastRow() - 1;
    Logger.log(`📊 目前資料庫總共有 ${totalRows} 個商品 URL`);
  }
  
  return { 
    success: true, 
    added: rows.length, 
    skipped: skippedCount,
    total: urls.length 
  };
}


// ============================================================
// 清除舊資料（重新抓取前執行）
// ============================================================
function clearBeamsUrls() {
  const sheet = initBeamsUrlSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
    Logger.log('✅ 已清除所有舊的 URL 資料');
  }
  
  clearBeamsUrlCache();
  
  return { success: true, message: '已清除所有 URL' };
}

// ============================================================
// 快取管理
// ============================================================
function getBeamsUrlCache() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(BEAMS_URL_CONFIG.CACHE_KEY);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  return null;
}

function setBeamsUrlCache(urls) {
  const cache = CacheService.getScriptCache();
  
  // CacheService 有 100KB 的限制，所以我們只快取 URL 的 Set
  // 如果資料太大，分批快取
  const urlSet = urls;
  
  try {
    cache.put(BEAMS_URL_CONFIG.CACHE_KEY, JSON.stringify(urlSet), BEAMS_URL_CONFIG.CACHE_EXPIRY_SECONDS);
  } catch (e) {
    // 如果資料太大，就不快取
    Logger.log('⚠️ URL 資料太大，無法快取');
  }
}

function clearBeamsUrlCache() {
  const cache = CacheService.getScriptCache();
  cache.remove(BEAMS_URL_CONFIG.CACHE_KEY);
}

// ============================================================
// 載入所有折扣商品 ID (優化效能)
// ============================================================
function loadAllBeamsProductIds() {
  // 先檢查快取
  const cache = CacheService.getScriptCache();
  const cached = cache.get('beams_discount_ids');
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 從工作表載入
  const sheet = initBeamsUrlSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return [];
  }
  
  // 載入商品 ID (B 欄)
  const data = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  const ids = data.map(row => String(row[0])).filter(id => id);
  
  // 存入快取 (只存 ID 會小很多)
  try {
    const jsonIds = JSON.stringify(ids);
    if (jsonIds.length < 100000) { // 100KB 限制
      cache.put('beams_discount_ids', jsonIds, BEAMS_URL_CONFIG.CACHE_EXPIRY_SECONDS);
    }
  } catch (e) {
    Logger.log('⚠️ ID 資料仍太大，無法快取');
  }
  
  return ids;
}

// ============================================================
// 檢查商品是否在折扣清單中（核心查詢函數 - 已優化）
// ============================================================
function isBeamsDiscountProduct(productUrl) {
  // 1. 從輸入的 URL 提取商品 ID (支援語系路徑)
  const match = productUrl.match(/\/item\/.*\/(\d+)/);
  if (!match) return false;
  
  const inputProductId = match[1];
  
  // 2. 載入所有折扣商品 ID
  const discountIds = loadAllBeamsProductIds();
  
  // 3. 使用 indexOf 或 Set 快速檢查 (不要用迴圈跑 regex)
  return discountIds.indexOf(inputProductId) !== -1;
}

// ============================================================
// 取得折扣清單統計資訊
// ============================================================
function getBeamsUrlStats() {
  const sheet = initBeamsUrlSheet();
  const lastRow = sheet.getLastRow();
  
  const stats = {
    totalUrls: lastRow > 1 ? lastRow - 1 : 0,
    lastUpdated: null
  };
  
  if (lastRow > 1) {
    const lastTimestamp = sheet.getRange(lastRow, 3).getValue();
    stats.lastUpdated = lastTimestamp;
  }
  
  return stats;
}

// ============================================================
// Web App 端點（供 F12 Console 腳本呼叫）
// 🔴 注意：此函數已改名為 handleBeamsWebhook，避免與 Controller.gs 的 doPost 衝突
// 🔴 如果需要獨立部署此服務，請將此函數改回 doPost
// ============================================================
function handleBeamsWebhook(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'addBeamsUrls') {
      const result = addBeamsUrls(data.urls, data.pageNumber, data.isLastBatch, data.mode);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    
    if (data.action === 'clearBeamsUrls') {
      const result = clearBeamsUrls();
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.action === 'checkUrl') {
      const isDiscount = isBeamsDiscountProduct(data.url);
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        isDiscount: isDiscount,
        url: data.url
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'Unknown action' 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// 測試函數
// ============================================================
function testBeamsUrlService() {
  // 初始化工作表
  initBeamsUrlSheet();
  Logger.log('✅ 工作表初始化完成');
  
  // 測試新增 URL
  const testUrls = [
    'https://www.beams.co.jp/item/beams/tops/11130412147/',
    'https://www.beams.co.jp/item/beams/pants/11240000001/'
  ];
  addBeamsUrls(testUrls, 1, false);
  Logger.log('✅ 測試 URL 已新增');
  
  // 測試查詢
  const isDiscount = isBeamsDiscountProduct('https://www.beams.co.jp/item/beams/tops/11130412147/');
  Logger.log(`✅ 查詢結果: ${isDiscount ? '是折扣商品' : '不是折扣商品'}`);
  
  // 取得統計
  const stats = getBeamsUrlStats();
  Logger.log(`✅ 統計: 共 ${stats.totalUrls} 個 URL`);
}
