// ==========================================
// Code.gs - LINE OA 後台管理系統（完整版）
// 版本：v4.0 - 單檔案整合版
// ==========================================

// ==========================================
// 全域常數設定
// ==========================================
const SPREADSHEET_ID = '1mHjJLM5sfEwGZ23BGF2SU_DHwjAiLNaVjGprloO82-U';
const TOWER_SS_ID = '1G6ektsuRi0ywXQ_5Uzj0vXAPOOQhc6LGYVH7D-4jsSQ';

const SHEET_NAMES = {
  ORDERS: '訂單管理',
  LINE_USERS: 'LINE用戶對應',
  TEMPLATES: '通知模板',
  LOGS: '操作記錄',
  SYNC_RECORDS: '同步記錄'
};

const LINE_CONFIG = {
  CHANNEL_ACCESS_TOKEN: 'E01ovFXScGEYxKd+OGsMzBnfTp9jCDPZTLk8BHsH+Pd+paKQ407IFB/QLBU7+GU25m2X3HJUlm5C91QNQ3Y8BK54Xptc9HVLZaBsT3xqk3s+ixeO6aG+EZhSU3JElcP5PD2cYbP3aYGMOfL18ZRXRwdB04t89/1O/w1cDnyilFU=',
  CHANNEL_SECRET: '282f9e2b4c7e48a96c3c2428c587a1e9'
};

// EasyStore API 設定
const EASYSTORE_CONFIG = {
  STORE_URL: 'takemejapan',
  ACCESS_TOKEN: 'f232b671b6cb3bb8151c23c2bd39129a',
  BASE_API: 'https://takemejapan.easy.co/api/3.0',
  HEADERS: {
    'EasyStore-Access-Token': 'f232b671b6cb3bb8151c23c2bd39129a',
    'Content-Type': 'application/json'
  }
};

// Queue 表欄位索引
const Q_COLS = {
  QUEUE_ID: 0,
  ES_ORDER_NO: 1,
  PRODUCT_NAME: 2,
  SKU: 3,
  COLOR: 4,
  SIZE: 5,
  QTY_ORDERED: 6,
  PURCHASE_STATUS: 8,
  BOX_ID: 16,
  TRACKING_JP_TO_TW: 18,
  NOTIFY_PUSHED_FLAG: 21,
  PURCHASE_NOTE: 29,     // 採購備註（欄位 AD）- 包含購買日期資訊
  NOTIFY_STATUS: 31,
  NOTIFY_NOTE: 32
};

// Packing_Boxes 表欄位索引
const BOX_COLS = {
  BOX_ID: 0,            // A
  BOX_NUMBER: 3,        // D - Box_Number
  PACKED_AT: 7          // H - Packed_At（入箱日期）
};

