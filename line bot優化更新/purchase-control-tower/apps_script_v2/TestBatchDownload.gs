/**
 * 測試批次下載功能
 * 這個檔案用於診斷為什麼批次下載的 Excel 是空白的
 */

/**
 * 測試函數：直接測試批次下載邏輯
 * 使用方式：
 * 1. 在 Apps Script 編輯器中選擇此函數
 * 2. 將下方的 TEST_BATCH_ID 改成您實際的批次ID（例如從截圖中的 'freak-j-20251023-143236'）
 * 3. 點擊執行
 * 4. 查看「執行項目」日誌
 */
function testBatchDownloadDiagnosis() {
  // ⚠️ 請將此處改成您實際的批次ID
  const TEST_BATCH_ID = 'freak-j-20251023-143236';
  
  Logger.log('========== 批次下載診斷開始 ==========');
  Logger.log('測試批次ID: ' + TEST_BATCH_ID);
  Logger.log('');
  
  // 步驟 1: 檢查試算表連接
  Logger.log('步驟 1: 檢查試算表連接');
  let ss;
  try {
    ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    Logger.log('✅ 試算表連接成功: ' + ss.getName());
  } catch (e) {
    Logger.log('❌ 試算表連接失敗: ' + e.toString());
    return;
  }
  Logger.log('');
  
  // 步驟 2: 檢查 Queue 工作表
  Logger.log('步驟 2: 檢查 Queue 工作表');
  const queueSheet = ss.getSheetByName('Queue');
  if (!queueSheet) {
    Logger.log('❌ 找不到 Queue 工作表');
    return;
  }
  Logger.log('✅ Queue 工作表存在');
  Logger.log('');
  
  // 步驟 3: 讀取所有數據
  Logger.log('步驟 3: 讀取所有數據');
  const queueData = queueSheet.getDataRange().getValues();
  Logger.log('總行數: ' + queueData.length);
  Logger.log('');
  
  // 步驟 4: 檢查表頭
  Logger.log('步驟 4: 檢查表頭');
  const headers = queueData[0];
  Logger.log('表頭總數: ' + headers.length);
  Logger.log('第 15 欄（索引 15）的欄位名稱: ' + headers[15]);
  
  // 尋找 Batch_ID 欄位
  let batchIdColIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] === 'Batch_ID' || headers[i] === '採購批次ID') {
      batchIdColIndex = i;
      Logger.log('✅ 找到批次ID欄位：索引 ' + i + '，名稱：' + headers[i]);
      break;
    }
  }
  
  if (batchIdColIndex === -1) {
    Logger.log('❌ 找不到批次ID欄位');
    return;
  }
  Logger.log('');
  
  // 步驟 5: 搜尋符合的資料
  Logger.log('步驟 5: 搜尋批次ID為 "' + TEST_BATCH_ID + '" 的資料');
  Logger.log('使用欄位索引: ' + batchIdColIndex);
  Logger.log('');
  
  const matchingRows = [];
  for (let i = 1; i < queueData.length; i++) {
    const row = queueData[i];
    const rowBatchId = (row[batchIdColIndex] || '').toString().trim();
    
    // 詳細記錄前 5 行進行比對診斷
    if (i <= 5) {
      Logger.log('第 ' + (i+1) + ' 行:');
      Logger.log('  - 原始值: "' + row[batchIdColIndex] + '"');
      Logger.log('  - 轉換後: "' + rowBatchId + '"');
      Logger.log('  - 目標值: "' + TEST_BATCH_ID + '"');
      Logger.log('  - 是否匹配: ' + (rowBatchId === TEST_BATCH_ID.trim()));
      Logger.log('');
    }
    
    if (rowBatchId === TEST_BATCH_ID.trim()) {
      matchingRows.push({
        rowNumber: i + 1,
        sku: row[3] || '',
        productName: row[2] || '',
        color: row[4] || '',
        size: row[5] || '',
        qty: row[6] || 1,
        unitPrice: row[13] || '',
        batchId: rowBatchId
      });
    }
  }
  
  Logger.log('========== 搜尋結果 ==========');
  Logger.log('找到 ' + matchingRows.length + ' 筆符合的資料');
  Logger.log('');
  
  if (matchingRows.length === 0) {
    Logger.log('❌ 沒有找到任何符合的資料！');
    Logger.log('');
    Logger.log('可能的原因：');
    Logger.log('1. 批次ID輸入錯誤（請確認大小寫和格式）');
    Logger.log('2. 資料中的批次ID有額外的空白或特殊字符');
    Logger.log('3. 批次ID欄位索引錯誤');
    Logger.log('');
    Logger.log('========== 顯示前 10 行的批次ID供參考 ==========');
    for (let i = 1; i < Math.min(11, queueData.length); i++) {
      const rowBatchId = (queueData[i][batchIdColIndex] || '').toString();
      Logger.log('第 ' + (i+1) + ' 行的批次ID: "' + rowBatchId + '" (長度: ' + rowBatchId.length + ')');
    }
  } else {
    Logger.log('✅ 成功找到資料！');
    Logger.log('');
    Logger.log('前 5 筆資料明細：');
    for (let i = 0; i < Math.min(5, matchingRows.length); i++) {
      const item = matchingRows[i];
      Logger.log('第 ' + (i+1) + ' 筆（原始行號 ' + item.rowNumber + '）:');
      Logger.log('  - SKU: ' + item.sku);
      Logger.log('  - 品名: ' + item.productName);
      Logger.log('  - 顏色: ' + item.color);
      Logger.log('  - 尺寸: ' + item.size);
      Logger.log('  - 數量: ' + item.qty);
      Logger.log('  - 單價: ' + item.unitPrice);
      Logger.log('');
    }
  }
  
  Logger.log('========== 診斷完成 ==========');
}


