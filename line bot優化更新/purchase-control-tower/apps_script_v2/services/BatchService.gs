/**
 * BatchService - 批次管理服務
 * 處理採購批次的建立、匯出等功能
 */

const BatchService = (function() {
  
  /**
   * 建立新批次
   * @param {string} batchName - 批次名稱（可選）
   * @return {Object} { success: boolean, batchId: string, itemCount: number }
   */
  function createBatch(batchName) {
    try {
      const batchId = batchName || `BATCH-${Date.now()}`;
      
      // 取得所有 SelectedForBatch = TRUE 且 Batch_ID 為空的行
      const sheet = getSheet(QUEUE_SHEET_NAME);
      const data = sheet.getDataRange().getValues();
      let itemCount = 0;
      
      for (let i = 1; i < data.length; i++) {
        const selectedForBatch = data[i][QUEUE_COLS.SELECTED_FOR_BATCH];
        const existingBatchId = data[i][QUEUE_COLS.BATCH_ID];
        
        if (selectedForBatch === true && !existingBatchId) {
          // 更新為此 Batch_ID
          const rowIndex = i + 1;
          QueueService.updateRow(rowIndex, {
            batchId: batchId,
            selectedForBatch: false  // 清除選取標記
          });
          itemCount++;
        }
      }
      
      logInfo(`建立批次 ${batchId}，包含 ${itemCount} 個品項`);
      
      return {
        success: true,
        batchId: batchId,
        itemCount: itemCount
      };
      
    } catch (error) {
      logError('建立批次失敗', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * 取得批次內容
   */
  function getBatchItems(batchId) {
    const sheet = getSheet(QUEUE_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const items = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][QUEUE_COLS.BATCH_ID] === batchId) {
        items.push({
          rowIndex: i + 1,
          data: QueueService.getByRowIndex(i + 1)
        });
      }
    }
    
    return items;
  }
  
  /**
   * 匯出批次（含摘要欄位）
   * 同品項合併，摘要欄位顯示所有訂單編號與數量
   * @return {Array} 匯出資料陣列
   */
  function exportBatch(batchId) {
    try {
      const items = getBatchItems(batchId);
      
      if (items.length === 0) {
        throw new Error(`批次 ${batchId} 沒有品項`);
      }
      
      // 取得批次資訊（包含運費）
      const ss = getSpreadsheet();
      const batchMetaSheet = ss.getSheetByName('Batch_Meta');
      let batchInfo = null;
      
      if (batchMetaSheet) {
        const data = batchMetaSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === batchId) {
            batchInfo = {
              supplier: data[i][1],
              rate: data[i][2],
              shipping: data[i][3]  // 運費JPY
            };
            break;
          }
        }
      }
      
      // 以 SKU + Color + Size 為 key 進行彙總
      const aggregatedMap = {};
      
      items.forEach(item => {
        const data = item.data;
        const key = `${data.sku}|${data.color}|${data.size}`;
        
        if (!aggregatedMap[key]) {
          aggregatedMap[key] = {
            sku: data.sku,
            productName: data.productName,
            color: data.color,
            size: data.size,
            totalQty: 0,
            actualPurchasePrice: data.actualPurchasePrice,
            orderMap: {}  // { orderNo: qty }
          };
        }
        
        // 累加數量
        aggregatedMap[key].totalQty += data.qtyOrdered;
        
        // 記錄訂單數量
        const orderNo = data.esOrderNo;
        if (!aggregatedMap[key].orderMap[orderNo]) {
          aggregatedMap[key].orderMap[orderNo] = 0;
        }
        aggregatedMap[key].orderMap[orderNo] += data.qtyOrdered;
      });
      
      // 轉換為匯出格式
      const exportData = [];
      
      // 標題列
      exportData.push([
        'SKU',
        '商品名稱',
        '顏色',
        '尺寸',
        '數量',
        '單價',
        '摘要（訂單編號與數量）'
      ]);
      
      // 資料列
      Object.values(aggregatedMap).forEach(item => {
        // 生成摘要字串：ES5336x1, ES5401x2, ES5410x1
        const summary = Object.entries(item.orderMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([orderNo, qty]) => `${orderNo}x${qty}`)
          .join(', ');
        
        exportData.push([
          item.sku,
          item.productName,
          item.color,
          item.size,
          item.totalQty,
          item.actualPurchasePrice,
          summary
        ]);
      });
      
      // 加入運費行（如果有運費）
      if (batchInfo && batchInfo.shipping && batchInfo.shipping > 0) {
        exportData.push([
          'SHIPPING',
          '運費',
          '',
          '',
          1,
          batchInfo.shipping,
          `批次運費 (${batchInfo.supplier || ''})`
        ]);
      }
      
      logInfo(`批次 ${batchId} 匯出完成，${exportData.length - 1} 個品項${batchInfo && batchInfo.shipping > 0 ? '（含運費）' : ''}`);
      
      return {
        success: true,
        data: exportData
      };
      
    } catch (error) {
      logError('匯出批次失敗', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * 創建批次並標記已購
   * @param {array} rowIndexes - 列索引陣列
   * @param {object} batchData - 批次資料 { supplier, jpOrder, rate, shipping }
   * @return {object} { success, batchId, updated }
   */
  function createBatchWithPurchase(rowIndexes, batchData) {
    try {
      if (!rowIndexes || rowIndexes.length === 0) {
        throw new Error('請提供要建立批次的列索引');
      }
      
      // 生成批次 ID
      const supplier = batchData.supplier || 'unknown';
      const timestamp = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd-HHmmss');
      const batchId = `${supplier}-${timestamp}`;
      
      // 儲存批次資訊到 Batch_Meta
      saveBatchMeta_(batchId, batchData);
      
      // 使用 QueueService 標記已購，並傳入已生成的 batchId
      const result = QueueService.markPurchased(rowIndexes, {
        ...batchData,
        createBatch: true,
        batchId: batchId  // 傳入已生成的 batchId，避免重複生成
      });
      
      logInfo(`建立批次 ${batchId} 並標記 ${result.updated} 筆為已購`);
      
      return {
        success: true,
        batchId: batchId,
        updated: result.updated
      };
      
    } catch (error) {
      logError('建立批次並標記已購失敗', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * 列出最近批次
   * @param {number} limit - 限制數量（預設 20）
   * @return {array} 批次列表
   */
  function listRecentBatches(limit) {
    try {
      const maxLimit = limit || 20;
      const ss = getSpreadsheet();
      const batchMetaSheet = ss.getSheetByName('Batch_Meta');
      
      if (!batchMetaSheet) {
        return [];
      }
      
      const data = batchMetaSheet.getDataRange().getValues();
      const batches = [];
      
      for (let i = 1; i < data.length; i++) {
        batches.push({
          id: data[i][0],
          supplier: data[i][1],
          rate: data[i][2],
          shipping: data[i][3],
          jpOrder: data[i][4],
          created: data[i][5],
          count: getBatchItemCount_(data[i][0])
        });
      }
      
      // 按建立時間排序（最新的在前）
      batches.sort((a, b) => new Date(b.created) - new Date(a.created));
      
      return batches.slice(0, maxLimit);
      
    } catch (error) {
      logError('列出批次失敗', error);
      return [];
    }
  }

  /**
   * 取得分頁的批次列表
   * @param {number} page - 頁碼 (1-based)
   * @param {number} pageSize - 每頁數量
   * @return {object} { items, totalCount, totalPages, currentPage }
   */
  function getBatchesPaginated(page, pageSize) {
    try {
      const currentPage = page || 1;
      const size = pageSize || 20;
      
      const ss = getSpreadsheet();
      const batchMetaSheet = ss.getSheetByName('Batch_Meta');
      
      if (!batchMetaSheet) {
        // Debug: List all sheets
        const sheets = ss.getSheets().map(s => s.getName());
        logError(`找不到 Batch_Meta 表單。可用表單: ${sheets.join(', ')}`);
        return { items: [], totalCount: 0, totalPages: 0, currentPage: 1 };
      }
      
      const data = batchMetaSheet.getDataRange().getValues();
      logInfo(`Batch_Meta 讀取到 ${data.length} 筆資料`);
      
      // 優化：一次讀取 Queue 表單，建立批次計數映射表
      const batchCountMap = {};
      try {
        const queueSheet = getSheet(QUEUE_SHEET_NAME);
        const queueData = queueSheet.getDataRange().getValues();
        
        for (let i = 1; i < queueData.length; i++) {
          const batchId = queueData[i][QUEUE_COLS.BATCH_ID];
          if (batchId) {
            batchCountMap[batchId] = (batchCountMap[batchId] || 0) + 1;
          }
        }
      } catch (e) {
        logError('讀取 Queue 表單失敗，批次數量將顯示為 0', e);
      }
      
      const batches = [];
      
      for (let i = 1; i < data.length; i++) {
        const batchId = data[i][0];
        batches.push({
          id: batchId,
          supplier: data[i][1],
          rate: data[i][2],
          shipping: data[i][3],
          jpOrder: data[i][4],
          created: data[i][5],
          count: batchCountMap[batchId] || 0  // 從映射表取得數量
        });
      }
      
      // 按建立時間排序（最新的在前）
      batches.sort((a, b) => new Date(b.created) - new Date(a.created));
      
      const totalCount = batches.length;
      const totalPages = Math.ceil(totalCount / size);
      const startIndex = (currentPage - 1) * size;
      const items = batches.slice(startIndex, startIndex + size);
      
      return {
        items: items,
        totalCount: totalCount,
        totalPages: totalPages,
        currentPage: currentPage
      };
      
    } catch (error) {
      logError('取得分頁批次失敗', error);
      return { items: [], totalCount: 0, totalPages: 0, currentPage: 1, error: error.toString() };
    }
  }
  
  /**
   * 取得批次詳細資訊
   * @param {string} batchId - 批次 ID
   * @return {object} { batchInfo, items }
   */
  function getBatchDetails(batchId) {
    try {
      const ss = getSpreadsheet();
      const batchMetaSheet = ss.getSheetByName('Batch_Meta');
      
      let batchInfo = null;
      
      if (batchMetaSheet) {
        const data = batchMetaSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === batchId) {
            batchInfo = {
              id: data[i][0],
              supplier: data[i][1],
              rate: data[i][2],
              shipping: data[i][3],
              created: data[i][4]
            };
            break;
          }
        }
      }
      
      const items = getBatchItems(batchId);
      
      return {
        success: true,
        batchInfo: batchInfo,
        items: items
      };
      
    } catch (error) {
      logError('取得批次詳情失敗', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * 下載批次採購單
   * @param {string} batchId - 批次 ID
   * @return {object} { success, file }
   */
  function downloadBatchPO(batchId) {
    try {
      // 使用 EcountExportService 匯出
      const result = apiExportPurchaseOrderExcel(batchId);
      return result;
      
    } catch (error) {
      logError('下載批次採購單失敗', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  /**
   * 更新批次日本訂單號
   * @param {string} batchId - 批次 ID
   * @param {string} jpOrderNo - 日本訂單號
   * @return {object} { success, updated }
   */
  function updateBatchJPOrderNo(batchId, jpOrderNo) {
    try {
      const sheet = getSheet('Batch_Meta');
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === batchId) {
          // 更新第 5 欄 (Index 4) - Japan Order No
          sheet.getRange(i + 1, 5).setValue(jpOrderNo);
          
          return {
            success: true,
            updated: true
          };
        }
      }
      
      return {
        success: false,
        error: '找不到指定批次 ID'
      };
      
    } catch (error) {
      logError('更新批次日本訂單號失敗', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  // ========== 私有輔助函數 ==========
  
  /**
   * 儲存批次資訊
   * @private
   */
  function saveBatchMeta_(batchId, batchData) {
    const ss = getSpreadsheet();
    let batchMetaSheet = ss.getSheetByName('Batch_Meta');
    
    if (!batchMetaSheet) {
      batchMetaSheet = ss.insertSheet('Batch_Meta');
      batchMetaSheet.getRange(1, 1, 1, 6).setValues([['批次ID', '供應商', '匯率', '運費JPY', '日本訂單號', '建立時間']]);
      batchMetaSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#f6f8fa');
    }
    
    const lastRow = batchMetaSheet.getLastRow();
    const now = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
    
    batchMetaSheet.getRange(lastRow + 1, 1, 1, 6).setValues([[
      batchId,
      batchData.supplier || '',
      batchData.rate || '',
      batchData.shipping || '',
      batchData.jpOrder || '',
      now
    ]]);
  }
  
  /**
   * 取得批次品項數量
   * @private
   */
  function getBatchItemCount_(batchId) {
    const sheet = getSheet(QUEUE_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    let count = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][QUEUE_COLS.BATCH_ID] === batchId) {
        count++;
      }
    }
    
    return count;
  }
  
  // 公開 API
  return {
    createBatch: createBatch,
    getBatchItems: getBatchItems,
    exportBatch: exportBatch,
    // 新增的統一系統功能
    createBatchWithPurchase: createBatchWithPurchase,
    listRecentBatches: listRecentBatches,
    getBatchDetails: getBatchDetails,
    downloadBatchPO: downloadBatchPO,
    getBatchesPaginated: getBatchesPaginated,
    updateBatchJPOrderNo: updateBatchJPOrderNo
  };
  
})();

// ==================== 全域 API 函數 (供 google.script.run 呼叫) ====================

function apiGetRecentBatches(limit) {
  try {
    Logger.log('apiGetRecentBatches called');
    if (typeof BatchService === 'undefined') {
      Logger.log('Error: BatchService is undefined');
      return [];
    }
    var result = BatchService.listRecentBatches(limit);
    Logger.log('apiGetRecentBatches result: ' + (result ? result.length : 'null'));
    return result || [];
  } catch (e) {
    Logger.log('apiGetRecentBatches error: ' + e.toString());
    return [];
  }
}

function apiCreateBatchWithPurchase(rowIndexes, batchData) {
  return BatchService.createBatchWithPurchase(rowIndexes, batchData);
}

function apiGetBatchDetails(batchId) {
  return BatchService.getBatchDetails(batchId);
}

function apiDownloadBatchPO(batchId) {
  return BatchService.downloadBatchPO(batchId);
}
