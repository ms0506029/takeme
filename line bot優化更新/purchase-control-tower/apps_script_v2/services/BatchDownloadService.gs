/**
 * 批量下載服務
 * 提供批次查詢、批量下載 ZIP 等功能
 */

const BatchDownloadService = (function() {
  
  /**
   * 依時間範圍查詢批次
   * @param {string} startDate - 開始日期 (YYYY-MM-DD)
   * @param {string} endDate - 結束日期 (YYYY-MM-DD)
   * @returns {Array} 批次列表
   */
  function getBatchesByDateRange(startDate, endDate) {
    try {
      Logger.log(`查詢批次: ${startDate} ~ ${endDate}`);
      
      // 使用全域 getSpreadsheet() 函數，與其他服務保持一致
      const ss = getSpreadsheet();
      const sheet = ss.getSheetByName('Batch_Meta');
      
      if (!sheet) {
        Logger.log('❌ Batch_Meta 表不存在');
        throw new Error('Batch_Meta 表不存在');
      }
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      Logger.log(`表頭: ${headers.join(', ')}`);
      Logger.log(`資料行數: ${data.length - 1}`);
      
      // 找到欄位索引
      const downloadTimeColIndex = headers.indexOf('最後下載時間');
      Logger.log(`最後下載時間欄位索引: ${downloadTimeColIndex}`);
      
      // 建立批次計數映射表（優化效能）
      const batchCountMap = {};
      try {
        const queueSheet = ss.getSheetByName(QUEUE_SHEET_NAME);
        if (queueSheet) {
          const queueData = queueSheet.getDataRange().getValues();
          for (let i = 1; i < queueData.length; i++) {
            const batchId = queueData[i][QUEUE_COLS.BATCH_ID];
            if (batchId) {
              batchCountMap[batchId] = (batchCountMap[batchId] || 0) + 1;
            }
          }
        }
      } catch (e) {
        Logger.log('讀取 Queue 表單失敗: ' + e.message);
      }
      
      const batches = [];
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // 設定為當天開始
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // 包含結束日期整天
      
      Logger.log(`開始日期: ${start}, 結束日期: ${end}`);
      Logger.log(`開始日期 timestamp: ${start.getTime()}, 結束日期 timestamp: ${end.getTime()}`);
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        // Google Sheets 可能回傳 Date 物件或字串，需要正確處理
        let createdDate;
        const rawCreated = row[5];
        
        if (rawCreated instanceof Date) {
          // 如果已經是 Date 物件，直接使用
          createdDate = rawCreated;
        } else if (typeof rawCreated === 'string') {
          // 如果是字串，解析它
          createdDate = new Date(rawCreated);
        } else {
          // 其他情況（可能是空值），跳過
          Logger.log(`批次 ${i}: 建立時間格式異常，跳過。raw=${rawCreated}, type=${typeof rawCreated}`);
          continue;
        }
        
        // 詳細日誌：顯示前 3 筆的日期資訊
        if (i <= 3) {
          Logger.log(`批次 ${i}: ID=${row[0]}, created raw=${rawCreated}, type=${typeof rawCreated}, created Date=${createdDate}, timestamp=${createdDate.getTime()}`);
          Logger.log(`  比較: ${createdDate.getTime()} >= ${start.getTime()} && ${createdDate.getTime()} <= ${end.getTime()}`);
          Logger.log(`  結果: ${createdDate >= start && createdDate <= end}`);
        }
        
        // 檢查是否在時間範圍內
        if (createdDate >= start && createdDate <= end) {
          const batchId = row[0];
          
          // 將 Date 物件轉換為字串，避免序列化問題
          let createdStr = '';
          if (row[5] instanceof Date) {
            createdStr = Utilities.formatDate(row[5], 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
          } else {
            createdStr = String(row[5] || '');
          }
          
          let lastDownloadedStr = '';
          if (downloadTimeColIndex >= 0 && row[downloadTimeColIndex]) {
            if (row[downloadTimeColIndex] instanceof Date) {
              lastDownloadedStr = Utilities.formatDate(row[downloadTimeColIndex], 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
            } else {
              lastDownloadedStr = String(row[downloadTimeColIndex]);
            }
          }
          
          batches.push({
            id: String(batchId),
            supplier: String(row[1] || ''),
            rate: row[2] || '',
            shipping: row[3] || '',
            jpOrder: String(row[4] || ''),
            created: createdStr,
            lastDownloaded: lastDownloadedStr,
            count: batchCountMap[batchId] || 0
          });
        }
      }

      
      // 按建立時間排序（最新的在前）
      batches.sort((a, b) => new Date(b.created) - new Date(a.created));
      
      Logger.log(`✅ 查詢到 ${batches.length} 個批次`);
      return batches;
      
    } catch (error) {
      Logger.log(`❌ getBatchesByDateRange 錯誤: ${error.message}`);
      Logger.log(`錯誤堆疊: ${error.stack}`);
      throw error;
    }
  }
  
  /**
   * 批量下載多個批次的採購單，打包成 ZIP
   * @param {Array} batchIds - 批次 ID 陣列
   * @returns {object} { success, file, downloadedCount }
   */
  function batchDownloadPOs(batchIds) {
    try {
      if (!batchIds || batchIds.length === 0) {
        throw new Error('請提供要下載的批次 ID');
      }
      
      Logger.log(`開始批量下載 ${batchIds.length} 個批次`);
      
      const blobs = [];
      let successCount = 0;
      const errors = [];
      
      // 逐一產生每個批次的 Excel
      batchIds.forEach((batchId, index) => {
        try {
          Logger.log(`[${index + 1}/${batchIds.length}] 產生批次 ${batchId} 的 Excel`);
          
          const result = apiExportPurchaseOrderExcel(batchId);
          
          if (result.success && result.file) {
            // 從 Drive 取得檔案
            const file = DriveApp.getFileById(result.file.id);
            const blob = file.getBlob();
            
            // 重新命名檔案（加入批次ID）
            const fileName = `PO_${batchId}.xlsx`;
            blob.setName(fileName);
            blobs.push(blob);
            
            successCount++;
            Logger.log(`✅ 成功產生 ${fileName}`);
            
          } else {
            errors.push(`${batchId}: ${result.error || '未知錯誤'}`);
            Logger.log(`❌ 批次 ${batchId} 產生失敗: ${result.error}`);
          }
          
        } catch (error) {
          errors.push(`${batchId}: ${error.toString()}`);
          Logger.log(`❌ 批次 ${batchId} 發生錯誤: ${error}`);
        }
      });
      
      if (blobs.length === 0) {
        throw new Error('沒有成功產生任何 Excel 檔案');
      }
      
      // 建立 ZIP 檔案
      Logger.log(`打包 ${blobs.length} 個 Excel 成 ZIP`);
      const zipBlob = Utilities.zip(blobs);
      const zipFileName = `ECOUNT_PO_Batch_${Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd-HHmmss')}.zip`;
      zipBlob.setName(zipFileName);
      
      // 上傳到 Drive（使用 EcountExportService 的 ensureExportFolder_ 函數）
      const folder = ensureExportFolder_();
      const zipFile = folder.createFile(zipBlob);
      
      Logger.log(`✅ ZIP 檔案已建立: ${zipFileName}`);
      
      // 更新所有成功下載的批次的下載時間
      const successBatchIds = batchIds.filter((id, index) => blobs[index] !== undefined);
      if (successBatchIds.length > 0) {
        batchUpdateDownloadTimes(successBatchIds);
      }
      
      return {
        success: true,
        file: {
          id: zipFile.getId(),
          url: zipFile.getUrl(),
          name: zipFileName
        },
        downloadedCount: successCount,
        totalCount: batchIds.length,
        errors: errors
      };
      
    } catch (error) {
      Logger.log(`❌ batchDownloadPOs 錯誤: ${error.message}`);
      Logger.log(`錯誤堆疊: ${error.stack}`);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
  
  /**
   * 取得批次內的品項數量（私有函數）
   * @private
   */
  function getBatchItemCount_(batchId) {
    try {
      const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
      const queueSheet = ss.getSheetByName('Queue');
      
      if (!queueSheet) return 0;
      
      const data = queueSheet.getDataRange().getValues();
      let count = 0;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][15] === batchId) { // Batch_ID 在第16欄（索引15）
          count++;
        }
      }
      
      return count;
      
    } catch (error) {
      Logger.log('getBatchItemCount_ 錯誤：' + error);
      return 0;
    }
  }
  
  // 公開介面
  return {
    getBatchesByDateRange: getBatchesByDateRange,
    batchDownloadPOs: batchDownloadPOs
  };
  
})();