/**
 * 快速測試：列出所有不同的批次ID
 */
function listAllBatchIds() {
  Logger.log('========== 列出所有批次ID ==========');
  
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  const queueSheet = ss.getSheetByName('Queue');
  const queueData = queueSheet.getDataRange().getValues();
  const headers = queueData[0];
  
  let batchIdColIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] === 'Batch_ID' || headers[i] === '採購批次ID') {
      batchIdColIndex = i;
      break;
    }
  }
  
  if (batchIdColIndex === -1) {
    Logger.log('找不到批次ID欄位');
    return;
  }
  
  const batchIds = new Set();
  for (let i = 1; i < queueData.length; i++) {
    const batchId = (queueData[i][batchIdColIndex] || '').toString().trim();
    if (batchId) {
      batchIds.add(batchId);
    }
  }
  
  const sortedBatchIds = Array.from(batchIds).sort().reverse();
  Logger.log('共找到 ' + sortedBatchIds.length + ' 個不同的批次ID:');
  Logger.log('');
  sortedBatchIds.forEach((id, index) => {
    Logger.log((index + 1) + '. ' + id);
  });
  
  Logger.log('');
  Logger.log('========== 完成 ==========');
}


/**
 * 完整測試批次下載全流程
 */
function testFullBatchDownloadProcess() {
  // ⚠️ 請將此處改成您實際的批次ID
  const TEST_BATCH_ID = 'freak-j-20251023-143236';
  
  Logger.log('========== 完整流程測試開始 ==========');
  Logger.log('測試批次ID: ' + TEST_BATCH_ID);
  Logger.log('');
  
  try {
    // 1. 讀取數據（模擬 apiExportPurchaseOrderExcel 的前半段）
    Logger.log('步驟 1: 讀取數據');
    const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    const queueSheet = ss.getSheetByName('Queue');
    const batchMetaSheet = ss.getSheetByName('Batch_Meta');
    
    // 取得批次資訊
    let batchInfo = { supplier: '', rate: '', shipping: '', jpOrder: '' };
    if (batchMetaSheet) {
      const batchData = batchMetaSheet.getDataRange().getValues();
      Logger.log('Batch_Meta 表頭: ' + JSON.stringify(batchData[0]));
      Logger.log('Batch_Meta 資料行數: ' + batchData.length);
      
      for (let i = 1; i < batchData.length; i++) {
        Logger.log('  第 ' + i + ' 行批次ID: "' + batchData[i][0] + '"');
        if (batchData[i][0] === TEST_BATCH_ID) {
          batchInfo = {
            supplier: batchData[i][1] || '',
            rate: batchData[i][2] || '',
            shipping: batchData[i][3] || '',
            jpOrder: ''
          };
          Logger.log('✅ 找到批次資訊: ' + JSON.stringify(batchInfo));
          break;
        }
      }
    }
    
    if (!batchInfo.supplier) {
      Logger.log('⚠️ Batch_Meta 中沒有找到批次資訊，使用預設值');
      // 從 batchId 解析 supplier
      const match = TEST_BATCH_ID.match(/^([a-z0-9\-]+)-\d{8}-\d{6}$/i);
      if (match) {
        batchInfo.supplier = match[1];
        Logger.log('從批次ID解析出供應商: ' + batchInfo.supplier);
      }
    }
    Logger.log('');
    
    // 2. 提取批次項目
    Logger.log('步驟 2: 提取批次項目');
    const queueData = queueSheet.getDataRange().getValues();
    const items = [];
    
    for (let i = 1; i < queueData.length; i++) {
      const row = queueData[i];
      const rowBatchId = (row[15] || '').toString().trim();
      
      if (rowBatchId === TEST_BATCH_ID.trim()) {
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
    Logger.log('找到 ' + items.length + ' 個項目');
    if (items.length > 0) {
      Logger.log('第 1 個項目: ' + JSON.stringify(items[0]));
    }
    Logger.log('');
    
    // 3. 合併項目（調用實際函數）
    Logger.log('步驟 3: 合併同品項');
    const mergedItems = EcountExportService.testing_mergeItems(items);
    Logger.log('合併後剩 ' + mergedItems.length + ' 個項目');
    if (mergedItems.length > 0) {
      Logger.log('第 1 個合併項目: ' + JSON.stringify(mergedItems[0]));
    }
    Logger.log('');
    
    // 4. 生成 Excel 數據（調用實際函數）
    Logger.log('步驟 4: 生成 Excel 數據');
    const excelData = EcountExportService.testing_generatePOExcelData(mergedItems, batchInfo);
    Logger.log('生成 ' + excelData.length + ' 行 Excel 數據（含表頭）');
    if (excelData.length > 0) {
      Logger.log('表頭: ' + JSON.stringify(excelData[0]));
    }
    if (excelData.length > 1) {
      Logger.log('第 1 行數據: ' + JSON.stringify(excelData[1]));
    }
    Logger.log('');
    
    Logger.log('========== 測試完成 ==========');
    Logger.log('結論: 如果上方顯示生成了數據，但下載的 Excel 是空的，');
    Logger.log('問題可能在 createExcelFromValues_ 函數。');
    
  } catch (error) {
    Logger.log('❌ 測試過程中出錯: ' + error.toString());
    Logger.log(error.stack);
  }
}

