/**
 * DataMigrationService.gs
 * 從舊系統遷移資料到新系統
 * - Queue (採購控制中心)
 * - OrderLineUserMap (LINE 客戶綁定)
 * - Batch_Meta (批次資料)
 */

const OLD_PURCHASE_TOWER_ID = '1YZqQBeujZ888XjlVxjGTAIKdbz4nzmXvxQ2j5kv1-jo';
const OLD_LINE_OA_ID = '1mHjJLM5sfEwGZ23BGF2SU_DHwjAiLNaVjGprloO82-U';

/**
 * 執行完整資料遷移
 * @returns {object} 遷移報告
 */
function apiRunFullMigration() {
  try {
    const report = {
      timestamp: new Date().toISOString(),
      oldPurchaseTowerId: OLD_PURCHASE_TOWER_ID,
      oldLineOaId: OLD_LINE_OA_ID,
      newSpreadsheetId: null,
      queue: { status: 'pending', oldCount: 0, newCount: 0, error: null },
      orderLineUserMap: { status: 'pending', oldCount: 0, newCount: 0, error: null },
      batchMeta: { status: 'pending', oldCount: 0, newCount: 0, error: null }
    };

    // 取得試算表 ID
    const spreadsheetId = getSpreadsheetId_();
    const newSs = SpreadsheetApp.openById(spreadsheetId);
    report.newSpreadsheetId = spreadsheetId;

    // 1. 遷移 Queue 資料
    Logger.log('開始遷移 Queue 資料...');
    try {
      const queueResult = migrateQueue_(OLD_PURCHASE_TOWER_ID, newSs);
      report.queue.status = 'success';
      report.queue.oldCount = queueResult.oldCount;
      report.queue.newCount = queueResult.newCount;
    } catch (err) {
      report.queue.status = 'failed';
      report.queue.error = err.toString();
      Logger.log('Queue 遷移失敗：' + err);
    }

    // 2. 遷移 OrderLineUserMap 資料
    Logger.log('開始遷移 OrderLineUserMap 資料...');
    try {
      const orderLineResult = migrateOrderLineUserMap_(OLD_LINE_OA_ID, newSs);
      report.orderLineUserMap.status = 'success';
      report.orderLineUserMap.oldCount = orderLineResult.oldCount;
      report.orderLineUserMap.newCount = orderLineResult.newCount;
    } catch (err) {
      report.orderLineUserMap.status = 'failed';
      report.orderLineUserMap.error = err.toString();
      Logger.log('OrderLineUserMap 遷移失敗：' + err);
    }

    // 3. 遷移 Batch_Meta 資料（如果存在）
    Logger.log('開始遷移 Batch_Meta 資料...');
    try {
      const batchResult = migrateBatchMeta_(OLD_PURCHASE_TOWER_ID, newSs);
      report.batchMeta.status = 'success';
      report.batchMeta.oldCount = batchResult.oldCount;
      report.batchMeta.newCount = batchResult.newCount;
    } catch (err) {
      report.batchMeta.status = 'failed';
      report.batchMeta.error = err.toString();
      Logger.log('Batch_Meta 遷移失敗：' + err);
    }

    // 產生報告
    const reportText = generateMigrationReport_(report);
    Logger.log(reportText);

    return {
      success: true,
      report: report,
      reportText: reportText
    };

  } catch (error) {
    Logger.log('資料遷移失敗：' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 遷移 Queue 資料
 * @private
 */
function migrateQueue_(oldSpreadsheetId, newSs) {
  const oldSs = SpreadsheetApp.openById(oldSpreadsheetId);
  const oldQueue = oldSs.getSheetByName('Queue');
  
  if (!oldQueue) {
    throw new Error('舊系統找不到 Queue 工作表');
  }

  // 取得舊資料
  const oldData = oldQueue.getDataRange().getValues();
  const oldHeader = oldData[0];
  const oldCount = oldData.length - 1; // 扣除標題列

  // 建立欄位對照 map
  const oldColMap = {};
  oldHeader.forEach((h, i) => {
    oldColMap[h] = i;
  });

  // 取得新系統 Queue 表
  let newQueue = newSs.getSheetByName('Queue');
  if (!newQueue) {
    throw new Error('新系統找不到 Queue 工作表');
  }

  // 取得新系統表頭
  const newHeader = newQueue.getRange(1, 1, 1, newQueue.getLastColumn()).getValues()[0];

  // 清空新系統的現有資料（保留標題列）
  if (newQueue.getLastRow() > 1) {
    // 使用 clearContent 而非 deleteRows，避免 "無法刪除所有非凍結列" 的錯誤
    newQueue.getRange(2, 1, newQueue.getLastRow() - 1, newQueue.getLastColumn()).clearContent();
  }

  // 轉換資料
  const newRows = [];
  for (let i = 1; i < oldData.length; i++) {
    const oldRow = oldData[i];
    const newRow = [];

    newHeader.forEach(newCol => {
      // 欄位對照
      let value = '';
      switch (newCol) {
        case 'ES_Order_No':
          value = oldRow[oldColMap['ES訂單號']] || '';
          break;
        case 'SKU':
          value = oldRow[oldColMap['SKU']] || '';
          break;
        case 'Product_Name':
          value = oldRow[oldColMap['品名']] || '';
          break;
        case 'Color':
          value = oldRow[oldColMap['顏色']] || '';
          break;
        case 'Size':
          value = oldRow[oldColMap['尺寸']] || '';
          break;
        case 'Qty_Ordered':
          value = oldRow[oldColMap['數量']] || 0;
          break;
        case 'Purchase_Status':
          value = oldRow[oldColMap['採購狀態']] || '待購';
          break;
        case 'Actual_Purchase_Price':
          value = oldRow[oldColMap['採購單價JPY']] || '';
          break;
        case 'Batch_ID':
          value = oldRow[oldColMap['採購批次ID']] || '';
          break;
        case 'Tracking_JP_to_TW':
          value = oldRow[oldColMap['Tracking_JP_to_TW']] || oldRow[oldColMap['追蹤碼']] || '';
          break;
        case 'Box_ID':
          value = oldRow[oldColMap['Box_ID']] || oldRow[oldColMap['箱號']] || '';
          break;
        case 'Qty_Allocated':
          value = 0; // 預設為 0
          break;
        // 新增欄位（如果舊系統有的話）
        case '預購月份':
          value = oldRow[oldColMap['預購月份']] || '';
          break;
        case '預購旬':
          value = oldRow[oldColMap['預購旬']] || '';
          break;
        case '採購日期':
          value = oldRow[oldColMap['採購日期']] || '';
          break;
        case '採購備註':
          value = oldRow[oldColMap['採購備註']] || '';
          break;
        case '鎖定人':
          value = oldRow[oldColMap['鎖定人']] || '';
          break;
        case '鎖定時間':
          value = oldRow[oldColMap['鎖定時間']] || '';
          break;
        case '已回寫ERP':
          value = oldRow[oldColMap['已回寫ERP']] || '';
          break;
        default:
          // 其他欄位保持空白
          value = '';
      }
      newRow.push(value);
    });

    newRows.push(newRow);
  }

  // 寫入新系統
  if (newRows.length > 0) {
    newQueue.getRange(2, 1, newRows.length, newHeader.length).setValues(newRows);
  }

  return {
    oldCount: oldCount,
    newCount: newRows.length
  };
}

/**
 * 遷移 OrderLineUserMap 資料
 * @private
 */
function migrateOrderLineUserMap_(oldSpreadsheetId, newSs) {
  const oldSs = SpreadsheetApp.openById(oldSpreadsheetId);
  const oldSheet = oldSs.getSheetByName('OrderLineUserMap') || oldSs.getSheetByName('訂單LINE對照表');
  
  if (!oldSheet) {
    Logger.log('舊系統找不到 OrderLineUserMap，跳過遷移');
    return { oldCount: 0, newCount: 0 };
  }

  // 取得舊資料
  const oldData = oldSheet.getDataRange().getValues();
  const oldHeader = oldData[0];
  const oldCount = oldData.length - 1;

  // 建立欄位對照 map
  const oldColMap = {};
  oldHeader.forEach((h, i) => {
    oldColMap[h] = i;
  });

  // 取得或建立新系統表
  let newSheet = newSs.getSheetByName('OrderLineUserMap');
  if (!newSheet) {
    newSheet = newSs.insertSheet('OrderLineUserMap');
    newSheet.getRange(1, 1, 1, 3).setValues([['ES_Order_No', 'LINE_User_ID', 'Customer_Name']]);
    newSheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#f6f8fa');
  }

  // 清空現有資料
  if (newSheet.getLastRow() > 1) {
    newSheet.deleteRows(2, newSheet.getLastRow() - 1);
  }

  // 轉換資料
  const newRows = [];
  for (let i = 1; i < oldData.length; i++) {
    const oldRow = oldData[i];
    
    const esOrderNo = oldRow[oldColMap['ES訂單號']] || oldRow[oldColMap['ES_Order_No']] || '';
    const lineUserId = oldRow[oldColMap['LINE用戶ID']] || oldRow[oldColMap['LINE_User_ID']] || '';
    const customerName = oldRow[oldColMap['客戶名稱']] || oldRow[oldColMap['Customer_Name']] || '';

    if (esOrderNo && lineUserId) {
      newRows.push([esOrderNo, lineUserId, customerName]);
    }
  }

  // 寫入新系統
  if (newRows.length > 0) {
    newSheet.getRange(2, 1, newRows.length, 3).setValues(newRows);
  }

  return {
    oldCount: oldCount,
    newCount: newRows.length
  };
}

/**
 * 遷移 Batch_Meta 資料
 * @private
 */
function migrateBatchMeta_(oldSpreadsheetId, newSs) {
  const oldSs = SpreadsheetApp.openById(oldSpreadsheetId);
  const oldSheet = oldSs.getSheetByName('Batch_Meta');
  
  if (!oldSheet) {
    Logger.log('舊系統找不到 Batch_Meta，跳過遷移');
    return { oldCount: 0, newCount: 0 };
  }

  // 取得舊資料
  const oldData = oldSheet.getDataRange().getValues();
  const oldHeader = oldData[0];
  const oldCount = oldData.length - 1;

  // 取得或建立新系統表
  let newSheet = newSs.getSheetByName('Batch_Meta');
  if (!newSheet) {
    newSheet = newSs.insertSheet('Batch_Meta');
    newSheet.getRange(1, 1, 1, 5).setValues([['批次ID', '供應商', '匯率', '運費JPY', '建立時間']]);
    newSheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#f6f8fa');
  }

  // 清空現有資料
  if (newSheet.getLastRow() > 1) {
    newSheet.deleteRows(2, newSheet.getLastRow() - 1);
  }

  // 直接複製資料（欄位結構相同）
  if (oldData.length > 1) {
    const dataRows = oldData.slice(1); // 移除標題列
    newSheet.getRange(2, 1, dataRows.length, oldHeader.length).setValues(dataRows);
  }

  return {
    oldCount: oldCount,
    newCount: oldData.length - 1
  };
}

/**
 * 產生遷移報告
 * @private
 */
function generateMigrationReport_(report) {
  let text = '========================================\n';
  text += '資料遷移報告\n';
  text += '========================================\n';
  text += '遷移時間：' + report.timestamp + '\n';
  text += '舊採購系統 ID：' + report.oldPurchaseTowerId + '\n';
  text += '舊 LINE OA ID：' + report.oldLineOaId + '\n';
  text += '新系統 ID：' + report.newSpreadsheetId + '\n\n';

  text += '--- Queue 資料遷移 ---\n';
  text += '舊系統筆數：' + report.queue.oldCount + ' 筆\n';
  text += '新系統筆數：' + report.queue.newCount + ' 筆\n';
  text += '遷移狀態：' + (report.queue.status === 'success' ? '✅ 成功' : '❌ 失敗') + '\n';
  if (report.queue.error) {
    text += '錯誤訊息：' + report.queue.error + '\n';
  }
  text += '\n';

  text += '--- OrderLineUserMap 資料遷移 ---\n';
  text += '舊系統筆數：' + report.orderLineUserMap.oldCount + ' 筆\n';
  text += '新系統筆數：' + report.orderLineUserMap.newCount + ' 筆\n';
  text += '遷移狀態：' + (report.orderLineUserMap.status === 'success' ? '✅ 成功' : '❌ 失敗') + '\n';
  if (report.orderLineUserMap.error) {
    text += '錯誤訊息：' + report.orderLineUserMap.error + '\n';
  }
  text += '\n';

  text += '--- Batch_Meta 資料遷移 ---\n';
  text += '舊系統筆數：' + report.batchMeta.oldCount + ' 筆\n';
  text += '新系統筆數：' + report.batchMeta.newCount + ' 筆\n';
  text += '遷移狀態：' + (report.batchMeta.status === 'success' ? '✅ 成功' : '❌ 失敗') + '\n';
  if (report.batchMeta.error) {
    text += '錯誤訊息：' + report.batchMeta.error + '\n';
  }
  text += '\n';

  text += '========================================\n';
  const allSuccess = report.queue.status === 'success' && 
                     report.orderLineUserMap.status === 'success' && 
                     report.batchMeta.status === 'success';
  text += allSuccess ? '遷移完成！所有資料已成功轉移。\n' : '遷移完成，但部分資料遷移失敗。\n';
  text += '========================================\n';

  return text;
}

/**
 * 取得試算表 ID 的輔助函數
 * @private
 */
function getSpreadsheetId_() {
  // 方法 1: 嘗試從全局 CFG 取得（如果存在）
  if (typeof CFG !== 'undefined' && CFG.SPREADSHEET_ID) {
    return CFG.SPREADSHEET_ID;
  }
  
  // 方法 2: 從 PropertiesService 取得
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('SPREADSHEET_ID');
  if (savedId) {
    return savedId;
  }
  
  // 方法 3: 如果都沒有，拋出錯誤
  throw new Error('找不到試算表 ID。請在 Config.gs 中設定 CFG.SPREADSHEET_ID = "您的試算表ID"');
}

/**
 * 取得試算表 ID 的輔助函數
 * @private
 */
function getSpreadsheetId_() {
  // 方法 1: 嘗試從全局 CFG 取得（如果存在）
  if (typeof CFG !== 'undefined' && CFG.SPREADSHEET_ID) {
    return CFG.SPREADSHEET_ID;
  }
  
  // 方法 2: 從 PropertiesService 取得
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('SPREADSHEET_ID');
  if (savedId) {
    return savedId;
  }
  
  // 方法 3: 如果都沒有，拋出錯誤
  throw new Error('找不到試算表 ID。請在 Config.gs 中設定 CFG.SPREADSHEET_ID = "您的試算表ID"');
}

