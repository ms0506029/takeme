/**
 * 為 Batch_Meta 表新增「最後下載時間」欄位
 * 此函數會在現有欄位最後面追加新欄位，不會影響現有資料
 */
function addDownloadTimestampToBatchMeta() {
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Batch_Meta');
  
  if (!sheet) {
    Logger.log('❌ Batch_Meta 表不存在');
    return { success: false, error: 'Batch_Meta 表不存在' };
  }
  
  // 獲取當前表頭
  const lastCol = sheet.getLastColumn();
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  Logger.log(`當前表頭 (${lastCol} 欄): ${currentHeaders.join(', ')}`);
  
  // 檢查是否已有「最後下載時間」欄位
  if (currentHeaders.includes('最後下載時間')) {
    Logger.log('✅ 「最後下載時間」欄位已存在');
    return { success: true, message: '欄位已存在，無需新增' };
  }
  
  // 在最後一欄後面新增欄位
  const newColIndex = lastCol + 1;
  sheet.getRange(1, newColIndex).setValue('最後下載時間');
  sheet.getRange(1, newColIndex)
    .setFontWeight('bold')
    .setBackground('#f6f8fa')
    .setFontColor('#2c3e50');
  
  // 自動調整欄寬
  sheet.autoResizeColumn(newColIndex);
  
  Logger.log(`✅ 已在第 ${newColIndex} 欄新增「最後下載時間」欄位`);
  Logger.log(`新表頭: ${sheet.getRange(1, 1, 1, newColIndex).getValues()[0].join(', ')}`);
  
  return {
    success: true,
    message: `已新增「最後下載時間」欄位於第 ${newColIndex} 欄`,
    columnIndex: newColIndex - 1  // 回傳索引（0-based）
  };
}

/**
 * 更新批次的最後下載時間
 * @param {string} batchId - 批次 ID
 * @returns {object} { success, updated }
 */
function updateBatchDownloadTime(batchId) {
  try {
    const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Batch_Meta');
    
    if (!sheet) {
      return { success: false, error: 'Batch_Meta 表不存在' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // 找到「最後下載時間」欄位索引
    const downloadTimeColIndex = headers.indexOf('最後下載時間');
    if (downloadTimeColIndex === -1) {
      return { success: false, error: '找不到「最後下載時間」欄位' };
    }
    
    // 找到批次所在列
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === batchId) {
        const now = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
        sheet.getRange(i + 1, downloadTimeColIndex + 1).setValue(now);
        
        Logger.log(`✅ 已更新批次 ${batchId} 的下載時間: ${now}`);
        return { success: true, updated: true, timestamp: now };
      }
    }
    
    return { success: false, error: '找不到指定批次 ID' };
    
  } catch (error) {
    Logger.log('updateBatchDownloadTime 錯誤：' + error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 批量更新多個批次的下載時間
 * @param {Array} batchIds - 批次 ID 陣列
 * @returns {object} { success, updatedCount }
 */
function batchUpdateDownloadTimes(batchIds) {
  try {
    let updatedCount = 0;
    const errors = [];
    
    batchIds.forEach(batchId => {
      const result = updateBatchDownloadTime(batchId);
      if (result.success) {
        updatedCount++;
      } else {
        errors.push(`${batchId}: ${result.error}`);
      }
    });
    
    return {
      success: true,
      updatedCount: updatedCount,
      totalCount: batchIds.length,
      errors: errors
    };
    
  } catch (error) {
    Logger.log('batchUpdateDownloadTimes 錯誤：' + error);
    return { success: false, error: error.toString() };
  }
}
