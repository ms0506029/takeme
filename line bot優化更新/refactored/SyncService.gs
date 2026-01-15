// ==========================================
// SyncService.gs - 資料同步服務模組
// 版本：v1.0
// 說明：處理 LINE_User_ID 與訂單管理表的同步
// ==========================================

/**
 * 同步服務模組
 * 負責將會員綁定記錄中的 LINE_User_ID 同步到訂單管理表
 */
const SyncService = {
  
  /**
   * 將 LINE_User_ID 同步到指定 Email 的所有訂單
   * 在會員綁定成功後自動執行
   * @param {string} email - 會員 Email
   * @param {string} lineUserId - LINE User ID
   * @returns {Object} - { success, updatedCount }
   */
  syncLineUserIdToOrders: function(email, lineUserId) {
    try {
      console.log(`🔄 開始同步 LINE_User_ID: ${email} -> ${lineUserId}`);
      
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const ordersSheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
      
      if (!ordersSheet) {
        console.error('❌ 找不到訂單管理表');
        return { success: false, error: '找不到訂單管理表' };
      }
      
      const data = ordersSheet.getDataRange().getValues();
      const headers = data[0];
      
      // 找到欄位索引
      const emailIndex = headers.indexOf('客戶Email');
      const lineUserIdIndex = headers.indexOf('LINE_User_ID');
      
      if (emailIndex === -1) {
        console.error('❌ 找不到「客戶Email」欄位');
        return { success: false, error: '找不到客戶Email欄位' };
      }
      
      if (lineUserIdIndex === -1) {
        console.error('❌ 找不到「LINE_User_ID」欄位');
        return { success: false, error: '找不到LINE_User_ID欄位' };
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      let updatedCount = 0;
      
      // 找到所有需要更新的訂單
      for (let i = 1; i < data.length; i++) {
        const rowEmail = (data[i][emailIndex] || '').toString().toLowerCase().trim();
        const currentLineUserId = data[i][lineUserIdIndex] || '';
        
        // 如果 Email 匹配且 LINE_User_ID 為空或不同
        if (rowEmail === normalizedEmail && currentLineUserId !== lineUserId) {
          // 更新 LINE_User_ID（行號從 1 開始，加上表頭所以是 i+1）
          ordersSheet.getRange(i + 1, lineUserIdIndex + 1).setValue(lineUserId);
          updatedCount++;
          console.log(`  ✅ 更新第 ${i + 1} 列訂單`);
        }
      }
      
      console.log(`🎉 同步完成，共更新 ${updatedCount} 筆訂單`);
      
      return {
        success: true,
        updatedCount: updatedCount
      };
      
    } catch (error) {
      console.error('❌ LINE_User_ID 同步失敗:', error);
      return { success: false, error: error.toString() };
    }
  },
  
  /**
   * 批次同步所有會員的 LINE_User_ID
   * 可透過定時觸發器執行（例如每小時）
   * @returns {Object} - { success, totalUpdated, errors }
   */
  batchSyncAllLineUserIds: function() {
    try {
      console.log('════════════════════════════════════════');
      console.log('🔄 開始批次同步 LINE_User_ID');
      console.log('════════════════════════════════════════');
      
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      
      // 1. 讀取會員綁定記錄
      const bindingSheet = ss.getSheetByName('會員綁定記錄');
      if (!bindingSheet) {
        console.log('⚠️ 會員綁定記錄表不存在');
        return { success: true, totalUpdated: 0, message: '無綁定記錄' };
      }
      
      const bindingData = bindingSheet.getDataRange().getValues();
      
      // 建立 Email → LINE_User_ID 對應表
      const emailToLineUserId = {};
      for (let i = 1; i < bindingData.length; i++) {
        const lineUserId = bindingData[i][1];
        const email = (bindingData[i][2] || '').toString().toLowerCase().trim();
        const status = bindingData[i][4];
        
        if (email && lineUserId && status === 'active') {
          emailToLineUserId[email] = lineUserId;
        }
      }
      
      console.log(`📋 已載入 ${Object.keys(emailToLineUserId).length} 筆有效綁定記錄`);
      
      // 2. 讀取訂單管理表
      const ordersSheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
      if (!ordersSheet) {
        console.error('❌ 找不到訂單管理表');
        return { success: false, error: '找不到訂單管理表' };
      }
      
      const ordersData = ordersSheet.getDataRange().getValues();
      const headers = ordersData[0];
      const emailIndex = headers.indexOf('客戶Email');
      const lineUserIdIndex = headers.indexOf('LINE_User_ID');
      
      if (emailIndex === -1 || lineUserIdIndex === -1) {
        console.error('❌ 缺少必要欄位');
        return { success: false, error: '缺少必要欄位' };
      }
      
      // 3. 批次更新
      let totalUpdated = 0;
      const updates = [];
      
      for (let i = 1; i < ordersData.length; i++) {
        const email = (ordersData[i][emailIndex] || '').toString().toLowerCase().trim();
        const currentLineUserId = ordersData[i][lineUserIdIndex] || '';
        
        if (email && emailToLineUserId[email] && currentLineUserId !== emailToLineUserId[email]) {
          updates.push({
            row: i + 1,
            col: lineUserIdIndex + 1,
            value: emailToLineUserId[email]
          });
          totalUpdated++;
        }
      }
      
      // 批次寫入
      updates.forEach(update => {
        ordersSheet.getRange(update.row, update.col).setValue(update.value);
      });
      
      console.log('════════════════════════════════════════');
      console.log(`🎉 批次同步完成，共更新 ${totalUpdated} 筆訂單`);
      console.log('════════════════════════════════════════');
      
      return {
        success: true,
        totalUpdated: totalUpdated
      };
      
    } catch (error) {
      console.error('❌ 批次同步失敗:', error);
      return { success: false, error: error.toString() };
    }
  }
};

// ==========================================
// 可獨立執行的函數（用於定時觸發器）
// ==========================================

/**
 * 批次同步所有 LINE_User_ID（可設為每小時觸發器）
 */
function runBatchSyncLineUserIds() {
  SyncService.batchSyncAllLineUserIds();
}

/**
 * 手動測試同步功能
 */
function testSyncLineUserId() {
  console.log('🧪 測試同步功能');
  
  // 測試批次同步
  const result = SyncService.batchSyncAllLineUserIds();
  console.log('結果:', JSON.stringify(result, null, 2));
}

/**
 * 給 Web Dashboard 調用的批次同步 API
 * 前端調用：google.script.run.batchSyncLineUserIdsForWeb()
 */
function batchSyncLineUserIdsForWeb() {
  console.log('🌐 Web Dashboard 觸發批次同步 LINE User ID');
  return SyncService.batchSyncAllLineUserIds();
}
