/**
 * PackingService.gs
 * 日本裝箱 + 台灣揀貨系統
 * 
 * 功能：
 * - 日本端：根據日本訂單號載入商品並裝箱
 * - 台灣端：根據箱號查詢內容物
 * - 統計：裝箱統計報表
 */

const PACKING_BOXES_SHEET_NAME = 'Packing_Boxes';

// 欄位索引
const PACKING_BOX_COLS = {
  BOX_ID: 0,              // A: Box_ID (批次ID-數字)
  BATCH_ID: 1,            // B: Batch_ID
  JP_ORDER_NO: 2,         // C: JP_Order_No
  BOX_NUMBER: 3,          // D: Box_Number (1, 2, 3...)
  QUEUE_ROW_INDEXES: 4,   // E: Queue_Row_Indexes (JSON陣列)
  ITEM_COUNT: 5,          // F: Item_Count (商品種類數)
  TOTAL_QTY: 6,           // G: Total_Qty (總數量)
  PACKED_AT: 7,           // H: Packed_At (裝箱時間)
  PACKED_BY: 8,           // I: Packed_By (裝箱人)
  SHIPPED_AT: 9,          // J: Shipped_At (寄出時間)
  PICKED_AT: 10,          // K: Picked_At (揀貨完成時間)
  PICKED_BY: 11,          // L: Picked_By (揀貨人)
  NOTES: 12               // M: Notes (備註)
};

