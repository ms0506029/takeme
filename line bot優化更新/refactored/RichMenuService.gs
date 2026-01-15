// ==========================================
// RichMenuService.gs - Rich Menu 管理服務
// 版本：v4.1
// 說明：透過 LINE Messaging API 管理 Rich Menu
// ==========================================

// 🔴 本地定義 Token（避免跨檔案引用問題）
const RICH_MENU_LINE_TOKEN = 'E01ovFXScGEYxKd+OGsMzBnfTp9jCDPZTLk8BHsH+Pd+paKQ407IFB/QLBU7+GU25m2X3HJUlm5C91QNQ3Y8BK54Xptc9HVLZaBsT3xqk3s+ixeO6aG+EZhSU3JElcP5PD2cYbP3aYGMOfL18ZRXRwdB04t89/1O/w1cDnyilFU=';

/**
 * Rich Menu 管理服務
 * 提供建立、更新、刪除 Rich Menu 的功能
 */
const RichMenuService = {
  
  /**
   * 建立並設定新的 Rich Menu
   * 執行此函數會：1. 建立 Rich Menu → 2. 設為預設選單
   * 🔴 注意：執行後需要手動上傳圖片
   */
  createAndSetDefaultRichMenu: function() {
    try {
      console.log('🎨 開始建立 Rich Menu...');
      
      // 1. 建立 Rich Menu
      const richMenuId = this._createRichMenu();
      
      if (!richMenuId) {
        console.error('❌ Rich Menu 建立失敗');
        return { success: false, error: 'Rich Menu 建立失敗' };
      }
      
      console.log('✅ Rich Menu 建立成功:', richMenuId);
      
      // 2. 設為預設 Rich Menu
      const setDefaultResult = this._setDefaultRichMenu(richMenuId);
      
      if (!setDefaultResult) {
        console.error('❌ 設定預設 Rich Menu 失敗');
        return { success: false, error: '設定預設失敗', richMenuId: richMenuId };
      }
      
      console.log('✅ 已設為預設 Rich Menu');
      
      return {
        success: true,
        richMenuId: richMenuId,
        message: 'Rich Menu 建立並設定成功！請記得上傳圖片。'
      };
      
    } catch (error) {
      console.error('❌ Rich Menu 操作失敗:', error);
      return { success: false, error: error.toString() };
    }
  },
  
  /**
   * 透過 API 建立 Rich Menu
   * @returns {string|null} - Rich Menu ID
   * @private
   */
  _createRichMenu: function() {
    try {
      const url = 'https://api.line.me/v2/bot/richmenu';
      
      // 🔴 直接定義 Rich Menu 配置（避免跨檔案引用問題）
      // 🔴 v4.2 改為 message 類型，不使用 postback
      const richMenuData = {
        size: {
          width: 2500,
          height: 1686
        },
        selected: true,
        name: "Take Me Japan 主選單",
        chatBarText: "選單",
        areas: [
          // 左上：官網連結
          {
            bounds: { x: 0, y: 0, width: 833, height: 843 },
            action: {
              type: "uri",
              uri: "https://www.takemejapan.com"
            }
          },
          // 中上：Instagram
          {
            bounds: { x: 833, y: 0, width: 834, height: 843 },
            action: {
              type: "uri",
              uri: "https://www.instagram.com/take.me_japan"
            }
          },
          // 右上：我的訂單 → 改為 message 類型
          {
            bounds: { x: 1667, y: 0, width: 833, height: 843 },
            action: {
              type: "message",
              text: "📦 查詢我的訂單"
            }
          },
          // 左下：物流追蹤 → 改為 message 類型
          {
            bounds: { x: 0, y: 843, width: 833, height: 843 },
            action: {
              type: "message",
              text: "🚚 查詢物流狀態"
            }
          },
          // 中下：會員綁定 → 改為 message 類型
          {
            bounds: { x: 833, y: 843, width: 834, height: 843 },
            action: {
              type: "message",
              text: "🔗 開始會員綁定"
            }
          }
        ]
      };
      
      console.log('📤 發送 Rich Menu 建立請求...');
      console.log('📋 Rich Menu 設定:', JSON.stringify(richMenuData, null, 2));
      
      const response = UrlFetchApp.fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + RICH_MENU_LINE_TOKEN,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(richMenuData),
        muteHttpExceptions: true
      });
      
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      console.log('📡 API 回應碼:', responseCode);
      console.log('📡 API 回應:', responseText);
      
      if (responseCode === 200) {
        const result = JSON.parse(responseText);
        return result.richMenuId;
      } else {
        console.error('❌ API 錯誤:', responseText);
        return null;
      }
      
    } catch (error) {
      console.error('❌ 建立 Rich Menu 失敗:', error);
      return null;
    }
  },
  
  /**
   * 設定預設 Rich Menu（所有用戶）
   * @param {string} richMenuId - Rich Menu ID
   * @returns {boolean}
   * @private
   */
  _setDefaultRichMenu: function(richMenuId) {
    try {
      const url = `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`;
      
      const response = UrlFetchApp.fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + RICH_MENU_LINE_TOKEN
        },
        muteHttpExceptions: true
      });
      
      const responseCode = response.getResponseCode();
      console.log('📡 設定預設回應碼:', responseCode);
      
      return responseCode === 200;
      
    } catch (error) {
      console.error('❌ 設定預設 Rich Menu 失敗:', error);
      return false;
    }
  },
  
  /**
   * 上傳 Rich Menu 圖片
   * @param {string} richMenuId - Rich Menu ID
   * @param {Blob} imageBlob - 圖片 Blob
   * @returns {boolean}
   */
  uploadRichMenuImage: function(richMenuId, imageBlob) {
    try {
      const url = `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`;
      
      const response = UrlFetchApp.fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + RICH_MENU_LINE_TOKEN,
          'Content-Type': 'image/png'
        },
        payload: imageBlob,
        muteHttpExceptions: true
      });
      
      const responseCode = response.getResponseCode();
      console.log('📡 上傳圖片回應碼:', responseCode);
      
      return responseCode === 200;
      
    } catch (error) {
      console.error('❌ 上傳 Rich Menu 圖片失敗:', error);
      return false;
    }
  },
  
  /**
   * 從 Google Drive 上傳 Rich Menu 圖片
   * @param {string} richMenuId - Rich Menu ID
   * @param {string} driveFileId - Google Drive 檔案 ID
   * @returns {boolean}
   */
  uploadRichMenuImageFromDrive: function(richMenuId, driveFileId) {
    try {
      const file = DriveApp.getFileById(driveFileId);
      const blob = file.getBlob();
      
      return this.uploadRichMenuImage(richMenuId, blob);
      
    } catch (error) {
      console.error('❌ 從 Drive 上傳圖片失敗:', error);
      return false;
    }
  },
  
  /**
   * 取得所有 Rich Menu 列表
   * @returns {Array}
   */
  listRichMenus: function() {
    try {
      const url = 'https://api.line.me/v2/bot/richmenu/list';
      
      const response = UrlFetchApp.fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + RICH_MENU_LINE_TOKEN
        },
        muteHttpExceptions: true
      });
      
      const responseCode = response.getResponseCode();
      
      if (responseCode === 200) {
        const result = JSON.parse(response.getContentText());
        console.log('📋 Rich Menu 列表:', result.richmenus?.length || 0, '個');
        return result.richmenus || [];
      }
      
      return [];
      
    } catch (error) {
      console.error('❌ 取得 Rich Menu 列表失敗:', error);
      return [];
    }
  },
  
  /**
   * 刪除指定的 Rich Menu
   * @param {string} richMenuId - Rich Menu ID
   * @returns {boolean}
   */
  deleteRichMenu: function(richMenuId) {
    try {
      const url = `https://api.line.me/v2/bot/richmenu/${richMenuId}`;
      
      const response = UrlFetchApp.fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + RICH_MENU_LINE_TOKEN
        },
        muteHttpExceptions: true
      });
      
      const responseCode = response.getResponseCode();
      console.log('📡 刪除回應碼:', responseCode);
      
      return responseCode === 200;
      
    } catch (error) {
      console.error('❌ 刪除 Rich Menu 失敗:', error);
      return false;
    }
  },
  
  /**
   * 取得目前的預設 Rich Menu
   * @returns {string|null} - Rich Menu ID
   */
  getDefaultRichMenu: function() {
    try {
      const url = 'https://api.line.me/v2/bot/user/all/richmenu';
      
      const response = UrlFetchApp.fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + RICH_MENU_LINE_TOKEN
        },
        muteHttpExceptions: true
      });
      
      const responseCode = response.getResponseCode();
      
      if (responseCode === 200) {
        const result = JSON.parse(response.getContentText());
        return result.richMenuId || null;
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ 取得預設 Rich Menu 失敗:', error);
      return null;
    }
  }
};

