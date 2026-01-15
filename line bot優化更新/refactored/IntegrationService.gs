// ==========================================
// IntegrationService.gs - 統一資料整合服務
// 版本：v1.0
// 說明：整合訂單管理表與 Queue 表的資料
// ==========================================

/**
 * 資料整合服務模組
 * 
 * 系統架構：
 * - 訂單管理表（LINE Bot 主表）：訂單基本資訊（訂單編號、日期、金額、客戶Email、LINE_User_ID）
 * - Queue 表（Tower）：商品詳細資訊（商品名稱、SKU、規格、採購狀態、Box_ID）
 * - Packing_Boxes 表（Tower）：物流資訊（裝箱日期、揀貨日期）
 * 
 * 此服務負責：
 * 1. 根據 LINE_User_ID 查詢訂單，並自動整合 Queue 表的商品資訊
 * 2. 提供統一的資料存取介面給 OrderService 和 TrackingService
 */
const IntegrationService = {
  
  // ==========================================
  // 公開方法
  // ==========================================
  
  /**
   * 根據 LINE_User_ID 查詢完整訂單（含商品明細）
   * 這是主要的訂單查詢入口
   * @param {string} lineUserId - LINE User ID
   * @returns {Object} - { success, orders: [{...訂單基本資料, products: [...]}] }
   */
  getOrdersByLineUserId: function(lineUserId) {
    try {
      console.log('════════════════════════════════════════');
      console.log('📦 IntegrationService: 查詢完整訂單');
      console.log('👤 LINE User ID:', lineUserId);
      console.log('════════════════════════════════════════');
      
      // 1. 從訂單管理表取得該 LINE_User_ID 的訂單基本資料
      const ordersResult = this._getOrdersFromOrderSheet(lineUserId);
      
      if (!ordersResult.success || ordersResult.orders.length === 0) {
        console.log('⚠️ 在訂單管理表中找不到訂單');
        return { success: true, orders: [], message: '無訂單記錄' };
      }
      
      console.log(`📋 找到 ${ordersResult.orders.length} 筆訂單基本資料`);
      
      // 2. 從 Queue 表取得所有相關訂單的商品資料
      const orderNumbers = ordersResult.orders.map(o => o.orderNumber);
      const queueMap = this._getQueueDataByOrderNumbers(orderNumbers);
      
      console.log(`📊 找到 ${Object.keys(queueMap).length} 個訂單的 Queue 資料`);
      
      // 3. 從 Packing_Boxes 表取得物流資訊
      const packingMap = this._getPackingBoxesMap();
      
      // 4. 整合資料
      const enrichedOrders = ordersResult.orders.map(order => {
        // 取得該訂單的商品資料
        let products = queueMap[order.orderNumber] || [];
        
        // 如果 Queue 沒有資料，嘗試使用訂單管理表的 products
        if (products.length === 0 && order.products && order.products.length > 0) {
          products = order.products.map(p => ({
            productName: p.name || p.product_title || '商品',
            sku: p.sku || '',
            color: '',
            size: p.variant_title || '',
            qtyOrdered: p.quantity || 1,
            purchaseStatus: p.status || '處理中',
            boxId: '',
            boxNumber: '',
            packedAt: '',
            pickedAt: ''
          }));
        }
        
        // 豐富每個商品的物流資訊
        products = products.map(item => {
          const boxInfo = packingMap[item.boxId] || {};
          return {
            ...item,
            boxNumber: boxInfo.boxNumber || item.boxNumber || '',
            packedAt: boxInfo.packedAt || item.packedAt || '',
            pickedAt: boxInfo.pickedAt || item.pickedAt || ''
          };
        });
        
        // 計算整體訂單狀態
        const overallStatus = this._determineOrderStatus(products);
        
        return {
          ...order,
          products: products,
          queueItems: products,  // 保持向下相容
          overallStatus: overallStatus
        };
      });
      
      console.log('✅ 訂單資料整合完成');
      
      return {
        success: true,
        orders: enrichedOrders,
        totalCount: enrichedOrders.length
      };
      
    } catch (error) {
      console.error('❌ IntegrationService 查詢失敗:', error);
      return { success: false, orders: [], error: error.toString() };
    }
  },
  
  /**
   * 根據訂單編號查詢 Queue 商品資料
   * @param {string|Array} orderNumbers - 訂單編號或訂單編號陣列
   * @returns {Object} - { success, items: [...] }
   */
  getQueueItemsByOrderNumber: function(orderNumbers) {
    try {
      const numbers = Array.isArray(orderNumbers) ? orderNumbers : [orderNumbers];
      const queueMap = this._getQueueDataByOrderNumbers(numbers);
      
      const items = [];
      numbers.forEach(orderNo => {
        const orderItems = queueMap[orderNo] || [];
        items.push(...orderItems);
      });
      
      return {
        success: true,
        items: items,
        totalCount: items.length
      };
      
    } catch (error) {
      console.error('❌ 查詢 Queue 失敗:', error);
      return { success: false, items: [], error: error.toString() };
    }
  },
  
  /**
   * 根據 LINE_User_ID 查詢物流資訊
   * 🔴 v4.1 更新：新增 allItems 返回全部商品資料（用於判斷全部/部分寄出）
   * @param {string} lineUserId - LINE User ID
   * @returns {Object} - { success, shipments: [...], allItems: [...] }
   */
  getShipmentsByLineUserId: function(lineUserId) {
    try {
      console.log('════════════════════════════════════════');
      console.log('🚚 IntegrationService: 查詢物流');
      console.log('👤 LINE User ID:', lineUserId);
      console.log('════════════════════════════════════════');
      
      // 1. 取得該用戶的所有訂單編號
      const orderNumbers = this._getOrderNumbersByLineUserId(lineUserId);
      
      if (orderNumbers.length === 0) {
        return { success: true, shipments: [], allItems: [], message: '無訂單記錄' };
      }
      
      // 2. 從 Queue 表取得商品資料
      const queueMap = this._getQueueDataByOrderNumbers(orderNumbers);
      
      // 3. 從 Packing_Boxes 表取得物流資訊
      const packingMap = this._getPackingBoxesMap();
      
      // 4. 收集所有商品和已寄出商品
      const shipments = [];
      const allItems = [];  // 🆕 全部商品
      
      Object.keys(queueMap).forEach(orderNo => {
        queueMap[orderNo].forEach(item => {
          // 🆕 加入全部商品列表
          allItems.push({
            orderNumber: orderNo,
            productName: item.productName,
            boxId: item.boxId || '',
            purchaseStatus: item.purchaseStatus || ''
          });
          
          // 篩選已有 Box_ID 的商品（已裝箱 = 已寄出）
          if (item.boxId && item.boxId.toString().trim() !== '') {
            const boxInfo = packingMap[item.boxId] || {};
            
            // 判斷物流狀態
            let statusEmoji, statusMessage, statusDate;
            
            if (boxInfo.pickedAt) {
              statusEmoji = '✈️';
              statusMessage = '已抵達台灣集貨倉';
              statusDate = boxInfo.pickedAt;
            } else if (boxInfo.packedAt) {
              statusEmoji = '📦';
              statusMessage = '已寄出回台灣集貨倉';
              statusDate = boxInfo.packedAt;
            } else {
              statusEmoji = '⏳';
              statusMessage = '處理中';
              statusDate = '';
            }
            
            shipments.push({
              orderNumber: orderNo,
              productName: item.productName,
              sku: item.sku,
              color: item.color,
              size: item.size,
              boxId: item.boxId,
              boxNumber: boxInfo.boxNumber || '',
              packedAt: boxInfo.packedAt || '',
              pickedAt: boxInfo.pickedAt || '',
              statusEmoji: statusEmoji,
              statusMessage: statusMessage,
              statusDate: statusDate,
              trackingNumber: item.trackingJPtoTW || '',
              trackingUrl: this._getTrackingUrl(item.trackingJPtoTW)
            });
          }
        });
      });
      
      console.log(`✅ 找到 ${shipments.length} 筆已寄出記錄（共 ${allItems.length} 件商品）`);
      
      return {
        success: true,
        shipments: shipments,
        allItems: allItems,  // 🆕 返回全部商品資料
        totalCount: shipments.length
      };
      
    } catch (error) {
      console.error('❌ IntegrationService 物流查詢失敗:', error);
      return { success: false, shipments: [], allItems: [], error: error.toString() };
    }
  },
  
  // ==========================================
  // 私有方法：資料來源
  // ==========================================
  
  /**
   * 從訂單管理表取得訂單基本資料
   * @param {string} lineUserId - LINE User ID
   * @returns {Object} - { success, orders: [...] }
   * @private
   */
  _getOrdersFromOrderSheet: function(lineUserId) {
    try {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = spreadsheet.getSheetByName(SHEET_NAMES.ORDERS);
      
      if (!sheet) {
        console.error('❌ 找不到訂單管理表');
        return { success: false, orders: [] };
      }
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      // 欄位索引
      const cols = {
        lineUserId: headers.indexOf('LINE_User_ID'),
        email: headers.indexOf('客戶Email'),
        orderNumber: headers.indexOf('訂單編號'),
        orderDate: headers.indexOf('下單時間'),
        customerName: headers.indexOf('客戶姓名'),
        totalAmount: headers.indexOf('訂單金額'),
        orderStatus: headers.indexOf('訂單狀態'),
        productInfo: headers.indexOf('商品資訊JSON')
      };
      
      if (cols.lineUserId === -1) {
        console.error('❌ 找不到 LINE_User_ID 欄位');
        return { success: false, orders: [] };
      }
      
      const orders = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowLineUserId = (row[cols.lineUserId] || '').toString().trim();
        
        if (rowLineUserId === lineUserId) {
          // 嘗試解析商品資訊
          let products = [];
          try {
            if (row[cols.productInfo]) {
              products = JSON.parse(row[cols.productInfo]);
            }
          } catch (e) {
            // 忽略解析錯誤
          }
          
          orders.push({
            orderNumber: row[cols.orderNumber] || '',
            orderDate: row[cols.orderDate] || '',
            customerName: row[cols.customerName] || '',
            customerEmail: row[cols.email] || '',
            totalAmount: row[cols.totalAmount] || 0,
            status: row[cols.orderStatus] || '',
            products: products
          });
        }
      }
      
      // 按日期倒序
      orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
      
      return { success: true, orders: orders };
      
    } catch (error) {
      console.error('❌ 讀取訂單管理表失敗:', error);
      return { success: false, orders: [], error: error.toString() };
    }
  },
  
  /**
   * 根據 LINE_User_ID 取得訂單編號列表
   * @param {string} lineUserId - LINE User ID
   * @returns {Array} - 訂單編號陣列
   * @private
   */
  _getOrderNumbersByLineUserId: function(lineUserId) {
    try {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = spreadsheet.getSheetByName(SHEET_NAMES.ORDERS);
      
      if (!sheet) return [];
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const lineUserIdIndex = headers.indexOf('LINE_User_ID');
      const orderNumberIndex = headers.indexOf('訂單編號');
      
      if (lineUserIdIndex === -1 || orderNumberIndex === -1) return [];
      
      const orderNumbers = [];
      for (let i = 1; i < data.length; i++) {
        const rowLineUserId = (data[i][lineUserIdIndex] || '').toString().trim();
        if (rowLineUserId === lineUserId) {
          const orderNo = data[i][orderNumberIndex];
          if (orderNo && !orderNumbers.includes(orderNo)) {
            orderNumbers.push(String(orderNo));
          }
        }
      }
      
      return orderNumbers;
      
    } catch (error) {
      console.error('❌ 取得訂單編號失敗:', error);
      return [];
    }
  },
  
  /**
   * 從 Queue 表取得指定訂單的商品資料
   * 🔴 注意：Queue 表的 ES_Order_No 有 "#" 前綴（如 #6298）
   *         但訂單管理表的訂單編號沒有（如 6298）
   *         因此比對時需要處理前綴問題
   * @param {Array} orderNumbers - 訂單編號陣列（不含 # 前綴）
   * @returns {Object} - { 訂單編號: [商品陣列] }（key 不含 # 前綴）
   * @private
   */
  _getQueueDataByOrderNumbers: function(orderNumbers) {
    try {
      const towerSS = SpreadsheetApp.openById(TOWER_SPREADSHEET_ID);
      const queueSheet = towerSS.getSheetByName('Queue');
      
      if (!queueSheet) {
        console.error('❌ 找不到 Queue 表');
        return {};
      }
      
      const data = queueSheet.getDataRange().getValues();
      const result = {};
      
      // 將訂單編號轉為字串（不含 #），統一格式以便比對
      const orderNumbersStr = orderNumbers.map(n => String(n).trim().replace(/^#/, ''));
      
      console.log('🔍 搜尋的訂單編號（已移除#）:', orderNumbersStr);
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        // Queue 表的訂單編號可能有 # 前綴，移除後比對
        const rawOrderNo = String(row[QUEUE_COLS.ES_ORDER_NO] || '').trim();
        const cleanOrderNo = rawOrderNo.replace(/^#/, '');  // 移除 # 前綴
        
        if (orderNumbersStr.includes(cleanOrderNo)) {
          // 使用無 # 前綴的訂單編號作為 key（與訂單管理表一致）
          if (!result[cleanOrderNo]) {
            result[cleanOrderNo] = [];
          }
          
          result[cleanOrderNo].push({
            productName: row[QUEUE_COLS.PRODUCT_NAME] || '',
            sku: row[QUEUE_COLS.SKU] || '',
            color: row[QUEUE_COLS.COLOR] || '',
            size: row[QUEUE_COLS.SIZE] || '',
            qtyOrdered: row[QUEUE_COLS.QTY_ORDERED] || 1,
            purchaseStatus: row[QUEUE_COLS.PURCHASE_STATUS] || '',
            boxId: row[QUEUE_COLS.BOX_ID] || '',
            trackingJPtoTW: row[QUEUE_COLS.TRACKING_JP_TO_TW] || '',
            preorderMonth: row[QUEUE_COLS.PREORDER_MONTH] || '',
            preorderPeriod: row[QUEUE_COLS.PREORDER_PERIOD] || ''
          });
        }
      }
      
      console.log('📊 Queue 比對結果:', Object.keys(result).length, '個訂單有商品資料');
      
      return result;
      
    } catch (error) {
      console.error('❌ 讀取 Queue 表失敗:', error);
      return {};
    }
  },
  
  /**
   * 讀取 Packing_Boxes 表
   * @returns {Object} - { boxId: { boxNumber, packedAt, pickedAt } }
   * @private
   */
  _getPackingBoxesMap: function() {
    try {
      const towerSS = SpreadsheetApp.openById(TOWER_SPREADSHEET_ID);
      const sheet = towerSS.getSheetByName('Packing_Boxes');
      
      if (!sheet || sheet.getLastRow() <= 1) return {};
      
      const data = sheet.getDataRange().getValues();
      const map = {};
      
      for (let i = 1; i < data.length; i++) {
        const boxId = String(data[i][PACKING_BOXES_COLS.BOX_ID] || '').trim();
        if (boxId) {
          map[boxId] = {
            boxNumber: data[i][PACKING_BOXES_COLS.BOX_NUMBER] || '',
            packedAt: this._formatDate(data[i][PACKING_BOXES_COLS.PACKED_AT]),
            pickedAt: this._formatDate(data[i][PACKING_BOXES_COLS.PICKED_AT])
          };
        }
      }
      
      return map;
      
    } catch (error) {
      console.error('❌ 讀取 Packing_Boxes 失敗:', error);
      return {};
    }
  },
  
  // ==========================================
  // 私有方法：工具函數
  // ==========================================
  
  /**
   * 判斷訂單整體狀態
   * @param {Array} products - 商品陣列
   * @returns {Object} - { status, label, emoji }
   * @private
   */
  _determineOrderStatus: function(products) {
    if (!products || products.length === 0) {
      return { status: 'processing', label: '處理中', emoji: '⏳' };
    }
    
    // 檢查是否有缺貨
    const hasOOS = products.some(p => 
      (p.purchaseStatus || '').includes('缺貨') || 
      (p.purchaseStatus || '').includes('OOS')
    );
    
    if (hasOOS) {
      return { status: 'oos', label: '部分缺貨', emoji: '⚠️' };
    }
    
    // 檢查是否全部已出貨
    const allShipped = products.every(p => p.pickedAt);
    if (allShipped) {
      return { status: 'arrived', label: '已抵達台灣', emoji: '✈️' };
    }
    
    // 檢查是否部分已寄出
    const someShipped = products.some(p => p.boxId);
    if (someShipped) {
      return { status: 'shipping', label: '運送中', emoji: '📦' };
    }
    
    // 預設：處理中
    return { status: 'processing', label: '處理中', emoji: '🛒' };
  },
  
  /**
   * 格式化日期
   * @param {Date|string} date - 日期
   * @returns {string}
   * @private
   */
  _formatDate: function(date) {
    if (!date) return '';
    try {
      const d = new Date(date);
      return Utilities.formatDate(d, 'Asia/Taipei', 'yyyy/MM/dd');
    } catch (e) {
      return date.toString();
    }
  },
  
  /**
   * 取得物流追蹤 URL
   * @param {string} trackingNumber - 追蹤號碼
   * @returns {string}
   * @private
   */
  _getTrackingUrl: function(trackingNumber) {
    if (!trackingNumber) return '';
    return `https://declogistics.com.tw/h/DataDetail?key=amqeg&cont=${trackingNumber}`;
  }
};

// ==========================================
// 測試函數
// ==========================================

/**
 * 測試 IntegrationService
 */
function testIntegrationService() {
  console.log('🧪 測試 IntegrationService');
  
  // 請替換為實際的 LINE User ID
  const testLineUserId = 'YOUR_LINE_USER_ID';
  
  // 測試訂單查詢
  const ordersResult = IntegrationService.getOrdersByLineUserId(testLineUserId);
  console.log('📦 訂單查詢結果:', JSON.stringify(ordersResult, null, 2));
  
  // 測試物流查詢
  const shipmentsResult = IntegrationService.getShipmentsByLineUserId(testLineUserId);
  console.log('🚚 物流查詢結果:', JSON.stringify(shipmentsResult, null, 2));
}
