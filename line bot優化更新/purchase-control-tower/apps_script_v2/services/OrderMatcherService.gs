/**
 * OrderMatcherService - 訂單比對工具 v2
 * 支援多訂單搜尋與到貨分配
 */

const OrderMatcherService = (function() {
  
  /**
   * 搜尋未滿足的訂單行
   * @param {Object} searchCriteria - { sku?, color?, size?, productName? }
   * @return {Array} 未滿足的訂單行陣列
   */
  function searchUnfilledOrders(searchCriteria) {
    const sheet = getSheet(QUEUE_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const results = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const qtyOrdered = row[QUEUE_COLS.QTY_ORDERED] || 0;
      const qtyAllocated = row[QUEUE_COLS.QTY_ALLOCATED] || 0;
      const remaining = qtyOrdered - qtyAllocated;
      
      // 只處理尚未完全滿足的訂單
      if (remaining <= 0) {
        continue;
      }
      
      // 檢查搜尋條件
      let match = true;
      
      if (searchCriteria.sku && row[QUEUE_COLS.SKU] !== searchCriteria.sku) {
        match = false;
      }
      if (searchCriteria.color && row[QUEUE_COLS.COLOR] !== searchCriteria.color) {
        match = false;
      }
      if (searchCriteria.size && row[QUEUE_COLS.SIZE] !== searchCriteria.size) {
        match = false;
      }
      if (searchCriteria.productName) {
        const productName = row[QUEUE_COLS.PRODUCT_NAME] || '';
        if (productName.indexOf(searchCriteria.productName) === -1) {
          match = false;
        }
      }
      
      if (match) {
        results.push({
          rowIndex: i + 1,
          esOrderNo: row[QUEUE_COLS.ES_ORDER_NO],
          productName: row[QUEUE_COLS.PRODUCT_NAME],
          sku: row[QUEUE_COLS.SKU],
          color: row[QUEUE_COLS.COLOR],
          size: row[QUEUE_COLS.SIZE],
          qtyOrdered: qtyOrdered,
          qtyAllocated: qtyAllocated,
          remaining: remaining,
          purchaseStatus: row[QUEUE_COLS.PURCHASE_STATUS]
        });
      }
    }
    
    // 依下單時間排序（假設列越前面越早下單）
    results.sort((a, b) => a.rowIndex - b.rowIndex);
    
    return results;
  }
  
  /**
   * 自動分配到貨數量
   * @param {Array} orderRows - searchUnfilledOrders 的結果
   * @param {number} arrivedQty - 到貨數量
   * @return {Object} { success: boolean, allocations: [...] }
   */
  function autoAllocate(orderRows, arrivedQty) {
    try {
      let remainingQty = arrivedQty;
      const allocations = [];
      
      for (const row of orderRows) {
        if (remainingQty <= 0) {
          break;
        }
        
        const allocateQty = Math.min(row.remaining, remainingQty);
        
        allocations.push({
          rowIndex: row.rowIndex,
          esOrderNo: row.esOrderNo,
          productName: row.productName,
          sku: row.sku,
          color: row.color,
          size: row.size,
          currentAllocated: row.qtyAllocated,
          allocateQty: allocateQty,
          newAllocated: row.qtyAllocated + allocateQty
        });
        
        remainingQty -= allocateQty;
      }
      
      return {
        success: true,
        allocations: allocations,
        remainingQty: remainingQty
      };
      
    } catch (error) {
      logError('自動分配失敗', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * 確認寫入分配結果
   * @param {Array} allocations - autoAllocate 的結果
   * @return {Object} { success: boolean, affectedRows: number }
   */
  function commitAllocations(allocations) {
    try {
      allocations.forEach(allocation => {
        QueueService.updateRow(allocation.rowIndex, {
          qtyAllocated: allocation.newAllocated
        });
        
        // 如果已完全滿足，可以更新狀態
        const queueData = QueueService.getByRowIndex(allocation.rowIndex);
        if (queueData.qtyAllocated >= queueData.qtyOrdered) {
          // 可以更新為「已配齊」等狀態
          // QueueService.updateRow(allocation.rowIndex, { purchaseStatus: '已配齊' });
        }
      });
      
      logInfo(`已寫入 ${allocations.length} 筆分配記錄`);
      
      return {
        success: true,
        affectedRows: allocations.length
      };
      
    } catch (error) {
      logError('寫入分配結果失敗', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  // 公開 API
  return {
    searchUnfilledOrders: searchUnfilledOrders,
    autoAllocate: autoAllocate,
    commitAllocations: commitAllocations
  };
  
})();
