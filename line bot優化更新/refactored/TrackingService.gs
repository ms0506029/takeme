// ==========================================
// TrackingService.gs - 物流追蹤服務模組
// 版本：v4.0 模組化架構
// 說明：處理物流查詢，基於 Queue 表單的 Box_ID 判斷出貨狀態
// ==========================================

/**
 * 物流服務模組
 * 判斷標準：Queue 表單的 Box_ID 有值 = 已完成裝箱 = 已寄出回台灣
 */
const TrackingService = {
  
  /**
   * 處理物流追蹤查詢
   * 🔴 v4.1 更新：新增整體物流狀態訊息（全部寄出/部分寄出/已抵達台灣）
   * @param {Object} event - LINE 事件
   */
  handleTrackingQuery: function(event) {
    try {
      const userId = event.source.userId;
      const replyToken = event.replyToken;
      
      console.log('🚚 開始處理物流追蹤');
      console.log('👤 LINE User ID:', userId);
      
      // 第一步：發送處理中訊息
      LineService.sendProcessing(replyToken, 'tracking');
      
      // 第二步：使用 IntegrationService 查詢物流
      const shipmentsResult = IntegrationService.getShipmentsByLineUserId(userId);
      console.log('🚚 物流查詢結果:', shipmentsResult);
      
      if (shipmentsResult.success && shipmentsResult.shipments && shipmentsResult.shipments.length > 0) {
        // 🆕 傳遞全部商品資料用於判斷整體狀態
        this._sendTrackingListMessage(userId, shipmentsResult.shipments, shipmentsResult.allItems || []);
      } else {
        // 如果查不到，檢查是否已綁定會員
        const bindingResult = MemberService.checkLocalBinding(userId);
        if (!bindingResult.success || !bindingResult.isBound) {
          this._sendBindingRequiredMessage(userId);
        } else {
          this._sendNoTrackingMessage(userId);
        }
      }
      
    } catch (error) {
      console.error('❌ 物流追蹤失敗:', error);
      LineService.sendErrorPush(event.source.userId, '查詢物流時發生錯誤');
    }
  },
  
  /**
   * 根據 LINE_User_ID 查詢物流資訊
   * 不限定單一 Email，只要訂單的 LINE_User_ID 相同就會查出來
   * @param {string} lineUserId - LINE User ID
   * @returns {Object} - { success, shipments }
   */
  getShipmentsByLineUserId: function(lineUserId) {
    try {
      console.log('📦 用 LINE_User_ID 查詢物流:', lineUserId);
      
      // 1. 從訂單管理表取得該 LINE_User_ID 的訂單編號
      const orderNumbers = this._getOrderNumbersByLineUserId(lineUserId);
      console.log('📋 找到訂單編號:', orderNumbers);
      
      if (orderNumbers.length === 0) {
        return { success: true, shipments: [], message: '無訂單記錄' };
      }
      
      // 2. 查詢 Queue 表單並結合 Packing_Boxes 資訊
      const queueData = this._getQueueDataWithPackingInfo(orderNumbers);
      console.log('📊 Queue 資料筆數:', queueData.length);
      
      // 3. 篩選已有 Box_ID 的商品（已裝箱 = 已寄出）
      const shipments = queueData.filter(item => 
        item.boxId && item.boxId.toString().trim() !== ''
      ).map(item => {
        // 判斷物流狀態
        let status, statusEmoji, statusMessage, statusDate;
        
        if (item.pickedAt) {
          // 已抵達台灣（Picked_At 有值）
          status = SHIPPING_STATUS.ARRIVED_TW;
          statusEmoji = '✈️';
          statusMessage = `已抵達台灣集貨倉`;
          statusDate = item.pickedAt;
        } else if (item.packedAt) {
          // 已寄出回台灣（Packed_At 有值）
          status = SHIPPING_STATUS.SHIPPED_TO_TW;
          statusEmoji = '📦';
          statusMessage = `已寄出回台灣集貨倉`;
          statusDate = item.packedAt;
        } else {
          // 有 Box_ID 但無日期（處理中）
          statusEmoji = '⏳';
          statusMessage = '處理中';
          statusDate = '';
        }
        
        return {
          orderNumber: item.esOrderNo,
          productName: item.productName,
          sku: item.sku,
          color: item.color,
          size: item.size,
          boxId: item.boxId,
          boxNumber: item.boxNumber,
          trackingNumber: item.trackingJPtoTW || '',
          courier: item.courier || '',
          packedAt: item.packedAt,
          pickedAt: item.pickedAt,
          statusEmoji: statusEmoji,
          statusMessage: statusMessage,
          statusDate: statusDate,
          trackingUrl: this._getTrackingUrl(item.courier, item.trackingJPtoTW)
        };
      });
      
      console.log(`✅ 找到 ${shipments.length} 筆已寄出記錄`);
      
      return {
        success: true,
        shipments: shipments,
        totalCount: shipments.length
      };
      
    } catch (error) {
      console.error('❌ 用 LINE_User_ID 查詢物流失敗:', error);
      return { success: false, error: error.toString(), shipments: [] };
    }
  },
  
  /**
   * 根據 Email 查詢物流資訊
   * 判斷標準：
   * - Box_ID 有值 + Packed_At 有值 = 已寄出回台灣集貨倉
   * - Picked_At 有值 = 已抵達台灣集貨倉
   * @param {string} email - 用戶 Email
   * @returns {Object} - { success, shipments }
   */
  getShipmentsByEmail: function(email) {
    try {
      console.log('📦 查詢物流資訊:', email);
      
      // 1. 從訂單管理表取得該 Email 的訂單編號
      const orderNumbers = this._getOrderNumbersByEmail(email);
      console.log('📋 找到訂單編號:', orderNumbers);
      
      if (orderNumbers.length === 0) {
        return { success: true, shipments: [], message: '無訂單記錄' };
      }
      
      // 2. 查詢 Queue 表單並結合 Packing_Boxes 資訊
      const queueData = this._getQueueDataWithPackingInfo(orderNumbers);
      console.log('📊 Queue 資料筆數:', queueData.length);
      
      // 3. 篩選已有 Box_ID 的商品（已裝箱 = 已寄出）
      const shipments = queueData.filter(item => 
        item.boxId && item.boxId.toString().trim() !== ''
      ).map(item => {
        // 判斷物流狀態
        let status, statusEmoji, statusMessage, statusDate;
        
        if (item.pickedAt) {
          // 已抵達台灣（Picked_At 有值）
          status = SHIPPING_STATUS.ARRIVED_TW;
          statusEmoji = '✈️';
          statusMessage = `已抵達台灣集貨倉`;
          statusDate = item.pickedAt;
        } else if (item.packedAt) {
          // 已寄出回台灣（Packed_At 有值）
          status = SHIPPING_STATUS.SHIPPED_TO_TW;
          statusEmoji = '📦';
          statusMessage = `已寄出回台灣集貨倉`;
          statusDate = item.packedAt;
        } else {
          // 有 Box_ID 但無日期（處理中）
          statusEmoji = '⏳';
          statusMessage = '處理中';
          statusDate = '';
        }
        
        return {
          orderNumber: item.esOrderNo,
          productName: item.productName,
          sku: item.sku,
          color: item.color,
          size: item.size,
          boxId: item.boxId,
          boxNumber: item.boxNumber,
          trackingNumber: item.trackingJPtoTW || '',
          courier: item.courier || '',
          packedAt: item.packedAt,
          pickedAt: item.pickedAt,
          statusEmoji: statusEmoji,
          statusMessage: statusMessage,
          statusDate: statusDate,
          trackingUrl: this._getTrackingUrl(item.courier, item.trackingJPtoTW)
        };
      });
      
      console.log(`✅ 找到 ${shipments.length} 筆已寄出記錄`);
      
      return {
        success: true,
        shipments: shipments,
        totalCount: shipments.length
      };
      
    } catch (error) {
      console.error('❌ 查詢物流失敗:', error);
      return { success: false, error: error.toString(), shipments: [] };
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
      
      if (!sheet) {
        console.error('❌ 找不到訂單管理表');
        return [];
      }
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const lineUserIdIndex = headers.indexOf('LINE_User_ID');
      const orderNumberIndex = headers.indexOf('訂單編號');
      
      if (lineUserIdIndex === -1 || orderNumberIndex === -1) {
        console.error('❌ 找不到必要欄位');
        return [];
      }
      
      const orderNumbers = [];
      for (let i = 1; i < data.length; i++) {
        const rowLineUserId = (data[i][lineUserIdIndex] || '').toString().trim();
        
        if (rowLineUserId === lineUserId) {
          const orderNo = data[i][orderNumberIndex];
          if (orderNo && !orderNumbers.includes(orderNo)) {
            orderNumbers.push(orderNo);
          }
        }
      }
      
      return orderNumbers;
      
    } catch (error) {
      console.error('❌ 用 LINE_User_ID 取得訂單編號失敗:', error);
      return [];
    }
  },
  
  /**
   * 根據 Email 取得訂單編號列表
   * @param {string} email - 用戶 Email
   * @returns {Array} - 訂單編號陣列
   * @private
   */
  _getOrderNumbersByEmail: function(email) {
    try {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = spreadsheet.getSheetByName(SHEET_NAMES.ORDERS);
      
      if (!sheet) {
        console.error('❌ 找不到訂單管理表');
        return [];
      }
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const emailIndex = headers.indexOf('客戶Email');
      const orderNumberIndex = headers.indexOf('訂單編號');
      
      if (emailIndex === -1 || orderNumberIndex === -1) {
        console.error('❌ 找不到必要欄位');
        return [];
      }
      
      const orderNumbers = [];
      for (let i = 1; i < data.length; i++) {
        if (data[i][emailIndex] && 
            data[i][emailIndex].toString().toLowerCase() === email.toLowerCase()) {
          const orderNo = data[i][orderNumberIndex];
          if (orderNo && !orderNumbers.includes(orderNo)) {
            orderNumbers.push(orderNo);
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
   * 從 Queue 表單取得指定訂單的資料（含 Packing_Boxes 資訊）
   * @param {Array} orderNumbers - 訂單編號陣列
   * @returns {Array} - Queue 資料陣列（含 packedAt, pickedAt）
   * @private
   */
  _getQueueDataWithPackingInfo: function(orderNumbers) {
    try {
      const towerSpreadsheetId = this._getTowerSpreadsheetId();
      
      if (!towerSpreadsheetId) {
        console.error('❌ 無法取得 Tower Spreadsheet ID');
        return [];
      }
      
      const spreadsheet = SpreadsheetApp.openById(towerSpreadsheetId);
      const queueSheet = spreadsheet.getSheetByName('Queue');
      
      if (!queueSheet) {
        console.error('❌ 找不到 Queue 表單');
        return [];
      }
      
      // 先讀取 Packing_Boxes 表，建立 Box_ID → 物流資訊的對應
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
            boxId: boxId,
            boxNumber: boxInfo.boxNumber || '',
            packedAt: boxInfo.packedAt || '',       // 裝箱日期
            pickedAt: boxInfo.pickedAt || '',       // 揀貨日期（抵達台灣）
            trackingJPtoTW: row[QUEUE_COLS.TRACKING_JP_TO_TW] || '',
            courier: ''  // 目前沒有 Courier 欄位
          });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ 查詢 Queue 表單失敗:', error);
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
   * 格式化日期
   * @param {Date|string} date - 日期
   * @returns {string} - 格式化日期字串
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
   * 取得 Tower Spreadsheet ID
   * 🔴 需要在 Config.gs 中設定
   * @returns {string} - Spreadsheet ID
   * @private
   */
  _getTowerSpreadsheetId: function() {
    // 可從 Config.gs 的常數取得，或從 Script Properties 讀取
    return TOWER_SPREADSHEET_ID || PropertiesService.getScriptProperties().getProperty('TOWER_SPREADSHEET_ID');
  },
  
  /**
   * 取得物流追蹤 URL
   * @param {string} courier - 物流公司 (SF, SCORE)
   * @param {string} trackingNumber - 追蹤號碼
   * @returns {string} - 追蹤 URL
   * @private
   */
  _getTrackingUrl: function(courier, trackingNumber) {
    if (!trackingNumber) return '';
    
    const urls = {
      'SF': `https://htm.sf-express.com/hk/tc/dynamic_function/waybill/#search/bill-number/${trackingNumber}`,
      'SCORE': `https://declogistics.com.tw/h/DataDetail?key=amqeg&cont=${trackingNumber}`
    };
    
    // 預設使用郵局查詢
    return urls[courier] || `https://postserv.post.gov.tw/pstmail/main_mail.html`;
  },
  
  /**
   * 🔴 v4.4 重構：判斷整體物流狀態
   * 根據箱子的實際抵達狀態判斷 3 種情境：
   * 1. 全部到貨：所有箱子都有 pickedAt
   * 2. 部分到貨：部分箱子有 pickedAt，部分只有 packedAt
   * 3. 除缺貨外都到貨：有缺貨商品 + 非缺貨商品的箱子都已抵達
   * @param {Array} shipments - 已寄出的商品陣列（有 boxId 的）
   * @param {Array} allItems - 全部商品陣列
   * @returns {Object|null} - { emoji, text, backgroundColor }
   * @private
   */
  _getOverallShippingStatus: function(shipments, allItems) {
    if (!shipments || shipments.length === 0) {
      return null;
    }
    
    // 先按箱號分組，統計每個箱子的狀態
    var boxStatusMap = {};
    shipments.forEach(function(s) {
      var boxId = s.boxId || s.boxNumber || 'unknown';
      if (!boxStatusMap[boxId]) {
        boxStatusMap[boxId] = {
          boxId: boxId,
          packedAt: s.packedAt || '',
          pickedAt: s.pickedAt || '',
          hasArrived: !!(s.pickedAt)
        };
      }
      // 如果這個箱子有任一商品有 pickedAt，就標記為已抵達
      if (s.pickedAt) {
        boxStatusMap[boxId].hasArrived = true;
        boxStatusMap[boxId].pickedAt = s.pickedAt;
      }
    });
    
    var boxIds = Object.keys(boxStatusMap);
    var totalBoxes = boxIds.length;
    var arrivedBoxes = boxIds.filter(function(id) { return boxStatusMap[id].hasArrived; }).length;
    
    // 檢查是否有缺貨商品
    var hasOOS = allItems.some(function(item) {
      var status = item.purchaseStatus || '';
      return status.indexOf('缺貨') >= 0 || status.indexOf('OOS') >= 0;
    });
    
    // 情境判斷
    if (arrivedBoxes === totalBoxes && totalBoxes > 0) {
      // 情境 1：全部到貨（所有箱子都已抵達）
      if (hasOOS) {
        // 情境 3：除缺貨外都到貨
        return {
          emoji: '✈️',
          text: '除了部分缺貨商品以外，其餘商品已全部抵達台灣集貨倉，我們會用最快的速度寄出給您，謝謝您的耐心等候。',
          backgroundColor: '#28a745'  // 綠色
        };
      } else {
        return {
          emoji: '✈️',
          text: '您的商品已全部抵達台灣集貨倉，我們會用最快的速度寄出給您，謝謝您的耐心等候。',
          backgroundColor: '#28a745'  // 綠色
        };
      }
    } else if (arrivedBoxes > 0 && arrivedBoxes < totalBoxes) {
      // 情境 2：部分到貨（部分箱子已抵達，部分運送中）
      return {
        emoji: '🚚',
        text: '部分商品已抵達台灣集貨倉，部分仍在運送中，請查看下方各箱詳細狀態。',
        backgroundColor: BRAND_COLORS.WARNING  // 橘色
      };
    } else {
      // 全部都還在運送中
      return {
        emoji: '📦',
        text: '您的商品已從日本集貨倉寄出，預計 5-7 天抵達台灣集貨倉，謝謝您的耐心等候。',
        backgroundColor: BRAND_COLORS.PRIMARY
      };
    }
  },
  
  /**
   * 🔴 v4.4 重構：發送物流追蹤列表訊息
   * 結構：2 個 Bubble
   * - Bubble 1：整體狀態訊息
   * - Bubble 2：所有箱子詳細資訊（按箱號分組）
   * @param {string} userId - LINE User ID
   * @param {Array} shipments - 物流資料陣列（有 boxId 的商品）
   * @param {Array} allItems - 全部商品資料
   * @private
   */
  _sendTrackingListMessage: function(userId, shipments, allItems) {
    var self = this;
    var bubbles = [];
    
    // ========== Bubble 1：整體物流狀態 ==========
    var overallStatus = this._getOverallShippingStatus(shipments, allItems || []);
    
    if (overallStatus) {
      bubbles.push({
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: overallStatus.backgroundColor || BRAND_COLORS.PRIMARY,
          paddingAll: 'md',
          contents: [
            {
              type: 'text',
              text: (overallStatus.emoji || '📦') + ' 物流狀態',
              weight: 'bold',
              size: 'lg',
              color: '#ffffff'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: 'lg',
          contents: [
            {
              type: 'text',
              text: overallStatus.text || '物流處理中',
              wrap: true,
              size: 'sm',
              color: BRAND_COLORS.TEXT_DARK
            }
          ]
        }
      });
    }
    
    // ========== Bubble 2：按箱號分組的詳細資訊 ==========
    // 步驟 1：按箱號分組
    var boxGroups = {};
    shipments.forEach(function(shipment) {
      var boxId = shipment.boxId || shipment.boxNumber || 'unknown';
      if (!boxGroups[boxId]) {
        boxGroups[boxId] = {
          boxId: boxId,
          boxNumber: shipment.boxNumber || boxId,
          packedAt: shipment.packedAt || '',
          pickedAt: shipment.pickedAt || '',
          trackingNumber: shipment.trackingNumber || '',
          trackingUrl: shipment.trackingUrl || '',
          items: []
        };
      }
      boxGroups[boxId].items.push(shipment);
      // 更新箱子資訊（取最新的）
      if (shipment.pickedAt) {
        boxGroups[boxId].pickedAt = shipment.pickedAt;
      }
      if (shipment.packedAt && !boxGroups[boxId].packedAt) {
        boxGroups[boxId].packedAt = shipment.packedAt;
      }
    });
    
    // 步驟 2：建構箱子明細內容
    var boxIds = Object.keys(boxGroups);
    var boxContents = [];
    
    // 取得訂單編號（用於標題）
    var orderNumbersSet = {};
    shipments.forEach(function(s) {
      if (s.orderNumber) {
        orderNumbersSet[s.orderNumber] = true;
      }
    });
    var orderNumbers = Object.keys(orderNumbersSet);
    var orderTitle = orderNumbers.length > 0 ? orderNumbers.join(', ') : '訂單';
    
    boxIds.forEach(function(boxId, boxIndex) {
      var box = boxGroups[boxId];
      var hasArrived = !!(box.pickedAt);
      var statusEmoji = hasArrived ? '✈️' : '🚚';
      var statusText = hasArrived ? '已抵達台灣' : '運送中';
      var statusColor = hasArrived ? '#28a745' : BRAND_COLORS.WARNING;
      
      // 箱號標題區塊
      if (boxIndex > 0) {
        boxContents.push({ type: 'separator', margin: 'lg' });
      }
      
      // 箱號和狀態
      boxContents.push({
        type: 'box',
        layout: 'horizontal',
        margin: boxIndex > 0 ? 'lg' : 'none',
        contents: [
          {
            type: 'text',
            text: '🏷️ 箱號 ' + String(box.boxNumber || box.boxId),
            size: 'sm',
            weight: 'bold',
            flex: 3
          },
          {
            type: 'text',
            text: statusEmoji + ' ' + statusText,
            size: 'sm',
            color: statusColor,
            align: 'end',
            flex: 2
          }
        ]
      });
      
      // 日期資訊
      var dateText = '';
      if (box.packedAt) {
        dateText = '📅 打包：' + box.packedAt;
      }
      if (box.pickedAt) {
        dateText += (dateText ? ' → 抵達：' : '📅 抵達：') + box.pickedAt;
      }
      if (dateText) {
        boxContents.push({
          type: 'text',
          text: dateText,
          size: 'xs',
          color: BRAND_COLORS.TEXT_MUTED,
          margin: 'sm'
        });
      }
      
      // 該箱商品列表
      var displayItems = box.items.slice(0, 4);  // 每箱最多顯示 4 件
      displayItems.forEach(function(item) {
        var productName = item.productName || '商品';
        var specParts = [];
        if (item.color) specParts.push(item.color);
        if (item.size) specParts.push(item.size);
        var specText = specParts.length > 0 ? specParts.join('/') : '-';
        
        boxContents.push({
          type: 'box',
          layout: 'horizontal',
          margin: 'sm',
          contents: [
            {
              type: 'text',
              text: '  • ' + productName,
              size: 'xs',
              wrap: true,
              flex: 4
            },
            {
              type: 'text',
              text: specText,
              size: 'xs',
              color: BRAND_COLORS.TEXT_MUTED,
              align: 'end',
              flex: 2
            }
          ]
        });
      });
      
      // 還有更多商品
      if (box.items.length > 4) {
        boxContents.push({
          type: 'text',
          text: '  ... 還有 ' + (box.items.length - 4) + ' 件商品',
          size: 'xs',
          color: BRAND_COLORS.TEXT_MUTED,
          margin: 'sm'
        });
      }
    });
    
    // 建構 Bubble 2
    var detailBubble = {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: BRAND_COLORS.PRIMARY,
        paddingAll: 'md',
        contents: [
          {
            type: 'text',
            text: '📦 訂單 #' + orderTitle + ' 物流明細',
            weight: 'bold',
            size: 'md',
            color: '#ffffff'
          },
          {
            type: 'text',
            text: '共 ' + boxIds.length + ' 箱 / ' + shipments.length + ' 件商品',
            size: 'xs',
            color: '#ffffff',
            margin: 'sm'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        contents: boxContents
      }
    };
    
    // 追蹤按鈕（如果有追蹤號碼）
    var trackingUrl = '';
    for (var i = 0; i < boxIds.length; i++) {
      if (boxGroups[boxIds[i]].trackingUrl) {
        trackingUrl = boxGroups[boxIds[i]].trackingUrl;
        break;
      }
    }
    if (trackingUrl) {
      detailBubble.footer = {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'sm',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '🔍 追蹤物流',
              uri: trackingUrl
            },
            style: 'secondary',
            height: 'sm'
          }
        ]
      };
    }
    
    bubbles.push(detailBubble);
    
    // 發送訊息
    var message = {
      type: 'flex',
      altText: '找到 ' + shipments.length + ' 筆物流記錄',
      contents: {
        type: 'carousel',
        contents: bubbles
      }
    };
    
    LineService.sendPush(userId, message);
  },
  
  /**
   * 發送無物流記錄訊息
   * @param {string} userId - LINE User ID
   * @private
   */
  _sendNoTrackingMessage: function(userId) {
    const message = {
      type: 'flex',
      altText: '目前沒有物流記錄',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🚚 目前沒有已寄出的商品',
              weight: 'bold',
              align: 'center'
            },
            {
              type: 'text',
              text: '商品完成裝箱後會在此顯示物流資訊。',
              wrap: true,
              margin: 'md',
              size: 'sm',
              align: 'center',
              color: BRAND_COLORS.TEXT_LIGHT
            },
            {
              type: 'text',
              text: '💡 小提示：Box_ID 有值 = 已裝箱寄出',
              wrap: true,
              margin: 'lg',
              size: 'xs',
              align: 'center',
              color: BRAND_COLORS.TEXT_MUTED
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
              text: '❌ 尚未綁定會員',
              weight: 'bold',
              size: 'xl',
              color: BRAND_COLORS.ERROR
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '您需要先綁定會員帳號才能查詢物流資訊。',
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
                label: '🔗 開始會員綁定',
                text: '🔗 開始會員綁定'
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
 * 處理物流追蹤（舊版，向下相容）
 */
function handleTrackingQuery(event) {
  TrackingService.handleTrackingQuery(event);
}

/**
 * 發送物流列表（舊版，向下相容）
 */
function sendTrackingListPush(userId, shipments) {
  TrackingService._sendTrackingListMessage(userId, shipments);
}

/**
 * 發送無物流訊息（舊版，向下相容）
 */
function sendNoTrackingMessagePush(userId) {
  TrackingService._sendNoTrackingMessage(userId);
}

/**
 * 發送需要綁定訊息（舊版，向下相容）
 */
function sendBindingRequiredMessagePush(userId) {
  TrackingService._sendBindingRequiredMessage(userId);
}