const PackingService = (function() {
  
  /**
   * 取得Packing_Boxes工作表
   * @private
   */
  function getPackingBoxesSheet() {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(PACKING_BOXES_SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Packing_Boxes 工作表不存在，請先執行初始化腳本');
    }
    
    return sheet;
  }
  
  /**
   * 根據日本訂單號載入商品
   * @param {string} jpOrderNo - 日本訂單號
   * @returns {object} { batchId, items: [...], packed: [...], unpacked: [...] }
   */
  function loadItemsByJpOrder(jpOrderNo) {
    if (!jpOrderNo) {
      throw new Error('請提供日本訂單號');
    }
    
    // 1. 從Batch_Meta找到對應的批次ID
    const ss = getSpreadsheet();
    const batchMetaSheet = ss.getSheetByName('Batch_Meta');
    
    if (!batchMetaSheet) {
      throw new Error('Batch_Meta 工作表不存在');
    }
    
    const batchData = batchMetaSheet.getDataRange().getValues();
    let batchId = null;
    
    for (let i = 1; i < batchData.length; i++) {
      const row = batchData[i];
      // Batch_Meta欄位：[批次ID, 供應商, 匯率, 運費JPY, 日本訂單號, 建立時間]
      // 索引：          [0,      1,      2,    3,        4,            5]
      const rowJpOrder = (row[4] || '').toString().trim();  // 日本訂單號在第5欄（索引4）
      if (rowJpOrder === jpOrderNo.trim()) {
        batchId = row[0];
        break;
      }
    }
    
    if (!batchId) {
      throw new Error(`找不到日本訂單號 ${jpOrderNo} 對應的批次`);
    }
    
    // 2. 從Queue取得該批次的所有商品
    const queueSheet = ss.getSheetByName('Queue');
    const queueData = queueSheet.getDataRange().getValues();
    const items = [];
    
    for (let i = 1; i < queueData.length; i++) {
      const row = queueData[i];
      const rowBatchId = (row[QUEUE_COLS.BATCH_ID] || '').toString().trim();
      
      if (rowBatchId === batchId) {
        items.push({
          rowIndex: i + 1,
          esOrderNo: row[QUEUE_COLS.ES_ORDER_NO],
          sku: row[QUEUE_COLS.SKU],
          productName: row[QUEUE_COLS.PRODUCT_NAME],
          color: row[QUEUE_COLS.COLOR],
          size: row[QUEUE_COLS.SIZE],
          qty: row[QUEUE_COLS.QTY_ORDERED],
          boxId: row[QUEUE_COLS.BOX_ID] || ''
        });
      }
    }
    
    // 3. 分類已裝箱和未裝箱
    const packed = items.filter(item => item.boxId);
    const unpacked = items.filter(item => !item.boxId);
    
    return {
      batchId: batchId,
      jpOrderNo: jpOrderNo,
      items: items,
      packed: packed,
      unpacked: unpacked,
      totalQty: items.reduce((sum, item) => sum + item.qty, 0)
    };
  }
  
  /**
   * 自動生成下一個箱號
   * @param {string} batchId - 批次ID
   * @returns {number} 箱號（1, 2, 3...）
   */
  function generateBoxNumber(batchId) {
    const sheet = getPackingBoxesSheet();
    const data = sheet.getDataRange().getValues();
    
    let maxBoxNumber = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowBatchId = row[PACKING_BOX_COLS.BATCH_ID];
      const boxNumber = row[PACKING_BOX_COLS.BOX_NUMBER];
      
      if (rowBatchId === batchId && !isNaN(boxNumber)) {
        maxBoxNumber = Math.max(maxBoxNumber, parseInt(boxNumber));
      }
    }
    
    return maxBoxNumber + 1;
  }
  
  /**
 * 創建新箱子
 * @param {object} boxData - { batchId, jpOrderNo, queueRowIndexes: [...], notes, packedBy, customBoxNumber }
 * @returns {object} { boxId, boxNumber }
 */
function createPackingBox(boxData) {
  const { batchId, jpOrderNo, queueRowIndexes, notes, packedBy, customBoxNumber } = boxData;
  
  if (!batchId || !jpOrderNo || !queueRowIndexes || queueRowIndexes.length === 0) {
    throw new Error('缺少必要參數');
  }
  
  // 1. 使用自定義箱號或生成箱號
  const boxNumber = customBoxNumber || generateBoxNumber(batchId);
  const boxId = `${batchId}-${boxNumber}`;
  
  // 2. 計算統計
  const ss = getSpreadsheet();
  const queueSheet = ss.getSheetByName('Queue');
  
  let itemCount = queueRowIndexes.length;
  let totalQty = 0;
  
  queueRowIndexes.forEach(rowIndex => {
    const qty = queueSheet.getRange(rowIndex, QUEUE_COLS.QTY_ORDERED + 1).getValue();
    totalQty += qty || 0;
  });
  
  // 3. 寫入Packing_Boxes
  const sheet = getPackingBoxesSheet();
  const timestamp = new Date();
  
  sheet.appendRow([
    boxId,                                  // Box_ID
    batchId,                                // Batch_ID
    jpOrderNo,                              // JP_Order_No
    boxNumber,                              // Box_Number (自定義或自動生成)
    JSON.stringify(queueRowIndexes),        // Queue_Row_Indexes
    itemCount,                              // Item_Count
    totalQty,                               // Total_Qty
    timestamp,                              // Packed_At
    packedBy || 'System',                   // Packed_By
    '',                                     // Shipped_At
    '',                                     // Picked_At
    '',                                     // Picked_By
    notes || ''                             // Notes
  ]);
  
  // 4. 更新Queue表的Box_ID
  queueRowIndexes.forEach(rowIndex => {
    queueSheet.getRange(rowIndex, QUEUE_COLS.BOX_ID + 1).setValue(boxId);
  });
  
  Logger.log(`已創建箱子：${boxId}，包含 ${itemCount} 個品項，共 ${totalQty} 件`);
  
  return {
    success: true,
    boxId: boxId,
    boxNumber: boxNumber,
    itemCount: itemCount,
    totalQty: totalQty
  };
}
  
  /**
   * 根據箱號查詢內容
   * @param {string|number} boxNumber - 箱號（簡單數字，例如：1, 2, 3...）
   * @returns {object} 箱子詳細資訊
   */
  function getBoxContents(boxNumber) {
    try {
      Logger.log(`[getBoxContents] 開始查詢箱號: ${boxNumber}`);
      
      const sheet = getPackingBoxesSheet();
      
      if (!sheet) {
        throw new Error('無法取得 Packing_Boxes 工作表，請確認表格是否存在');
      }
      
      const data = sheet.getDataRange().getValues();
      Logger.log(`[getBoxContents] 讀取到 ${data.length} 行數據`);
      
      if (!boxNumber) {
        throw new Error('請提供箱號');
      }
      
      const searchBoxNumber = parseInt(boxNumber);
      
      if (isNaN(searchBoxNumber)) {
        throw new Error('箱號必須是數字（例如：1, 2, 3...）');
      }
      
      Logger.log(`[getBoxContents] 搜尋箱號: ${searchBoxNumber}`);
      
      // 查找箱子記錄 - 用Box_Number（D欄）搜尋
      let boxRow = null;
      let boxRowIndex = -1;
      let matchedRows = [];
      
      for (let i = 1; i < data.length; i++) {
        const rowBoxNumber = data[i][PACKING_BOX_COLS.BOX_NUMBER];
        
        if (parseInt(rowBoxNumber) === searchBoxNumber) {
          matchedRows.push({
            row: data[i],
            index: i + 1,
            packedAt: new Date(data[i][PACKING_BOX_COLS.PACKED_AT])
          });
        }
      }
      
      Logger.log(`[getBoxContents] 找到 ${matchedRows.length} 個匹配的箱子`);
      
      if (matchedRows.length === 0) {
        throw new Error(`找不到箱號：${searchBoxNumber}\n\n提示：請確認箱號是否正確`);
      }
      
      // 如果有多個相同箱號（來自不同批次），返回最新的
      if (matchedRows.length > 1) {
        matchedRows.sort((a, b) => b.packedAt - a.packedAt);
        Logger.log(`警告：找到 ${matchedRows.length} 個箱號 ${searchBoxNumber}，返回最新的`);
      }
      
      boxRow = matchedRows[0].row;
      boxRowIndex = matchedRows[0].index;
      
      Logger.log(`[getBoxContents] 選擇箱子: Box_ID=${boxRow[PACKING_BOX_COLS.BOX_ID]}`);
      
      // 從Queue取得商品明細 - 使用 Box_ID 查詢而非行索引
      const ss = getSpreadsheet();
      const queueSheet = ss.getSheetByName('Queue');
      
      if (!queueSheet) {
        throw new Error('無法取得 Queue 工作表');
      }
      
      const targetBoxId = boxRow[PACKING_BOX_COLS.BOX_ID];
      const queueData = queueSheet.getDataRange().getValues();
      const items = [];
      
      Logger.log(`[getBoxContents] 使用 Box_ID=${targetBoxId} 查詢 Queue 表`);
      
      // 遍歷 Queue 表，找出所有 Box_ID 匹配的商品
      for (let i = 1; i < queueData.length; i++) {
        const row = queueData[i];
        const rowBoxId = row[QUEUE_COLS.BOX_ID];
        
        if (rowBoxId && String(rowBoxId).trim() === String(targetBoxId).trim()) {
          items.push({
            esOrderNo: row[QUEUE_COLS.ES_ORDER_NO],
            sku: row[QUEUE_COLS.SKU],
            productName: row[QUEUE_COLS.PRODUCT_NAME],
            color: row[QUEUE_COLS.COLOR],
            size: row[QUEUE_COLS.SIZE],
            qty: row[QUEUE_COLS.QTY_ORDERED]
          });
        }
      }
      
      Logger.log(`[getBoxContents] 成功讀取 ${items.length} 個商品`);
      
      const result = {
        boxId: boxRow[PACKING_BOX_COLS.BOX_ID],
        batchId: boxRow[PACKING_BOX_COLS.BATCH_ID],
        jpOrderNo: boxRow[PACKING_BOX_COLS.JP_ORDER_NO],
        boxNumber: boxRow[PACKING_BOX_COLS.BOX_NUMBER],
        itemCount: boxRow[PACKING_BOX_COLS.ITEM_COUNT],
        totalQty: boxRow[PACKING_BOX_COLS.TOTAL_QTY],
        packedAt: boxRow[PACKING_BOX_COLS.PACKED_AT],
        packedBy: boxRow[PACKING_BOX_COLS.PACKED_BY],
        shippedAt: boxRow[PACKING_BOX_COLS.SHIPPED_AT],
        pickedAt: boxRow[PACKING_BOX_COLS.PICKED_AT],
        pickedBy: boxRow[PACKING_BOX_COLS.PICKED_BY],
        notes: boxRow[PACKING_BOX_COLS.NOTES],
        items: items
      };
      
      Logger.log(`[getBoxContents] 返回結果: Box ${result.boxNumber}, ${items.length} 件商品`);
      
      return result;
      
    } catch (error) {
      Logger.log(`[getBoxContents] 錯誤: ${error.message}\n堆疊: ${error.stack}`);
      throw error;
    }
  }
  
  /**
   * 列出批次的所有箱子
   * @param {string} batchId - 批次ID
   * @returns {array} 箱子列表
   */
  function listBoxesByBatch(batchId) {
    const sheet = getPackingBoxesSheet();
    const data = sheet.getDataRange().getValues();
    const boxes = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[PACKING_BOX_COLS.BATCH_ID] === batchId) {
        boxes.push({
          boxId: row[PACKING_BOX_COLS.BOX_ID],
          boxNumber: row[PACKING_BOX_COLS.BOX_NUMBER],
          itemCount: row[PACKING_BOX_COLS.ITEM_COUNT],
          totalQty: row[PACKING_BOX_COLS.TOTAL_QTY],
          packedAt: row[PACKING_BOX_COLS.PACKED_AT],
          shippedAt: row[PACKING_BOX_COLS.SHIPPED_AT],
          pickedAt: row[PACKING_BOX_COLS.PICKED_AT]
        });
      }
    }
    
    return boxes.sort((a, b) => a.boxNumber - b.boxNumber);
  }
  
  /**
   * 標記箱子已寄出
   * @param {string} boxId - 箱號
   * @param {Date} shippedAt - 寄出時間（可選，預設當前時間）
   */
  function markBoxShipped(boxId, shippedAt) {
    const sheet = getPackingBoxesSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][PACKING_BOX_COLS.BOX_ID] === boxId) {
        sheet.getRange(i + 1, PACKING_BOX_COLS.SHIPPED_AT + 1)
          .setValue(shippedAt || new Date());
        return { success: true, boxId: boxId };
      }
    }
    
    throw new Error(`找不到箱號：${boxId}`);
  }
  
  /**
   * 標記箱子已揀貨完成
   * @param {string} boxId - 箱號
   * @param {string} pickedBy - 揀貨人
   * @param {Date} pickedAt - 揀貨時間（可選，預設當前時間）
   */
  function markBoxPicked(boxId, pickedBy, pickedAt) {
    const sheet = getPackingBoxesSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][PACKING_BOX_COLS.BOX_ID] === boxId) {
        const timestamp = pickedAt || new Date();
        sheet.getRange(i + 1, PACKING_BOX_COLS.PICKED_AT + 1).setValue(timestamp);
        sheet.getRange(i + 1, PACKING_BOX_COLS.PICKED_BY + 1).setValue(pickedBy || 'System');
        return { success: true, boxId: boxId, pickedAt: timestamp };
      }
    }
    
    throw new Error(`找不到箱號：${boxId}`);
  }
  
  /**
   * 獲取裝箱統計報表
   * @param {string} batchId - 批次ID（可選）
   * @returns {object} 統計資訊
   */
  function getPackingStats(batchId) {
    const sheet = getPackingBoxesSheet();
    const data = sheet.getDataRange().getValues();
    
    let totalBoxes = 0;
    let totalItems = 0;
    let totalQty = 0;
    let shippedBoxes = 0;
    let pickedBoxes = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowBatchId = row[PACKING_BOX_COLS.BATCH_ID];
      
      if (!batchId || rowBatchId === batchId) {
        totalBoxes++;
        totalItems += row[PACKING_BOX_COLS.ITEM_COUNT] || 0;
        totalQty += row[PACKING_BOX_COLS.TOTAL_QTY] || 0;
        
        if (row[PACKING_BOX_COLS.SHIPPED_AT]) shippedBoxes++;
        if (row[PACKING_BOX_COLS.PICKED_AT]) pickedBoxes++;
      }
    }
    
    return {
      totalBoxes: totalBoxes,
      totalItems: totalItems,
      totalQty: totalQty,
      shippedBoxes: shippedBoxes,
      pickedBoxes: pickedBoxes,
      pendingShip: totalBoxes - shippedBoxes,
      pendingPick: totalBoxes - pickedBoxes
    };
  }
  
  // 公開API
  return {
    loadItemsByJpOrder: loadItemsByJpOrder,
    createPackingBox: createPackingBox,
    getBoxContents: getBoxContents,
    listBoxesByBatch: listBoxesByBatch,
    markBoxShipped: markBoxShipped,
    markBoxPicked: markBoxPicked,
    getPackingStats: getPackingStats
  };
  
})();
