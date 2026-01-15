/**
 * ImportService.gs
 * 處理訂單匯入功能
 * - 從 Google Drive 匯入 EasyStore Excel
 * - 從本機上傳匯入 Excel
 * - 解析 EasyStore 格式並寫入 Queue 表
 */

/**
 * 從 Google Drive 匯入 EasyStore Excel
 * @param {string} fileId - Google Drive 檔案 ID
 * @returns {object} {success: boolean, data: {inserted: number, sheetId: string, sheetUrl: string}, error: string}
 */
function apiImportFromDrive(fileId) {
  try {
    // 檢查 Drive API 是否啟用
    checkDriveService_();

    if (!fileId) {
      return { success: false, error: '缺少檔案 ID' };
    }

    // 確保試算表已綁定
    const ss = getSpreadsheet();
    const queueSheet = ss.getSheetByName('Queue');
    
    if (!queueSheet) {
      return { success: false, error: 'Queue 工作表不存在，請先初始化系統' };
    }

    // 使用 Drive API 將 xlsx 轉換為 Google Sheets
    let convertedId = null;
    try {
      const meta = {
        mimeType: 'application/vnd.google-apps.spreadsheet',
        title: 'ES_IMPORT_' + Date.now()
      };
      const file = Drive.Files.copy(meta, fileId, { convert: true });
      convertedId = file.id;

      // 開啟轉換後的試算表
      const ssImport = SpreadsheetApp.openById(convertedId);
      const importSheet = ssImport.getSheets()[0];
      
      // 解析並匯入資料
      const result = parseAndImportEasyStoreData_(importSheet, queueSheet);
      
      // 清理臨時檔案
      try {
        Drive.Files.remove(convertedId);
      } catch (err) {
        Logger.log('清理臨時檔案失敗：' + err);
      }

      return {
        success: true,
        data: {
          inserted: result.inserted,
          sheetId: ss.getId(),
          sheetUrl: ss.getUrl()
        }
      };

    } catch (err) {
      // 清理臨時檔案
      if (convertedId) {
        try {
          Drive.Files.remove(convertedId);
        } catch (cleanErr) {
          Logger.log('清理臨時檔案失敗：' + cleanErr);
        }
      }
      throw err;
    }

  } catch (error) {
    Logger.log('importFromDrive 錯誤：' + error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 從本機上傳匯入 Excel（透過 base64）
 * @param {string} filename - 檔案名稱
 * @param {string} base64 - Base64 編碼的檔案內容
 * @returns {object} {success: boolean, data: {inserted: number}, error: string}
 */
function apiImportFromUpload(filename, base64) {
  try {
    // 檢查 Drive API 是否啟用
    checkDriveService_();

    if (!filename || !base64) {
      return { success: false, error: '缺少檔案名稱或內容' };
    }

    // 確保試算表已綁定
    const ss = getSpreadsheet();
    const queueSheet = ss.getSheetByName('Queue');
    
    if (!queueSheet) {
      return { success: false, error: 'Queue 工作表不存在，請先初始化系統' };
    }

    // 容錯：移除 data URL 前綴
    if (base64.indexOf(',') >= 0) {
      base64 = base64.split(',')[1];
    }
    
    // Safari 有時會插入換行或空白，先清理
    base64 = base64.replace(/\s/g, '');

    // 解碼 base64 並建立臨時檔案
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename);
    
    // 上傳到 Drive（臨時）
    const uploaded = DriveApp.createFile(blob);
    const uploadedId = uploaded.getId();
    
    let convertedId = null;
    try {
      // 轉換為 Google Sheets
      const meta = {
        mimeType: 'application/vnd.google-apps.spreadsheet',
        title: 'ES_UPLOAD_' + Date.now()
      };
      const file = Drive.Files.copy(meta, uploadedId, { convert: true });
      convertedId = file.id;

      // 開啟轉換後的試算表
      const ssImport = SpreadsheetApp.openById(convertedId);
      const importSheet = ssImport.getSheets()[0];
      
      // 解析並匯入資料
      const result = parseAndImportEasyStoreData_(importSheet, queueSheet);
      
      // 清理臨時檔案
      try {
        uploaded.setTrashed(true);
        Drive.Files.remove(convertedId);
      } catch (err) {
        Logger.log('清理臨時檔案失敗：' + err);
      }

      return {
        success: true,
        data: {
          inserted: result.inserted
        }
      };

    } catch (err) {
      // 清理臨時檔案
      try {
        uploaded.setTrashed(true);
        if (convertedId) Drive.Files.remove(convertedId);
      } catch (cleanErr) {
        Logger.log('清理臨時檔案失敗：' + cleanErr);
      }
      throw err;
    }

  } catch (error) {
    Logger.log('importFromUpload 錯誤：' + error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 解析 EasyStore Excel 並匯入到 Queue 表
 * @param {Sheet} importSheet - 要匯入的工作表
 * @param {Sheet} queueSheet - Queue 目標工作表
 * @returns {object} {inserted: number}
 * @private
 */
function parseAndImportEasyStoreData_(importSheet, queueSheet) {
  const data = importSheet.getDataRange().getValues();
  Logger.log(`[Import Debug] Total rows: ${data.length}`);
  
  if (data.length < 2) {
    throw new Error('檔案內容為空或格式不正確');
  }

  // 取得表頭並建立正規化對照表
  const importHeader = data[0];
  Logger.log(`[Import Debug] Headers: ${JSON.stringify(importHeader)}`);
  
  const headerMap = {};
  const normalizedHeaderMap = {};
  
  importHeader.forEach((h, i) => {
    if (h) {
      headerMap[h] = i;
      // 移除空白並轉小寫，作為正規化 key
      const normalizedKey = String(h).trim().toLowerCase().replace(/\s+/g, '');
      normalizedHeaderMap[normalizedKey] = i;
    }
  });

  // 欄位別名定義 (全部小寫且無空白)
  const COLUMN_ALIASES = {
    'orderNo': ['order', 'es訂單號', 'orderno', '訂單號碼', 'ordernumber', 'name', 'order name', 'order number'],
    'sku': ['sku', 'lineitemsku', '商品編號', '料號', 'variant sku', 'part number', 'item sku'],
    'productName': ['lineitemname', '品名', '商品名稱', 'title', 'producttitle', '商品', 'product', 'item name', 'description'],
    'color': ['lineitemvarianttitle', '顏色', 'color', 'variantcolor', 'option1value', '款式', 'variant option one value'],
    'size': ['lineitemvarianttitle2', '尺寸', 'size', 'variantsize', 'option2value', '規格', 'variant option two value'],
    'qty': ['lineitemquantity', '數量', 'qty', 'quantity'],
    'itemVariant': ['item variant', 'variant', 'option']
  };

  // 輔助函數：尋找欄位索引
  const findColIndex = (fieldKey) => {
    const aliases = COLUMN_ALIASES[fieldKey];
    if (!aliases) return null;
    
    for (const alias of aliases) {
      const normalizedAlias = alias.toLowerCase().replace(/\s+/g, '');
      if (normalizedHeaderMap[normalizedAlias] !== undefined) {
        return normalizedHeaderMap[normalizedAlias];
      }
    }
    return null;
  };

  // 檢查必要欄位
  const orderColIdx = findColIndex('orderNo');
  const skuColIdx = findColIndex('sku');

  if (orderColIdx === null && skuColIdx === null) {
    const foundHeaders = importHeader.join(', ');
    throw new Error(`找不到必要的欄位 (訂單號 或 SKU)。\n讀取到的標題列：${foundHeaders}\n請確認檔案是否包含正確的標題。`);
  }

  // 取得 Queue 表頭
  const queueHeader = queueSheet.getRange(1, 1, 1, queueSheet.getLastColumn()).getValues()[0];
  
  // 準備要插入的資料
  const rows = [];
  let debugLog = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // 取得各欄位值
    const orderNo = orderColIdx !== null ? row[orderColIdx] : '';
    const sku = skuColIdx !== null ? row[skuColIdx] : '';
    
    // 其他欄位
    const nameIdx = findColIndex('productName');
    const colorIdx = findColIndex('color');
    const sizeIdx = findColIndex('size');
    const qtyIdx = findColIndex('qty');
    
    const productName = nameIdx !== null ? row[nameIdx] : '';
    let color = colorIdx !== null ? row[colorIdx] : '';
    let size = sizeIdx !== null ? row[sizeIdx] : '';
    const qty = qtyIdx !== null ? parseInt(row[qtyIdx] || 1, 10) : 1;

    // 特殊處理：如果 Color/Size 為空，但有 Item Variant，則嘗試解析
    if (!color && !size) {
      const variantIdx = findColIndex('itemVariant');
      if (variantIdx !== null) {
        const variantStr = String(row[variantIdx] || '');
        // 常見格式： "Color / Size" 或 "Color Size"
        if (variantStr.includes('/')) {
          const parts = variantStr.split('/').map(p => p.trim());
          if (parts.length >= 1) color = parts[0];
          if (parts.length >= 2) size = parts[1];
        } else {
          // 嘗試用空白分割，但這比較不準確，假設最後一個是尺寸
          const parts = variantStr.trim().split(/\s+/);
          if (parts.length > 1) {
            size = parts.pop();
            color = parts.join(' ');
          } else {
            color = variantStr; // 只有一段，當作顏色
          }
        }
      }
    }
    
    // 跳過空行
    if (!orderNo && !sku) {
       continue;
    }

    // 建立新列資料（雙語對應，確保能對應到 Queue 表頭）
    const newRow = {};
    
    // 核心欄位
    newRow['ES_Order_No'] = orderNo;
    newRow['ES訂單號'] = orderNo;
    
    newRow['SKU'] = sku;
    // SKU 通常中英相同
    
    newRow['Product_Name'] = productName;
    newRow['品名'] = productName;
    newRow['Product Name'] = productName;
    
    newRow['Color'] = color;
    newRow['顏色'] = color;
    
    newRow['Size'] = size;
    newRow['尺寸'] = size;
    
    newRow['Qty_Ordered'] = qty;
    newRow['數量'] = qty;
    
    newRow['Purchase_Status'] = '待購';
    newRow['採購狀態'] = '待購';
    
    // 其他欄位初始化
    newRow['ExpectedShipMonth'] = '';
    newRow['預購月份'] = '';
    
    newRow['ExpectedShipTen'] = '';
    newRow['預購旬'] = '';
    
    newRow['ExpectedShipLabel'] = '';
    
    newRow['ListPrice'] = '';
    newRow['採購單價JPY'] = ''; // 舊版可能用這個
    
    newRow['ActualPurchasePrice'] = '';
    newRow['實際採購單價'] = '';
    
    newRow['SelectedForBatch'] = '';
    newRow['Batch_ID'] = '';
    newRow['採購批次ID'] = '';
    
    newRow['Box_ID'] = '';
    newRow['Tracking_JP_to_JP'] = '';
    newRow['Tracking_JP_to_TW'] = '';
    
    newRow['Last_Status_Update_At'] = '';
    newRow['Last_Status_Updated_By'] = '';
    newRow['Notify_Pushed_Flag'] = '';
    newRow['ReadyToNotify'] = '';
    newRow['Courier'] = '';
    
    newRow['鎖定人'] = '';
    newRow['鎖定時間'] = '';
    newRow['採購日期'] = '';
    newRow['採購備註'] = '';
    newRow['已回寫ERP'] = '';

    // 將資料對應到 Queue 表頭順序
    const rowValues = queueHeader.map(h => newRow[h] || '');
    rows.push(rowValues);
  }

  Logger.log(`[Import Debug] Parsed ${rows.length} rows from ${data.length - 1} source rows.`);

  // 排序：依據 ES_Order_No (第二欄，索引 1) 遞增排序
  rows.sort((a, b) => {
    const orderA = String(a[1] || '');
    const orderB = String(b[1] || '');
    return orderA.localeCompare(orderB, undefined, { numeric: true, sensitivity: 'base' });
  });

  // 寫入 Queue 表
  if (rows.length > 0) {
    const lastRow = queueSheet.getLastRow();
    queueSheet.getRange(lastRow + 1, 1, rows.length, queueHeader.length).setValues(rows);
  }

  // 找出未對應到的欄位，供前端除錯
  const mappedKeys = Object.keys(COLUMN_ALIASES).filter(key => findColIndex(key) !== null);
  const unmappedKeys = Object.keys(COLUMN_ALIASES).filter(key => findColIndex(key) === null);

  return { 
    inserted: rows.length,
    debug: {
      totalRows: data.length,
      headers: importHeader,
      parsedRows: rows.length,
      mappedColumns: mappedKeys,
      unmappedColumns: unmappedKeys
    }
  };
}

/**
 * 檢查 Drive API 是否已啟用
 * @private
 */
function checkDriveService_() {
  if (typeof Drive === 'undefined') {
    throw new Error('系統未啟用 Drive API 服務。\n\n請依照以下步驟啟用：\n1. 回到 Apps Script 編輯器\n2. 點擊左側「服務」旁邊的「+」號\n3. 選擇 "Drive API"\n4. 點擊「新增」\n5. 重新部署 Web App');
  }
}
