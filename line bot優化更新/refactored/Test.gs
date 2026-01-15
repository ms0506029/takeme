/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 訂單狀態完整測試套件
 * 
 * 測試各種訂單狀態的 Flex Message 顯示：
 * 1. 全部已購買（正常狀態）
 * 2. 部分缺貨
 * 3. 全部缺貨
 * 4. 部分已寄出
 * 5. 全部已寄出
 * 
 * 請依序執行每個測試函數，確認 LINE 收到的訊息正確
 * ═══════════════════════════════════════════════════════════════════════════
 */

// 🔴 設定測試用的 LINE User ID（請更換為您自己的 ID）
const TEST_LINE_USER_ID = 'Ub74499ca18dbd1604c225f02ac07a965';

/**
 * ═══════════════════════════════════════════════════════════
 * 🔴 會員綁定診斷工具 - 測試特定 Email 的 EasyStore 會員狀態
 * 
 * 使用方式：
 * 1. 在下方 TEST_EMAIL 變數中填入要測試的客戶 Email
 * 2. 執行此函數
 * 3. 查看執行紀錄 (Log) 的輸出結果
 * ═══════════════════════════════════════════════════════════
 */
function debugMemberBinding() {
  // ⬇️ 請在這裡填入要測試的客戶 Email
  var TEST_EMAIL = 'customer@example.com';  // 🔴 請替換成實際要測試的 Email
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 會員綁定診斷工具');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('📧 測試 Email:', TEST_EMAIL);
  console.log('⏰ 測試時間:', new Date().toLocaleString('zh-TW'));
  console.log('');
  
  // ========================================
  // Step 1: 檢查 EasyStore API 設定
  // ========================================
  console.log('────────────────────────────────────────');
  console.log('📋 Step 1: 檢查 EasyStore API 設定');
  console.log('────────────────────────────────────────');
  
  console.log('   BASE_API:', EASYSTORE_CONFIG.BASE_API);
  console.log('   ACCESS_TOKEN:', EASYSTORE_CONFIG.ACCESS_TOKEN ? '已設定 (' + EASYSTORE_CONFIG.ACCESS_TOKEN.substring(0, 8) + '...)' : '❌ 未設定');
  console.log('');
  
  // ========================================
  // Step 2: 呼叫 EasyStore Customers API
  // ========================================
  console.log('────────────────────────────────────────');
  console.log('📋 Step 2: 呼叫 EasyStore Customers API');
  console.log('────────────────────────────────────────');
  
  var normalizedEmail = TEST_EMAIL.toLowerCase().trim();
  var customersUrl = EASYSTORE_CONFIG.BASE_API + '/customers.json?query=' + encodeURIComponent(normalizedEmail) + '&limit=20';
  console.log('   🔗 API URL:', customersUrl);
  console.log('');
  
  try {
    var response = UrlFetchApp.fetch(customersUrl, {
      method: 'GET',
      headers: EASYSTORE_CONFIG.HEADERS,
      muteHttpExceptions: true
    });
    
    var responseCode = response.getResponseCode();
    console.log('   📡 HTTP 狀態碼:', responseCode);
    
    if (responseCode === 200) {
      var result = JSON.parse(response.getContentText());
      console.log('   ✅ API 呼叫成功');
      console.log('   📊 搜尋結果數量:', result.customers ? result.customers.length : 0);
      console.log('');
      
      // ========================================
      // Step 3: 分析搜尋結果
      // ========================================
      console.log('────────────────────────────────────────');
      console.log('📋 Step 3: 分析搜尋結果');
      console.log('────────────────────────────────────────');
      
      if (result.customers && result.customers.length > 0) {
        console.log('   📋 返回的客戶列表：');
        console.log('');
        
        var foundExactMatch = false;
        
        for (var i = 0; i < result.customers.length; i++) {
          var customer = result.customers[i];
          var customerEmail = (customer.email || '').toLowerCase();
          var isExactMatch = customerEmail === normalizedEmail;
          
          console.log('   ─── 客戶 ' + (i + 1) + ' ───');
          console.log('   ID:', customer.id);
          console.log('   Email:', customer.email);
          console.log('   姓名:', customer.name || customer.first_name || '(無姓名)');
          console.log('   精確匹配:', isExactMatch ? '✅ 是' : '❌ 否');
          console.log('   訂單數:', customer.order_count || 0);
          console.log('   註冊時間:', customer.created_at || '(無資料)');
          console.log('');
          
          if (isExactMatch) {
            foundExactMatch = true;
          }
        }
        
        // ========================================
        // Step 4: 診斷結論
        // ========================================
        console.log('────────────────────────────────────────');
        console.log('📋 Step 4: 診斷結論');
        console.log('────────────────────────────────────────');
        
        if (foundExactMatch) {
          console.log('   ✅ 結論：Email 精確匹配成功');
          console.log('   ✅ 此客戶應該可以成功綁定 LINE');
          console.log('');
          console.log('   🔍 如果仍無法綁定，可能原因：');
          console.log('      1. 客戶輸入的 Email 有多餘空格');
          console.log('      2. 大小寫問題（系統已自動處理）');
          console.log('      3. LINE Bot 發生其他錯誤');
        } else {
          console.log('   ⚠️ 結論：API 返回結果中沒有精確匹配的 Email');
          console.log('');
          console.log('   🔍 可能原因：');
          console.log('      1. 客戶使用的 Email 與搜尋的不完全相同');
          console.log('      2. EasyStore 搜尋返回的是「模糊匹配」結果');
          console.log('');
          console.log('   📧 搜尋的 Email:', normalizedEmail);
          console.log('   📧 API 返回的第一個 Email:', result.customers[0].email);
          console.log('');
          console.log('   💡 建議：請確認客戶使用的確切 Email 地址');
        }
        
      } else {
        console.log('   ❌ 結論：EasyStore 中找不到此 Email 的會員');
        console.log('');
        console.log('   🔍 可能原因：');
        console.log('      1. 客戶可能使用了不同的 Email 註冊');
        console.log('      2. 客戶可能記錯了自己使用的 Email');
        console.log('      3. 客戶可能尚未完成 EasyStore 註冊');
        console.log('');
        console.log('   💡 建議：');
        console.log('      1. 請客戶登入 EasyStore 官網確認帳號');
        console.log('      2. 檢查客戶是否有其他常用 Email');
        console.log('      3. 若客戶確定有註冊，請直接在 EasyStore 後台搜尋');
      }
      
    } else if (responseCode === 401) {
      console.log('   ❌ API 錯誤：401 未授權');
      console.log('   💡 請檢查 Config.gs 中的 EasyStore ACCESS_TOKEN 是否正確');
      console.log('   📋 完整回應:', response.getContentText());
    } else {
      console.log('   ❌ API 錯誤:', responseCode);
      console.log('   📋 完整回應:', response.getContentText());
    }
    
  } catch (error) {
    console.log('   ❌ API 呼叫異常:', error.toString());
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏁 診斷完成');
  console.log('═══════════════════════════════════════════════════════════');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 🔴 直接發送綁定成功訊息給特定客戶
 * 
 * 使用方式：
 * 1. 填入客戶的 LINE User ID
 * 2. 執行此函數
 * 3. 查看完整的 LINE API 回應
 * ═══════════════════════════════════════════════════════════
 */
function sendBindingSuccessToUser() {
  // ⬇️ 請填入客戶的 LINE User ID
  var TARGET_LINE_USER_ID = 'Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';  // 🔴 請替換成客戶的 LINE User ID
  
  // ⬇️ 可選：填入客戶姓名（用於個人化訊息）
  var CUSTOMER_NAME = '會員';
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📤 直接發送綁定成功訊息');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('👤 目標 LINE User ID:', TARGET_LINE_USER_ID);
  console.log('📛 客戶姓名:', CUSTOMER_NAME);
  console.log('⏰ 發送時間:', new Date().toLocaleString('zh-TW'));
  console.log('');
  
  // 建立綁定成功 Flex Message
  var successMessage = {
    type: 'flex',
    altText: '🎉 會員綁定成功！獲得新會員折扣碼',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🎉 綁定成功！',
            weight: 'bold',
            size: 'xl',
            color: '#28a745'
          },
          {
            type: 'text',
            text: '恭喜獲得新會員專屬折扣',
            size: 'sm',
            color: '#888888'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '歡迎，' + CUSTOMER_NAME + '！',
            weight: 'bold',
            size: 'lg'
          },
          {
            type: 'text',
            text: '您的 LINE 帳號已成功綁定會員資料。',
            wrap: true,
            margin: 'md'
          },
          {
            type: 'separator',
            margin: 'xl'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            backgroundColor: '#FFF8E1',
            cornerRadius: '10px',
            paddingAll: '15px',
            contents: [
              {
                type: 'text',
                text: '🎁 結帳輸入折扣碼',
                weight: 'bold',
                color: '#C4A35A',
                align: 'center'
              },
              {
                type: 'text',
                text: 'LINE100',
                weight: 'bold',
                size: '3xl',
                align: 'center',
                margin: 'md',
                color: '#C4A35A'
              },
              {
                type: 'text',
                text: '💰 享有額外優惠',
                size: 'sm',
                align: 'center',
                color: '#888888'
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '🛒 立即購物',
              uri: 'https://www.takemejapan.com'
            },
            style: 'primary',
            color: '#C4A35A'
          },
          {
            type: 'button',
            action: {
              type: 'message',
              label: '📦 查看我的訂單',
              text: '📦 查詢我的訂單'
            },
            margin: 'sm'
          }
        ]
      }
    }
  };
  
  // ========================================
  // 直接呼叫 LINE Push API 並顯示完整回應
  // ========================================
  console.log('────────────────────────────────────────');
  console.log('📋 呼叫 LINE Push API');
  console.log('────────────────────────────────────────');
  
  try {
    var url = 'https://api.line.me/v2/bot/message/push';
    var payload = {
      to: TARGET_LINE_USER_ID,
      messages: [successMessage]
    };
    
    console.log('   🔗 API URL:', url);
    console.log('   📦 Payload to:', TARGET_LINE_USER_ID);
    console.log('');
    
    var options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + LINE_CONFIG.CHANNEL_ACCESS_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var statusCode = response.getResponseCode();
    var responseText = response.getContentText();
    var responseHeaders = response.getAllHeaders();
    
    console.log('   📡 HTTP 狀態碼:', statusCode);
    console.log('   📋 回應內容:', responseText || '(空)');
    console.log('');
    
    if (statusCode === 200) {
      console.log('   ✅ API 呼叫成功！');
      console.log('');
      console.log('   📌 如果客戶仍然沒收到訊息，可能原因：');
      console.log('      1. LINE User ID 不正確');
      console.log('      2. 客戶已封鎖官方帳號');
      console.log('      3. 客戶已取消關注官方帳號');
      console.log('      4. Push 訊息配額已用完');
      console.log('');
      console.log('   💡 建議：');
      console.log('      1. 確認客戶的 LINE User ID 來源是否正確');
      console.log('      2. 請客戶確認是否有封鎖或取消關注');
      console.log('      3. 檢查 LINE Official Account Manager 的訊息配額');
    } else if (statusCode === 400) {
      console.log('   ❌ 錯誤 400：請求格式錯誤');
      var errorData = JSON.parse(responseText);
      console.log('   📋 錯誤詳情:', JSON.stringify(errorData, null, 2));
    } else if (statusCode === 401) {
      console.log('   ❌ 錯誤 401：未授權');
      console.log('   💡 請檢查 LINE_CHANNEL_ACCESS_TOKEN 是否正確');
    } else if (statusCode === 403) {
      console.log('   ❌ 錯誤 403：權限不足');
      console.log('   💡 可能原因：用戶已封鎖或取消關注');
    } else if (statusCode === 429) {
      console.log('   ❌ 錯誤 429：請求過於頻繁');
      console.log('   💡 請稍候再試');
    } else {
      console.log('   ❌ 錯誤:', statusCode);
    }
    
  } catch (error) {
    console.log('   ❌ API 呼叫異常:', error.toString());
    console.log('   📋 錯誤堆疊:', error.stack);
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏁 發送完成');
  console.log('═══════════════════════════════════════════════════════════');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 🔴 詳細 LINE User ID 診斷 - 驗證用戶是否有效
 * 
 * 使用 LINE Profile API 檢查：
 * 1. User ID 是否有效
 * 2. 用戶是否仍是好友
 * 3. 用戶的顯示名稱和頭像
 * ═══════════════════════════════════════════════════════════
 */
function debugLineUserId() {
  // ⬇️ 請填入要診斷的 LINE User ID
  var TARGET_USER_ID = 'Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';  // 🔴 請替換成客戶的 LINE User ID
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 詳細 LINE User ID 診斷');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('👤 診斷目標:', TARGET_USER_ID);
  console.log('⏰ 診斷時間:', new Date().toLocaleString('zh-TW'));
  console.log('');
  
  // ========================================
  // Step 1: 檢查 LINE Token 設定
  // ========================================
  console.log('────────────────────────────────────────');
  console.log('📋 Step 1: 檢查 LINE Token 設定');
  console.log('────────────────────────────────────────');
  
  var token = LINE_CONFIG.CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.log('   ❌ LINE_CHANNEL_ACCESS_TOKEN 未設定！');
    return;
  }
  console.log('   ✅ Token 已設定 (長度:', token.length, ')');
  console.log('   📋 Token 開頭:', token.substring(0, 20) + '...');
  console.log('');
  
  // ========================================
  // Step 2: 呼叫 LINE Profile API
  // ========================================
  console.log('────────────────────────────────────────');
  console.log('📋 Step 2: 呼叫 LINE Profile API');
  console.log('────────────────────────────────────────');
  
  try {
    var profileUrl = 'https://api.line.me/v2/bot/profile/' + TARGET_USER_ID;
    console.log('   🔗 API URL:', profileUrl);
    
    var profileResponse = UrlFetchApp.fetch(profileUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      muteHttpExceptions: true
    });
    
    var profileCode = profileResponse.getResponseCode();
    var profileText = profileResponse.getContentText();
    
    console.log('   📡 HTTP 狀態碼:', profileCode);
    console.log('');
    
    if (profileCode === 200) {
      var profile = JSON.parse(profileText);
      console.log('   ✅ 用戶有效！');
      console.log('   📛 顯示名稱:', profile.displayName);
      console.log('   🖼️ 頭像:', profile.pictureUrl || '(無頭像)');
      console.log('   📋 狀態訊息:', profile.statusMessage || '(無狀態訊息)');
      console.log('');
      console.log('   ✅ 此 User ID 是有效的，用戶仍是好友');
    } else if (profileCode === 404) {
      console.log('   ❌ 用戶不存在或已取消關注！');
      console.log('   📋 錯誤訊息:', profileText);
      console.log('');
      console.log('   🔍 可能原因：');
      console.log('      1. User ID 不正確');
      console.log('      2. 用戶已取消關注官方帳號');
      console.log('      3. User ID 來自不同的 LINE Channel');
      return;
    } else if (profileCode === 401) {
      console.log('   ❌ Token 無效或過期！');
      console.log('   📋 錯誤訊息:', profileText);
      console.log('');
      console.log('   💡 請重新產生 LINE Channel Access Token');
      return;
    } else {
      console.log('   ❌ 未知錯誤:', profileCode);
      console.log('   📋 錯誤訊息:', profileText);
      return;
    }
    
  } catch (error) {
    console.log('   ❌ API 呼叫異常:', error.toString());
    return;
  }
  
  console.log('');
  
  // ========================================
  // Step 3: 發送測試訊息
  // ========================================
  console.log('────────────────────────────────────────');
  console.log('📋 Step 3: 發送測試訊息');
  console.log('────────────────────────────────────────');
  
  try {
    var pushUrl = 'https://api.line.me/v2/bot/message/push';
    var testMessage = {
      to: TARGET_USER_ID,
      messages: [{
        type: 'text',
        text: '🧪 這是 LINE Bot 診斷測試訊息\n\n如果您收到此訊息，表示推播功能正常運作。\n\n時間：' + new Date().toLocaleString('zh-TW')
      }]
    };
    
    console.log('   📤 發送測試訊息...');
    
    var pushResponse = UrlFetchApp.fetch(pushUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      payload: JSON.stringify(testMessage),
      muteHttpExceptions: true
    });
    
    var pushCode = pushResponse.getResponseCode();
    var pushText = pushResponse.getContentText();
    
    console.log('   📡 HTTP 狀態碼:', pushCode);
    console.log('   📋 回應內容:', pushText || '(空)');
    console.log('');
    
    if (pushCode === 200) {
      console.log('   ✅ 訊息發送成功！');
      console.log('');
      console.log('   📌 如果用戶仍然沒收到訊息：');
      console.log('      1. 請用戶檢查 LINE 通知設定');
      console.log('      2. 請用戶嘗試關閉/重開 LINE App');
      console.log('      3. 用戶可能有開啟「封鎖不明帳號」設定');
    } else {
      console.log('   ❌ 訊息發送失敗！');
      
      if (pushText) {
        try {
          var errorData = JSON.parse(pushText);
          console.log('   📋 錯誤詳情:', JSON.stringify(errorData, null, 2));
        } catch (e) {
          console.log('   📋 錯誤訊息:', pushText);
        }
      }
    }
    
  } catch (error) {
    console.log('   ❌ 發送異常:', error.toString());
  }
  
  console.log('');
  
  // ========================================
  // Step 4: 檢查訊息配額
  // ========================================
  console.log('────────────────────────────────────────');
  console.log('📋 Step 4: 檢查訊息配額');
  console.log('────────────────────────────────────────');
  
  try {
    var quotaUrl = 'https://api.line.me/v2/bot/message/quota';
    
    var quotaResponse = UrlFetchApp.fetch(quotaUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      muteHttpExceptions: true
    });
    
    var quotaCode = quotaResponse.getResponseCode();
    var quotaText = quotaResponse.getContentText();
    
    console.log('   📡 HTTP 狀態碼:', quotaCode);
    
    if (quotaCode === 200) {
      var quota = JSON.parse(quotaText);
      console.log('   📊 訊息配額類型:', quota.type);
      if (quota.value !== undefined) {
        console.log('   📊 每月配額:', quota.value);
      }
    }
    
    // 檢查已使用配額
    var consumptionUrl = 'https://api.line.me/v2/bot/message/quota/consumption';
    var consumptionResponse = UrlFetchApp.fetch(consumptionUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      muteHttpExceptions: true
    });
    
    if (consumptionResponse.getResponseCode() === 200) {
      var consumption = JSON.parse(consumptionResponse.getContentText());
      console.log('   📊 本月已使用:', consumption.totalUsage);
    }
    
  } catch (error) {
    console.log('   ⚠️ 無法取得配額資訊:', error.toString());
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏁 診斷完成');
  console.log('═══════════════════════════════════════════════════════════');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 🔍 透過信箱反查 LINE User ID
 * 
 * 從「會員綁定記錄」與「訂單管理」表中尋找對應的 LINE User ID
 * ═══════════════════════════════════════════════════════════
 */
function findLineUserIdByEmail() {
  // ⬇️ 請填入要查詢的信箱
  var SEARCH_EMAIL = 'customer@example.com'; // 🔴 請替換成要查詢的 Email
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 透過信箱反查 LINE User ID');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('📧 查詢信箱:', SEARCH_EMAIL);
  
  var normalizedEmail = SEARCH_EMAIL.toLowerCase().trim();
  var foundIds = [];
  
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 1. 檢查「會員綁定記錄」表
    console.log('────────────────────────────────────────');
    console.log('📋 Step 1: 檢查「會員綁定記錄」表');
    console.log('────────────────────────────────────────');
    
    var bindingSheet = ss.getSheetByName('會員綁定記錄');
    if (bindingSheet) {
      var bindingData = bindingSheet.getDataRange().getValues();
      var foundInBinding = false;
      
      for (var i = 1; i < bindingData.length; i++) {
        var rowEmail = (bindingData[i][2] || '').toString().toLowerCase().trim();
        var lineUserId = bindingData[i][1];
        var status = bindingData[i][4];
        
        if (rowEmail === normalizedEmail) {
          console.log('   ✅ 找到匹配記錄！');
          console.log('   🆔 LINE User ID:', lineUserId);
          console.log('   👤 狀態:', status);
          console.log('   📅 綁定時間:', bindingData[i][0]);
          
          if (lineUserId && foundIds.indexOf(lineUserId) === -1) {
            foundIds.push(lineUserId);
          }
          foundInBinding = true;
        }
      }
      
      if (!foundInBinding) {
        console.log('   ⚠️ 在綁定記錄中未找到此 Email');
      }
    } else {
      console.log('   ❌ 找不到「會員綁定記錄」表');
    }
    
    console.log('');
    
    // 2. 檢查「訂單管理」表（作為備份）
    console.log('────────────────────────────────────────');
    console.log('📋 Step 2: 檢查「訂單管理」表');
    console.log('────────────────────────────────────────');
    
    var ordersSheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
    if (ordersSheet) {
      var ordersData = ordersSheet.getDataRange().getValues();
      var headers = ordersData[0];
      var emailIndex = headers.indexOf('客戶Email');
      var lineUserIdIndex = headers.indexOf('LINE_User_ID');
      
      if (emailIndex !== -1 && lineUserIdIndex !== -1) {
        var foundInOrders = false;
        for (var j = 1; j < ordersData.length; j++) {
          var orderEmail = (ordersData[j][emailIndex] || '').toString().toLowerCase().trim();
          var orderLineId = ordersData[j][lineUserIdIndex];
          
          if (orderEmail === normalizedEmail && orderLineId) {
            console.log('   ✅ 在訂單第 ' + (j + 1) + ' 列找到匹配！');
            console.log('   🆔 LINE User ID:', orderLineId);
            
            if (foundIds.indexOf(orderLineId) === -1) {
              foundIds.push(orderLineId);
            }
            foundInOrders = true;
          }
        }
        
        if (!foundInOrders) {
          console.log('   ⚠️ 在訂單管理中未找到已同步的 ID');
        }
      } else {
        console.log('   ❌ 訂單管理表缺少 Email 或 LINE_User_ID 欄位');
      }
    } else {
      console.log('   ❌ 找不到「訂單管理」表');
    }
    
  } catch (error) {
    console.log('   ❌ 查詢異常:', error.toString());
  }
  
  console.log('');
  console.log('────────────────────────────────────────');
  console.log('📊 最終結果匯總');
  console.log('────────────────────────────────────────');
  
  if (foundIds.length > 0) {
    console.log('   🎉 成功！找到以下 LINE User ID：');
    foundIds.forEach(function(id, idx) {
      console.log('   ' + (idx + 1) + '. ' + id);
    });
    console.log('');
    console.log('   💡 您可以複製上面的 ID 到 debugLineUserId 進行進一步診斷。');
  } else {
    console.log('   ❌ 失敗：找不到任何與此信箱關聯的 LINE User ID');
    console.log('');
    console.log('   💡 這表示：');
    console.log('      1. 客戶可能還沒開始綁定流程');
    console.log('      2. 客戶使用的是不同的信箱地址');
    console.log('      3. 資料表同步尚未執行');
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏁 查詢完成');
  console.log('═══════════════════════════════════════════════════════════');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 🔴 完整會員綁定流程測試 - 模擬整個綁定流程並發送 LINE 訊息
 * 
 * 使用方式：
 * 1. 填入客戶的 Email 和您自己的 LINE User ID
 * 2. 執行此函數
 * 3. 檢查 Log 和 LINE 是否收到訊息
 * ═══════════════════════════════════════════════════════════
 */
function testMemberBindingFlow() {
  // ⬇️ 請填入要測試的客戶 Email
  var TEST_EMAIL = 'customer@example.com';  // 🔴 請替換成實際要測試的 Email
  
  // ⬇️ 請填入您的 LINE User ID（用於接收測試訊息）
  var RECEIVE_LINE_USER_ID = TEST_LINE_USER_ID;  // 預設使用 Test.gs 開頭的 ID
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 完整會員綁定流程測試');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('📧 測試 Email:', TEST_EMAIL);
  console.log('👤 LINE User ID:', RECEIVE_LINE_USER_ID);
  console.log('⏰ 測試時間:', new Date().toLocaleString('zh-TW'));
  console.log('');
  
  // ========================================
  // Step 1: 測試 LINE Push API 連接
  // ========================================
  console.log('────────────────────────────────────────');
  console.log('📋 Step 1: 測試 LINE Push API 連接');
  console.log('────────────────────────────────────────');
  
  try {
    // 發送簡單測試訊息（使用正確的 sendPush 格式）
    var testMessage = {
      type: 'text',
      text: '🧪 LINE Bot 測試訊息 - 請忽略'
    };
    var testResult = LineService.sendPush(RECEIVE_LINE_USER_ID, testMessage);
    console.log('   📤 LINE Push 測試:', testResult ? '✅ 成功' : '❌ 失敗');
    
    if (!testResult) {
      console.log('   ❌ LINE Push 失敗！請檢查：');
      console.log('      1. LINE_CHANNEL_ACCESS_TOKEN 是否正確');
      console.log('      2. LINE User ID 是否正確');
      console.log('      3. 用戶是否已加入官方帳號');
      return;
    }
  } catch (error) {
    console.log('   ❌ LINE Push 異常:', error.toString());
    return;
  }
  console.log('');
  
  // ========================================
  // Step 2: 呼叫 EasyStore API 驗證會員
  // ========================================
  console.log('────────────────────────────────────────');
  console.log('📋 Step 2: 呼叫 EasyStore API 驗證會員');
  console.log('────────────────────────────────────────');
  
  var verifyResult = MemberService._verifyMemberWithEasyStore(TEST_EMAIL);
  console.log('   📊 驗證結果:', JSON.stringify(verifyResult, null, 2));
  console.log('');
  
  if (!verifyResult.success) {
    console.log('   ❌ EasyStore 驗證失敗:', verifyResult.error);
    console.log('');
    
    // 發送失敗訊息測試
    console.log('────────────────────────────────────────');
    console.log('📋 Step 3: 測試發送「綁定失敗」訊息');
    console.log('────────────────────────────────────────');
    
    try {
      MemberService._sendBindingFailedMessage(RECEIVE_LINE_USER_ID, verifyResult.error);
      console.log('   📤 綁定失敗訊息已發送，請檢查 LINE');
    } catch (error) {
      console.log('   ❌ 發送失敗訊息異常:', error.toString());
      console.log('   📋 錯誤堆疊:', error.stack);
    }
    
    return;
  }
  
  console.log('   ✅ EasyStore 驗證成功');
  console.log('   📋 客戶資料:');
  console.log('      ID:', verifyResult.customer.id);
  console.log('      Email:', verifyResult.customer.email);
  console.log('      姓名:', verifyResult.customer.name);
  console.log('      訂單數:', verifyResult.customer.orderCount);
  console.log('');
  
  // ========================================
  // Step 3: 測試發送「綁定成功」訊息
  // ========================================
  console.log('────────────────────────────────────────');
  console.log('📋 Step 3: 測試發送「綁定成功」Flex 訊息');
  console.log('────────────────────────────────────────');
  
  try {
    var memberData = {
      email: verifyResult.customer.email || TEST_EMAIL,
      name: verifyResult.customer.name || TEST_EMAIL,
      orderCount: verifyResult.customer.orderCount || 0
    };
    
    console.log('   📦 memberData:', JSON.stringify(memberData));
    
    // 手動建立 Flex Message 並發送
    var successMessage = {
      type: 'flex',
      altText: '🎉 會員綁定成功！獲得新會員折扣碼',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🎉 綁定成功！',
              weight: 'bold',
              size: 'xl',
              color: '#28a745'
            },
            {
              type: 'text',
              text: '恭喜獲得新會員專屬折扣',
              size: 'sm',
              color: '#888888'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '歡迎，' + memberData.name + '！',
              weight: 'bold',
              size: 'lg'
            },
            {
              type: 'text',
              text: '您的 LINE 帳號已成功綁定會員資料。',
              wrap: true,
              margin: 'md'
            },
            {
              type: 'separator',
              margin: 'xl'
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'xl',
              backgroundColor: '#FFF8E1',
              cornerRadius: '10px',
              paddingAll: '15px',
              contents: [
                {
                  type: 'text',
                  text: '🎁 結帳輸入折扣碼',
                  weight: 'bold',
                  color: '#C4A35A',
                  align: 'center'
                },
                {
                  type: 'text',
                  text: 'LINE100',
                  weight: 'bold',
                  size: '3xl',
                  align: 'center',
                  margin: 'md',
                  color: '#C4A35A'
                },
                {
                  type: 'text',
                  text: '💰 享有額外優惠',
                  size: 'sm',
                  align: 'center',
                  color: '#888888'
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '🛒 立即購物',
                uri: 'https://www.takemejapan.com'
              },
              style: 'primary',
              color: '#C4A35A'
            }
          ]
        }
      }
    };
    
    console.log('   📤 發送 Flex Message...');
    var pushResult = LineService.sendPush(RECEIVE_LINE_USER_ID, successMessage);
    console.log('   📤 發送結果:', pushResult ? '✅ 成功' : '❌ 失敗');
    
    if (!pushResult) {
      console.log('   ❌ Flex Message 發送失敗！');
      console.log('   💡 嘗試查看 LineService.sendPush 的詳細錯誤');
    }
    
  } catch (error) {
    console.log('   ❌ 發送成功訊息異常:', error.toString());
    console.log('   📋 錯誤堆疊:', error.stack);
  }
  
  console.log('');
  
  // ========================================
  // Step 4: 測試使用 MemberService 內建函數發送
  // ========================================
  console.log('────────────────────────────────────────');
  console.log('📋 Step 4: 使用 MemberService 內建函數發送');
  console.log('────────────────────────────────────────');
  
  try {
    console.log('   📤 呼叫 MemberService._sendBindingSuccessMessage()...');
    MemberService._sendBindingSuccessMessage(RECEIVE_LINE_USER_ID, memberData, TEST_EMAIL);
    console.log('   ✅ 呼叫完成（請檢查 LINE 是否收到第二則訊息）');
  } catch (error) {
    console.log('   ❌ MemberService 發送異常:', error.toString());
    console.log('   📋 錯誤堆疊:', error.stack);
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏁 測試完成');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('📌 請檢查您的 LINE 是否收到以下訊息：');
  console.log('   1. 簡單測試訊息');
  console.log('   2. 手動建立的綁定成功 Flex Message');
  console.log('   3. MemberService 發送的綁定成功訊息');
  console.log('');
  console.log('如果只收到部分訊息，可以定位問題出在哪個步驟');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 主測試選單 - 執行此函數查看所有可用測試
 * ═══════════════════════════════════════════════════════════
 */
function testMenu() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 訂單狀態測試套件');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('📋 可用的測試函數：');
  console.log('');
  console.log('  1. testOrderStatus_AllPurchased    - 全部已購買（正常）');
  console.log('  2. testOrderStatus_PartialOOS      - 部分缺貨');
  console.log('  3. testOrderStatus_AllOOS          - 全部缺貨');
  console.log('  4. testOrderStatus_PartialShipped  - 部分已寄出');
  console.log('  5. testOrderStatus_AllShipped      - 全部已寄出');
  console.log('  6. testOrderStatus_RunAll          - 依序執行全部測試');
  console.log('');
  console.log('  🆕 testOrderStatus_Preorder        - 🕐 預購商品測試');
  console.log('  🆕 testOrderStatus_PartialPreorder - 🕐 部分預購測試');
  console.log('');
  console.log('  📌 testOOSButtonHandler            - 測試缺貨按鈕回調處理');
  console.log('');
  console.log('  🔍 debugMemberBinding              - 會員綁定診斷（只檢查 Email）');
  console.log('  🔍 testMemberBindingFlow           - 完整綁定流程測試（含 LINE 訊息）');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('👤 測試 LINE User ID:', TEST_LINE_USER_ID);
  console.log('⚠️  請確認 ID 正確，測試會實際發送訊息給此用戶');
  console.log('═══════════════════════════════════════════════════════════');
}