// ==========================================
// 獨立執行函數（可在 GAS 編輯器中直接執行）
// ==========================================

/**
 * 🚀 執行此函數來建立新的 Rich Menu 並設為預設
 * 在 GAS 編輯器中選擇此函數並點擊「執行」
 */
function createNewRichMenu() {
  const result = RichMenuService.createAndSetDefaultRichMenu();
  console.log('==========================================');
  console.log('🎨 Rich Menu 建立結果:');
  console.log(JSON.stringify(result, null, 2));
  console.log('==========================================');
  
  if (result.success) {
    console.log('');
    console.log('📌 下一步：請執行以下操作上傳圖片');
    console.log('1. 將 Rich Menu 圖片上傳到 Google Drive');
    console.log('2. 複製檔案 ID');
    console.log('3. 執行 uploadRichMenuImageFromDrive("' + result.richMenuId + '", "YOUR_FILE_ID")');
  }
  
  return result;
}

/**
 * 📋 列出所有現有的 Rich Menu
 */
function listAllRichMenus() {
  const menus = RichMenuService.listRichMenus();
  console.log('==========================================');
  console.log('📋 現有 Rich Menu 列表:');
  menus.forEach((menu, index) => {
    console.log(`${index + 1}. ID: ${menu.richMenuId}`);
    console.log(`   名稱: ${menu.name}`);
    console.log(`   大小: ${menu.size.width} x ${menu.size.height}`);
    console.log('');
  });
  console.log('==========================================');
  return menus;
}

