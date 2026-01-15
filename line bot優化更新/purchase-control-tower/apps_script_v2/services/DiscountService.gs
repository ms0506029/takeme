/**
 * DiscountService - 折扣分攤服務
 * 依金額比例自動分攤折扣到每個商品
 */

const DiscountService = (function() {
  
  /**
   * 計算折扣分攤
   * @param {Array} items - 品項陣列，每個品項包含 { key, totalQty, listPrice }
   * @param {number} actualPaid - 實際付款金額
   * @return {Object} { success: boolean, items: [...], totalOriginal, totalAfterDiscount, discountRate }
   */
  function calculateDiscountAllocation(items, actualPaid) {
    try {
      // 1. 計算總原價
      let totalOriginal = 0;
      
      items.forEach(item => {
        const itemGross = (item.listPrice || 0) * (item.totalQty || 0);
        item.itemGross = itemGross;
        totalOriginal += itemGross;
      });
      
      if (totalOriginal === 0) {
        throw new Error('總原價為 0，無法計算折扣');
      }
      
      // 2. 計算折扣比例
      const discountRate = actualPaid / totalOriginal;
      
      // 3. 分攤折扣
      let totalAllocated = 0;
      
      items.forEach(item => {
        const itemNetTotal = Math.round(item.itemGross * discountRate);
        item.itemNetTotal = itemNetTotal;
        item.actualUnitPrice = itemNetTotal / item.totalQty;
        totalAllocated += itemNetTotal;
      });
      
      // 4. 處理四捨五入誤差
      const diff = actualPaid - totalAllocated;
      
      if (diff !== 0) {
        // 找到金額最大的品項
        let maxItem = items[0];
        items.forEach(item => {
          if (item.itemGross > maxItem.itemGross) {
            maxItem = item;
          }
        });
        
        // 將差額加到最大項
        maxItem.itemNetTotal += diff;
        maxItem.actualUnitPrice = maxItem.itemNetTotal / maxItem.totalQty;
      }
      
      logInfo('折扣分攤計算完成', {
        totalOriginal: totalOriginal,
        actualPaid: actualPaid,
        discountRate: discountRate,
        itemCount: items.length
      });
      
      return {
        success: true,
        items: items,
        totalOriginal: totalOriginal,
        totalAfterDiscount: actualPaid,
        discountRate: discountRate
      };
      
    } catch (error) {
      logError('計算折扣分攤失敗', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * 套用折扣分攤結果到 Queue
   * @param {Array} items - 經過 calculateDiscountAllocation 計算後的品項陣列
   * @return {Object} { success: boolean, affectedRows: number }
   */
  function applyDiscountToQueue(items) {
    try {
      let totalAffectedRows = 0;
      
      items.forEach(item => {
        if (item.key && item.actualUnitPrice !== undefined) {
          const result = QueueService.applyUnitPriceToKey(item.key, item.actualUnitPrice);
          totalAffectedRows += result.affectedRows;
        }
      });
      
      logInfo(`折扣分攤已套用到 ${totalAffectedRows} 個 Queue 行`);
      
      return {
        success: true,
        affectedRows: totalAffectedRows
      };
      
    } catch (error) {
      logError('套用折扣分攤失敗', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  // 公開 API
  return {
    calculateDiscountAllocation: calculateDiscountAllocation,
    applyDiscountToQueue: applyDiscountToQueue
  };
  
})();
