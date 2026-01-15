/**
 * ShipmentService - 箱號管理服務
 * 管理 ShipmentsHeader 與 ShipmentsDetail
 */

const ShipmentService = (function() {
  
  /**
   * 取得 ShipmentsHeader 工作表
   */
  function getHeaderSheet() {
    return getSheet(SHIPMENT_HEADER_SHEET_NAME);
  }
  
  /**
   * 取得 ShipmentsDetail 工作表
   */
  function getDetailSheet() {
    return getSheet(SHIPMENT_DETAIL_SHEET_NAME);
  }
  
  /**
   * 建立新箱號
   * @param {Object} headerData - 箱號基本資訊
   * @param {Array} queueRowIndices - 要加入此箱的 Queue 列索引陣列
   * @return {Object} { success: boolean, shipmentId?: string, error?: string }
   */
  function createShipment(headerData, queueRowIndices) {
    try {
      const shipmentId = headerData.shipmentId || `SH-${Date.now()}`;
      
      // 1. 寫入 ShipmentsHeader
      const headerSheet = getHeaderSheet();
      const headerRow = [
        shipmentId,
        headerData.trackingJPtoTW || '',
        headerData.shipDateJP || '',
        headerData.etaTW || '',
        headerData.arriveDateTW || '',
        headerData.status || '在日本',
        headerData.memo || ''
      ];
      
      headerSheet.appendRow(headerRow);
      logInfo(`建立箱號: ${shipmentId}`);
      
      // 2. 寫入 ShipmentsDetail 並更新 Queue 的 Box_ID
      const detailSheet = getDetailSheet();
      const queueSheet = getSheet(QUEUE_SHEET_NAME);
      
      queueRowIndices.forEach(rowIndex => {
        const queueData = QueueService.getByRowIndex(rowIndex);
        
        // 寫入 Detail
        const detailRow = [
          shipmentId,
          queueData.queueId,
          queueData.esOrderNo,
          queueData.sku,
          queueData.color,
          queueData.size,
          queueData.qtyOrdered,
          ''  // OrderSummary 暫時為空，後續可填入
        ];
        
        detailSheet.appendRow(detailRow);
        
        // 更新 Queue 的 Box_ID
        QueueService.updateRow(rowIndex, { boxId: shipmentId });
      });
      
      // 3. 計算並更新 OrderSummary
      updateOrderSummary(shipmentId);
      
      logInfo(`箱號 ${shipmentId} 建立完成，包含 ${queueRowIndices.length} 個品項`);
      
      return {
        success: true,
        shipmentId: shipmentId
      };
      
    } catch (error) {
      logError('建立箱號失敗', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * 更新箱號的 OrderSummary（摘要欄位）
   * 格式：ES5336x1, ES5401x2, ES5410x1
   */
  function updateOrderSummary(shipmentId) {
    const detailSheet = getDetailSheet();
    const data = detailSheet.getDataRange().getValues();
    
    // 找出此箱號的所有明細
    const shipmentDetails = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][SHIPMENT_DETAIL_COLS.SHIPMENT_ID] === shipmentId) {
        shipmentDetails.push({
          rowIndex: i + 1,
          orderNo: data[i][SHIPMENT_DETAIL_COLS.ES_ORDER_NO],
          qty: data[i][SHIPMENT_DETAIL_COLS.QTY_IN_SHIPMENT]
        });
      }
    }
    
    // 以 orderNo 分組加總數量
    const orderMap = {};
    
    shipmentDetails.forEach(detail => {
      if (!orderMap[detail.orderNo]) {
        orderMap[detail.orderNo] = 0;
      }
      orderMap[detail.orderNo] += detail.qty;
    });
    
    // 產生摘要字串
    const summary = Object.entries(orderMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([orderNo, qty]) => `${orderNo}x${qty}`)
      .join(', ');
    
    // 更新所有相關列的 OrderSummary
    shipmentDetails.forEach(detail => {
      detailSheet.getRange(detail.rowIndex, SHIPMENT_DETAIL_COLS.ORDER_SUMMARY + 1).setValue(summary);
    });
    
    logInfo(`更新箱號 ${shipmentId} 的 OrderSummary: ${summary}`);
  }
  
  /**
   * 查詢箱號資訊
   * @param {string} shipmentId - 箱號 ID
   * @return {Object} 箱號資訊與明細
   */
  function getShipmentInfo(shipmentId) {
    const headerSheet = getHeaderSheet();
    const detailSheet = getDetailSheet();
    
    // 查詢 Header
    const headerData = headerSheet.getDataRange().getValues();
    let headerInfo = null;
    
    for (let i = 1; i < headerData.length; i++) {
      if (headerData[i][SHIPMENT_HEADER_COLS.SHIPMENT_ID] === shipmentId) {
        headerInfo = {
          shipmentId: headerData[i][SHIPMENT_HEADER_COLS.SHIPMENT_ID],
          trackingJPtoTW: headerData[i][SHIPMENT_HEADER_COLS.TRACKING_JP_TO_TW],
          shipDateJP: headerData[i][SHIPMENT_HEADER_COLS.SHIP_DATE_JP],
          etaTW: headerData[i][SHIPMENT_HEADER_COLS.ETA_TW],
          arriveDateTW: headerData[i][SHIPMENT_HEADER_COLS.ARRIVE_DATE_TW],
          status: headerData[i][SHIPMENT_HEADER_COLS.STATUS],
          memo: headerData[i][SHIPMENT_HEADER_COLS.MEMO]
        };
        break;
      }
    }
    
    if (!headerInfo) {
      return null;
    }
    
    // 查詢 Detail
    const detailData = detailSheet.getDataRange().getValues();
    const details = [];
    
    for (let i = 1; i < detailData.length; i++) {
      if (detailData[i][SHIPMENT_DETAIL_COLS.SHIPMENT_ID] === shipmentId) {
        details.push({
          queueId: detailData[i][SHIPMENT_DETAIL_COLS.QUEUE_ID],
          esOrderNo: detailData[i][SHIPMENT_DETAIL_COLS.ES_ORDER_NO],
          sku: detailData[i][SHIPMENT_DETAIL_COLS.SKU],
          color: detailData[i][SHIPMENT_DETAIL_COLS.COLOR],
          size: detailData[i][SHIPMENT_DETAIL_COLS.SIZE],
          qtyInShipment: detailData[i][SHIPMENT_DETAIL_COLS.QTY_IN_SHIPMENT],
          orderSummary: detailData[i][SHIPMENT_DETAIL_COLS.ORDER_SUMMARY]
        });
      }
    }
    
    return {
      header: headerInfo,
      details: details
    };
  }
  
  /**
   * 取得揀貨視圖（彙總同品項）
   */
  function getPickingView(shipmentId) {
    const shipmentInfo = getShipmentInfo(shipmentId);
    
    if (!shipmentInfo) {
      return null;
    }
    
    // 以 SKU+Color+Size 分組
    const summaryMap = {};
    
    shipmentInfo.details.forEach(detail => {
      const key = `${detail.sku}|${detail.color}|${detail.size}`;
      
      if (!summaryMap[key]) {
        summaryMap[key] = {
          sku: detail.sku,
          color: detail.color,
          size: detail.size,
          totalQty: 0,
          orderSummary: detail.orderSummary
        };
      }
      
      summaryMap[key].totalQty += detail.qtyInShipment;
    });
    
    return {
      header: shipmentInfo.header,
      items: Object.values(summaryMap)
    };
  }
  
  // 公開 API
  return {
    createShipment: createShipment,
    updateOrderSummary: updateOrderSummary,
    getShipmentInfo: getShipmentInfo,
    getPickingView: getPickingView
  };
  
})();