/**
 * 🗑️ 刪除指定的 Rich Menu
 * @param {string} richMenuId - 要刪除的 Rich Menu ID
 */
function deleteRichMenuById(richMenuId) {
  const result = RichMenuService.deleteRichMenu(richMenuId);
  console.log('刪除結果:', result ? '成功' : '失敗');
  return result;
}

/**
 * 📷 從 Google Drive 上傳圖片到 Rich Menu
 * @param {string} richMenuId - Rich Menu ID
 * @param {string} driveFileId - Google Drive 檔案 ID
 */
function uploadImageToRichMenu(richMenuId, driveFileId) {
  const result = RichMenuService.uploadRichMenuImageFromDrive(richMenuId, driveFileId);
  console.log('上傳結果:', result ? '成功' : '失敗');
  return result;
}

/**
 * 🔍 查看目前的預設 Rich Menu
 */
function checkDefaultRichMenu() {
  const defaultId = RichMenuService.getDefaultRichMenu();
  console.log('目前預設 Rich Menu ID:', defaultId || '(無)');
  return defaultId;
}

/**
 * 🚀 一鍵完成：上傳圖片並設為預設
 * 執行此函數即可完成 Rich Menu 設定
 */
function completeRichMenuSetup() {
  const richMenuId = 'richmenu-532c4ba6f6e534ee536a182b7610c4de';  // 🔴 新的 Rich Menu ID
  const driveFileId = '11DyGPzSpkK8vDF8r5llaTbIto-GhrHNl';
  
  console.log('==========================================');
  console.log('🚀 開始完成 Rich Menu 設定...');
  console.log('==========================================');
  
  // 步驟 1：上傳圖片
  console.log('📷 步驟 1：上傳圖片...');
  const uploadResult = RichMenuService.uploadRichMenuImageFromDrive(richMenuId, driveFileId);
  
  if (!uploadResult) {
    console.error('❌ 圖片上傳失敗！');
    return { success: false, error: '圖片上傳失敗' };
  }
  
  console.log('✅ 圖片上傳成功！');
  
  // 步驟 2：設為預設
  console.log('🔗 步驟 2：設為預設選單...');
  const setDefaultResult = RichMenuService._setDefaultRichMenu(richMenuId);
  
  if (!setDefaultResult) {
    console.error('❌ 設定預設失敗！');
    return { success: false, error: '設定預設失敗' };
  }
  
  console.log('✅ 已設為預設選單！');
  console.log('==========================================');
  console.log('🎉 Rich Menu 設定完成！');
  console.log('==========================================');
  
  return { success: true, richMenuId: richMenuId };
}