// ==========================================
// doGet - 處理 GET 請求
// ==========================================
function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action) {
      return handleAPIRequest(e);
    }
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('LINE Bot 後台管理系統')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (error) {
    console.error('doGet 錯誤:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false, error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 診斷函數：列出 SPREADSHEET_ID 中的所有表名
 * 在 GAS 編輯器中直接執行此函數來檢查表名
 */
function listAllSheets() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();
    
    console.log('========================================');
    console.log('SPREADSHEET_ID: ' + SPREADSHEET_ID);
    console.log('共有 ' + sheets.length + ' 個工作表：');
    console.log('========================================');
    
    sheets.forEach((sheet, index) => {
      const name = sheet.getName();
      const rowCount = sheet.getLastRow();
      console.log(`${index + 1}. 「${name}」 (${rowCount} 列)`);
      
      // 檢查是否包含「會員」關鍵字
      if (name.includes('會員') || name.includes('綁定')) {
        console.log(`   ⭐ 可能是目標表！`);
      }
    });
    
    console.log('========================================');
    return { success: true, sheets: sheets.map(s => s.getName()) };
    
  } catch (error) {
    console.error('❌ 錯誤：' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function handleAPIRequest(e) {
  const action = e.parameter.action;
  let result;
  
  switch (action) {
    case 'getOrdersWithQueueStatus':
      result = getOrdersWithQueueStatus(e.parameter);
      break;
    case 'getPendingOOSNotifications':
      result = getPendingOOSNotifications();
      break;
    case 'getPendingShippingNotifications':
      result = getPendingShippingNotifications();
      break;
    case 'getCustomerBindings':
      result = getCustomerBindings(e.parameter);
      break;
    case 'sendOOSNotification':
      result = sendOOSNotificationFromBackend(e.parameter);
      break;
    case 'sendShippingNotification':
      result = sendShippingNotificationFromBackend(e.parameter);
      break;
    case 'markNotificationSent':
      result = markNotificationSent(e.parameter.queueId, e.parameter.notifyType);
      break;
    case 'getOrders':
      result = getOrdersWithQueueStatus(e.parameter);
      break;
    case 'getStats':
      result = getStats();
      break;
    case 'syncOrders':
      result = syncEasyStoreOrders(parseInt(e.parameter.days) || 5, e.parameter.operator || 'system');
      break;
    case 'getOrderDetail':
      result = getOrderDetail(e.parameter.orderNo);
      break;
    case 'verifyMember':
      result = verifyMember({ email: e.parameter.email });
      break;
    case 'saveMemberBinding':
      const lineUserId = e.parameter.lineUserId;
      const memberDataJson = e.parameter.memberData;
      if (lineUserId && memberDataJson) {
        try {
          const memberData = JSON.parse(memberDataJson);
          result = saveMemberBinding(lineUserId, memberData);
        } catch (parseError) {
          result = { success: false, error: '會員資料格式錯誤' };
        }
      } else {
        result = { success: false, error: '缺少必要參數' };
      }
      break;
    case 'checkBinding':
      result = checkMemberBinding(e.parameter.lineUserId);
      break;
    default:
      result = { success: false, error: '未知的 action: ' + action };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 訂單管理 API（雙表 JOIN）
// ==========================================

/**
 * 取得訂單列表（合併訂單管理表 + Queue 表）
 * 支援分頁、遞減排序、搜尋、狀態篩選、日期範圍
 */
function getOrdersWithQueueStatus(params) {
  try {
    console.log('📦 getOrdersWithQueueStatus 開始');
    
    params = params || {};
    const page = parseInt(params.page) || 1;
    const pageSize = parseInt(params.pageSize) || 50;
    const search = (params.search || '').toLowerCase().trim();
    const statusFilter = (params.status || '').trim();
    const dateFrom = params.dateFrom || '';
    const dateTo = params.dateTo || '';
    
    console.log(`🔍 搜尋: ${search}, 狀態: ${statusFilter}, 日期: ${dateFrom} ~ ${dateTo}`);
    
    // 1. 從訂單管理表讀取基本資訊
    const ordersMap = _getOrdersFromMainSheet();
    console.log(`📋 訂單管理表: ${Object.keys(ordersMap).length} 筆`);
    
    // 2. 從 Queue 表讀取採購狀態
    const queueData = _getQueueData();
    console.log(`📊 Queue 表: ${queueData.length} 筆商品`);
    
    // 3. 按訂單編號聚合 Queue 商品
    const queueMap = {};
    queueData.forEach(item => {
      if (!item.esOrderNo) return;
      const normalizedOrderNo = String(item.esOrderNo).replace(/^#/, '').trim();
      if (!queueMap[normalizedOrderNo]) queueMap[normalizedOrderNo] = [];
      queueMap[normalizedOrderNo].push(item);
    });
    
    // 4. JOIN 兩表資料
    let mergedOrders = [];
    
    for (const [orderNo, orderInfo] of Object.entries(ordersMap)) {
      const queueItems = queueMap[orderNo] || [];
      const overallStatus = _determineOrderStatus(queueItems);
      const firstProductName = queueItems.length > 0 ? queueItems[0].productName : '';
      
      mergedOrders.push({
        orderNumber: orderNo,
        orderDate: _formatDateString(orderInfo.orderDate),
        orderDateRaw: orderInfo.orderDate,  // 用於日期篩選
        customerName: orderInfo.customerName || '',
        customerEmail: orderInfo.customerEmail || '',
        lineUserId: orderInfo.lineUserId || '',
        orderStatus: orderInfo.orderStatus || '',
        totalAmount: orderInfo.totalAmount || 0,
        syncTime: _formatDateString(orderInfo.syncTime),
        queueItemCount: queueItems.length,
        firstProductName: firstProductName,
        overallStatus: overallStatus.label,
        overallStatusColor: overallStatus.color,
        overallStatusRaw: overallStatus.raw || '',  // 用於狀態篩選
        hasOOS: queueItems.some(i => i.purchaseStatus === '缺貨'),
        hasShipped: queueItems.some(i => i.boxId && i.boxId !== '')
      });
    }
    
    // 5. 搜尋篩選
    if (search) {
      mergedOrders = mergedOrders.filter(o => 
        o.orderNumber.toLowerCase().includes(search) ||
        (o.customerName && o.customerName.toLowerCase().includes(search)) ||
        (o.customerEmail && o.customerEmail.toLowerCase().includes(search)) ||
        (o.firstProductName && o.firstProductName.toLowerCase().includes(search))
      );
    }
    
    // 6. 狀態篩選
    if (statusFilter && statusFilter !== 'all') {
      mergedOrders = mergedOrders.filter(o => {
        const status = o.overallStatus || '';
        switch(statusFilter) {
          case 'pending':    return status.includes('待購買') || status.includes('處理中');
          case 'purchased':  return status.includes('已購買') || status.includes('部分已購');
          case 'shipped':    return status.includes('供應商已出貨');
          case 'arrived':    return status.includes('已到日本') || status.includes('集貨');
          case 'boxed':      return status.includes('已入箱');
          case 'twshipped':  return status.includes('已寄回台灣');
          case 'delivered':  return status.includes('已出貨');
          case 'oos':        return status.includes('缺貨');
          default: return true;
        }
      });
    }
    
    // 7. 日期範圍篩選
    if (dateFrom || dateTo) {
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null;
      
      mergedOrders = mergedOrders.filter(o => {
        if (!o.orderDateRaw) return true;
        const orderDate = new Date(o.orderDateRaw);
        if (isNaN(orderDate.getTime())) return true;
        if (fromDate && orderDate < fromDate) return false;
        if (toDate && orderDate > toDate) return false;
        return true;
      });
    }
    
    // 8. 遞減排序（訂單編號大的在前）
    mergedOrders.sort((a, b) => {
      const numA = parseInt(a.orderNumber) || 0;
      const numB = parseInt(b.orderNumber) || 0;
      return numB - numA;
    });
    
    // 9. 分頁
    const totalCount = mergedOrders.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const pagedOrders = mergedOrders.slice(startIndex, startIndex + pageSize);
    
    // 移除不需要傳到前端的欄位
    pagedOrders.forEach(o => delete o.orderDateRaw);
    
    console.log(`✅ 篩選後 ${totalCount} 筆，第 ${page}/${totalPages} 頁`);
    
    return {
      success: true,
      data: pagedOrders,
      totalCount: totalCount,
      totalPages: totalPages,
      currentPage: page,
      pageSize: pageSize
    };
    
  } catch (error) {
    console.error('❌ getOrdersWithQueueStatus 錯誤:', error);
    return { success: false, error: error.toString(), data: [] };
  }
}

/**
 * 取得單一訂單的詳細資訊（包含所有商品）
 * 這個 API 用於訂單詳情 Modal
 */
function getOrderDetail(orderNo) {
  try {
    if (!orderNo) {
      return { success: false, error: '缺少訂單編號' };
    }
    
    orderNo = String(orderNo).trim();
    console.log(`📦 取得訂單詳情: ${orderNo}`);
    
    // 1. 從訂單管理表取得基本資訊
    const ordersMap = _getOrdersFromMainSheet();
    const orderInfo = ordersMap[orderNo];
    
    if (!orderInfo) {
      return { success: false, error: '找不到訂單: ' + orderNo };
    }
    
    // 2. 從 Queue 表取得商品資訊
    const queueData = _getQueueData();
    const queueItems = queueData.filter(item => {
      const normalizedOrderNo = String(item.esOrderNo).replace(/^#/, '').trim();
      return normalizedOrderNo === orderNo;
    });
    
    // 3. 計算整體狀態
    const overallStatus = _determineOrderStatus(queueItems);
    
    // 4. 從 OrderLineUserMap 取得客戶綁定資訊
    const userMap = _getOrderLineUserMap();
    const userInfo = userMap[orderNo] || {};
    
    // 5. 從 Packing_Boxes 表取得箱號和入箱日期資訊
    const packingBoxesMap = _getPackingBoxesMap();
    
    return {
      success: true,
      order: {
        orderNumber: orderNo,
        customerName: orderInfo.customerName || '',
        customerEmail: orderInfo.customerEmail || '',
        lineUserId: orderInfo.lineUserId || userInfo.lineUserId || '',
        lineDisplayName: userInfo.lineDisplayName || '',
        orderStatus: orderInfo.orderStatus || '',
        totalAmount: orderInfo.totalAmount || 0,
        orderDate: _formatDateString(orderInfo.orderDate),
        syncTime: _formatDateString(orderInfo.syncTime),
        overallStatus: overallStatus.label,
        overallStatusColor: overallStatus.color
      },
      items: queueItems.map(item => {
        // 從 Packing_Boxes 取得正確的箱號和入箱日期
        const boxInfo = packingBoxesMap[item.boxId] || {};
        return {
          queueId: item.queueId,
          productName: item.productName,
          sku: item.sku,
          color: item.color,
          size: item.size,
          qtyOrdered: item.qtyOrdered,
          purchaseStatus: item.purchaseStatus,
          purchaseNote: item.purchaseNote,          // 採購備註（包含購買日期）
          boxId: item.boxId,
          boxNumber: boxInfo.boxNumber || item.boxId,  // 正確的箱號 from Packing_Boxes
          packedAt: boxInfo.packedAt || '',          // 入箱日期 from Packing_Boxes
          trackingJPtoTW: item.trackingJPtoTW
        };
      }),
      itemCount: queueItems.length
    };
    
  } catch (error) {
    console.error('❌ getOrderDetail 錯誤:', error);
    return { success: false, error: error.toString() };
  }
}

// ==========================================
// 缺貨/物流通知 API
// ==========================================

function getPendingOOSNotifications() {
  try {
    const queueData = _getQueueData();
    const userMap = _getOrderLineUserMap();
    
    const oosItems = queueData.filter(item => 
      item.purchaseStatus === '缺貨' && !item.notifyPushed
    );
    
    const enrichedItems = oosItems.map(item => {
      const userInfo = userMap[item.esOrderNo] || {};
      return {
        ...item,
        lineUserId: userInfo.lineUserId || '',
        customerName: userInfo.customerName || userInfo.lineDisplayName || '',
        canSend: !!userInfo.lineUserId
      };
    });
    
    return { success: true, items: enrichedItems, totalCount: enrichedItems.length };
  } catch (error) {
    console.error('❌ getPendingOOSNotifications 錯誤:', error);
    return { success: false, error: error.toString(), items: [], totalCount: 0 };
  }
}

function getPendingShippingNotifications() {
  try {
    const queueData = _getQueueData();
    const userMap = _getOrderLineUserMap();
    
    const shippedItems = queueData.filter(item => 
      item.boxId && item.boxId !== '' && !item.notifyPushed
    );
    
    const enrichedItems = shippedItems.map(item => {
      const userInfo = userMap[item.esOrderNo] || {};
      return {
        ...item,
        lineUserId: userInfo.lineUserId || '',
        customerName: userInfo.customerName || userInfo.lineDisplayName || '',
        canSend: !!userInfo.lineUserId
      };
    });
    
    return { success: true, items: enrichedItems, totalCount: enrichedItems.length };
  } catch (error) {
    console.error('❌ getPendingShippingNotifications 錯誤:', error);
    return { success: false, error: error.toString(), items: [], totalCount: 0 };
  }
}

// ==========================================
// 客戶管理 API
// ==========================================

function getCustomerBindings(params) {
  try {
    params = params || {};
    const page = parseInt(params.page) || 1;
    const pageSize = parseInt(params.pageSize) || 50;
    const search = (params.search || '').toLowerCase();
    
    const bindings = _getOrderLineUserMapArray();
    console.log(`📋 getCustomerBindings: 共 ${bindings.length} 筆`);
    
    let filtered = bindings;
    if (search) {
      filtered = bindings.filter(b => 
        (b.email && b.email.toLowerCase().includes(search)) ||
        (b.lineDisplayName && b.lineDisplayName.toLowerCase().includes(search)) ||
        (b.customerName && b.customerName.toLowerCase().includes(search)) ||
        (b.lineUserId && b.lineUserId.toLowerCase().includes(search))
      );
    }
    
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const pagedData = filtered.slice(startIndex, startIndex + pageSize);
    
    return {
      success: true,
      data: pagedData,
      totalCount: totalCount,
      totalPages: totalPages,
      currentPage: page
    };
  } catch (error) {
    console.error('❌ getCustomerBindings 錯誤:', error);
    return { success: false, error: error.toString(), data: [], totalCount: 0 };
  }
}

// ==========================================
// 統計與同步 API
// ==========================================

function getStats() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const ordersSheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
    
    let totalOrders = 0, pendingOrders = 0, completedOrders = 0, totalCustomers = 0;
    
    if (ordersSheet && ordersSheet.getLastRow() > 1) {
      totalOrders = ordersSheet.getLastRow() - 1;
      pendingOrders = totalOrders;  // 簡化處理
    }
    
    const usersSheet = ss.getSheetByName(SHEET_NAMES.LINE_USERS);
    if (usersSheet && usersSheet.getLastRow() > 1) {
      totalCustomers = usersSheet.getLastRow() - 1;
    }
    
    return {
      success: true,
      totalOrders: totalOrders,
      pendingOrders: pendingOrders,
      completedOrders: completedOrders,
      totalCustomers: totalCustomers
    };
  } catch (error) {
    console.error('getStats 錯誤:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 從 EasyStore API 同步訂單到 Google Sheets
 * @param {number} days - 同步最近幾天的訂單（預設 7 天）
 * @param {string} operator - 操作者
 */
function syncEasyStoreOrders(days, operator) {
  try {
    days = days || 7;  // 預設改為 7 天
    console.log(`🔄 開始同步 EasyStore 訂單 (最近 ${days} 天)`);
    
    // 計算日期範圍
    const now = new Date();
    const sinceDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const sinceDateStr = sinceDate.toISOString().split('T')[0];
    
    // 從 EasyStore API 獲取訂單
    const url = `${EASYSTORE_CONFIG.BASE_API}/orders.json?created_at_min=${sinceDateStr}&financial_status=paid&limit=100`;
    console.log('🔗 API URL:', url);
    
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: EASYSTORE_CONFIG.HEADERS,
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    console.log('📡 API 回應碼:', responseCode);
    
    if (responseCode !== 200) {
      const errorText = response.getContentText();
      console.error('❌ EasyStore API 錯誤:', errorText);
      return { success: false, error: `API 錯誤: ${responseCode}`, details: errorText };
    }
    
    const result = JSON.parse(response.getContentText());
    const orders = result.orders || [];
    console.log(`📦 取得 ${orders.length} 筆訂單`);
    
    if (orders.length === 0) {
      return { success: true, message: '沒有新訂單', syncedCount: 0 };
    }
    
    // 取得訂單管理表和欄位索引
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const ordersSheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
    
    if (!ordersSheet) {
      return { success: false, error: '找不到訂單管理表' };
    }
    
    const existingData = ordersSheet.getDataRange().getValues();
    const headers = existingData[0];
    
    // 動態欄位索引（與 _getOrdersFromMainSheet 保持一致）
    const colIdx = {
      syncTime: _findColIndex(headers, ['同步時間', 'Sync_Time']),
      orderNo: _findColIndex(headers, ['訂單編號', 'Order_No', 'ES_Order_No']),
      orderIdES: _findColIndex(headers, ['訂單ID', 'ES_Order_ID']),
      customerName: _findColIndex(headers, ['客戶姓名', 'Customer_Name']),
      customerEmail: _findColIndex(headers, ['客戶Email', 'Customer_Email', 'Email']),
      customerPhone: _findColIndex(headers, ['客戶電話', 'Phone']),
      lineUserId: _findColIndex(headers, ['LINE_User_ID']),
      orderStatus: _findColIndex(headers, ['訂單狀態', 'Order_Status']),
      productInfo: _findColIndex(headers, ['商品資訊JSON', 'Products_JSON', '商品資訊']),
      totalAmount: _findColIndex(headers, ['訂單金額', 'Total_Amount']),
      orderDate: _findColIndex(headers, ['下單時間', 'Order_Date', '訂單日期'])
    };
    
    console.log('📋 欄位索引:', JSON.stringify(colIdx));
    
    // 取得已同步的訂單編號
    const orderNoCol = colIdx.orderNo >= 0 ? colIdx.orderNo : 0;
    const existingOrderNumbers = new Set(existingData.slice(1).map(row => String(row[orderNoCol])));
    
    // 篩選新訂單
    let syncedCount = 0;
    const newOrders = orders.filter(order => {
      const orderNumber = String(order.number || order.order_number);
      return !existingOrderNumbers.has(orderNumber);
    });
    
    console.log(`🆕 新訂單: ${newOrders.length} 筆`);
    
    // 準備新行
    const colCount = headers.length;
    
    for (const order of newOrders) {
      try {
        const orderNumber = String(order.number || order.order_number);
        const customerEmail = order.email || '';
        const customerName = order.customer?.first_name 
          ? `${order.customer.first_name} ${order.customer.last_name || ''}`.trim()
          : (order.shipping_address?.name || customerEmail);
        const customerPhone = order.shipping_address?.phone || order.phone || '';
        
        const orderDate = order.created_at ? new Date(order.created_at) : new Date();
        const totalAmount = order.total || '0';
        const orderStatus = order.fulfillment_status || 'unfulfilled';
        
        // 商品資訊 JSON
        const items = order.items || [];
        const productInfoJSON = JSON.stringify(items.map(item => ({
          name: item.name || '商品',
          sku: item.sku || '',
          price: item.price,
          quantity: item.quantity || 1,
          product_id: item.product_id
        })));
        
        // 建立新行（使用動態欄位）
        const newRow = new Array(colCount).fill('');
        
        if (colIdx.syncTime >= 0) newRow[colIdx.syncTime] = new Date();
        if (colIdx.orderNo >= 0) newRow[colIdx.orderNo] = orderNumber;
        if (colIdx.orderIdES >= 0) newRow[colIdx.orderIdES] = order.id || '';
        if (colIdx.customerName >= 0) newRow[colIdx.customerName] = customerName;
        if (colIdx.customerEmail >= 0) newRow[colIdx.customerEmail] = customerEmail;
        if (colIdx.customerPhone >= 0) newRow[colIdx.customerPhone] = customerPhone;
        if (colIdx.lineUserId >= 0) newRow[colIdx.lineUserId] = '';  // 待綁定
        if (colIdx.orderStatus >= 0) newRow[colIdx.orderStatus] = orderStatus;
        if (colIdx.productInfo >= 0) newRow[colIdx.productInfo] = productInfoJSON;
        if (colIdx.totalAmount >= 0) newRow[colIdx.totalAmount] = totalAmount;
        if (colIdx.orderDate >= 0) newRow[colIdx.orderDate] = orderDate;
        
        ordersSheet.appendRow(newRow);
        syncedCount++;
        console.log(`✅ 同步訂單: #${orderNumber}`);
        
      } catch (orderError) {
        console.error(`❌ 同步訂單失敗:`, orderError);
      }
    }
    
    console.log(`📊 同步完成: ${syncedCount} 筆`);
    
    return {
      success: true,
      message: `同步完成，新增 ${syncedCount} 筆訂單`,
      syncedCount: syncedCount,
      totalFetched: orders.length,
      operator: operator
    };
    
  } catch (error) {
    console.error('❌ syncEasyStoreOrders 錯誤:', error);
    return { success: false, error: error.toString() };
  }
}

// ==========================================
// 通知發送 API
// ==========================================

function sendOOSNotificationFromBackend(item) {
  try {
    if (!item || !item.lineUserId) {
      return { success: false, error: '缺少 LINE User ID' };
    }
    
    const message = {
      to: item.lineUserId,
      messages: [{
        type: 'text',
        text: `⚠️ 缺貨通知\n\n親愛的顧客您好，\n\n您訂購的商品「${item.productName}」目前缺貨中。\n\n我們會盡快為您處理。\n\n訂單編號：${item.esOrderNo}`
      }]
    };
    
    const result = _sendLineMessage(message);
    if (result.success) {
      markNotificationSent(item.queueId, 'OOS');
    }
    return result;
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function sendShippingNotificationFromBackend(item) {
  try {
    if (!item || !item.lineUserId) {
      return { success: false, error: '缺少 LINE User ID' };
    }
    
    const trackingInfo = item.trackingJPtoTW ? `\n追蹤號碼：${item.trackingJPtoTW}` : '';
    const message = {
      to: item.lineUserId,
      messages: [{
        type: 'text',
        text: `📦 物流通知\n\n親愛的顧客您好，\n\n您訂購的商品「${item.productName}」已從日本寄出！\n\n箱號：${item.boxId}${trackingInfo}\n訂單編號：${item.esOrderNo}`
      }]
    };
    
    const result = _sendLineMessage(message);
    if (result.success) {
      markNotificationSent(item.queueId, 'SHIPPING');
    }
    return result;
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function markNotificationSent(queueId, notifyType) {
  try {
    const ss = SpreadsheetApp.openById(TOWER_SS_ID);
    const sheet = ss.getSheetByName('Queue');
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][Q_COLS.QUEUE_ID]) === String(queueId)) {
        const rowIndex = i + 1;
        sheet.getRange(rowIndex, Q_COLS.NOTIFY_PUSHED_FLAG + 1).setValue(true);
        sheet.getRange(rowIndex, Q_COLS.NOTIFY_STATUS + 1).setValue('已通知');
        sheet.getRange(rowIndex, 34).setValue(new Date());
        return { success: true };
      }
    }
    return { success: false, error: '找不到 Queue ID' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function _sendLineMessage(message) {
  try {
    const url = 'https://api.line.me/v2/bot/message/push';
    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + LINE_CONFIG.CHANNEL_ACCESS_TOKEN
      },
      payload: JSON.stringify(message),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    return response.getResponseCode() === 200 
      ? { success: true }
      : { success: false, error: 'LINE API 錯誤: ' + response.getResponseCode() };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ==========================================
// 內部函數：讀取訂單管理表
// ==========================================

function _getOrdersFromMainSheet() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
    
    if (!sheet || sheet.getLastRow() <= 1) {
      console.log('⚠️ 訂單管理表為空');
      return {};
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // 動態欄位索引
    const colIdx = {
      syncTime: _findColIndex(headers, ['同步時間', 'Sync_Time']),
      orderNo: _findColIndex(headers, ['訂單編號', 'Order_No', 'ES_Order_No']),
      customerName: _findColIndex(headers, ['客戶姓名', 'Customer_Name']),
      customerEmail: _findColIndex(headers, ['客戶Email', 'Customer_Email']),
      lineUserId: _findColIndex(headers, ['LINE_User_ID']),
      orderStatus: _findColIndex(headers, ['訂單狀態', 'Order_Status']),
      totalAmount: _findColIndex(headers, ['訂單金額', 'Total_Amount']),
      orderDate: _findColIndex(headers, ['下單時間', 'Order_Date'])
    };
    
    const ordersMap = {};
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const orderNo = String(row[colIdx.orderNo] || '').trim();
      if (!orderNo) continue;
      
      ordersMap[orderNo] = {
        syncTime: row[colIdx.syncTime] || '',
        orderNo: orderNo,
        customerName: row[colIdx.customerName] || '',
        customerEmail: row[colIdx.customerEmail] || '',
        lineUserId: row[colIdx.lineUserId] || '',
        orderStatus: row[colIdx.orderStatus] || '',
        totalAmount: row[colIdx.totalAmount] || 0,
        orderDate: row[colIdx.orderDate] || ''
      };
    }
    
    return ordersMap;
  } catch (error) {
    console.error('❌ 讀取訂單管理表失敗:', error);
    return {};
  }
}

function _findColIndex(headers, possibleNames) {
  for (const name of possibleNames) {
    const idx = headers.indexOf(name);
    if (idx >= 0) return idx;
  }
  return -1;
}

/**
 * 將日期轉為字串格式（避免 Date 物件序列化問題）
 */
function _formatDateString(date) {
  if (!date) return '';
  try {
    if (date instanceof Date) {
      return Utilities.formatDate(date, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
    }
    if (typeof date === 'string') return date;
    return String(date);
  } catch (e) {
    return '';
  }
}

// ==========================================
// 內部函數：讀取 Queue 表
// ==========================================

function _getQueueData() {
  try {
    const ss = SpreadsheetApp.openById(TOWER_SS_ID);
    const sheet = ss.getSheetByName('Queue');
    
    if (!sheet || sheet.getLastRow() <= 1) return [];
    
    const data = sheet.getDataRange().getValues();
    
    return data.slice(1).map((row, index) => ({
      rowIndex: index + 2,
      queueId: String(row[Q_COLS.QUEUE_ID] || ''),
      esOrderNo: String(row[Q_COLS.ES_ORDER_NO] || ''),
      productName: row[Q_COLS.PRODUCT_NAME] || '',
      sku: row[Q_COLS.SKU] || '',
      color: row[Q_COLS.COLOR] || '',
      size: row[Q_COLS.SIZE] || '',
      qtyOrdered: row[Q_COLS.QTY_ORDERED] || 0,
      purchaseStatus: row[Q_COLS.PURCHASE_STATUS] || '',
      boxId: row[Q_COLS.BOX_ID] || '',
      trackingJPtoTW: row[Q_COLS.TRACKING_JP_TO_TW] || '',
      notifyPushed: row[Q_COLS.NOTIFY_PUSHED_FLAG] === true || row[Q_COLS.NOTIFY_PUSHED_FLAG] === 'TRUE',
      notifyStatus: row[Q_COLS.NOTIFY_STATUS] || '',
      notifyNote: row[Q_COLS.NOTIFY_NOTE] || '',
      purchaseNote: row[Q_COLS.PURCHASE_NOTE] || ''  // 採購備註（包含購買日期）
    })).filter(item => item.esOrderNo);
  } catch (error) {
    console.error('❌ 讀取 Queue 失敗:', error);
    return [];
  }
}

/**
 * 讀取 Packing_Boxes 表，取得箱號和入箱日期資訊
 */
function _getPackingBoxesMap() {
  try {
    const ss = SpreadsheetApp.openById(TOWER_SS_ID);
    const sheet = ss.getSheetByName('Packing_Boxes');
    
    if (!sheet || sheet.getLastRow() <= 1) return {};
    
    const data = sheet.getDataRange().getValues();
    const map = {};
    
    for (let i = 1; i < data.length; i++) {
      const boxId = String(data[i][BOX_COLS.BOX_ID] || '').trim();
      if (boxId) {
        map[boxId] = {
          boxNumber: data[i][BOX_COLS.BOX_NUMBER] || '',
          packedAt: _formatDateString(data[i][BOX_COLS.PACKED_AT])
        };
      }
    }
    
    return map;
  } catch (error) {
    console.error('❌ 讀取 Packing_Boxes 失敗:', error);
    return {};
  }
}

// ==========================================
// 內部函數：讀取 OrderLineUserMap
// ==========================================

function _getOrderLineUserMap() {
  try {
    const ss = SpreadsheetApp.openById(TOWER_SS_ID);
    const sheet = ss.getSheetByName('OrderLineUserMap');
    
    if (!sheet || sheet.getLastRow() <= 1) return {};
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const colIdx = {
      esOrderNo: Math.max(0, headers.indexOf('ES_Order_No')),
      lineUserId: Math.max(1, headers.indexOf('LINE_User_ID')),
      customerName: Math.max(2, headers.indexOf('Customer_Name')),
      lineDisplayName: Math.max(3, headers.indexOf('LINE_Display_Name')),
      email: Math.max(4, headers.indexOf('Email'))
    };
    
    const map = {};
    for (let i = 1; i < data.length; i++) {
      const orderNo = String(data[i][colIdx.esOrderNo] || '');
      if (orderNo) {
        map[orderNo] = {
          esOrderNo: orderNo,
          lineUserId: data[i][colIdx.lineUserId] || '',
          customerName: data[i][colIdx.customerName] || '',
          lineDisplayName: data[i][colIdx.lineDisplayName] || '',
          email: data[i][colIdx.email] || ''
        };
      }
    }
    return map;
  } catch (error) {
    console.error('❌ 讀取 OrderLineUserMap 失敗:', error);
    return {};
  }
}

/**
 * 從 SPREADSHEET_ID 的「會員綁定記錄」表讀取會員資料
 * 欄位：A綁定時間、B LINE User ID、C會員Email、D會員姓名、E綁定狀態、F最後驗證時間、G訂單總數、H備註
 */
function _getOrderLineUserMapArray() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('會員綁定記錄');
    
    if (!sheet) {
      console.error('❌ 找不到「會員綁定記錄」表');
      return [];
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      console.log('📋 會員綁定記錄表為空');
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    console.log(`📋 會員綁定記錄表: ${data.length - 1} 筆`);
    
    // 欄位索引（根據截圖的表結構）
    const COL = {
      BIND_TIME: 0,        // A 綁定時間
      LINE_USER_ID: 1,     // B LINE User ID
      EMAIL: 2,            // C 會員Email
      CUSTOMER_NAME: 3,    // D 會員姓名
      BIND_STATUS: 4,      // E 綁定狀態
      LAST_VERIFY: 5,      // F 最後驗證時間
      ORDER_COUNT: 6,      // G 訂單總數
      NOTE: 7              // H 備註
    };
    
    const result = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const lineUserId = String(row[COL.LINE_USER_ID] || '').trim();
      
      // 至少要有 LINE User ID
      if (lineUserId) {
        result.push({
          lineUserId: lineUserId,
          email: row[COL.EMAIL] || '',
          customerName: row[COL.CUSTOMER_NAME] || '',
          lineDisplayName: row[COL.CUSTOMER_NAME] || '',  // 暫用客戶姓名
          bindTime: _formatDateString(row[COL.BIND_TIME]),
          bindStatus: row[COL.BIND_STATUS] || '',
          lastVerify: _formatDateString(row[COL.LAST_VERIFY]),
          orderCount: row[COL.ORDER_COUNT] || 0,
          note: row[COL.NOTE] || ''
        });
      }
    }
    
    // 遞減排序（最新在前）
    result.reverse();
    return result;
  } catch (error) {
    console.error('❌ 讀取會員綁定記錄失敗:', error);
    return [];
  }
}

// ==========================================
// 狀態判定函數
// ==========================================

function _determineOrderStatus(queueItems) {
  if (!queueItems || queueItems.length === 0) {
    return { label: '⏳ 處理中', color: '#6c757d' };
  }
  
  // 取得所有商品的採購狀態
  const statuses = queueItems.map(i => (i.purchaseStatus || '').trim());
  
  // 已出貨給客人
  if (statuses.every(s => s === '已出貨給客人')) {
    return { label: '🚚 已出貨', color: '#28a745' };
  }
  
  // 有缺貨
  if (statuses.some(s => s === '缺貨' || s === 'OOS')) {
    return { label: '⚠️ 部分缺貨', color: '#e17055' };
  }
  
  // 已寄回台灣相關狀態
  const twShippedStatuses = ['已寄出回台灣', '已到台灣', '已出貨給客人'];
  if (statuses.every(s => twShippedStatuses.includes(s))) {
    return { label: '✈️ 已寄回台灣', color: '#00b894' };
  }
  
  // 已入箱
  if (queueItems.every(i => i.boxId && i.boxId !== '')) {
    return { label: '📦 已入箱', color: '#00b894' };
  }
  
  // 已到日本 / 集貨中
  const inJapanStatuses = ['已到日本', '集貨中'];
  if (statuses.every(s => inJapanStatuses.includes(s))) {
    return { label: '📍 已到日本', color: '#00b894' };
  }
  
  // 供應商已出貨
  if (statuses.every(s => s === '供應商已出貨')) {
    return { label: '🚛 供應商已出貨', color: '#74b9ff' };
  }
  
  // 🔴 已購買 / 己購（注意：可能有不同寫法）
  const purchasedStatuses = ['已購買', '己購', '已購', '已訂購', 'Purchased'];
  if (statuses.every(s => purchasedStatuses.includes(s))) {
    return { label: '✅ 已購買', color: '#17a2b8' };
  }
  
  // 部分已購買
  if (statuses.some(s => purchasedStatuses.includes(s))) {
    return { label: '🛒 部分已購', color: '#74b9ff' };
  }
  
  // 預購
  if (statuses.some(s => s === '預購' || s === 'Pre-order')) {
    return { label: '🕐 預購中', color: '#ffc107' };
  }
  
  // 待購買
  if (statuses.some(s => s === '待購買' || s === '' || s === 'Pending')) {
    return { label: '🛒 待購買', color: '#6c757d' };
  }
  
  // 預設：顯示第一個商品的狀態
  const firstStatus = statuses[0] || '處理中';
  return { label: `📋 ${firstStatus}`, color: '#6c757d' };
}

// ==========================================
// 會員驗證與綁定 API（EasyStore 連接）
// ==========================================

/**
 * 驗證會員（透過 EasyStore API 查詢）
 * 只有在 EasyStore 有訂單的用戶才算有效會員
 * @param {Object} params - { email }
 */
function verifyMember(params) {
  try {
    const email = (params.email || '').toLowerCase().trim();
    
    if (!email) {
      return { success: false, error: '缺少 email 參數', isLoggedIn: false };
    }
    
    console.log('🔍 驗證會員:', email);
    
    // 透過 EasyStore Orders API 查找是否有此 Email 的訂單
    const customerResult = searchCustomerByEmail(email);
    
    if (customerResult.success && customerResult.customer) {
      console.log('✅ 會員驗證成功:', email);
      return {
        success: true,
        isLoggedIn: true,
        memberData: customerResult.customer,
        message: '會員驗證成功'
      };
    } else {
      console.log('❌ 找不到會員:', email);
      return {
        success: false,
        isLoggedIn: false,
        error: customerResult.error || '找不到會員資料，請確認您已在 Take Me Japan 官網註冊並完成首次購物'
      };
    }
    
  } catch (error) {
    console.error('❌ verifyMember 錯誤:', error);
    return { success: false, error: error.toString(), isLoggedIn: false };
  }
}

/**
 * 透過 Email 搜尋 EasyStore 客戶
 * 使用訂單 API 間接查找客戶（因為沒有直接客戶搜尋 API）
 * @param {string} email - 用戶 Email
 */
function searchCustomerByEmail(email) {
  try {
    console.log(`🔍 透過訂單搜尋客戶: ${email}`);
    
    // 透過訂單查找客戶
    const url = `${EASYSTORE_CONFIG.BASE_API}/orders.json?limit=50&email=${encodeURIComponent(email)}`;
    console.log('🔗 訂單查詢 URL:', url);
    
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: EASYSTORE_CONFIG.HEADERS,
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    console.log('📡 訂單查詢狀態碼:', responseCode);
    
    if (responseCode === 200) {
      const result = JSON.parse(response.getContentText());
      
      if (result.orders && result.orders.length > 0) {
        // 從訂單中取得客戶資訊
        const order = result.orders[0];
        
        if (order.customer_id && order.email.toLowerCase() === email.toLowerCase()) {
          // 嘗試取得完整的客戶資訊
          const customerUrl = `${EASYSTORE_CONFIG.BASE_API}/customers/${order.customer_id}.json`;
          console.log('🔗 客戶詳情 URL:', customerUrl);
          
          const customerResponse = UrlFetchApp.fetch(customerUrl, {
            method: 'GET',
            headers: EASYSTORE_CONFIG.HEADERS,
            muteHttpExceptions: true
          });
          
          if (customerResponse.getResponseCode() === 200) {
            const customerResult = JSON.parse(customerResponse.getContentText());
            
            if (customerResult.customer) {
              const customer = customerResult.customer;
              console.log('✅ 找到完整客戶資料:', customer.email);
              
              return {
                success: true,
                customer: {
                  id: customer.id,
                  email: customer.email || email,
                  firstName: customer.first_name || '',
                  lastName: customer.last_name || '',
                  name: customer.name || 
                        ((customer.first_name || '') + ' ' + (customer.last_name || '')).trim() || 
                        email,
                  phone: customer.phone || '',
                  totalSpent: customer.total_spent || '0.0',
                  orderCount: customer.order_count || result.orders.length
                }
              };
            }
          }
          
          // 如果無法取得客戶詳情，使用訂單中的基本資訊
          return {
            success: true,
            customer: {
              id: order.customer_id,
              email: order.email,
              name: order.shipping_address?.name || order.email,
              orderCount: result.orders.length
            }
          };
        }
      }
      
      console.log('❌ 找不到此 Email 的訂單記錄');
      return { success: false, error: '找不到會員資料，請確認 Email 是否正確' };
    }
    
    console.error('❌ EasyStore API 錯誤:', responseCode);
    return { success: false, error: `EasyStore API 錯誤: ${responseCode}` };
    
  } catch (error) {
    console.error('❌ searchCustomerByEmail 錯誤:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 儲存會員綁定記錄
 * @param {string} lineUserId - LINE User ID
 * @param {Object} memberData - 會員資料
 */
function saveMemberBinding(lineUserId, memberData) {
  try {
    console.log(`🔗 儲存會員綁定: ${lineUserId} -> ${memberData.email}`);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let bindingSheet = ss.getSheetByName('會員綁定記錄');
    
    // 如果表不存在，建立一個
    if (!bindingSheet) {
      console.log('建立會員綁定記錄表');
      bindingSheet = ss.insertSheet('會員綁定記錄');
      
      const headers = [
        '綁定時間', 'LINE User ID', '會員Email', '會員姓名',
        '綁定狀態', '最後驗證時間', '訂單總數', '備註'
      ];
      
      bindingSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // 設定標題樣式
      const headerRange = bindingSheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#C9915D');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
    }
    
    // 檢查是否已存在相同 LINE User ID 的綁定
    const data = bindingSheet.getDataRange().getValues();
    let existingRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === lineUserId) {
        existingRow = i + 1;  // 轉換為 1-based
        break;
      }
    }
    
    const now = new Date();
    const rowData = [
      now,                                    // A: 綁定時間
      lineUserId,                             // B: LINE User ID
      memberData.email || '',                 // C: 會員Email
      memberData.name || memberData.email,    // D: 會員姓名
      'active',                               // E: 綁定狀態
      now,                                    // F: 最後驗證時間
      memberData.orderCount || 0,             // G: 訂單總數
      '系統自動綁定'                           // H: 備註
    ];
    
    if (existingRow > 0) {
      // 更新現有綁定
      console.log(`🔄 更新現有綁定 (第 ${existingRow} 列)`);
      bindingSheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      // 新增綁定
      console.log('🆕 新增會員綁定');
      bindingSheet.appendRow(rowData);
    }
    
    // 同時更新訂單管理表中的 LINE_User_ID
    updateOrdersWithLineUserId(memberData.email, lineUserId);
    
    return {
      success: true,
      message: existingRow > 0 ? '會員綁定已更新' : '會員綁定成功',
      isUpdate: existingRow > 0
    };
    
  } catch (error) {
    console.error('❌ saveMemberBinding 錯誤:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 更新訂單表中的 LINE User ID
 * @param {string} email - 會員 Email
 * @param {string} lineUserId - LINE User ID
 */
function updateOrdersWithLineUserId(email, lineUserId) {
  try {
    console.log(`🔄 更新訂單 LINE User ID: ${email}`);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const ordersSheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
    
    if (!ordersSheet) return { success: false, error: '找不到訂單表' };
    
    const data = ordersSheet.getDataRange().getValues();
    const headers = data[0];
    
    // 找到 Email 和 LINE_User_ID 欄位索引
    const emailIndex = headers.indexOf('客戶Email');
    const lineUserIdIndex = headers.indexOf('LINE_User_ID');
    
    if (emailIndex === -1 || lineUserIdIndex === -1) {
      console.log('⚠️ 找不到必要欄位');
      return { success: false, error: '欄位不存在' };
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    let updatedCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      const rowEmail = (data[i][emailIndex] || '').toLowerCase().trim();
      const currentLineUserId = data[i][lineUserIdIndex] || '';
      
      if (rowEmail === normalizedEmail && !currentLineUserId) {
        ordersSheet.getRange(i + 1, lineUserIdIndex + 1).setValue(lineUserId);
        updatedCount++;
      }
    }
    
    console.log(`✅ 更新了 ${updatedCount} 筆訂單`);
    return { success: true, updatedCount: updatedCount };
    
  } catch (error) {
    console.error('❌ updateOrdersWithLineUserId 錯誤:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 檢查會員綁定狀態
 * @param {string} lineUserId - LINE User ID
 */
function checkMemberBinding(lineUserId) {
  try {
    console.log(`🔍 檢查會員綁定: ${lineUserId}`);
    
    if (!lineUserId) {
      return { success: false, isBound: false, error: '缺少 LINE User ID' };
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const bindingSheet = ss.getSheetByName('會員綁定記錄');
    
    if (!bindingSheet || bindingSheet.getLastRow() <= 1) {
      return { success: true, isBound: false, message: '尚未綁定會員帳號' };
    }
    
    const data = bindingSheet.getDataRange().getValues();
    
    // 欄位索引
    // A: 綁定時間, B: LINE User ID, C: 會員Email, D: 會員姓名, E: 綁定狀態
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === lineUserId) {
        const bindingStatus = data[i][4] || '';
        
        if (bindingStatus === 'active') {
          console.log('✅ 找到會員綁定:', data[i][2]);
          return {
            success: true,
            isBound: true,
            email: data[i][2],
            name: data[i][3],
            bindingTime: data[i][0],
            lastVerify: data[i][5]
          };
        }
      }
    }
    
    console.log('❌ 未找到會員綁定');
    return {
      success: true,
      isBound: false,
      message: '尚未綁定會員帳號'
    };
    
  } catch (error) {
    console.error('❌ checkMemberBinding 錯誤:', error);
    return { success: false, isBound: false, error: error.toString() };
  }
}

/**
 * 測試 EasyStore API 連接（診斷用）
 * 在 GAS 中直接執行來測試 API 是否正常
 */
function testEasyStoreAPI() {
  try {
    console.log('========================================');
    console.log('🧪 測試 EasyStore API 連接');
    console.log('========================================');
    
    const url = `${EASYSTORE_CONFIG.BASE_API}/orders.json?limit=1`;
    console.log('🔗 測試 URL:', url);
    
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: EASYSTORE_CONFIG.HEADERS,
      muteHttpExceptions: true
    });
    
    const code = response.getResponseCode();
    console.log('📡 回應碼:', code);
    
    if (code === 200) {
      const result = JSON.parse(response.getContentText());
      console.log('✅ API 連接成功！');
      console.log('📦 訂單數量:', result.orders?.length || 0);
      return { success: true, message: 'EasyStore API 連接正常' };
    } else {
      console.log('❌ API 錯誤:', response.getContentText());
      return { success: false, error: `API 回應 ${code}` };
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 測試會員驗證（診斷用）
 * @param {string} testEmail - 測試用 Email
 */
function testVerifyMember(testEmail) {
  testEmail = testEmail || 'eddc9104@gmail.com';
  console.log('========================================');
  console.log('🧪 測試會員驗證:', testEmail);
  console.log('========================================');
  
  const result = verifyMember({ email: testEmail });
  console.log('📋 驗證結果:', JSON.stringify(result, null, 2));
  return result;
}