/**
 * ═══════════════════════════════════════════════════════════
 * 測試 1: 全部已購買（正常狀態）
 * ═══════════════════════════════════════════════════════════
 */
function testOrderStatus_AllPurchased() {
  console.log('\n🧪 測試 1: 全部已購買');
  console.log('────────────────────────────────────────');
  
  const mockOrders = [{
    orderNumber: 'TEST-001',
    totalAmount: 2580,
    orderDate: '2025-12-15T10:30:00+08:00',
    overallStatus: { emoji: '✅', label: '已購買', status: 'purchased' },
    queueItems: [
      {
        productName: 'BEAMS 經典格紋襯衫',
        color: '藍色',
        size: 'M',
        qtyOrdered: 1,
        purchaseStatus: '已購',
        packedAt: null
      },
      {
        productName: 'URBAN RESEARCH 休閒長褲',
        color: '卡其',
        size: 'L',
        qtyOrdered: 1,
        purchaseStatus: '已購',
        packedAt: null
      }
    ]
  }];
  
  _sendTestOrders(mockOrders, '全部已購買');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 測試 2: 部分缺貨
 * ═══════════════════════════════════════════════════════════
 */
function testOrderStatus_PartialOOS() {
  console.log('\n🧪 測試 2: 部分缺貨');
  console.log('────────────────────────────────────────');
  
  const mockOrders = [{
    orderNumber: 'TEST-002',
    totalAmount: 3890,
    orderDate: '2025-12-14T15:20:00+08:00',
    overallStatus: { emoji: '⚠️', label: '部分缺貨', status: 'oos' },
    queueItems: [
      {
        productName: 'NANO universe 羊毛大衣',
        color: '深藍',
        size: 'M',
        qtyOrdered: 1,
        purchaseStatus: '已購',
        packedAt: '12/10'
      },
      {
        productName: 'BEAUTY&YOUTH 針織毛衣',
        color: '米白',
        size: 'S',
        qtyOrdered: 1,
        purchaseStatus: '缺貨',  // 🔴 缺貨狀態
        packedAt: null
      },
      {
        productName: 'JOURNAL STANDARD 牛仔褲',
        color: '水洗藍',
        size: '32',
        qtyOrdered: 1,
        purchaseStatus: '已購',
        packedAt: null
      }
    ]
  }];
  
  _sendTestOrders(mockOrders, '部分缺貨（應顯示等待/退款按鈕）');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 測試 3: 全部缺貨
 * ═══════════════════════════════════════════════════════════
 */
function testOrderStatus_AllOOS() {
  console.log('\n🧪 測試 3: 全部缺貨');
  console.log('────────────────────────────────────────');
  
  const mockOrders = [{
    orderNumber: 'TEST-003',
    totalAmount: 4290,
    orderDate: '2025-12-13T09:00:00+08:00',
    overallStatus: { emoji: '❌', label: '全部缺貨', status: 'oos' },
    queueItems: [
      {
        productName: 'SHIPS 限量聯名外套',
        color: '黑色',
        size: 'L',
        qtyOrdered: 1,
        purchaseStatus: '缺貨',  // 🔴 缺貨
        packedAt: null
      },
      {
        productName: 'UNITED ARROWS 限定T恤',
        color: '白色',
        size: 'M',
        qtyOrdered: 2,
        purchaseStatus: '缺貨',  // 🔴 缺貨
        packedAt: null
      }
    ]
  }];
  
  _sendTestOrders(mockOrders, '全部缺貨（應顯示等待/退款按鈕）');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 測試 4: 部分已寄出
 * ═══════════════════════════════════════════════════════════
 */
function testOrderStatus_PartialShipped() {
  console.log('\n🧪 測試 4: 部分已寄出');
  console.log('────────────────────────────────────────');
  
  const mockOrders = [{
    orderNumber: 'TEST-004',
    totalAmount: 5680,
    orderDate: '2025-12-10T14:45:00+08:00',
    overallStatus: { emoji: '📦', label: '部分寄出', status: 'partial_shipped' },
    queueItems: [
      {
        productName: 'ADAM ET ROPÉ 羊絨圍巾',
        color: '灰色',
        size: 'FREE',
        qtyOrdered: 1,
        purchaseStatus: '已購',
        packedAt: '12/12'  // 已入箱
      },
      {
        productName: 'green label relaxing 休閒鞋',
        color: '棕色',
        size: '27',
        qtyOrdered: 1,
        purchaseStatus: '已購',
        packedAt: null  // 尚未入箱
      },
      {
        productName: 'ROPE PICNIC 手提包',
        color: '駝色',
        size: 'ONE SIZE',
        qtyOrdered: 1,
        purchaseStatus: '已購',
        packedAt: '12/12'  // 已入箱
      }
    ]
  }];
  
  _sendTestOrders(mockOrders, '部分已寄出（部分商品有入箱日期）');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 測試 5: 全部已寄出
 * ═══════════════════════════════════════════════════════════
 */
function testOrderStatus_AllShipped() {
  console.log('\n🧪 測試 5: 全部已寄出');
  console.log('────────────────────────────────────────');
  
  const mockOrders = [{
    orderNumber: 'TEST-005',
    totalAmount: 2180,
    orderDate: '2025-12-08T11:30:00+08:00',
    overallStatus: { emoji: '🚚', label: '已寄出', status: 'shipped' },
    queueItems: [
      {
        productName: 'LOWRYS FARM 碎花洋裝',
        color: '粉紅',
        size: 'M',
        qtyOrdered: 1,
        purchaseStatus: '已購',
        packedAt: '12/10'
      },
      {
        productName: 'GLOBAL WORK 針織外套',
        color: '深藍',
        size: 'S',
        qtyOrdered: 1,
        purchaseStatus: '已購',
        packedAt: '12/10'
      }
    ]
  }];
  
  _sendTestOrders(mockOrders, '全部已寄出（所有商品都有入箱日期）');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 測試 6: 全部預購（所有商品都有預購月份和預購旬）
 * ═══════════════════════════════════════════════════════════
 */
function testOrderStatus_Preorder() {
  console.log('\n🧪 測試 6: 全部預購');
  console.log('────────────────────────────────────────');
  
  var mockOrders = [{
    orderNumber: 'TEST-006',
    totalAmount: 4580,
    orderDate: '2025-12-18T11:00:00+08:00',
    overallStatus: { emoji: '🕐', label: '預購中', status: 'preorder' },
    queueItems: [
      {
        productName: 'BEAMS 2025春夏限定外套',
        color: '海軍藍',
        size: 'M',
        qtyOrdered: 1,
        purchaseStatus: '預購',
        packedAt: null,
        boxId: '',
        preorderMonth: '2025-12',
        preorderPeriod: '下'
      },
      {
        productName: 'UNITED ARROWS 新年限定襯衫',
        color: '白色',
        size: 'L',
        qtyOrdered: 1,
        purchaseStatus: '預購',
        packedAt: null,
        boxId: '',
        preorderMonth: '2025-12',
        preorderPeriod: '中'
      },
      {
        productName: 'NANO universe 春季新款長褲',
        color: '卡其',
        size: '32',
        qtyOrdered: 1,
        purchaseStatus: '預購',
        packedAt: null,
        boxId: '',
        preorderMonth: '2025-11',
        preorderPeriod: '下'
      }
    ]
  }];
  
  _sendTestOrders(mockOrders, '全部預購（應顯示預計出貨日期）');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 測試 7: 部分預購（混合已購買和預購商品）
 * ═══════════════════════════════════════════════════════════
 */
function testOrderStatus_PartialPreorder() {
  console.log('\n🧪 測試 7: 部分預購');
  console.log('────────────────────────────────────────');
  
  var mockOrders = [{
    orderNumber: 'TEST-007',
    totalAmount: 6280,
    orderDate: '2025-12-17T16:30:00+08:00',
    overallStatus: { emoji: '🕐', label: '部分預購', status: 'partial_preorder' },
    queueItems: [
      {
        productName: 'BEAMS 經典格紋襯衫',
        color: '藍色',
        size: 'M',
        qtyOrdered: 1,
        purchaseStatus: '已購',
        packedAt: '12/15',
        boxId: 'BOX-001',
        preorderMonth: '',
        preorderPeriod: ''
      },
      {
        productName: 'SHIPS 2025春夏新款T恤',
        color: '白色',
        size: 'L',
        qtyOrdered: 2,
        purchaseStatus: '預購',
        packedAt: null,
        boxId: '',
        preorderMonth: '2025-12',
        preorderPeriod: '下'
      },
      {
        productName: 'JOURNAL STANDARD 牛仔褲',
        color: '水洗藍',
        size: '32',
        qtyOrdered: 1,
        purchaseStatus: '已購',
        packedAt: null,
        boxId: '',
        preorderMonth: '',
        preorderPeriod: ''
      }
    ]
  }];
  
  _sendTestOrders(mockOrders, '部分預購（混合已購買和預購商品）');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 依序執行全部測試（每個間隔 3 秒）
 * ═══════════════════════════════════════════════════════════
 */
function testOrderStatus_RunAll() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 依序執行全部訂單狀態測試');
  console.log('⏰ 每個測試間隔 3 秒');
  console.log('═══════════════════════════════════════════════════════════');
  
  testOrderStatus_AllPurchased();
  Utilities.sleep(3000);
  
  testOrderStatus_PartialOOS();
  Utilities.sleep(3000);
  
  testOrderStatus_AllOOS();
  Utilities.sleep(3000);
  
  testOrderStatus_PartialShipped();
  Utilities.sleep(3000);
  
  testOrderStatus_AllShipped();
  Utilities.sleep(3000);
  
  testOrderStatus_Preorder();
  Utilities.sleep(3000);
  
  testOrderStatus_PartialPreorder();
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ 全部測試完成！請檢查 LINE 收到的 7 則訊息');
  console.log('═══════════════════════════════════════════════════════════');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 測試缺貨按鈕回調處理
 * 模擬用戶點擊「願意等待」或「不願等待」按鈕
 * ═══════════════════════════════════════════════════════════
 */
function testOOSButtonHandler() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 測試缺貨按鈕回調處理');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // 模擬 postback 事件：願意等待
  const mockEventWait = {
    type: 'postback',
    source: { userId: TEST_LINE_USER_ID },
    replyToken: 'MOCK_REPLY_TOKEN_WAIT',
    postback: { data: 'action=oos_wait&orderNumber=TEST-002' }
  };
  
  // 模擬 postback 事件：不願等待
  const mockEventRefund = {
    type: 'postback',
    source: { userId: TEST_LINE_USER_ID },
    replyToken: 'MOCK_REPLY_TOKEN_REFUND',
    postback: { data: 'action=oos_refund&orderNumber=TEST-002' }
  };
  
  console.log('📋 測試 1: 模擬「願意等待」按鈕');
  console.log('   Postback data:', mockEventWait.postback.data);
  console.log('');
  
  // 檢查 Controller 中是否有處理此 postback 的邏輯
  if (typeof handlePostback === 'function') {
    try {
      // 注意：這會嘗試使用無效的 replyToken，所以會失敗
      // 但我們可以看到處理邏輯是否正確
      console.log('⚠️  注意：由於 replyToken 無效，實際發送會失敗');
      console.log('   但我們可以檢查處理邏輯是否存在...');
      
      // 解析 postback data
      const params = new URLSearchParams(mockEventWait.postback.data);
      console.log('   ✅ action:', params.get('action'));
      console.log('   ✅ orderNumber:', params.get('orderNumber'));
      
    } catch (e) {
      console.log('   處理結果:', e.message);
    }
  } else {
    console.log('⚠️  handlePostback 函數不存在');
  }
  
  console.log('');
  console.log('📋 測試 2: 發送測試訊息確認按鈕回調路徑');
  
  // 發送一個簡單的確認訊息
  const confirmMessage = {
    type: 'flex',
    altText: '缺貨處理選項測試',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '⚠️ 缺貨處理選項測試',
            weight: 'bold',
            size: 'lg',
            align: 'center'
          },
          {
            type: 'text',
            text: '請點擊下方按鈕測試回調功能',
            size: 'sm',
            color: '#666666',
            margin: 'md',
            align: 'center'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'postback',
                  label: '🟢 願意等待',
                  data: 'action=oos_wait&orderNumber=TEST-002',
                  displayText: '我願意等待'
                },
                style: 'secondary',
                height: 'sm',
                flex: 1
              },
              {
                type: 'button',
                action: {
                  type: 'postback',
                  label: '🔴 不願等待',
                  data: 'action=oos_refund&orderNumber=TEST-002',
                  displayText: '我不願意等待（申請退款）'
                },
                style: 'secondary',
                color: '#dc3545',
                height: 'sm',
                flex: 1
              }
            ]
          },
          {
            type: 'text',
            text: '點擊按鈕後查看 GAS 執行紀錄',
            size: 'xxs',
            color: '#999999',
            margin: 'md',
            align: 'center'
          }
        ]
      }
    }
  };
  
  const result = LineService.sendPush(TEST_LINE_USER_ID, confirmMessage);
  console.log('📤 發送結果:', result ? '✅ 成功' : '❌ 失敗');
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📌 請在 LINE 中點擊按鈕，然後查看 GAS 執行紀錄');
  console.log('═══════════════════════════════════════════════════════════');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 內部輔助函數：發送測試訂單
 * ═══════════════════════════════════════════════════════════
 */
