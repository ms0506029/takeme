var QueryService = (function() {
  
  /**
   * 根據訂單編號查詢詳細資料
   * @param {string} orderNo - 訂單編號 (ES_Order_No)
   * @return {Object} 訂單詳細資料
   */
  function searchOrderDetails(orderNo) {
    if (!orderNo) {
      return { success: false, error: '請輸入訂單編號' };
    }
    
    // 移除輸入的 # 號，確保搜尋彈性
    const targetOrderNo = String(orderNo).replace(/#/g, '').trim();
    
    try {
      const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
      const queueSheet = ss.getSheetByName('Queue');
      const batchMetaSheet = ss.getSheetByName('Batch_Meta');
      const packingBoxesSheet = ss.getSheetByName('Packing_Boxes');
      
      if (!queueSheet) {
        throw new Error('找不到 Queue 表單');
      }
      
      // 1. 在 Queue 表中搜尋訂單
      const data = queueSheet.getDataRange().getValues();
      const headers = data[0];
      
      // 建立欄位索引映射
      const colMap = {};
      headers.forEach((header, index) => {
        colMap[header] = index;
      });
      
      // 搜尋符合的列 (比對時也移除 # 號)
      const orderRows = data.filter((row, index) => {
        if (index === 0) return false; // 跳過標題
        const rowOrderNo = row[colMap['ES_Order_No']];
        if (!rowOrderNo) return false;
        
        const cleanRowOrderNo = String(rowOrderNo).replace(/#/g, '').trim();
        return cleanRowOrderNo === targetOrderNo;
      });
      
      if (orderRows.length === 0) {
        return { success: true, data: [], message: '找不到此訂單編號' };
      }
      
      // 預先讀取 Packing_Boxes 資料以優化查詢
      let boxMap = {};
      if (packingBoxesSheet) {
        const boxData = packingBoxesSheet.getDataRange().getValues();
        // 假設 Box_ID 在 A 欄 (index 0), Box_Number 在 D 欄 (index 3), Packed_At 在 H 欄 (index 7)
        // 為了保險，我們嘗試找標題
        const boxHeaders = boxData[0];
        let boxIdIdx = 0; // 預設 A
        let boxNumIdx = 3; // 預設 D
        let packedAtIdx = 7; // 預設 H
        
        // 嘗試從標題確認
        const hId = boxHeaders.indexOf('Box_ID');
        const hNum = boxHeaders.indexOf('Box_Number');
        const hPackedAt = boxHeaders.indexOf('Packed_At');
        
        if (hId !== -1) boxIdIdx = hId;
        if (hNum !== -1) boxNumIdx = hNum;
        if (hPackedAt !== -1) packedAtIdx = hPackedAt;
        
        for (let i = 1; i < boxData.length; i++) {
          const bId = boxData[i][boxIdIdx];
          if (bId) {
            boxMap[String(bId)] = {
              number: boxData[i][boxNumIdx],
              packedAt: boxData[i][packedAtIdx]
            };
          }
        }
      }
      
      // 2. 整理結果
      const results = orderRows.map(row => {
        const batchId = row[colMap['Batch_ID']];
        let jpOrderNo = '';
        
        // 如果有 Batch_ID，去 Batch_Meta 查日本訂單號
        if (batchId && batchMetaSheet) {
          jpOrderNo = findJpOrderNoByBatchId(batchMetaSheet, batchId);
        }
        
        // 判斷裝箱狀態
        const boxId = row[colMap['Box_ID']];
        const isPacked = !!boxId;
        let boxNumber = '';
        let packedAt = '';
        
        if (isPacked && boxMap[String(boxId)]) {
          boxNumber = boxMap[String(boxId)].number;
          const rawPackedAt = boxMap[String(boxId)].packedAt;
          if (rawPackedAt instanceof Date) {
            packedAt = Utilities.formatDate(rawPackedAt, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
          } else {
            packedAt = rawPackedAt;
          }
        }
        
        // 採購時間：優先用「採購日期」，如果沒有則用「Last_Status_Update_At」
        let purchaseTime = row[colMap['採購日期']];
        if (!purchaseTime) {
          purchaseTime = row[colMap['Last_Status_Update_At']];
        }
        
        // 格式化日期
        if (purchaseTime instanceof Date) {
          purchaseTime = Utilities.formatDate(purchaseTime, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
        }
        
        return {
          orderNo: row[colMap['ES_Order_No']],
          productName: row[colMap['Product_Name']],
          sku: row[colMap['SKU']],
          color: row[colMap['Color']],
          size: row[colMap['Size']],
          status: row[colMap['Purchase_Status']],
          purchaseTime: purchaseTime,
          jpOrderNo: jpOrderNo,
          note: row[colMap['採購備註']] || '',
          preorderMonth: row[colMap['預購月份']] || '',
          preorderXun: row[colMap['預購旬']] || '',
          isPacked: isPacked,
          boxId: boxNumber || boxId || '', // 優先顯示 Box_Number，如果沒有則顯示 Box_ID
          packedAt: packedAt || '',
          batchId: batchId || ''
        };
      });
      
      return { success: true, data: results };
      
    } catch (error) {
      Logger.log('searchOrderDetails error: ' + error);
      return { success: false, error: error.toString() };
    }
  }
  
  /**
   * 輔助函式：根據 Batch_ID 查詢日本訂單號
   */
  function findJpOrderNoByBatchId(sheet, batchId) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('批次ID'); // 或 'Batch_ID'
    const jpOrderIndex = headers.indexOf('日本訂單號'); // 或 'JP_Order_No'
    
    if (idIndex === -1 || jpOrderIndex === -1) {
      return ''; // 找不到欄位
    }
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIndex]) === String(batchId)) {
        return data[i][jpOrderIndex];
      }
    }
    return '';
  }
  
  return {
    searchOrderDetails: searchOrderDetails
  };
  
})();
