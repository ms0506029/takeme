// ==========================================
// OrderService.gs - 訂單查詢服務模組
// 版本：v4.0 模組化架構
// 說明：處理訂單查詢，整合訂單管理表與 Queue 表的商品狀態
// ==========================================

/**
 * 訂單服務模組
 * 資料來源：
 * - 訂單基本資料：LINE Bot 主表的「訂單管理」工作表
 * - 商品狀態：Tower 的「Queue」表單
 * - 會員綁定：呼叫 LINE OA 後端 API
 */
const OrderService = {
  
  /**
 * 處理訂單查詢
 * @param {Object} event - LINE 事件
 */
handleOrderQuery: function(event) {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  
  console.log('════════════════════════════════════════');
  console.log('📦 開始處理訂單查詢');
  console.log('👤 LINE User ID:', userId);
  console.log('🎫 Reply Token:', replyToken);
  console.log('════════════════════════════════════════');
  
  try {
    // 第一步：發送處理中訊息
    console.log('📤 Step 1: 發送處理中訊息...');
    LineService.sendProcessing(replyToken, 'orders');
    console.log('✅ Step 1 完成');
    
    // 第二步：使用 IntegrationService 查詢完整訂單（含商品明細）
    console.log('📤 Step 2: 查詢訂單資料...');
    const ordersResult = IntegrationService.getOrdersByLineUserId(userId);
    console.log('📋 查詢結果:', JSON.stringify(ordersResult).substring(0, 500));
    
    if (!ordersResult.success) {
      console.error('❌ Step 2 失敗: IntegrationService 返回錯誤');
      console.error('錯誤訊息:', ordersResult.error);
      LineService.sendErrorPush(userId, '查詢訂單時發生錯誤，請稍後再試');
      return;
    }
    
    if (ordersResult.orders.length === 0) {
      console.log('⚠️ Step 2: 找不到訂單');
      // 檢查是否已綁定會員
      const bindingResult = MemberService.checkLocalBinding(userId);
      if (!bindingResult.success || !bindingResult.isBound) {
        console.log('📤 發送綁定提示訊息');
        this._sendBindingRequiredMessage(userId);
      } else {
        console.log('📤 發送無訂單訊息');
        this._sendNoOrdersMessage(userId);
      }
      return;
    }
    
    console.log('✅ Step 2 完成: 找到', ordersResult.orders.length, '筆訂單');
    
    // 第三步：驗證訂單資料完整性
    console.log('📤 Step 3: 驗證訂單資料...');
    ordersResult.orders.forEach((order, index) => {
      console.log(`  訂單 ${index + 1}: #${order.orderNumber}`);
      console.log(`    - queueItems: ${order.queueItems ? order.queueItems.length : 'undefined'} 件`);
      console.log(`    - products: ${order.products ? order.products.length : 'undefined'} 件`);
      console.log(`    - overallStatus: ${JSON.stringify(order.overallStatus)}`);
      
      // 🔴 確保 queueItems 存在（向下相容）
      if (!order.queueItems) {
        order.queueItems = order.products || [];
        console.log('    ⚠️ queueItems 不存在，使用 products 替代');
      }
      
      // 🔴 確保 overallStatus 存在
      if (!order.overallStatus) {
        order.overallStatus = { emoji: '📦', label: '處理中', text: '訂單處理中' };
        console.log('    ⚠️ overallStatus 不存在，使用預設值');
      }
    });
    console.log('✅ Step 3 完成');
    
    // 第四步：發送訂單列表
    console.log('📤 Step 4: 發送訂單列表...');
    this._sendOrderListMessage(userId, ordersResult.orders);
    console.log('✅ Step 4 完成');
    
    console.log('════════════════════════════════════════');
    console.log('✅ 訂單查詢流程完成');
    console.log('════════════════════════════════════════');
    
  } catch (error) {
    console.error('════════════════════════════════════════');
    console.error('❌ 訂單查詢失敗:', error);
    console.error('❌ 錯誤堆疊:', error.stack);
    console.error('════════════════════════════════════════');
    
    // 發送錯誤訊息給用戶
    try {
      LineService.sendErrorPush(userId, '查詢訂單時發生錯誤，請稍後再試或聯繫客服');
    } catch (pushError) {
      console.error('❌ 發送錯誤訊息也失敗:', pushError);
    }
  }
},
  
  /**
   * 根據 LINE_User_ID 查詢所有訂單
   * 不限定單一 Email，只要訂單的 LINE_User_ID 相同就會查出來
   * 這樣顧客用多個 Email 下的訂單都能查到
   * @param {string} lineUserId - LINE User ID
   * @returns {Object} - { success, orders }
   */
  getOrdersByLineUserId: function(lineUserId) {
    try {
      console.log('📦 用 LINE_User_ID 查詢訂單:', lineUserId);
      
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = spreadsheet.getSheetByName(SHEET_NAMES.ORDERS);
      
      if (!sheet) {
        console.error('❌ 找不到訂單管理表');
        return { success: false, orders: [], error: '找不到訂單資料表' };
      }
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      // 找到欄位索引
      const lineUserIdIndex = headers.indexOf('LINE_User_ID');
      const emailIndex = headers.indexOf('客戶Email');
      const orderNumberIndex = headers.indexOf('訂單編號');
      const orderDateIndex = headers.indexOf('下單時間');
      const customerNameIndex = headers.indexOf('客戶姓名');
      const totalAmountIndex = headers.indexOf('訂單金額');
      const orderStatusIndex = headers.indexOf('訂單狀態');
      const productInfoIndex = headers.indexOf('商品資訊JSON');
      
      if (lineUserIdIndex === -1) {
        console.error('❌ 找不到「LINE_User_ID」欄位');
        return { success: false, orders: [], error: '找不到LINE_User_ID欄位' };
      }
      
      const orders = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowLineUserId = (row[lineUserIdIndex] || '').toString().trim();
        
        // 比對 LINE_User_ID
        if (rowLineUserId === lineUserId) {
          // 解析商品資訊
          let products = [];
          try {
            if (row[productInfoIndex]) {
              products = JSON.parse(row[productInfoIndex]);
            }
          } catch (parseError) {
            console.warn('解析商品資訊失敗:', parseError);
          }
          
          orders.push({
            orderNumber: row[orderNumberIndex] || '',
            orderDate: row[orderDateIndex] || '',
            customerName: row[customerNameIndex] || '',
            customerEmail: row[emailIndex] || '',  // 記錄是哪個 Email 下的訂單
            totalAmount: row[totalAmountIndex] || 0,
            status: row[orderStatusIndex] || '',
            products: products
          });
        }
      }
      
      // 按訂單日期倒序排列
      orders.sort((a, b) => {
        const dateA = new Date(a.orderDate);
        const dateB = new Date(b.orderDate);
        return dateB - dateA;
      });
      
      console.log(`✅ 找到 ${orders.length} 筆訂單`);
      
      return {
        success: true,
        orders: orders,
        totalCount: orders.length
      };
      
    } catch (error) {
      console.error('❌ 用 LINE_User_ID 查詢訂單失敗:', error);
      return { success: false, orders: [], error: error.toString() };
    }
  },
  
  /**
   * 根據 Email 查詢訂單
   * @param {string} email - 用戶 Email
   * @returns {Object} - { success, orders }
   */
  getOrdersByEmail: function(email) {
    try {
      console.log('📦 查詢訂單:', email);
      
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = spreadsheet.getSheetByName(SHEET_NAMES.ORDERS);
      
      if (!sheet) {
        console.error('❌ 找不到訂單管理表');
        return { success: false, orders: [], error: '找不到訂單資料表' };
      }
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      // 找到欄位索引
      const emailIndex = headers.indexOf('客戶Email');
      const orderNumberIndex = headers.indexOf('訂單編號');
      const orderDateIndex = headers.indexOf('下單時間');
      const customerNameIndex = headers.indexOf('客戶姓名');
      const totalAmountIndex = headers.indexOf('訂單金額');
      const orderStatusIndex = headers.indexOf('訂單狀態');
      const productInfoIndex = headers.indexOf('商品資訊JSON');
      
      const orders = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        if (row[emailIndex] && 
            row[emailIndex].toString().toLowerCase() === email.toLowerCase()) {
          
          // 解析商品資訊
          let products = [];
          try {
            if (row[productInfoIndex]) {
              products = JSON.parse(row[productInfoIndex]);
            }
          } catch (parseError) {
            console.warn('解析商品資訊失敗:', parseError);
          }
          
          orders.push({
            orderNumber: row[orderNumberIndex] || '',
            orderDate: row[orderDateIndex] || '',
            customerName: row[customerNameIndex] || '',
            totalAmount: row[totalAmountIndex] || 0,
            status: row[orderStatusIndex] || '',
            products: products
          });
        }
      }
      
      // 按訂單日期倒序排列
      orders.sort((a, b) => {
        const dateA = new Date(a.orderDate);
        const dateB = new Date(b.orderDate);
        return dateB - dateA;
      });
      
      console.log(`✅ 找到 ${orders.length} 筆訂單`);
      
      return {
        success: true,
        orders: orders,
        totalCount: orders.length
      };
      
    } catch (error) {
      console.error('❌ 查詢訂單失敗:', error);
      return { success: false, orders: [], error: error.toString() };
    }
  },
  
  /**
   * 用 Queue 表的商品狀態豐富訂單資料
   * @param {Array} orders - 訂單陣列
   * @returns {Array} - 含商品狀態的訂單陣列
   * @private
   */
  _enrichOrdersWithQueueStatus: function(orders) {
    try {
      // 取得所有訂單編號
      const orderNumbers = orders.map(o => o.orderNumber);
      
      // 查詢 Queue 表
      const queueData = this._getQueueDataForOrders(orderNumbers);
      
      // 建立訂單編號 → 商品狀態的對應
      const statusMap = {};
      queueData.forEach(item => {
        if (!statusMap[item.esOrderNo]) {
          statusMap[item.esOrderNo] = [];
        }
        statusMap[item.esOrderNo].push({
          productName: item.productName,
          sku: item.sku,
          color: item.color,
          size: item.size,
          qtyOrdered: item.qtyOrdered,
          purchaseStatus: item.purchaseStatus,
          boxId: item.boxId,
          boxNumber: item.boxNumber,
          packedAt: item.packedAt,
          pickedAt: item.pickedAt,
          trackingJPtoTW: item.trackingJPtoTW
        });
      });
      
      // 豐富訂單資料
      return orders.map(order => {
        const queueItems = statusMap[order.orderNumber] || [];
        
        // 判斷整體訂單狀態
        let overallStatus = this._determineOverallStatus(queueItems);
        
        // 如果 Queue 表沒有資料，使用訂單管理表的 products 作為 fallback
        // 並轉換格式以匹配 queueItems 結構
        let displayItems = queueItems;
        if (queueItems.length === 0 && order.products && order.products.length > 0) {
          displayItems = order.products.map(p => ({
            productName: p.name || p.product_title || '商品',
            sku: p.sku || '',
            color: '',
            size: p.variant_title || '',
            qtyOrdered: p.quantity || 1,
            purchaseStatus: p.status || '處理中',
            boxId: '',
            boxNumber: '',
            packedAt: '',
            pickedAt: '',
            trackingJPtoTW: ''
          }));
        }
        
        return {
          ...order,
          queueItems: displayItems,
          overallStatus: overallStatus
        };
      });
      
    } catch (error) {
      console.error('❌ 豐富訂單狀態失敗:', error);
      return orders;
    }
  },
  
  /**
   * 從 Queue 表取得指定訂單的商品資料
   * 同時從 Packing_Boxes 表取得入箱日期和物流狀態
   * @param {Array} orderNumbers - 訂單編號陣列
   * @returns {Array} - Queue 資料陣列（含物流狀態）
   * @private
   */
  _getQueueDataForOrders: function(orderNumbers) {
    try {
      const spreadsheet = SpreadsheetApp.openById(TOWER_SPREADSHEET_ID);
      const queueSheet = spreadsheet.getSheetByName('Queue');
      
      if (!queueSheet) {
        console.error('❌ 找不到 Queue 表單');
        return [];
      }
      
      // 1. 先讀取 Packing_Boxes 表，建立 Box_ID → 物流資訊的對應
      const packingBoxesMap = this._getPackingBoxesMap(spreadsheet);
      
      const data = queueSheet.getDataRange().getValues();
      const results = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const esOrderNo = row[QUEUE_COLS.ES_ORDER_NO];
        
        if (orderNumbers.includes(esOrderNo)) {
          const boxId = row[QUEUE_COLS.BOX_ID] || '';
          const boxInfo = packingBoxesMap[boxId] || {};
          
          results.push({
            esOrderNo: esOrderNo,
            productName: row[QUEUE_COLS.PRODUCT_NAME] || '',
            sku: row[QUEUE_COLS.SKU] || '',
            color: row[QUEUE_COLS.COLOR] || '',
            size: row[QUEUE_COLS.SIZE] || '',
            qtyOrdered: row[QUEUE_COLS.QTY_ORDERED] || 1,
            purchaseStatus: row[QUEUE_COLS.PURCHASE_STATUS] || '',
            boxId: boxId,
            boxNumber: boxInfo.boxNumber || '',
            packedAt: boxInfo.packedAt || '',        // 裝箱日期
            pickedAt: boxInfo.pickedAt || '',        // 揀貨日期（抵達台灣）
            trackingJPtoTW: row[QUEUE_COLS.TRACKING_JP_TO_TW] || ''
          });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ 查詢 Queue 表失敗:', error);
      return [];
    }
  },
  
  /**
   * 讀取 Packing_Boxes 表，建立 Box_ID → 物流資訊的對應
   * @param {Spreadsheet} spreadsheet - Tower Spreadsheet
   * @returns {Object} - { boxId: { boxNumber, packedAt, pickedAt } }
   * @private
   */
  _getPackingBoxesMap: function(spreadsheet) {
    try {
      const sheet = spreadsheet.getSheetByName('Packing_Boxes');
      
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
  
  /**
   * 判斷整體訂單狀態
   * @param {Array} queueItems - Queue 商品陣列
   * @returns {Object} - { status, label, emoji }
   * @private
   */
  _determineOverallStatus: function(queueItems) {
    if (queueItems.length === 0) {
      return { status: 'pending', label: '處理中', emoji: '⏳' };
    }
    
    // 檢查是否有缺貨商品
    const hasOOS = queueItems.some(item => item.purchaseStatus === '缺貨');
    if (hasOOS) {
      return { status: 'oos', label: '部分缺貨', emoji: '⚠️' };
    }
    
    // 檢查是否全部已裝箱寄出（Box_ID 有值）
    const allShipped = queueItems.every(item => item.boxId && item.boxId !== '');
    if (allShipped) {
      return { status: 'shipped', label: '已從日本寄出', emoji: '✈️' };
    }
    
    // 檢查是否全部已購
    const allPurchased = queueItems.every(item => 
      item.purchaseStatus === '已購' || item.purchaseStatus === '已購買'
    );
    if (allPurchased) {
      return { status: 'purchased', label: '採購完成，等待集貨', emoji: '📦' };
    }
    
    // 檢查是否有預購
    const hasPreorder = queueItems.some(item => item.purchaseStatus === '預購');
    if (hasPreorder) {
      return { status: 'preorder', label: '預購中', emoji: '🕐' };
    }
    
    // 預設：採購中
    return { status: 'purchasing', label: '採購中', emoji: '🛒' };
  },
  /**
   * 發送訂單列表訊息（使用 Carousel 顯示詳細商品資訊）
   * 🔴 v4.1 更新：當訂單有缺貨商品時，顯示「願意等待/不願等待」選擇按鈕
   * 🔴 v4.2 修復：確保所有 text 欄位都有非空值，避免 LINE API 400 錯誤
   * @param {string} userId - LINE User ID
   * @param {Array} orders - 訂單陣列
   * @private
   */
  _sendOrderListMessage: function(userId, orders) {
    // 最多顯示 5 筆訂單
    const displayOrders = orders.slice(0, 5);
    
    // 生成每個訂單的 Bubble
    const bubbles = displayOrders.map(order => {
      // 🔴 確保 queueItems 存在
      const queueItems = order.queueItems || order.products || [];
      
      // 商品資訊
      const itemContents = this._buildItemContents(queueItems);
      
      // 🔴 檢查是否有缺貨商品
      const hasOOS = queueItems.some(item => 
        (item.purchaseStatus || '').includes('缺貨')
      );
      
      // 🔴 確保 overallStatus 存在且有值
      const overallStatus = order.overallStatus || {};
      const statusEmoji = overallStatus.emoji || '📦';
      const statusLabel = overallStatus.label || '處理中';
      
      // 🔴 確保金額有值
      const totalAmount = order.totalAmount !== undefined && order.totalAmount !== null 
        ? order.totalAmount 
        : '0';
      
      // 🔴 確保訂單編號有值
      const orderNumber = order.orderNumber || '未知';
      
      // 🔴 確保日期有值
      const formattedDate = this._formatDate(order.orderDate) || '-';
      
      // 建立 Footer 內容
      const footerContents = [];
      
      // 「查看物流進度」按鈕（改用 message 類型，觸發帶 emoji 的精確關鍵字）
      footerContents.push({
        type: 'button',
        action: {
          type: 'message',
          label: '🚚 查看物流進度',
          text: '🚚 查詢物流狀態'
        },
        style: 'primary',
        color: BRAND_COLORS.PRIMARY,
        height: 'sm'
      });
      
      // 🆕 如果有缺貨商品，新增選擇按鈕
      if (hasOOS) {
        footerContents.push({
          type: 'box',
          layout: 'horizontal',
          margin: 'sm',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              action: {
                type: 'postback',
                label: '🟢 願意等待',
                data: `action=oos_wait&orderNumber=${orderNumber}`,
                displayText: '我願意等待'
              },
              style: 'secondary',
              height: 'sm',
              flex: 1
            },
            {
              type: 'button',
              action: {
                type: 'postback',
                label: '🔴 不願等待',
                data: `action=oos_refund&orderNumber=${orderNumber}`,
                displayText: '我不願意等待（申請退款）'
              },
              style: 'secondary',
              color: '#dc3545',
              height: 'sm',
              flex: 1
            }
          ]
        });
        
        // 加入提示文字
        footerContents.push({
          type: 'text',
          text: '⚠️ 部分商品缺貨，請選擇處理方式',
          size: 'xs',
          color: BRAND_COLORS.WARNING,
          margin: 'sm',
          align: 'center'
        });
      }
      
      return {
        type: 'bubble',
        size: 'giga',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: BRAND_COLORS.PRIMARY,
          paddingAll: 'md',
          contents: [
            {
              type: 'text',
              text: `📦 訂單 #${orderNumber}`,
              weight: 'bold',
              size: 'lg',
              color: '#ffffff'
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              contents: [
                {
                  type: 'text',
                  text: `${statusEmoji} ${statusLabel}`,
                  size: 'sm',
                  color: '#ffffff',
                  flex: 2
                },
                {
                  type: 'text',
                  text: `NT$ ${totalAmount}`,
                  size: 'sm',
                  color: '#ffffff',
                  align: 'end',
                  flex: 1
                }
              ]
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: 'md',
          contents: [
            // 訂單日期
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '📅 訂單日期',
                  size: 'xs',
                  color: BRAND_COLORS.TEXT_MUTED,
                  flex: 1
                },
                {
                  type: 'text',
                  text: formattedDate,
                  size: 'xs',
                  color: BRAND_COLORS.TEXT_DARK,
                  align: 'end',
                  flex: 2
                }
              ]
            },
            { type: 'separator', margin: 'sm' },
            // 商品列表標題
            {
              type: 'text',
              text: `🛍️ 商品明細 (${queueItems.length} 件)`,
              weight: 'bold',
              size: 'sm',
              margin: 'md',
              color: BRAND_COLORS.TEXT_DARK
            },
            // 商品列表
            ...itemContents
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          paddingAll: 'sm',
          contents: footerContents
        }
      };
    });
    
    const message = {
      type: 'flex',
      altText: `找到 ${orders.length} 筆訂單`,
      contents: {
        type: 'carousel',
        contents: bubbles
      }
    };
    
    LineService.sendPush(userId, message);
  },
  
  /**
   * 建立商品詳情內容
   * @param {Array} items - 商品陣列
   * @returns {Array} - Flex Message contents
   * @private
   * 🔴 v4.2 修復：確保所有 text 欄位都有非空值，避免 LINE API 400 錯誤
   * 🔴 v4.3 更新：上限改為 8 件、未寄出商品更明顯
   */
  _buildItemContents: function(items) {
    if (!items || items.length === 0) {
      return [{
        type: 'text',
        text: '尚無商品資料',
        size: 'sm',
        color: BRAND_COLORS.TEXT_MUTED,
        margin: 'sm'
      }];
    }
    
    const contents = [];
    
    // 🔴 v4.3 更新：上限改為 8 件
    const MAX_DISPLAY_ITEMS = 8;
    const displayItems = items.slice(0, MAX_DISPLAY_ITEMS);
    
    displayItems.forEach((item, index) => {
      // 判斷採購狀態
      const isOOS = (item.purchaseStatus || '').includes('缺貨');
      const isShipped = item.boxId && item.boxId.toString().trim() !== '';
      const hasPackedAt = item.packedAt && item.packedAt.toString().trim() !== '';
      
      // 🔴 v4.3 更新：未寄出商品特殊處理
      // 條件：非缺貨 + 沒有 boxId = 等待寄出
      const isWaitingToShip = !isOOS && !isShipped;
      
      // 狀態顏色
      let statusColor = BRAND_COLORS.SUCCESS;  // 預設綠色
      if (isOOS) {
        statusColor = BRAND_COLORS.ERROR;  // 缺貨紅色
      } else if (isWaitingToShip) {
        statusColor = BRAND_COLORS.WARNING;  // 等待寄出橘色
      }
      
      // 🔴 v4.3 更新：未寄出商品使用不同背景色
      const backgroundColor = isWaitingToShip ? '#FFF3E0' : '#f8f8f8';  // 淺橘色 vs 淺灰色
      
      // 🔴 確保所有文字欄位都有值（LINE API 不允許空字串）
      const productName = item.productName || item.name || '商品';
      const specText = [item.color, item.size].filter(s => s && s.trim()).join(' / ') || '-';
      const qtyText = `x${item.qtyOrdered || item.quantity || 1}`;
      
      // 🔴 採購狀態對外顯示轉換：「待購」→「處理中」（對顧客更友善）
      // 🔴 v4.3 更新：未寄出商品加上「⏳ 等待寄出」標籤
      // 🔴 v4.4 更新：預購商品顯示預計出貨時間
      // 🔴 v4.5 修復：預購日期獨立一行顯示，避免文字被截斷
      // 🔴 v4.6 修復：格式化 Date 物件為 YYYY-MM 格式
      var displayStatus = this._convertStatusForDisplay(item.purchaseStatus);
      
      // 🆕 檢查是否有預購資訊（欄位 Y 和 Z 同時有值）
      // 🔴 v4.6 修復：處理 Date 物件格式
      var rawPreorderMonth = item.preorderMonth;
      var preorderMonth = '';
      
      // 如果是 Date 物件，格式化為 YYYY-MM
      if (rawPreorderMonth instanceof Date) {
        var year = rawPreorderMonth.getFullYear();
        var month = rawPreorderMonth.getMonth() + 1;  // getMonth() 是 0-based
        preorderMonth = year + '-' + (month < 10 ? '0' + month : month);
      } else if (rawPreorderMonth) {
        // 如果是字串，嘗試解析
        var monthStr = rawPreorderMonth.toString().trim();
        // 檢查是否像 Date 字串格式（包含 GMT）
        if (monthStr.indexOf('GMT') !== -1 || monthStr.indexOf('00:00:00') !== -1) {
          try {
            var dateObj = new Date(monthStr);
            if (!isNaN(dateObj.getTime())) {
              var y = dateObj.getFullYear();
              var m = dateObj.getMonth() + 1;
              preorderMonth = y + '-' + (m < 10 ? '0' + m : m);
            }
          } catch (e) {
            preorderMonth = monthStr;
          }
        } else {
          preorderMonth = monthStr;
        }
      }
      
      var preorderPeriod = (item.preorderPeriod || '').toString().trim();
      var hasPreorderInfo = preorderMonth !== '' && preorderPeriod !== '';
      
      // 預購狀態文字（簡化格式，獨立顯示）
      // 🔴 v4.6 修復：格式改為「🕐 預計 2026-01 中旬 日本官方出貨」
      var preorderText = '';
      if (hasPreorderInfo) {
        preorderText = '🕐 預計 ' + preorderMonth + ' ' + preorderPeriod + '旬 日本官方出貨';
        displayStatus = '預購中';
      } else if (isWaitingToShip) {
        displayStatus = '⏳ 等待寄出';
      }
      var statusText = '狀態：' + displayStatus;
      
      // 🔴 入箱日期：如果沒有則顯示 '-'，不能是空字串
      var packedAtText = hasPackedAt ? '📦 ' + item.packedAt : '-';
      
      // 🆕 建立商品內容陣列
      var itemBoxContents = [
        // 商品名稱
        {
          type: 'text',
          text: productName,
          size: 'sm',
          weight: 'bold',
          wrap: true,
          maxLines: 2
        },
        // 規格和數量
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'xs',
          contents: [
            {
              type: 'text',
              text: '規格：' + specText,
              size: 'xs',
              color: BRAND_COLORS.TEXT_MUTED,
              flex: 3
            },
            {
              type: 'text',
              text: qtyText,
              size: 'xs',
              color: BRAND_COLORS.TEXT_DARK,
              align: 'end',
              flex: 1
            }
          ]
        },
        // 採購狀態
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'xs',
          contents: [
            {
              type: 'text',
              text: statusText,
              size: 'xs',
              color: statusColor,
              flex: 2
            },
            // 入箱日期
            {
              type: 'text',
              text: packedAtText,
              size: 'xs',
              color: BRAND_COLORS.TEXT_MUTED,
              align: 'end',
              flex: 2
            }
          ]
        }
      ];
      
      // 🆕 如果有預購資訊，在狀態下方新增一行顯示預購日期
      if (hasPreorderInfo) {
        itemBoxContents.push({
          type: 'text',
          text: preorderText,
          size: 'xs',
          color: '#6366F1',  // 紫色強調預購
          margin: 'xs',
          wrap: true
        });
      }
      
      contents.push({
        type: 'box',
        layout: 'vertical',
        margin: index > 0 ? 'md' : 'sm',
        backgroundColor: backgroundColor,
        paddingAll: 'sm',
        cornerRadius: 'md',
        // 🔴 v4.3 更新：未寄出商品加上橘色左邊框
        // 🔴 v4.5 更新：預購商品使用紫色左邊框
        borderColor: hasPreorderInfo ? '#6366F1' : (isWaitingToShip ? '#FF9800' : undefined),
        borderWidth: (hasPreorderInfo || isWaitingToShip) ? '2px' : undefined,
        contents: itemBoxContents
      });
    });
    
    // 如果還有更多商品
    if (items.length > MAX_DISPLAY_ITEMS) {
      contents.push({
        type: 'text',
        text: `... 還有 ${items.length - MAX_DISPLAY_ITEMS} 件商品`,
        size: 'xs',
        color: BRAND_COLORS.TEXT_MUTED,
        margin: 'sm',
        align: 'center'
      });
    }
    
    return contents;
  },
  
  /**
   * 取得狀態對應顏色
   * @param {string} status - 狀態碼
   * @returns {string} - 顏色代碼
   * @private
   */
  _getStatusColor: function(status) {
    const colors = {
      'shipped': BRAND_COLORS.SUCCESS,
      'purchased': BRAND_COLORS.PRIMARY,
      'purchasing': BRAND_COLORS.TEXT_LIGHT,
      'preorder': BRAND_COLORS.WARNING,
      'oos': BRAND_COLORS.ERROR,
      'pending': BRAND_COLORS.TEXT_MUTED
    };
    return colors[status] || BRAND_COLORS.TEXT_LIGHT;
  },
  
  /**
   * 格式化日期
   * @param {Date|string} date - 日期
   * @returns {string} - 格式化日期字串
   * @private
   * 🔴 v4.2 修復：確保不返回空字串
   */
  _formatDate: function(date) {
    if (!date) return '-';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '-';
      return Utilities.formatDate(d, 'Asia/Taipei', 'yyyy/MM/dd');
    } catch (e) {
      return date.toString() || '-';
    }
  },
  
  /**
   * 將內部採購狀態轉換為對顧客友善的顯示文字
   * @param {string} status - 原始採購狀態
   * @returns {string} - 對顧客友善的顯示文字
   * @private
   * 
   * 轉換規則：
   * - 「待購」→「處理中」
   * - 「已購」→「已購買」
   * - 其他狀態保持原樣
   */
  _convertStatusForDisplay: function(status) {
    if (!status) return '處理中';
    
    const statusMap = {
      '待購': '處理中',
      '已購': '已購買',
      '預購': '預購中',
      '缺貨': '缺貨',
      'OOS': '缺貨'
    };
    
    return statusMap[status] || status;
  },
  
  /**
   * 發送無訂單訊息
   * @param {string} userId - LINE User ID
   * @private
   */
  _sendNoOrdersMessage: function(userId) {
    const message = {
      type: 'flex',
      altText: '目前沒有訂單記錄',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📦 目前沒有訂單記錄',
              weight: 'bold',
              align: 'center'
            },
            {
              type: 'text',
              text: '如果您最近有下單，請稍後再試。',
              wrap: true,
              margin: 'md',
              size: 'sm',
              align: 'center',
              color: BRAND_COLORS.TEXT_LIGHT
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '🛒 前往購物',
                uri: 'https://www.takemejapan.com'
              },
              style: 'primary',
              color: BRAND_COLORS.PRIMARY
            }
          ]
        }
      }
    };
    
    LineService.sendPush(userId, message);
  },
  
  /**
   * 發送需要綁定訊息
   * @param {string} userId - LINE User ID
   * @private
   */
  _sendBindingRequiredMessage: function(userId) {
    const message = {
      type: 'flex',
      altText: '需要先綁定會員',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🔗 尚未綁定會員',
              weight: 'bold',
              size: 'xl',
              color: BRAND_COLORS.PRIMARY
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '您需要先綁定會員帳號才能查詢訂單。',
              weight: 'bold',
              wrap: true
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'message',
                label: '開始會員綁定',
                text: '會員綁定'
              },
              style: 'primary',
              color: BRAND_COLORS.PRIMARY
            }
          ]
        }
      }
    };
    
    LineService.sendPush(userId, message);
  }
};

// ==========================================
// 向下相容：保留舊函數名稱
// ==========================================

/**
 * 處理訂單查詢（舊版，向下相容）
 */
function handleOrderQuery(event) {
  OrderService.handleOrderQuery(event);
}

/**
 * 發送無訂單訊息（舊版，向下相容）
 */
function sendNoOrdersMessagePush(userId) {
  OrderService._sendNoOrdersMessage(userId);
}
