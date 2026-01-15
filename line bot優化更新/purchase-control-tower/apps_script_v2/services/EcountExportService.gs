/**
 * EcountExportService.gs
 * ECOUNT 匯出功能
 * - 匯出摘要 CSV (ERP銷貨單號, 摘要)
 * - 匯出狀態 CSV (ERP銷貨單號, 進行狀態)
 * - 匯出採購單 Excel (Template-7 格式)
 * - 匯出選取品項 CSV
 * - 匯出選取品項 ECOUNT PO Excel
 */

/**
 * 匯出摘要 CSV (已購未回寫 ERP)
 * 格式：ERP銷貨單號, 摘要
 * @returns {object} { success, file: {id, url, name}, updatedRows }
 */
function apiExportMemoCSV() {
  try {
    const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    const queueSheet = ss.getSheetByName('Queue');
    const soMapSheet = ss.getSheetByName('SO_Map');
    
    if (!queueSheet) {
      return { success: false, error: 'Queue 工作表不存在' };
    }

    // 取得 SO_Map 對照表
    const soMap = getSoMap_(soMapSheet);
    
    // 取得已購未回寫的資料
    const queueData = queueSheet.getDataRange().getValues();
    const header = queueData[0];
    
    const csvRows = [['ERP銷貨單號', '摘要']];
    const toWriteRowIndexes = [];
    
    for (let i = 1; i < queueData.length; i++) {
      const row = queueData[i];
      const status = row[8] || ''; // Purchase_Status
      const wrote = (row[22] || '').toString().trim().toLowerCase() === '是'; // 已回寫ERP
      
      if (status === '已購' && !wrote) {
        const esOrderNo = row[1] || ''; // ES_Order_No
        const erpSoNo = soMap[esOrderNo] || '';
        const memo = row[27] || ''; // 採購備註
        
        if (erpSoNo) {
          csvRows.push([erpSoNo, memo]);
          toWriteRowIndexes.push(i + 1); // 1-based
        }
      }
    }
    
    // 產生 CSV
    const csvContent = csvRows.map(row => row.map(escapeCSV_).join(',')).join('\n');
    const fileName = `so_memo_update_${Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd-HHmmss')}.csv`;
    const file = createCsvFile_(fileName, csvContent);
    
    // 標記已回寫
    if (toWriteRowIndexes.length > 0) {
      toWriteRowIndexes.forEach(rowIndex => {
        queueSheet.getRange(rowIndex, 23).setValue('是'); // 已回寫ERP
      });
    }
    
    return {
      success: true,
      file: file,
      updatedRows: toWriteRowIndexes.length
    };
    
  } catch (error) {
    Logger.log('exportMemoCSV 錯誤：' + error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 匯出進行狀態 CSV
 * 格式：ERP銷貨單號, 進行狀態
 * @returns {object} { success, file: {id, url, name} }
 */
function apiExportStatusCSV() {
  try {
    const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    const queueSheet = ss.getSheetByName('Queue');
    const soMapSheet = ss.getSheetByName('SO_Map');
    
    if (!queueSheet) {
      return { success: false, error: 'Queue 工作表不存在' };
    }

    // 取得 SO_Map 對照表
    const soMap = getSoMap_(soMapSheet);
    
    // 取得已購未回寫的資料
    const queueData = queueSheet.getDataRange().getValues();
    const csvRows = [['ERP銷貨單號', '進行狀態']];
    
    for (let i = 1; i < queueData.length; i++) {
      const row = queueData[i];
      const status = row[8] || ''; // Purchase_Status
      const wrote = (row[22] || '').toString().trim().toLowerCase() === '是';
      
      if (status === '已購' && !wrote) {
        const esOrderNo = row[1] || '';
        const erpSoNo = soMap[esOrderNo] || '';
        
        if (erpSoNo) {
          csvRows.push([erpSoNo, '已購買']);
        }
      }
    }
    
    // 產生 CSV
    const csvContent = csvRows.map(row => row.map(escapeCSV_).join(',')).join('\n');
    const fileName = `so_status_update_${Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd-HHmmss')}.csv`;
    const file = createCsvFile_(fileName, csvContent);
    
    return {
      success: true,
      file: file
    };
    
  } catch (error) {
    Logger.log('exportStatusCSV 錯誤：' + error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 匯出採購單 Excel (Template-7 格式)
 * @param {string} batchId - 批次 ID
 * @returns {object} { success, file: {id, url, name} }
 */
function apiExportPurchaseOrderExcel(batchId) {
  try {
    if (!batchId) {
      return { success: false, error: '缺少批次 ID' };
    }

    const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    const queueSheet = ss.getSheetByName('Queue');
    const batchMetaSheet = ss.getSheetByName('Batch_Meta');
    
    if (!queueSheet) {
      return { success: false, error: 'Queue 工作表不存在' };
    }

    // 取得批次資訊
    let batchInfo = { supplier: '', rate: '', shipping: '', jpOrder: '' };
    if (batchMetaSheet) {
      const batchData = batchMetaSheet.getDataRange().getValues();
      for (let i = 1; i < batchData.length; i++) {
        if (batchData[i][0] === batchId) {
          batchInfo = {
            supplier: batchData[i][1] || '',
            rate: batchData[i][2] || '',
            shipping: batchData[i][3] || '',
            jpOrder: batchData[i][4] || ''  // 日本訂單號在第5欄（索引4）
          };
          break;
        }
      }
    }
    
    // 取得批次內的 Queue 資料
    const queueData = queueSheet.getDataRange().getValues();
    const items = [];
    
    Logger.log(`正在搜尋批次 ID: ${batchId}`);
    
    for (let i = 1; i < queueData.length; i++) {
      const row = queueData[i];
      const rowBatchId = (row[15] || '').toString().trim();
      
      if (rowBatchId === batchId.trim()) { // Batch_ID (比對時去除空白)
        items.push({
          sku: row[3] || '',
          productName: row[2] || '',
          color: row[4] || '',
          size: row[5] || '',
          qty: row[6] || 1,
          unitPrice: row[13] || '',
          esOrderNo: row[1] || ''
        });
      }
    }
    
    Logger.log(`找到 ${items.length} 筆資料`);
    
    if (items.length === 0) {
      return { success: false, error: '批次內無資料' };
    }
    
    // 合併同品項
    const mergedItems = mergeItems_(items);
    
    // 產生 Excel（Template-7 格式）
    const excelData = generatePOExcelData_(mergedItems, batchInfo);
    const fileName = `PO_${batchId}_${Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd-HHmmss')}`;
    const file = createExcelFromValues_(fileName, '採購單', excelData);
    
    return {
      success: true,
      file: file
    };
    
  } catch (error) {
    Logger.log('exportPurchaseOrderExcel 錯誤：' + error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 匯出選取品項 CSV
 * @param {array} rowIndexes - 列索引陣列 (1-based)
 * @param {string} supplier - 供應商
 * @param {number} shipping - 運費
 * @returns {object} { success, file: {id, url, name} }
 */
function apiExportSelectedItemsCSV(rowIndexes, supplier, shipping) {
  try {
    if (!rowIndexes || rowIndexes.length === 0) {
      return { success: false, error: '請提供要匯出的列索引' };
    }

    const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    const queueSheet = ss.getSheetByName('Queue');
    
    const queueData = queueSheet.getDataRange().getValues();
    const csvRows = [['供應商', '日期', 'SKU', '品名', '規格', '數量', '單價', 'ES訂單號', '日本訂單號', '日本貨運單號']];
    
    const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd');
    
    rowIndexes.forEach(rowIndex => {
      if (rowIndex > 0 && rowIndex < queueData.length) {
        const row = queueData[rowIndex - 1];
        const spec = [row[4] || '', row[5] || ''].filter(Boolean).join('/');
        
        csvRows.push([
          supplier || '',
          today,
          row[3] || '',
          row[2] || '',
          spec,
          row[6] || 1,
          row[13] || '',
          row[1] || '',
          '',
          ''
        ]);
      }
    });
    
    // 加入運費行
    if (shipping && shipping > 0) {
      csvRows.push([supplier || '', '', 'SHIPPING', '運費', '', 1, shipping, '', '', '']);
    }
    
    // 產生 CSV
    const csvContent = csvRows.map(row => row.map(escapeCSV_).join(',')).join('\n');
    const fileName = `selected_items_${Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd-HHmmss')}.csv`;
    const file = createCsvFile_(fileName, csvContent);
    
    return {
      success: true,
      file: file
    };
    
  } catch (error) {
    Logger.log('exportSelectedItemsCSV 錯誤：' + error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 匯出選取品項 ECOUNT 採購單 Excel
 * @param {array} rowIndexes - 列索引陣列
 * @param {object} formData - 表單資料 { supplier, jpOrder, rate, shipping, docDate, prices }
 * @returns {object} { success, file: {id, url, name} }
 */
function apiExportSelectedPOExcel(rowIndexes, formData) {
  try {
    if (!rowIndexes || rowIndexes.length === 0) {
      return { success: false, error: '請提供要匯出的列索引' };
    }

    const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    const queueSheet = ss.getSheetByName('Queue');
    
    const queueData = queueSheet.getDataRange().getValues();
    const items = [];
    
    rowIndexes.forEach((rowIndex, idx) => {
      if (rowIndex > 0 && rowIndex < queueData.length) {
        const row = queueData[rowIndex - 1];
        items.push({
          sku: row[3] || '',
          productName: row[2] || '',
          color: row[4] || '',
          size: row[5] || '',
          qty: row[6] || 1,
          unitPrice: formData.prices && formData.prices[idx] ? formData.prices[idx] : (row[13] || ''),
          esOrderNo: row[1] || ''
        });
      }
    });
    
    const batchInfo = {
      supplier: formData.supplier || '',
      rate: formData.rate || '',
      shipping: formData.shipping || '',
      jpOrder: formData.jpOrder || '',
      docDate: formData.docDate || ''
    };
    
    // 合併同品項
    const mergedItems = mergeItems_(items);
    
    // 產生 Excel
    const excelData = generatePOExcelData_(mergedItems, batchInfo);
    const fileName = `PO_Selected_${Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd-HHmmss')}`;
    const file = createExcelFromValues_(fileName, '採購單', excelData);
    
    return {
      success: true,
      file: file
    };
    
  } catch (error) {
    Logger.log('exportSelectedPOExcel 錯誤：' + error);
    return { success: false, error: error.toString() };
  }
}

// ========== 私有輔助函數 ==========

/**
 * 取得 SO_Map 對照表
 * @private
 */
function getSoMap_(soMapSheet) {
  const soMap = {};
  if (!soMapSheet) return soMap;
  
  const data = soMapSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const esOrderNo = data[i][0];
    const erpSoNo = data[i][1];
    if (esOrderNo && erpSoNo) {
      soMap[esOrderNo] = erpSoNo;
    }
  }
  return soMap;
}

/**
 * 合併同品項
 * @private
 */
function mergeItems_(items) {
  const mergedMap = {};
  
  items.forEach(item => {
    const key = `${item.sku}|${item.color}|${item.size}`;
    
    if (!mergedMap[key]) {
      mergedMap[key] = {
        sku: item.sku,
        productName: item.productName,
        color: item.color,
        size: item.size,
        qty: 0,
        unitPrice: item.unitPrice,
        orderSummary: {}
      };
    }
    
    mergedMap[key].qty += item.qty;
    
    // 記錄訂單摘要
    if (item.esOrderNo) {
      if (!mergedMap[key].orderSummary[item.esOrderNo]) {
        mergedMap[key].orderSummary[item.esOrderNo] = 0;
      }
      mergedMap[key].orderSummary[item.esOrderNo] += item.qty;
    }
  });
  
  // 轉換為陣列並生成訂單摘要字串
  return Object.values(mergedMap).map(item => {
    const summaryParts = Object.entries(item.orderSummary)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([orderNo, qty]) => `${orderNo}x${qty}`);
    item.orderSummaryText = summaryParts.join(', ');
    return item;
  });
}

/**
 * 產生 ECOUNT 採購單 Excel 資料
 * @private
 */
function generatePOExcelData_(items, batchInfo) {
  const rows = [];
  
  // 表頭
  rows.push([
    '日期', '序號', '客戶/供應商編碼', '客戶/供應商名稱', '承辦人', '收貨倉庫', '交易類型',
    '貨幣', '匯率', '交付日期', '日本訂單號', '日本貨運單號', '品項編碼', '品項名稱', '規格',
    '日文(摘要3)', '數量', '單價', '外幣金額', '稅前價格', '營業稅', '訂單號', '摘要'
  ]);
  
  const today = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd');
  
  // 供應商名稱映射
  let supplierName;
  if (batchInfo.supplier === 'freak-j') {
    supplierName = 'Freaks store-傑';
  } else if (batchInfo.supplier === 'zozo-j') {
    supplierName = 'ZOZOTOWN-傑';
  } else {
    supplierName = 'ZOZOTOWN-胡';
  }
  
  items.forEach((item, idx) => {
    const spec = [item.color, item.size].filter(Boolean).join('/');
    const amount = item.unitPrice * item.qty;
    
    rows.push([
      today,
      1,  // 序號固定為1
      supplierName,
      supplierName,
      'TUV',
      '100',
      '',
      "'00001",  // 貨幣代碼（前置單引號確保 Excel 保留前導零）
      batchInfo.rate || '',
      '',
      batchInfo.jpOrder || '',
      '',
      item.sku,
      item.productName,
      spec,
      item.productName,
      item.qty,
      item.unitPrice,
      amount,
      '',
      '',
      '',
      item.orderSummaryText
    ]);
  });
  
  // 加入運費行（如果有運費）
  if (batchInfo.shipping && batchInfo.shipping > 0) {
    rows.push([
      today,
      1,  // 序號固定為1
      supplierName,
      supplierName,
      'TUV',
      '100',
      '',
      "'00001",  // 貨幣代碼
      batchInfo.rate || '',
      '',
      batchInfo.jpOrder || '',
      '',
      'SHIPPING',  // 品項編碼
      '運費',  // 品項名稱
      '',  // 規格
      '',  // 日文(摘要3) - 留空
      1,  // 數量
      batchInfo.shipping,  // 單價
      batchInfo.shipping,  // 外幣金額
      '',  // 稅前價格
      '',  // 營業稅
      '',  // 訂單號
      ''   // 摘要 - 留空
    ]);
  }
  
  return rows;
}

// ==================== Testing Helpers ====================
// 這些函數用於測試，暴露私有函數以便診斷

const EcountExportService = {
  testing_mergeItems: function(items) {
    return mergeItems_(items);
  },
  
  testing_generatePOExcelData: function(items, batchInfo) {
    return generatePOExcelData_(items, batchInfo);
  }
};


/**
 * CSV 跳脫字元
 * @private
 */
function escapeCSV_(value) {
  const str = value == null ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * 建立 CSV 檔案
 * @private
 */
function createCsvFile_(fileName, content) {
  const blob = Utilities.newBlob(content, 'text/csv', fileName);
  const folder = ensureExportFolder_();
  const file = folder.createFile(blob);
  
  return {
    id: file.getId(),
    url: file.getUrl(),
    name: file.getName()
  };
}

/**
 * 建立 Excel 檔案
 * @private
 */
function createExcelFromValues_(baseName, sheetName, values) {
  const ss = SpreadsheetApp.create(baseName);
  try {
    const sheet = ss.getSheets()[0];
    if (sheetName) sheet.setName(sheetName);
    
    if (values && values.length) {
      // 先確保列數、欄數足夠
      const rows = values.length;
      const cols = values[0].length;
      if (sheet.getMaxRows() < rows) {
        sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
      }
      if (sheet.getMaxColumns() < cols) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), cols - sheet.getMaxColumns());
      }
      sheet.getRange(1, 1, rows, cols).setValues(values);
      
      // 格式化表頭
      sheet.getRange(1, 1, 1, cols)
        .setFontWeight('bold')
        .setBackground('#C9915D')
        .setFontColor('#FFFFFF');
    }
    
    // ⚠️ 關鍵：確保寫入已提交再匯出
    SpreadsheetApp.flush();
    Utilities.sleep(200);  // 等待寫入完成
    
    // 匯出為 Excel
    const url = `https://docs.google.com/spreadsheets/d/${ss.getId()}/export?format=xlsx`;
    const token = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error('HTTP ' + response.getResponseCode() + ' ' + response.getContentText());
    }
    
    const blob = response.getBlob().setName(baseName + '.xlsx');
    const folder = ensureExportFolder_();
    const file = folder.createFile(blob);
    
    // 刪除臨時試算表
    try {
      DriveApp.getFileById(ss.getId()).setTrashed(true);
    } catch (err) {
      Logger.log('無法刪除臨時試算表：' + err);
    }
    
    return {
      id: file.getId(),
      url: file.getUrl(),
      name: file.getName()
    };
    
  } catch (err) {
    Logger.log('Excel 匯出失敗：' + err);
    // 備用：匯出為 CSV
    const csvContent = (values || []).map(row => row.map(escapeCSV_).join(',')).join('\n');
    return createCsvFile_(baseName + '.csv', csvContent);
  }
}

/**
 * 確保匯出資料夾存在
 * @private
 */
function ensureExportFolder_() {
  const folderName = 'PurchaseExports';
  const folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}