function _sendTestOrders(orders, testName) {
  console.log('📤 發送測試訂單:', testName);
  console.log('   訂單數量:', orders.length);
  console.log('   訂單編號:', orders.map(o => o.orderNumber).join(', '));
  
  try {
    OrderService._sendOrderListMessage(TEST_LINE_USER_ID, orders);
    console.log('✅ 發送成功！請檢查 LINE');
  } catch (error) {
    console.error('❌ 發送失敗:', error.message);
    console.error('   錯誤堆疊:', error.stack);
  }
}

/**
 * ═══════════════════════════════════════════════════════════
 * 🔴 按鈕測試 - 使用最簡單的格式確認按鈕是否能點擊
 * ═══════════════════════════════════════════════════════════
 */
function testSimpleButton() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 測試簡單按鈕（確認按鈕是否能正常點擊）');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // 使用最簡單的 Flex Message 格式
  const simpleFlexMessage = {
    type: 'flex',
    altText: '按鈕測試',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🧪 按鈕點擊測試',
            weight: 'bold',
            size: 'lg',
            align: 'center'
          },
          {
            type: 'text',
            text: '請測試下方每個按鈕是否能點擊',
            size: 'sm',
            color: '#666666',
            margin: 'md',
            align: 'center',
            wrap: true
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          // 測試 1: message 類型按鈕
          {
            type: 'button',
            action: {
              type: 'message',
              label: '測試 Message 按鈕',
              text: '🚚 查詢物流狀態'
            },
            style: 'primary',
            height: 'md'
          },
          // 測試 2: postback 類型按鈕
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '測試 Postback 按鈕',
              data: 'action=test_button',
              displayText: '我點擊了 Postback 按鈕'
            },
            style: 'secondary',
            height: 'md'
          },
          // 測試 3: URI 類型按鈕
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '測試 URI 按鈕（開啟網頁）',
              uri: 'https://line.me'
            },
            style: 'link',
            height: 'md'
          }
        ]
      }
    }
  };
  
  try {
    const result = LineService.sendPush(TEST_LINE_USER_ID, simpleFlexMessage);
    console.log('📤 發送結果:', result ? '✅ 成功' : '❌ 失敗');
    console.log('');
    console.log('📌 請在 LINE 中測試：');
    console.log('   1. 點擊「測試 Message 按鈕」- 應該發送訊息');
    console.log('   2. 點擊「測試 Postback 按鈕」- 應該發送 Postback');
    console.log('   3. 點擊「測試 URI 按鈕」- 應該開啟 LINE 網頁');
  } catch (error) {
    console.error('❌ 發送失敗:', error.message);
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 🔴 測試訂單卡片使用不同尺寸
 * LINE Flex Message 的 bubble size 可能影響按鈕點擊
 * ═══════════════════════════════════════════════════════════
 */
function testOrderCardWithDifferentSizes() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 測試不同尺寸的訂單卡片');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // 使用 "kilo" 尺寸（較小）
  const kiloSizeCard = {
    type: 'flex',
    altText: '訂單測試 (kilo size)',
    contents: {
      type: 'bubble',
      size: 'kilo',  // 較小尺寸
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#C4A35A',
        paddingAll: 'md',
        contents: [
          {
            type: 'text',
            text: '📦 訂單 #SIZE-TEST',
            weight: 'bold',
            size: 'md',
            color: '#ffffff'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        contents: [
          {
            type: 'text',
            text: '這是 kilo 尺寸測試',
            size: 'sm',
            wrap: true
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        contents: [
          {
            type: 'button',
            action: {
              type: 'message',
              label: '🚚 查看物流進度',
              text: '🚚 查詢物流狀態'
            },
            style: 'primary',
            color: '#C4A35A',
            height: 'md'
          }
        ]
      }
    }
  };
  
  // 使用 "mega" 尺寸（較大但不是最大）
  const megaSizeCard = {
    type: 'flex',
    altText: '訂單測試 (mega size)',
    contents: {
      type: 'bubble',
      size: 'mega',  // 較大尺寸
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#C4A35A',
        paddingAll: 'md',
        contents: [
          {
            type: 'text',
            text: '📦 訂單 #MEGA-TEST',
            weight: 'bold',
            size: 'lg',
            color: '#ffffff'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        contents: [
          {
            type: 'text',
            text: '這是 mega 尺寸測試（與 giga 相比較小）',
            size: 'sm',
            wrap: true
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        contents: [
          {
            type: 'button',
            action: {
              type: 'message',
              label: '🚚 查看物流進度',
              text: '🚚 查詢物流狀態'
            },
            style: 'primary',
            color: '#C4A35A',
            height: 'md'
          }
        ]
      }
    }
  };
  
  try {
    LineService.sendPush(TEST_LINE_USER_ID, kiloSizeCard);
    console.log('✅ kilo 尺寸卡片已發送');
    
    Utilities.sleep(1000);
    
    LineService.sendPush(TEST_LINE_USER_ID, megaSizeCard);
    console.log('✅ mega 尺寸卡片已發送');
    
    console.log('');
    console.log('📌 請比較兩張卡片的按鈕是否都能點擊');
    console.log('   如果 kilo/mega 能點擊但原本的無法，表示 giga 尺寸有問題');
  } catch (error) {
    console.error('❌ 發送失敗:', error.message);
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════════════════
// 以下是原有的診斷函數
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ═══════════════════════════════════════════════════════════
 * 🔴 診斷特定用戶的訂單查詢問題
 * 請在 GAS 編輯器中執行此函數，查看 log
 * ═══════════════════════════════════════════════════════════
 */
function debugOrderQueryForUser() {
  // 🔴 請把這裡改成卡住用戶的 LINE User ID
  const testLineUserId = 'Ub74499ca18dbd1604c225f02ac07a965';
  
  console.log('════════════════════════════════════════');
  console.log('🔴 診斷特定用戶訂單查詢問題');
  console.log('👤 LINE User ID:', testLineUserId);
  console.log('⏰ 時間:', new Date().toLocaleString('zh-TW'));
  console.log('════════════════════════════════════════\n');
  
  // ========================================
  // Step 1: 檢查 IntegrationService 是否存在
  // ========================================
  console.log('📋 Step 1: 檢查 IntegrationService');
  console.log('────────────────────────────────────────');
  
  if (typeof IntegrationService === 'undefined') {
    console.error('❌ IntegrationService 未定義！');
    console.error('請確認 IntegrationService.gs 已被加入專案');
    return;
  }
  console.log('✅ IntegrationService 存在');
  console.log('   可用方法:', Object.keys(IntegrationService).join(', '));
  
  // ========================================
  // Step 2: 執行 getOrdersByLineUserId
  // ========================================
  console.log('\n📋 Step 2: 執行 IntegrationService.getOrdersByLineUserId');
  console.log('────────────────────────────────────────');
  
  try {
    const ordersResult = IntegrationService.getOrdersByLineUserId(testLineUserId);
    console.log('📊 查詢結果:');
    console.log('   success:', ordersResult.success);
    console.log('   orders 數量:', ordersResult.orders ? ordersResult.orders.length : 'undefined');
    console.log('   error:', ordersResult.error || '無');
    
    if (!ordersResult.success) {
      console.error('❌ 查詢失敗:', ordersResult.error);
      return;
    }
    
    if (ordersResult.orders.length === 0) {
      console.log('⚠️ 找不到訂單，檢查會員綁定狀態...');
      
      // 檢查會員綁定
      if (typeof MemberService !== 'undefined' && MemberService.checkLocalBinding) {
        const bindingResult = MemberService.checkLocalBinding(testLineUserId);
        console.log('\n📋 會員綁定狀態:');
        console.log('   isBound:', bindingResult.isBound);
        console.log('   email:', bindingResult.email || '無');
      }
      return;
    }
    
    console.log('✅ 找到', ordersResult.orders.length, '筆訂單');
    
    // ========================================
    // Step 3: 檢查每筆訂單資料完整性
    // ========================================
    console.log('\n📋 Step 3: 檢查訂單資料完整性');
    console.log('────────────────────────────────────────');
    
    ordersResult.orders.forEach((order, index) => {
      console.log(`\n🔍 訂單 ${index + 1}: #${order.orderNumber}`);
      console.log('   totalAmount:', order.totalAmount);
      console.log('   orderDate:', order.orderDate);
      console.log('   queueItems:', order.queueItems ? order.queueItems.length + ' 件' : '❌ undefined');
      console.log('   products:', order.products ? order.products.length + ' 件' : '❌ undefined');
      console.log('   overallStatus:', JSON.stringify(order.overallStatus));
      
      // 顯示商品詳情
      const items = order.queueItems || order.products || [];
      if (items.length > 0) {
        console.log('   商品列表:');
        items.forEach((item, i) => {
          console.log(`      ${i + 1}. ${item.productName || item.name || '未知商品'}`);
          console.log(`         SKU: ${item.sku || '-'}`);
          console.log(`         狀態: ${item.purchaseStatus || '-'}`);
        });
      }
    });
    
    // ========================================
    // Step 4: 嘗試建立 Flex Message
    // ========================================
    console.log('\n📋 Step 4: 嘗試建立 Flex Message');
    console.log('────────────────────────────────────────');
    
    if (typeof OrderService !== 'undefined') {
      // 確保資料完整性
      ordersResult.orders.forEach(order => {
        if (!order.queueItems) {
          order.queueItems = order.products || [];
        }
        if (!order.overallStatus) {
          order.overallStatus = { emoji: '📦', label: '處理中', text: '訂單處理中' };
        }
      });
      
      // 嘗試建立 itemContents
      try {
        const testOrder = ordersResult.orders[0];
        console.log('📦 測試訂單:', testOrder.orderNumber);
        console.log('   queueItems 數量:', testOrder.queueItems.length);
        
        const itemContents = OrderService._buildItemContents(testOrder.queueItems);
        console.log('✅ _buildItemContents 成功，產生', itemContents.length, '個元素');
      } catch (e) {
        console.error('❌ _buildItemContents 失敗:', e.toString());
        console.error('   錯誤堆疊:', e.stack);
      }
    } else {
      console.error('❌ OrderService 未定義');
    }
    
    // ========================================
    // Step 5: 嘗試發送 Push 訊息（可選）
    // ========================================
    console.log('\n📋 Step 5: 測試 Push 訊息發送');
    console.log('────────────────────────────────────────');
    console.log('⚠️ 這一步會實際發送訊息給用戶');
    console.log('如需測試，請取消下面的註解並重新執行');
    
    /*
    // 取消註解以測試發送
    const testMessage = {
      type: 'text',
      text: '🔧 這是診斷測試訊息，您的訂單查詢功能正在修復中。'
    };
    LineService.sendPush(testLineUserId, testMessage);
    console.log('✅ 測試訊息已發送');
    */
    
  } catch (error) {
    console.error('❌ 診斷過程發生錯誤:', error.toString());
    console.error('❌ 錯誤堆疊:', error.stack);
  }
  
  console.log('\n════════════════════════════════════════');
  console.log('🏁 診斷完成');
  console.log('════════════════════════════════════════');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 🔴 實際發送訂單 Flex Message 給用戶
 * 這會真的發送訊息！請確認 LINE User ID 正確
 * ═══════════════════════════════════════════════════════════
 */
function testSendOrderFlexMessage() {
  // 🔴 請確認這是正確的 LINE User ID
  const testLineUserId = 'Ub74499ca18dbd1604c225f02ac07a965';
  
  console.log('════════════════════════════════════════');
  console.log('🚀 實際發送訂單 Flex Message');
  console.log('👤 LINE User ID:', testLineUserId);
  console.log('════════════════════════════════════════\n');
  
  try {
    // 1. 取得訂單資料
    console.log('📋 Step 1: 取得訂單資料...');
    const ordersResult = IntegrationService.getOrdersByLineUserId(testLineUserId);
    
    if (!ordersResult.success || ordersResult.orders.length === 0) {
      console.error('❌ 找不到訂單');
      return;
    }
    
    console.log('✅ 找到', ordersResult.orders.length, '筆訂單');
    
    // 2. 確保資料完整性
    console.log('📋 Step 2: 確保資料完整性...');
    ordersResult.orders.forEach(order => {
      if (!order.queueItems) {
        order.queueItems = order.products || [];
      }
      if (!order.overallStatus) {
        order.overallStatus = { emoji: '📦', label: '處理中', text: '訂單處理中' };
      }
    });
    console.log('✅ 資料已處理');
    
    // 3. 調用 _sendOrderListMessage
    console.log('📋 Step 3: 發送訂單列表訊息...');
    OrderService._sendOrderListMessage(testLineUserId, ordersResult.orders);
    console.log('✅ 訊息已發送（請檢查 LINE 是否收到）');
    
  } catch (error) {
    console.error('❌ 發送失敗:', error.toString());
    console.error('❌ 錯誤堆疊:', error.stack);
  }
  
  console.log('\n════════════════════════════════════════');
  console.log('🏁 測試完成');
  console.log('════════════════════════════════════════');
}

/**
 * ═══════════════════════════════════════════════════════════
 * 🔴 測試 Push 訊息基本功能
 * 發送簡單文字訊息確認 Push 是否正常
 * ═══════════════════════════════════════════════════════════
 */
function testPushSimpleMessage() {
  const testLineUserId = 'Ub74499ca18dbd1604c225f02ac07a965';
  
  console.log('════════════════════════════════════════');
  console.log('🧪 測試 Push 簡單文字訊息');
  console.log('👤 LINE User ID:', testLineUserId);
  console.log('════════════════════════════════════════\n');
  
  try {
    const message = {
      type: 'text',
      text: '✅ 這是系統診斷測試訊息\n\n如果您收到此訊息，代表 Push 訊息功能正常。\n\n時間: ' + new Date().toLocaleString('zh-TW')
    };
    
    console.log('📤 發送訊息...');
    const result = LineService.sendPush(testLineUserId, message);
    console.log('📋 sendPush 返回:', result);
    
    if (result) {
      console.log('✅ Push 訊息發送成功！');
    } else {
      console.log('❌ Push 訊息發送失敗！');
      console.log('請檢查 LINE_CONFIG.CHANNEL_ACCESS_TOKEN 是否正確');
    }
    
  } catch (error) {
    console.error('❌ 發送異常:', error.toString());
    console.error('❌ 錯誤堆疊:', error.stack);
  }
  
  console.log('\n════════════════════════════════════════');
  console.log('🏁 測試完成');
  console.log('════════════════════════════════════════');
}

/**
 * 完整的 EasyStore API 診斷測試
 * 請在 GAS 中執行此函數，然後將執行記錄截圖傳給我
 */
function testEasyStoreFullDiagnosis() {
  const testEmail = 'eddc9104@gmail.com';
  
  console.log('════════════════════════════════════════');
  console.log('🧪 EasyStore API 完整診斷');
  console.log('📧 測試 Email:', testEmail);
  console.log('════════════════════════════════════════\n');
  
  // 檢查 EASYSTORE_CONFIG 是否存在
  if (typeof EASYSTORE_CONFIG === 'undefined') {
    console.error('❌ 致命錯誤: EASYSTORE_CONFIG 未定義！');
    console.error('請確認 Config.gs 中已新增 EASYSTORE_CONFIG 設定');
    return;
  }
  
  console.log('✅ EASYSTORE_CONFIG 存在');
  console.log('🔗 BASE_API:', EASYSTORE_CONFIG.BASE_API);
  console.log('🔑 ACCESS_TOKEN:', EASYSTORE_CONFIG.ACCESS_TOKEN ? '已設定 (' + EASYSTORE_CONFIG.ACCESS_TOKEN.substring(0, 8) + '...)' : '❌ 未設定');
  console.log('');
  
  // ========================================
  // 測試 1: Customers API (直接搜尋客戶)
  // ========================================
  console.log('────────────────────────────────────────');
  console.log('📋 測試 1: Customers API (email 搜尋)');
  console.log('────────────────────────────────────────');
  
  try {
    const customersUrl = `${EASYSTORE_CONFIG.BASE_API}/customers.json?email=${encodeURIComponent(testEmail)}&limit=10`;
    console.log('🔗 URL:', customersUrl);
    
    const customersResp = UrlFetchApp.fetch(customersUrl, {
      method: 'GET',
      headers: EASYSTORE_CONFIG.HEADERS,
      muteHttpExceptions: true
    });
    
    console.log('📡 狀態碼:', customersResp.getResponseCode());
    
    if (customersResp.getResponseCode() === 200) {
      const result = JSON.parse(customersResp.getContentText());
      console.log('📦 返回客戶數:', result.customers?.length || 0);
      console.log('📊 總數 (total_count):', result.total_count || 'N/A');
      
      if (result.customers && result.customers.length > 0) {
        console.log('\n📋 前 3 個客戶:');
        result.customers.slice(0, 3).forEach((c, i) => {
          console.log(`   ${i+1}. Email: ${c.email}, Name: ${c.name || c.first_name}`);
        });
        
        // 檢查是否有精確匹配
        const matched = result.customers.find(c => 
          c.email && c.email.toLowerCase() === testEmail.toLowerCase()
        );
        
        if (matched) {
          console.log('\n✅ 找到精確匹配的客戶!');
          console.log('   ID:', matched.id);
          console.log('   Email:', matched.email);
          console.log('   Name:', matched.name || matched.first_name);
        } else {
          console.log('\n⚠️ 沒有找到精確匹配 ' + testEmail + ' 的客戶');
          console.log('   API 返回的客戶 Email 與測試 Email 不符');
        }
      } else {
        console.log('⚠️ Customers API 沒有返回任何客戶');
      }
    } else {
      console.log('❌ API 請求失敗:', customersResp.getContentText().substring(0, 200));
    }
  } catch (e) {
    console.error('❌ Customers API 錯誤:', e.toString());
  }
  
  console.log('');
  
  // ========================================
  // 測試 2: Orders API (手動過濾)
  // ========================================
  console.log('────────────────────────────────────────');
  console.log('📋 測試 2: Orders API (手動過濾 Email)');
  console.log('────────────────────────────────────────');
  
  try {
    // 取得最近的訂單，然後手動過濾
    const ordersUrl = `${EASYSTORE_CONFIG.BASE_API}/orders.json?limit=250&fields=id,order_number,email,customer_id`;
    console.log('🔗 URL:', ordersUrl);
    
    const ordersResp = UrlFetchApp.fetch(ordersUrl, {
      method: 'GET',
      headers: EASYSTORE_CONFIG.HEADERS,
      muteHttpExceptions: true
    });
    
    console.log('📡 狀態碼:', ordersResp.getResponseCode());
    
    if (ordersResp.getResponseCode() === 200) {
      const result = JSON.parse(ordersResp.getContentText());
      console.log('📦 取得訂單數:', result.orders?.length || 0);
      console.log('📊 總訂單數 (total_count):', result.total_count || 'N/A');
      
      if (result.orders && result.orders.length > 0) {
        // 手動過濾
        const matchedOrders = result.orders.filter(o => 
          o.email && o.email.toLowerCase() === testEmail.toLowerCase()
        );
        
        console.log(`\n🔍 手動過濾結果: 在 ${result.orders.length} 筆訂單中找到 ${matchedOrders.length} 筆 Email 匹配`);
        
        if (matchedOrders.length > 0) {
          console.log('✅ 找到匹配的訂單!');
          matchedOrders.slice(0, 3).forEach((o, i) => {
            console.log(`   ${i+1}. 訂單 #${o.order_number}, Email: ${o.email}, Customer ID: ${o.customer_id}`);
          });
        } else {
          console.log('⚠️ 在最近 250 筆訂單中沒有找到 ' + testEmail);
          console.log('\n📋 顯示前 5 個訂單的 Email 供參考:');
          result.orders.slice(0, 5).forEach((o, i) => {
            console.log(`   ${i+1}. #${o.order_number} - ${o.email}`);
          });
        }
      }
    } else {
      console.log('❌ API 請求失敗:', ordersResp.getContentText().substring(0, 200));
    }
  } catch (e) {
    console.error('❌ Orders API 錯誤:', e.toString());
  }
  
  console.log('');
  console.log('════════════════════════════════════════');
  console.log('🏁 診斷完成');
  console.log('════════════════════════════════════════');
}

/**
 * 測試不同的 EasyStore API 搜尋參數
 * 找出哪個參數可以正確搜尋客戶
 */
function testEasyStoreSearchMethods() {
  const testEmail = 'eddc9104@gmail.com';
  
  console.log('════════════════════════════════════════');
  console.log('🧪 測試 EasyStore 不同搜尋方式');
  console.log('📧 測試 Email:', testEmail);
  console.log('════════════════════════════════════════\n');
  
  const baseUrl = EASYSTORE_CONFIG.BASE_API;
  const headers = EASYSTORE_CONFIG.HEADERS;
  
  // 測試的不同 URL 參數
  const testUrls = [
    { name: 'email 參數', url: `${baseUrl}/customers.json?email=${encodeURIComponent(testEmail)}&limit=10` },
    { name: 'query 參數', url: `${baseUrl}/customers.json?query=${encodeURIComponent(testEmail)}&limit=10` },
    { name: 'search 參數', url: `${baseUrl}/customers.json?search=${encodeURIComponent(testEmail)}&limit=10` },
    { name: 'q 參數', url: `${baseUrl}/customers.json?q=${encodeURIComponent(testEmail)}&limit=10` },
    { name: 'keyword 參數', url: `${baseUrl}/customers.json?keyword=${encodeURIComponent(testEmail)}&limit=10` },
  ];
  
  testUrls.forEach((test, index) => {
    console.log(`\n────────────────────────────────────────`);
    console.log(`📋 測試 ${index + 1}: ${test.name}`);
    console.log(`────────────────────────────────────────`);
    console.log('🔗 URL:', test.url);
    
    try {
      const resp = UrlFetchApp.fetch(test.url, {
        method: 'GET',
        headers: headers,
        muteHttpExceptions: true
      });
      
      console.log('📡 狀態碼:', resp.getResponseCode());
      
      if (resp.getResponseCode() === 200) {
        const result = JSON.parse(resp.getContentText());
        const customers = result.customers || [];
        console.log('📦 返回客戶數:', customers.length);
        console.log('📊 總數:', result.total_count || 'N/A');
        
        // 檢查是否有匹配的客戶
        const matched = customers.find(c => 
          c.email && c.email.toLowerCase() === testEmail.toLowerCase()
        );
        
        if (matched) {
          console.log('✅ 找到精確匹配!');
          console.log('   ID:', matched.id);
          console.log('   Email:', matched.email);
          console.log('   Name:', matched.name || matched.first_name);
        } else if (customers.length > 0) {
          console.log('⚠️ 沒有精確匹配，返回的第一個客戶:', customers[0].email);
        } else {
          console.log('⚠️ 沒有返回任何客戶');
        }
      } else {
        console.log('❌ 請求失敗');
      }
    } catch (e) {
      console.log('❌ 錯誤:', e.toString());
    }
  });
  
  console.log('\n════════════════════════════════════════');
  console.log('🏁 搜尋方式測試完成');
  console.log('════════════════════════════════════════');
}

// ==========================================
// 🔧 訂單查詢診斷測試
// 請在 GAS 編輯器中執行此函數
// ==========================================

/**
 * 訂單查詢完整診斷測試
 * 請在 GAS 編輯器中執行，並將執行記錄截圖傳給我
 */
function testOrderQueryDiagnosis() {
  console.log('════════════════════════════════════════');
  console.log('🧪 訂單查詢完整診斷');
  console.log('════════════════════════════════════════\n');
  
  // 使用您的 LINE User ID 進行測試（請替換為實際的 Line User ID）
  const testLineUserId = 'YOUR_LINE_USER_ID_HERE'; // 🔴 請替換
  const testEmail = 'eddc9104@gmail.com';
  
  // ========================================
  // 測試 1: SPREADSHEET_ID 是否有效
  // ========================================
  console.log('────────────────────────────────────────');
  console.log('📋 測試 1: SPREADSHEET_ID 是否有效');
  console.log('────────────────────────────────────────');
  
  try {
    console.log('SPREADSHEET_ID:', SPREADSHEET_ID);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('✅ 成功開啟 Spreadsheet:', ss.getName());
  } catch (e) {
    console.error('❌ 無法開啟 Spreadsheet:', e.toString());
    return;
  }
  
  // ========================================
  // 測試 2: 會員綁定記錄表是否存在
  // ========================================
  console.log('\n────────────────────────────────────────');
  console.log('📋 測試 2: 會員綁定記錄表');
  console.log('────────────────────────────────────────');
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const bindingSheet = ss.getSheetByName('會員綁定記錄');
    
    if (!bindingSheet) {
      console.log('⚠️ 「會員綁定記錄」表不存在');
      console.log('請先進行會員綁定以建立此表');
    } else {
      const data = bindingSheet.getDataRange().getValues();
      console.log('✅ 表存在，共', data.length - 1, '筆綁定記錄');
      
      if (data.length > 1) {
        console.log('\n📋 綁定記錄列表:');
        for (let i = 1; i < Math.min(data.length, 6); i++) {
          console.log(`  ${i}. LINE User ID: ${data[i][1]}, Email: ${data[i][2]}, 狀態: ${data[i][4]}`);
        }
      }
    }
  } catch (e) {
    console.error('❌ 查詢會員綁定記錄表失敗:', e.toString());
  }
  
  // ========================================
  // 測試 3: checkLocalBinding 函數
  // ========================================
  console.log('\n────────────────────────────────────────');
  console.log('📋 測試 3: MemberService.checkLocalBinding');
  console.log('────────────────────────────────────────');
  
  try {
    if (typeof MemberService === 'undefined') {
      console.error('❌ MemberService 未定義！');
    } else if (typeof MemberService.checkLocalBinding !== 'function') {
      console.error('❌ MemberService.checkLocalBinding 函數不存在！');
      console.log('可用的 MemberService 方法:', Object.keys(MemberService));
    } else {
      const result = MemberService.checkLocalBinding(testLineUserId);
      console.log('✅ checkLocalBinding 結果:', JSON.stringify(result, null, 2));
    }
  } catch (e) {
    console.error('❌ checkLocalBinding 執行失敗:', e.toString());
  }
  
  // ========================================
  // 測試 4: 訂單管理表
  // ========================================
  console.log('\n────────────────────────────────────────');
  console.log('📋 測試 4: 訂單管理表 (SHEET_NAMES.ORDERS)');
  console.log('────────────────────────────────────────');
  
  try {
    console.log('SHEET_NAMES.ORDERS:', SHEET_NAMES.ORDERS);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const ordersSheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
    
    if (!ordersSheet) {
      console.error('❌ 找不到「' + SHEET_NAMES.ORDERS + '」表！');
      console.log('\n可用的表單:');
      ss.getSheets().forEach(sheet => console.log('  - ' + sheet.getName()));
    } else {
      const data = ordersSheet.getDataRange().getValues();
      const headers = data[0];
      console.log('✅ 表存在，共', data.length - 1, '筆訂單');
      console.log('📝 表頭:', headers.join(', '));
      
      // 檢查必要欄位
      const requiredCols = ['客戶Email', '訂單編號', '下單時間', '訂單金額'];
      requiredCols.forEach(col => {
        const idx = headers.indexOf(col);
        if (idx === -1) {
          console.error('  ❌ 缺少欄位:', col);
        } else {
          console.log('  ✅ 欄位存在:', col, '(索引:', idx + ')');
        }
      });
    }
  } catch (e) {
    console.error('❌ 查詢訂單管理表失敗:', e.toString());
  }
  
  // ========================================
  // 測試 5: getOrdersByEmail 函數
  // ========================================
  console.log('\n────────────────────────────────────────');
  console.log('📋 測試 5: OrderService.getOrdersByEmail');
  console.log('────────────────────────────────────────');
  
  try {
    if (typeof OrderService === 'undefined') {
      console.error('❌ OrderService 未定義！');
    } else if (typeof OrderService.getOrdersByEmail !== 'function') {
      console.error('❌ OrderService.getOrdersByEmail 函數不存在！');
    } else {
      console.log('📧 測試 Email:', testEmail);
      const result = OrderService.getOrdersByEmail(testEmail);
      console.log('✅ getOrdersByEmail 結果:', JSON.stringify(result, null, 2));
    }
  } catch (e) {
    console.error('❌ getOrdersByEmail 執行失敗:', e.toString());
  }
  
  // ========================================
  // 測試 6: TOWER_SPREADSHEET_ID 和 Queue 表
  // ========================================
  console.log('\n────────────────────────────────────────');
  console.log('📋 測試 6: TOWER_SPREADSHEET_ID 和 Queue 表');
  console.log('────────────────────────────────────────');
  
  try {
    console.log('TOWER_SPREADSHEET_ID:', TOWER_SPREADSHEET_ID);
    
    const towerSS = SpreadsheetApp.openById(TOWER_SPREADSHEET_ID);
    console.log('✅ 成功開啟 Tower Spreadsheet:', towerSS.getName());
    
    const queueSheet = towerSS.getSheetByName('Queue');
    if (!queueSheet) {
      console.error('❌ 找不到 Queue 表！');
    } else {
      const data = queueSheet.getDataRange().getValues();
      console.log('✅ Queue 表存在，共', data.length - 1, '筆資料');
    }
  } catch (e) {
    console.error('❌ 查詢 Tower/Queue 失敗:', e.toString());
  }
  
  console.log('\n════════════════════════════════════════');
  console.log('🏁 診斷完成');
  console.log('════════════════════════════════════════');
}

// ==========================================
// 🚚 物流追蹤診斷測試
// 診斷為什麼顧客會卡在「正在查詢物流資訊...」
// ==========================================

/**
 * ═══════════════════════════════════════════════════════════
 * 🔴 物流追蹤完整診斷 - 診斷為什麼卡在「處理中」訊息
 * 
 * 使用方式：
 * 1. 將下方的 testLineUserId 替換為卡住顧客的 LINE User ID
 * 2. 在 GAS 編輯器中執行此函數
 * 3. 查看執行紀錄，找出問題所在
 * ═══════════════════════════════════════════════════════════
 */
function debugTrackingQueryStuck() {
  // 🔴 請替換為卡住顧客的 LINE User ID
  const testLineUserId = 'Ub74499ca18dbd1604c225f02ac07a965'; // 請修改
  
  console.log('════════════════════════════════════════════════════════════');
  console.log('🚚 物流追蹤診斷 - 為什麼卡在「正在查詢物流資訊...」');
  console.log('════════════════════════════════════════════════════════════');
  console.log('👤 LINE User ID:', testLineUserId);
  console.log('⏰ 診斷時間:', new Date().toLocaleString('zh-TW'));
  console.log('════════════════════════════════════════════════════════════\n');
  
  let diagnosticResult = {
    步驟1_服務存在: false,
    步驟2_會員綁定: false,
    步驟3_物流查詢: false,
    步驟4_資料完整性: false,
    步驟5_Push訊息: false,
    錯誤訊息: []
  };
  
  try {
    // ========================================
    // 步驟 1: 檢查服務模組是否存在
    // ========================================
    console.log('📋 步驟 1: 檢查服務模組是否存在');
    console.log('────────────────────────────────────────');
    
    const requiredServices = [
      { name: 'TrackingService', obj: typeof TrackingService !== 'undefined' ? TrackingService : null },
      { name: 'IntegrationService', obj: typeof IntegrationService !== 'undefined' ? IntegrationService : null },
      { name: 'LineService', obj: typeof LineService !== 'undefined' ? LineService : null },
      { name: 'MemberService', obj: typeof MemberService !== 'undefined' ? MemberService : null }
    ];
    
    let allServicesExist = true;
    requiredServices.forEach(service => {
      if (!service.obj) {
        console.error(`❌ ${service.name} 未定義！`);
        diagnosticResult.錯誤訊息.push(`${service.name} 未定義`);
        allServicesExist = false;
      } else {
        console.log(`✅ ${service.name} 存在`);
      }
    });
    
    if (!allServicesExist) {
      console.error('\n❌ 部分服務模組不存在，無法繼續診斷');
      _printDiagnosticSummary(diagnosticResult);
      return;
    }
    
    diagnosticResult.步驟1_服務存在 = true;
    console.log('');
    
    // ========================================
    // 步驟 2: 檢查會員綁定狀態
    // ========================================
    console.log('📋 步驟 2: 檢查會員綁定狀態');
    console.log('────────────────────────────────────────');
    
    const bindingResult = MemberService.checkLocalBinding(testLineUserId);
    console.log('🔍 綁定結果:', JSON.stringify(bindingResult, null, 2));
    
    if (!bindingResult.success) {
      console.error('❌ 查詢綁定狀態失敗:', bindingResult.error || '未知錯誤');
      diagnosticResult.錯誤訊息.push('會員綁定查詢失敗: ' + (bindingResult.error || '未知錯誤'));
    } else if (!bindingResult.isBound) {
      console.warn('⚠️ 用戶尚未綁定會員');
      console.warn('   系統應該要發送「需要綁定」訊息');
      diagnosticResult.錯誤訊息.push('用戶尚未綁定會員');
    } else {
      console.log('✅ 用戶已綁定會員');
      console.log('   綁定 Email:', bindingResult.email || '無');
      diagnosticResult.步驟2_會員綁定 = true;
    }
    console.log('');
    
    // ========================================
    // 步驟 3: 執行物流資料查詢
    // ========================================
    console.log('📋 步驟 3: 執行物流資料查詢');
    console.log('────────────────────────────────────────');
    console.log('📞 呼叫 IntegrationService.getShipmentsByLineUserId()');
    
    const shipmentsResult = IntegrationService.getShipmentsByLineUserId(testLineUserId);
    
    console.log('\n📊 查詢結果:');
    console.log('   success:', shipmentsResult.success);
    console.log('   shipments 數量:', shipmentsResult.shipments ? shipmentsResult.shipments.length : 'undefined');
    console.log('   allItems 數量:', shipmentsResult.allItems ? shipmentsResult.allItems.length : 'undefined');
    console.log('   error:', shipmentsResult.error || '無');
    
    if (!shipmentsResult.success) {
      console.error('❌ 物流查詢失敗:', shipmentsResult.error);
      diagnosticResult.錯誤訊息.push('物流查詢失敗: ' + shipmentsResult.error);
      _printDiagnosticSummary(diagnosticResult);
      return;
    }
    
    diagnosticResult.步驟3_物流查詢 = true;
    
    // 判斷物流資料狀態
    const hasShipments = shipmentsResult.shipments && shipmentsResult.shipments.length > 0;
    const hasAllItems = shipmentsResult.allItems && shipmentsResult.allItems.length > 0;
    
    console.log('\n📦 物流資料狀態:');
    console.log('   有已寄出商品:', hasShipments ? '是 (' + shipmentsResult.shipments.length + ' 件)' : '否');
    console.log('   有全部商品:', hasAllItems ? '是 (' + shipmentsResult.allItems.length + ' 件)' : '否');
    
    if (!hasShipments) {
      console.warn('\n⚠️ 沒有已寄出的商品（Box_ID 為空）');
      console.warn('   系統應該要發送「無物流記錄」訊息');
      console.warn('   如果卡住，表示這個環節的訊息沒有發送成功\n');
    }
    
    // 顯示物流資料詳情
    if (hasShipments) {
      console.log('\n📦 已寄出商品詳情:');
      shipmentsResult.shipments.slice(0, 3).forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.productName || '未知商品'}`);
        console.log(`      訂單: ${item.orderNumber}`);
        console.log(`      箱號: ${item.boxId} (${item.boxNumber || '無箱號'})`);
        console.log(`      狀態: ${item.statusEmoji} ${item.statusMessage}`);
        console.log(`      日期: ${item.statusDate || '無'}`);
      });
      if (shipmentsResult.shipments.length > 3) {
        console.log(`   ... 還有 ${shipmentsResult.shipments.length - 3} 件商品`);
      }
    }
    
    console.log('');
    
    // ========================================
    // 步驟 4: 檢查資料完整性
    // ========================================
    console.log('📋 步驟 4: 檢查資料完整性（避免 LINE API 400 錯誤）');
    console.log('────────────────────────────────────────');
    
    let dataIntegrityOK = true;
    
    if (hasShipments) {
      shipmentsResult.shipments.forEach((item, i) => {
        let issues = [];
        
        // 檢查必要欄位
        if (!item.productName || item.productName.trim() === '') {
          issues.push('productName 為空');
        }
        if (!item.orderNumber || item.orderNumber.toString().trim() === '') {
          issues.push('orderNumber 為空');
        }
        if (!item.statusEmoji || item.statusEmoji.trim() === '') {
          issues.push('statusEmoji 為空');
        }
        if (!item.statusMessage || item.statusMessage.trim() === '') {
          issues.push('statusMessage 為空');
        }
        
        if (issues.length > 0) {
          console.error(`❌ 商品 ${i + 1} 資料不完整:`, issues.join(', '));
          diagnosticResult.錯誤訊息.push(`商品 ${i + 1} 資料不完整: ${issues.join(', ')}`);
          dataIntegrityOK = false;
        }
      });
      
      if (dataIntegrityOK) {
        console.log('✅ 所有物流資料完整，符合 LINE API 要求');
        diagnosticResult.步驟4_資料完整性 = true;
      } else {
        console.error('\n❌ 資料不完整可能導致 LINE API 400 錯誤');
        console.error('   Flex Message 會建立失敗，導致沒有訊息發送');
      }
    } else {
      console.log('⚠️ 無已寄出商品，跳過資料完整性檢查');
      diagnosticResult.步驟4_資料完整性 = true; // 無資料也算通過
    }
    
    console.log('');
    
    // ========================================
    // 步驟 5: 測試 Push 訊息功能
    // ========================================
    console.log('📋 步驟 5: 測試 Push 訊息功能');
    console.log('────────────────────────────────────────');
    console.log('📤 發送測試訊息到 LINE...');
    
    const testMessage = {
      type: 'text',
      text: `🧪 物流診斷測試訊息\n\n時間: ${new Date().toLocaleString('zh-TW')}\n\n如果您收到此訊息，代表 Push 功能正常。`
    };
    
    try {
      const pushResult = LineService.sendPush(testLineUserId, testMessage);
      
      if (pushResult) {
        console.log('✅ 測試訊息發送成功！');
        console.log('   請檢查 LINE 是否收到測試訊息');
        diagnosticResult.步驟5_Push訊息 = true;
      } else {
        console.error('❌ 測試訊息發送失敗（返回 false）');
        console.error('   LineService.sendPush 返回 false');
        diagnosticResult.錯誤訊息.push('Push 訊息發送失敗');
      }
    } catch (pushError) {
      console.error('❌ 測試訊息發送異常:', pushError.toString());
      diagnosticResult.錯誤訊息.push('Push 訊息異常: ' + pushError.toString());
    }
    
    console.log('');
    
    // ========================================
    // 步驟 6: 嘗試實際發送物流追蹤訊息
    // ========================================
    console.log('📋 步驟 6: 嘗試實際發送物流追蹤訊息');
    console.log('────────────────────────────────────────');
    
    if (hasShipments && dataIntegrityOK) {
      console.log('📤 嘗試發送物流追蹤 Flex Message...');
      
      try {
        TrackingService._sendTrackingListMessage(
          testLineUserId, 
          shipmentsResult.shipments, 
          shipmentsResult.allItems || []
        );
        console.log('✅ 物流追蹤訊息發送成功！');
        console.log('   請檢查 LINE 是否收到物流追蹤 Flex Message');
      } catch (flexError) {
        console.error('❌ 物流追蹤訊息發送失敗:', flexError.toString());
        console.error('📋 錯誤堆疊:', flexError.stack);
        diagnosticResult.錯誤訊息.push('Flex Message 發送失敗: ' + flexError.toString());
      }
    } else if (!hasShipments) {
      console.log('📤 嘗試發送「無物流記錄」訊息...');
      
      try {
        TrackingService._sendNoTrackingMessage(testLineUserId);
        console.log('✅ 無物流記錄訊息發送成功！');
        console.log('   請檢查 LINE 是否收到無物流記錄訊息');
      } catch (noTrackingError) {
        console.error('❌ 無物流記錄訊息發送失敗:', noTrackingError.toString());
        diagnosticResult.錯誤訊息.push('無物流訊息發送失敗: ' + noTrackingError.toString());
      }
    } else if (!bindingResult.isBound) {
      console.log('📤 嘗試發送「需要綁定」訊息...');
      
      try {
        TrackingService._sendBindingRequiredMessage(testLineUserId);
        console.log('✅ 需要綁定訊息發送成功！');
        console.log('   請檢查 LINE 是否收到綁定提示訊息');
      } catch (bindingError) {
        console.error('❌ 綁定訊息發送失敗:', bindingError.toString());
        diagnosticResult.錯誤訊息.push('綁定訊息發送失敗: ' + bindingError.toString());
      }
    }
    
  } catch (error) {
    console.error('\n❌❌❌ 診斷過程發生嚴重錯誤 ❌❌❌');
    console.error('錯誤訊息:', error.toString());
    console.error('錯誤堆疊:', error.stack);
    diagnosticResult.錯誤訊息.push('診斷異常: ' + error.toString());
  }
  
  // ========================================
  // 顯示診斷摘要
  // ========================================
  _printDiagnosticSummary(diagnosticResult);
}

/**
 * ═══════════════════════════════════════════════════════════
 * 🔴 模擬完整的物流追蹤查詢流程
 * 模擬從接收事件到發送訊息的完整流程
 * ═══════════════════════════════════════════════════════════
 */
function simulateFullTrackingQuery() {
  // 🔴 請替換為測試用的 LINE User ID
  const testLineUserId = 'Ub74499ca18dbd1604c225f02ac07a965';
  
  console.log('════════════════════════════════════════════════════════════');
  console.log('🎬 模擬完整物流追蹤查詢流程');
  console.log('════════════════════════════════════════════════════════════');
  console.log('👤 LINE User ID:', testLineUserId);
  console.log('⏰ 開始時間:', new Date().toLocaleString('zh-TW'));
  console.log('════════════════════════════════════════════════════════════\n');
  
  // 模擬 LINE 事件
  const mockEvent = {
    type: 'message',
    source: { userId: testLineUserId },
    replyToken: 'MOCK_REPLY_TOKEN_FOR_TESTING',
    message: { type: 'text', text: '🚚 查詢物流狀態' }
  };
  
  console.log('📋 步驟 1: 模擬接收 LINE 事件');
  console.log('────────────────────────────────────────');
  console.log('事件類型:', mockEvent.type);
  console.log('訊息內容:', mockEvent.message.text);
  console.log('');
  
  console.log('📋 步驟 2: 呼叫 TrackingService.handleTrackingQuery()');
  console.log('────────────────────────────────────────');
  
  try {
    // 🔴 注意：replyToken 是無效的，所以「處理中」訊息會失敗
    // 但我們可以看到後續的 Push 訊息是否成功
    console.log('⚠️  注意：replyToken 無效，reply 訊息會失敗');
    console.log('   但 Push 訊息應該要成功發送\n');
    
    TrackingService.handleTrackingQuery(mockEvent);
    
    console.log('✅ handleTrackingQuery 執行完成');
    console.log('   請檢查上方 log 和 LINE 是否收到訊息');
    
  } catch (error) {
    console.error('❌ handleTrackingQuery 執行失敗:', error.toString());
    console.error('❌ 錯誤堆疊:', error.stack);
  }
  
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log('🏁 模擬完成');
  console.log('════════════════════════════════════════════════════════════');
}

/**
 * 輔助函數：列印診斷摘要
 * @private
 */
function _printDiagnosticSummary(result) {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('📊 診斷摘要');
  console.log('════════════════════════════════════════════════════════════');
  console.log('步驟 1 - 服務存在:', result.步驟1_服務存在 ? '✅ 通過' : '❌ 失敗');
  console.log('步驟 2 - 會員綁定:', result.步驟2_會員綁定 ? '✅ 通過' : '⚠️  未綁定或失敗');
  console.log('步驟 3 - 物流查詢:', result.步驟3_物流查詢 ? '✅ 通過' : '❌ 失敗');
  console.log('步驟 4 - 資料完整性:', result.步驟4_資料完整性 ? '✅ 通過' : '❌ 失敗');
  console.log('步驟 5 - Push訊息:', result.步驟5_Push訊息 ? '✅ 通過' : '❌ 失敗');
  
  if (result.錯誤訊息.length > 0) {
    console.log('\n❌ 發現的錯誤:');
    result.錯誤訊息.forEach((msg, i) => {
      console.log(`   ${i + 1}. ${msg}`);
    });
  }
  
  console.log('\n💡 可能的卡住原因:');
  if (!result.步驟1_服務存在) {
    console.log('   🔴 服務模組缺失 - 請確認所有 .gs 檔案都已加入專案');
  }
  if (!result.步驟3_物流查詢) {
    console.log('   🔴 物流查詢失敗 - IntegrationService 可能有錯誤');
  }
  if (!result.步驟4_資料完整性) {
    console.log('   🔴 資料不完整 - Flex Message 建立失敗，導致沒有訊息');
  }
  if (!result.步驟5_Push訊息) {
    console.log('   🔴 Push 訊息失敗 - LINE API Token 或網路問題');
  }
  if (result.步驟1_服務存在 && result.步驟3_物流查詢 && result.步驟4_資料完整性 && !result.步驟5_Push訊息) {
    console.log('   🔴 資料查詢成功但 Push 失敗 - 檢查 LINE_CONFIG.CHANNEL_ACCESS_TOKEN');
  }
  if (result.步驟1_服務存在 && result.步驟3_物流查詢 && result.步驟4_資料完整性 && result.步驟5_Push訊息) {
    console.log('   ✅ 所有測試通過！如果用戶仍卡住，可能是:');
    console.log('      - handleTrackingQuery 中的錯誤處理吞掉了異常');
    console.log('      - Reply Token 無效但沒有正確 fallback 到 Push');
    console.log('      - TrackingService._sendTrackingListMessage 內部有未捕獲錯誤');
  }
  
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('🏁 診斷完成');
  console.log('════════════════════════════════════════════════════════════');
}

// ==========================================
// 🔍 純內部偵錯 - 不發送任何訊息
// ==========================================

/**
 * ═══════════════════════════════════════════════════════════
 * 🔴 純內部偵錯：檢查 Flex Message 結構，找出空字串欄位
 * 
 * ⚠️ 此函數不會發送任何訊息到 LINE
 * ⚠️ 只會輸出 JSON 結構到 console，便於檢查
 * ═══════════════════════════════════════════════════════════
 */
function debugFlexMessageStructure() {
  // 🔴 請替換為卡住顧客的 LINE User ID
  const testLineUserId = 'Ub74499ca18dbd1604c225f02ac07a965';
  
  console.log('════════════════════════════════════════════════════════════');
  console.log('🔍 純內部偵錯 - 檢查 Flex Message 結構');
  console.log('════════════════════════════════════════════════════════════');
  console.log('⚠️  此函數不會發送任何訊息到 LINE');
  console.log('👤 LINE User ID:', testLineUserId);
  console.log('════════════════════════════════════════════════════════════\n');
  
  // 步驟 1：取得物流資料
  console.log('📋 步驟 1: 取得物流資料');
  console.log('────────────────────────────────────────');
  
  const shipmentsResult = IntegrationService.getShipmentsByLineUserId(testLineUserId);
  
  if (!shipmentsResult.success) {
    console.error('❌ 物流查詢失敗:', shipmentsResult.error);
    return;
  }
  
  const shipments = shipmentsResult.shipments || [];
  const allItems = shipmentsResult.allItems || [];
  
  console.log('✅ 找到 ' + shipments.length + ' 筆已寄出商品');
  console.log('✅ 共 ' + allItems.length + ' 件商品\n');
  
  if (shipments.length === 0) {
    console.log('⚠️ 沒有已寄出的商品，無法建立 Flex Message');
    return;
  }
  
  // 步驟 2：逐一檢查每個 shipment 的欄位
  console.log('📋 步驟 2: 逐一檢查每個 shipment 的欄位');
  console.log('────────────────────────────────────────');
  
  shipments.forEach((shipment, index) => {
    console.log(`\n🔍 第 ${index + 1} 件商品：`);
    console.log('────────────────────────────────────────');
    
    // 檢查每個可能為空的欄位
    const fields = [
      { name: 'orderNumber', value: shipment.orderNumber },
      { name: 'productName', value: shipment.productName },
      { name: 'sku', value: shipment.sku },
      { name: 'color', value: shipment.color },
      { name: 'size', value: shipment.size },
      { name: 'boxId', value: shipment.boxId },
      { name: 'boxNumber', value: shipment.boxNumber },
      { name: 'trackingNumber', value: shipment.trackingNumber },
      { name: 'statusEmoji', value: shipment.statusEmoji },
      { name: 'statusMessage', value: shipment.statusMessage },
      { name: 'statusDate', value: shipment.statusDate },
      { name: 'trackingUrl', value: shipment.trackingUrl }
    ];
    
    let hasEmptyField = false;
    
    fields.forEach(field => {
      const value = field.value;
      const isEmpty = value === '' || value === null || value === undefined;
      const display = isEmpty ? '❌ 空值' : `✅ "${value}"`;
      
      if (isEmpty) {
        console.log(`   ${field.name}: ${display}`);
        hasEmptyField = true;
      } else {
        console.log(`   ${field.name}: ${display}`);
      }
    });
    
    if (hasEmptyField) {
      console.log('\n   ⚠️ 此商品有空值欄位，可能導致 400 錯誤！');
    }
  });
  
  // 步驟 3：建構 Flex Message 並輸出 JSON
  console.log('\n\n📋 步驟 3: 建構 Flex Message JSON（不發送）');
  console.log('────────────────────────────────────────');
  
  const bubbles = [];
  
  // 整體狀態 Bubble
  const overallStatus = _getOverallShippingStatusDebug(shipments, allItems);
  if (overallStatus) {
    bubbles.push({
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: overallStatus.backgroundColor,
        paddingAll: 'md',
        contents: [
          {
            type: 'text',
            text: `${overallStatus.emoji} 物流狀態`,
            weight: 'bold',
            size: 'lg',
            color: '#ffffff'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        contents: [
          {
            type: 'text',
            text: overallStatus.text,
            wrap: true,
            size: 'sm',
            color: '#333333'
          }
        ]
      }
    });
  }
  
  // 商品 Bubbles
  shipments.slice(0, 4).forEach((shipment, index) => {
    console.log(`\n📦 建構第 ${index + 1} 個商品 Bubble...`);
    
    // 準備 header contents
    const headerContents = [];
    
    // 狀態文字
    const statusText = `${shipment.statusEmoji || '📦'} ${shipment.statusMessage || '處理中'}`;
    console.log(`   Header text: "${statusText}"`);
    if (!statusText || statusText.trim() === '' || statusText === ' ') {
      console.error('   ❌❌❌ Header statusText 為空！');
    }
    headerContents.push({
      type: 'text',
      text: statusText,
      weight: 'bold',
      size: 'md',
      color: '#ffffff'
    });
    
    // 日期（條件渲染）
    if (shipment.statusDate) {
      headerContents.push({
        type: 'text',
        text: `📅 ${shipment.statusDate}`,
        size: 'sm',
        color: '#ffffff',
        margin: 'sm'
      });
    }
    
    // 準備 body contents
    const bodyContents = [];
    
    // 商品名稱
    const productNameText = shipment.productName || '商品';
    console.log(`   productName: "${productNameText}"`);
    if (!productNameText) {
      console.error('   ❌❌❌ productName 為空！');
    }
    bodyContents.push({
      type: 'text',
      text: productNameText,
      weight: 'bold',
      size: 'md',
      wrap: true,
      maxLines: 2
    });
    
    // 規格
    const specText = [shipment.color, shipment.size].filter(s => s).join(' / ') || '-';
    console.log(`   規格: "${specText}"`);
    bodyContents.push({
      type: 'text',
      text: specText,
      size: 'sm',
      color: '#999999',
      margin: 'sm'
    });
    
    bodyContents.push({ type: 'separator', margin: 'md' });
    
    // 訂單編號
    const orderNumberText = String(shipment.orderNumber || '-');
    console.log(`   orderNumber: "${orderNumberText}"`);
    if (!orderNumberText || orderNumberText === '') {
      console.error('   ❌❌❌ orderNumber 為空！');
    }
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      contents: [
        { type: 'text', text: '訂單編號', size: 'xs', color: '#999999', flex: 2 },
        { type: 'text', text: orderNumberText, size: 'xs', color: '#333333', flex: 3, align: 'end' }
      ]
    });
    
    // 箱號
    const boxNumberText = shipment.boxNumber || shipment.boxId || '-';
    console.log(`   boxNumber: "${boxNumberText}"`);
    if (!boxNumberText || boxNumberText === '') {
      console.error('   ❌❌❌ boxNumber 為空！');
    }
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'sm',
      contents: [
        { type: 'text', text: '箱號', size: 'xs', color: '#999999', flex: 2 },
        { type: 'text', text: boxNumberText, size: 'xs', color: '#333333', flex: 3, align: 'end' }
      ]
    });
    
    // 追蹤號碼（條件渲染）
    if (shipment.trackingNumber) {
      console.log(`   trackingNumber: "${shipment.trackingNumber}"`);
      bodyContents.push({
        type: 'box',
        layout: 'horizontal',
        margin: 'sm',
        contents: [
          { type: 'text', text: '追蹤號碼', size: 'xs', color: '#999999', flex: 2 },
          { type: 'text', text: shipment.trackingNumber, size: 'xs', color: '#C9915D', weight: 'bold', flex: 3, align: 'end' }
        ]
      });
    }
    
    // 建構完整 Bubble
    const bubble = {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: shipment.pickedAt ? '#28a745' : '#C9915D',
        paddingAll: 'md',
        contents: headerContents
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        contents: bodyContents
      }
    };
    
    // Footer（條件渲染）
    if (shipment.trackingUrl) {
      bubble.footer = {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'sm',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '🔍 追蹤物流',
              uri: shipment.trackingUrl
            },
            style: 'secondary',
            height: 'sm'
          }
        ]
      };
    }
    
    bubbles.push(bubble);
  });
  
  // 最終 Flex Message
  const flexMessage = {
    type: 'flex',
    altText: `找到 ${shipments.length} 筆物流記錄`,
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  };
  
  // 步驟 4：深度檢查所有 text 欄位
  console.log('\n\n📋 步驟 4: 深度掃描所有 text 欄位');
  console.log('────────────────────────────────────────');
  
  const emptyTextFields = [];
  _findEmptyTextFields(flexMessage, '', emptyTextFields);
  
  if (emptyTextFields.length > 0) {
    console.log('\n❌❌❌ 發現空 text 欄位：');
    emptyTextFields.forEach(path => {
      console.log(`   ${path}`);
    });
    console.log('\n💡 這些空欄位會導致 LINE API 400 錯誤！');
  } else {
    console.log('✅ 所有 text 欄位都有值，沒有發現空字串');
  }
  
  // 步驟 5：輸出完整 JSON
  console.log('\n\n📋 步驟 5: 完整 Flex Message JSON');
  console.log('────────────────────────────────────────');
  console.log(JSON.stringify(flexMessage, null, 2));
  
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('🏁 偵錯完成 - 未發送任何訊息');
  console.log('════════════════════════════════════════════════════════════');
}

/**
 * 遞迴掃描 JSON 物件，找出所有空的 text 欄位
 * @private
 */
function _findEmptyTextFields(obj, path, results) {
  if (obj === null || obj === undefined) return;
  
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        _findEmptyTextFields(item, `${path}[${index}]`, results);
      });
    } else {
      Object.keys(obj).forEach(key => {
        const newPath = path ? `${path}.${key}` : key;
        
        // 檢查 text 欄位
        if (key === 'text') {
          const value = obj[key];
          if (value === '' || value === null || value === undefined) {
            results.push(`${newPath} = "${value}" (空值)`);
          } else if (typeof value === 'string' && value.trim() === '') {
            results.push(`${newPath} = "${value}" (只有空白)`);
          }
        }
        
        _findEmptyTextFields(obj[key], newPath, results);
      });
    }
  }
}

/**
 * 判斷整體物流狀態（偵錯版）
 * @private
 */
function _getOverallShippingStatusDebug(shipments, allItems) {
  if (!shipments || shipments.length === 0) {
    return null;
  }
  
  const hasArrived = shipments.some(s => s.pickedAt);
  if (hasArrived) {
    return {
      emoji: '✈️',
      text: '您的商品已抵達台灣集貨倉，我們會用最快的速度寄出給您，謝謝您的耐心等候。',
      backgroundColor: '#28a745'
    };
  }
  
  const shippedCount = shipments.length;
  const totalCount = allItems.length || shippedCount;
  
  if (shippedCount >= totalCount && totalCount > 0) {
    return {
      emoji: '📦',
      text: '您的商品已全部從日本集貨倉寄出，預計 5-7 天抵達台灣集貨倉，謝謝您的耐心等候。',
      backgroundColor: '#C9915D'
    };
  } else if (shippedCount > 0) {
    return {
      emoji: '📦',
      text: '您有部分商品已從日本集貨倉寄出，預計 5-7 天抵達台灣集貨倉。',
      backgroundColor: '#FF9800'
    };
  }
  
  return null;
}


// ═══════════════════════════════════════════════════════════════════════════
// 🧪 BEAMS 促銷系統測試套件
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 測試 BEAMS 報價計算公式
 * 公式：日幣 × 0.7 × 0.21 + $350
 */
function testBeamsPriceCalculation() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 BEAMS 報價計算測試');
  console.log('═══════════════════════════════════════════════════════════');
  
  const testCases = [
    { jpyPrice: 13200, expected: 2290 },  // 13200 * 0.7 * 0.21 + 350 = 2290.4 ≈ 2290
    { jpyPrice: 20000, expected: 3290 },  // 20000 * 0.7 * 0.21 + 350 = 3290
    { jpyPrice: 5000, expected: 1085 },   // 5000 * 0.7 * 0.21 + 350 = 1085
  ];
  
  testCases.forEach((test, index) => {
    const result = BeamsSaleService.calculateTwdPrice(test.jpyPrice);
    const isPass = Math.abs(result - test.expected) <= 5;  // 允許 5 元誤差（四捨五入）
    console.log(`測試 ${index + 1}: ¥${test.jpyPrice} → NT$${result} (預期: ${test.expected}) ${isPass ? '✅' : '❌'}`);
  });
  
  console.log('');
  console.log('🏁 測試完成');
}

/**
 * 測試 BEAMS 商品 URL 解析
 */
function testBeamsUrlExtraction() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 BEAMS URL 解析測試');
  console.log('═══════════════════════════════════════════════════════════');
  
  const testCases = [
    { url: 'https://www.beams.co.jp/item/beams/tops/11130412147/', expected: '11130412147' },
    { url: 'https://www.beams.co.jp/item/beams/bags/12345678901/', expected: '12345678901' },
    { url: 'https://www.example.com/product/123', expected: null },
  ];
  
  testCases.forEach((test, index) => {
    const result = BeamsSaleService.extractProductId(test.url);
    const isPass = result === test.expected;
    console.log(`測試 ${index + 1}: ${test.url}`);
    console.log(`  結果: ${result} (預期: ${test.expected}) ${isPass ? '✅' : '❌'}`);
  });
  
  console.log('');
  console.log('🏁 測試完成');
}

/**
 * 測試 BEAMS 歡迎訊息 Flex Message
 */
function testBeamsWelcomeFlex() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 BEAMS 歡迎訊息 Flex Message 測試');
  console.log('═══════════════════════════════════════════════════════════');
  
  const welcomeMessage = BeamsFlexBuilder.buildWelcomeMessage();
  console.log('✅ 歡迎訊息建構成功');
  console.log('📋 訊息類型:', welcomeMessage.type);
  console.log('📋 Alt Text:', welcomeMessage.altText);
  
  // 發送測試訊息
  LineService.sendPush(TEST_LINE_USER_ID, welcomeMessage);
  console.log('📤 已發送測試訊息至:', TEST_LINE_USER_ID);
  
  console.log('');
  console.log('🏁 測試完成');
}

/**
 * 測試 BEAMS 類別選單 Carousel
 */
function testBeamsCategoryCarousel() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 BEAMS 類別選單 Carousel 測試');
  console.log('═══════════════════════════════════════════════════════════');
  
  const categories = BeamsSaleService.getCategoryList();
  console.log('📋 類別數量:', categories.length);
  
  const carousel = BeamsFlexBuilder.buildCategoryCarousel();
  console.log('✅ Carousel 建構成功');
  console.log('📋 Bubbles 數量:', carousel.contents.contents.length);
  
  // 發送測試訊息
  LineService.sendPush(TEST_LINE_USER_ID, carousel);
  console.log('📤 已發送測試訊息至:', TEST_LINE_USER_ID);
  
  console.log('');
  console.log('🏁 測試完成');
}

/**
 * 測試 BEAMS 活動狀態
 */
function testBeamsCampaignStatus() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 BEAMS 活動狀態測試');
  console.log('═══════════════════════════════════════════════════════════');
  
  const isEnded = BeamsSaleService.isCampaignEnded();
  const remainingTime = BeamsSaleService.getCampaignRemainingTime();
  
  console.log('📅 活動結束時間:', BEAMS_CONFIG.CAMPAIGN_END);
  console.log('⏰ 現在時間:', new Date());
  console.log('🏁 活動已結束:', isEnded ? '是 ❌' : '否 ✅');
  console.log('⏳ 剩餘時間:', remainingTime);
  
  console.log('');
  console.log('🏁 測試完成');
}

/**
 * 測試 BEAMS 工作表建立
 * 執行此函數會建立 BEAMS_Product_Cache 和 BEAMS_Sale_Orders 工作表
 */
function testBeamsCreateSheets() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 BEAMS 工作表建立測試');
  console.log('═══════════════════════════════════════════════════════════');
  
  const ss = SpreadsheetApp.openById(MAIN_SHEET_ID);
  
  // 檢查並建立快取表
  let cacheSheet = ss.getSheetByName('BEAMS_Product_Cache');
  if (!cacheSheet) {
    cacheSheet = ss.insertSheet('BEAMS_Product_Cache');
    cacheSheet.getRange(1, 1, 1, 7).setValues([[
      'productId', 'productName', 'hasDiscount', 'originalPrice', 'category', 'cachedAt', 'queryCount'
    ]]);
    cacheSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    cacheSheet.setFrozenRows(1);
    console.log('✅ BEAMS_Product_Cache 工作表已建立');
  } else {
    console.log('ℹ️ BEAMS_Product_Cache 工作表已存在');
  }
  
  // 檢查並建立訂單表
  let ordersSheet = ss.getSheetByName('BEAMS_Sale_Orders');
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet('BEAMS_Sale_Orders');
    ordersSheet.getRange(1, 1, 1, 12).setValues([[
      'orderId', 'orderTime', 'lineUserId', 'productId', 'productUrl', 
      'productName', 'color', 'size', 'jpyPrice', 'twdPrice', 'screenshotUrl', 'status'
    ]]);
    ordersSheet.getRange(1, 1, 1, 12).setFontWeight('bold');
    ordersSheet.setFrozenRows(1);
    console.log('✅ BEAMS_Sale_Orders 工作表已建立');
  } else {
    console.log('ℹ️ BEAMS_Sale_Orders 工作表已存在');
  }
  
  console.log('');
  console.log('🏁 測試完成');
}
