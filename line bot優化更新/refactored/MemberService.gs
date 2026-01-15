// ==========================================
// MemberService.gs - 會員服務模組
// 版本：v4.0 模組化架構
// 說明：處理會員綁定、驗證、EasyStore API 互動
// 功能：Upsert 綁定邏輯（一個 LINE ID 永遠對應最新 Email）
// ==========================================

/**
 * 會員服務模組
 * 處理會員綁定、Email 驗證、EasyStore API 查詢
 * 🔴 Upsert 邏輯：綁定時先檢查是否已存在，若有則更新，若無則新增
 */
const MemberService = {
  
  /**
   * 顯示會員綁定選項卡片
   * 讓用戶選擇「已是會員」或「註冊新會員」
   * @param {Object} event - LINE 事件
   */
  handleBinding: function(event) {
    const message = {
      type: 'flex',
      altText: '會員綁定 - 請確認身份',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '👤 會員綁定',
              weight: 'bold',
              size: 'xl',
              color: BRAND_COLORS.PRIMARY
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '請問您是否已經是我們的會員？',
              weight: 'bold',
              size: 'lg',
              wrap: true
            },
            {
              type: 'text',
              text: '為了完成帳號綁定，請先確認您的會員狀態',
              wrap: true,
              margin: 'md',
              size: 'sm',
              color: BRAND_COLORS.TEXT_LIGHT
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
                type: 'message',
                label: '✅ 我已經是會員（輸入信箱綁定）',
                text: '輸入信箱綁定'
              },
              style: 'primary',
              color: BRAND_COLORS.PRIMARY
            },
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '🆕 我還不是會員（立即註冊）',
                uri: 'https://takemejapan.easy.co/account/register'
              },
              margin: 'sm',
              style: 'secondary'
            },
            {
              type: 'text',
              text: '💡 註冊完成後，請點選上方「我已經是會員」進行綁定',
              size: 'xs',
              color: BRAND_COLORS.TEXT_LIGHT,
              margin: 'md',
              wrap: true
            }
          ]
        }
      }
    };
    
    LineService.sendReply(event.replyToken, message);
  },
  
  /**
   * 顯示信箱輸入指引
   * 引導用戶輸入註冊信箱進行綁定
   * @param {Object} event - LINE 事件
   */
  showEmailInputGuide: function(event) {
    const message = {
      type: 'flex',
      altText: '請輸入註冊信箱',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📧 請輸入信箱',
              weight: 'bold',
              size: 'xl',
              color: BRAND_COLORS.PRIMARY
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '請輸入您在 Take Me Japan 官網註冊完成的信箱來綁定官方 LINE，即可獲取折扣碼',
              weight: 'bold',
              wrap: true
            },
            {
              type: 'text',
              text: '我們會驗證您的會員資料並完成綁定。',
              wrap: true,
              margin: 'md',
              size: 'sm',
              color: BRAND_COLORS.TEXT_LIGHT
            },
            {
              type: 'separator',
              margin: 'xl'
            },
            {
              type: 'text',
              text: '📧 範例格式：',
              weight: 'bold',
              margin: 'xl'
            },
            {
              type: 'text',
              text: 'your-email@gmail.com',
              size: 'sm',
              margin: 'sm',
              color: BRAND_COLORS.TEXT_LIGHT
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '⚠️ 請確保輸入的是您在 Take Me Japan 官網註冊時使用的信箱',
              size: 'xs',
              color: BRAND_COLORS.TEXT_MUTED,
              wrap: true
            }
          ]
        }
      }
    };
    
    LineService.sendReply(event.replyToken, message);
  },
  
  /**
   * 處理 Email 驗證流程
   * 驗證用戶輸入的 Email 是否為有效會員（直接使用 EasyStore API）
   * @param {Object} event - LINE 事件
   * @param {string} email - 用戶輸入的 Email
   */
  handleEmailVerification: function(event, email) {
    try {
      const userId = event.source.userId;
      const replyToken = event.replyToken;
      
      console.log('🔍 開始 Email 驗證流程');
      console.log('📧 Email:', email);
      console.log('👤 User ID:', userId);
      
      // 第一步：發送處理中訊息
      LineService.sendProcessing(replyToken, 'verifying');
      
      // 第二步：直接使用 EasyStore API 驗證會員
      const verifyResult = this._verifyMemberWithEasyStore(email);
      console.log('📋 驗證結果:', JSON.stringify(verifyResult));
      
      if (verifyResult.success && verifyResult.customer) {
        console.log('✅ 會員驗證成功，發送綁定成功訊息');
        
        // 發送綁定成功通知 (Push)
        const memberData = {
          email: verifyResult.customer.email || email,
          name: verifyResult.customer.name || email,
          orderCount: verifyResult.customer.orderCount || 0
        };
        
        this._sendBindingSuccessMessage(userId, memberData, email);
        
        // 儲存會員綁定到 Google Sheets
        this._saveMemberBindingToSheet(userId, memberData);
        
        // 同步 LINE_User_ID 到該會員的所有訂單
        const syncResult = SyncService.syncLineUserIdToOrders(email, userId);
        console.log('🔄 LINE_User_ID 同步結果:', JSON.stringify(syncResult));
        
        console.log('💾 綁定儲存完成');
        
      } else {
        console.log('❌ 會員驗證失敗，發送失敗訊息');
        this._sendBindingFailedMessage(userId, verifyResult.error || '找不到會員資料');
      }
      
    } catch (error) {
      console.error('❌ Email 驗證失敗:', error);
      LineService.sendErrorPush(event.source.userId, '驗證過程發生錯誤，請稍後再試');
    }
  },
  
  /**
   * 直接使用 EasyStore API 驗證會員
   * 使用 Customers API 的 query 參數搜尋（唯一有效的搜尋方式）
   * 只有在 EasyStore 有註冊的會員才能綁定
   * @param {string} email - 用戶 Email
   * @private
   */
  _verifyMemberWithEasyStore: function(email) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      console.log(`🔍 透過 EasyStore API 驗證會員: ${normalizedEmail}`);
      
      // 使用 query 參數搜尋客戶（唯一有效的搜尋方式）
      const customersUrl = `${EASYSTORE_CONFIG.BASE_API}/customers.json?query=${encodeURIComponent(normalizedEmail)}&limit=20`;
      console.log('🔗 Customers API URL:', customersUrl);
      
      const customersResponse = UrlFetchApp.fetch(customersUrl, {
        method: 'GET',
        headers: EASYSTORE_CONFIG.HEADERS,
        muteHttpExceptions: true
      });
      
      const customersCode = customersResponse.getResponseCode();
      console.log('📡 Customers API 回應碼:', customersCode);
      
      if (customersCode === 200) {
        const customersResult = JSON.parse(customersResponse.getContentText());
        console.log('📋 客戶搜尋結果數量:', customersResult.customers?.length || 0);
        
        // 在結果中找到精確匹配的 Email（防止類似 email 被誤認）
        if (customersResult.customers && customersResult.customers.length > 0) {
          const matchedCustomer = customersResult.customers.find(c => 
            c.email && c.email.toLowerCase() === normalizedEmail
          );
          
          if (matchedCustomer) {
            console.log('✅ 找到精確匹配的客戶:', matchedCustomer.email);
            console.log('   客戶 ID:', matchedCustomer.id);
            console.log('   客戶姓名:', matchedCustomer.name || matchedCustomer.first_name);
            
            return {
              success: true,
              customer: {
                id: matchedCustomer.id,
                email: matchedCustomer.email,
                name: matchedCustomer.name || 
                      ((matchedCustomer.first_name || '') + ' ' + (matchedCustomer.last_name || '')).trim() || 
                      email,
                orderCount: matchedCustomer.order_count || 0
              }
            };
          } else {
            console.log('⚠️ API 返回結果中沒有精確匹配的 Email');
            console.log('   搜尋的 Email:', normalizedEmail);
            console.log('   返回的第一個客戶 Email:', customersResult.customers[0]?.email);
          }
        }
      } else {
        console.error('❌ EasyStore API 錯誤:', customersResponse.getContentText());
      }
      
      // 沒有找到匹配的客戶
      console.log('❌ 找不到此 Email 的會員記錄');
      return { 
        success: false, 
        error: '找不到會員資料，請確認您已在 Take Me Japan 官網完成註冊' 
      };
      
    } catch (error) {
      console.error('❌ EasyStore API 驗證錯誤:', error);
      return { success: false, error: error.toString() };
    }
  },
  
  /**
   * 儲存會員綁定到 Google Sheets
   * @param {string} lineUserId - LINE User ID
   * @param {Object} memberData - 會員資料
   * @private
   */
  _saveMemberBindingToSheet: function(lineUserId, memberData) {
    try {
      console.log(`🔗 儲存會員綁定: ${lineUserId} -> ${memberData.email}`);
      
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      let bindingSheet = ss.getSheetByName('會員綁定記錄');
      
      // 如果表不存在，建立一個
      if (!bindingSheet) {
        console.log('建立會員綁定記錄表');
        bindingSheet = ss.insertSheet('會員綁定記錄');
        
        const headers = [
          '綁定時間', 'LINE User ID', '會員Email', '會員姓名',
          '綁定狀態', '最後驗證時間', '訂單總數', '備註'
        ];
        
        bindingSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        bindingSheet.getRange(1, 1, 1, headers.length)
          .setBackground('#C9915D')
          .setFontColor('white')
          .setFontWeight('bold');
      }
      
      // 檢查是否已存在
      const data = bindingSheet.getDataRange().getValues();
      let existingRow = -1;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === lineUserId) {
          existingRow = i + 1;
          break;
        }
      }
      
      const now = new Date();
      const rowData = [
        now,
        lineUserId,
        memberData.email || '',
        memberData.name || memberData.email,
        'active',
        now,
        memberData.orderCount || 0,
        '系統自動綁定'
      ];
      
      if (existingRow > 0) {
        bindingSheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
        console.log(`🔄 更新現有綁定 (第 ${existingRow} 列)`);
      } else {
        bindingSheet.appendRow(rowData);
        console.log('🆕 新增會員綁定');
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ 儲存會員綁定失敗:', error);
      return { success: false, error: error.toString() };
    }
  },
  
  /**
   * 檢查本地會員綁定狀態
   * 從「會員綁定記錄」表查詢
   * @param {string} lineUserId - LINE User ID
   * @returns {Object} - { success, isBound, email, name }
   */
  checkLocalBinding: function(lineUserId) {
    try {
      console.log(`🔍 檢查本地綁定: ${lineUserId}`);
      
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const bindingSheet = ss.getSheetByName('會員綁定記錄');
      
      if (!bindingSheet) {
        console.log('❌ 會員綁定記錄表不存在');
        return { success: true, isBound: false };
      }
      
      const data = bindingSheet.getDataRange().getValues();
      
      // 表頭: 綁定時間, LINE User ID, 會員Email, 會員姓名, 綁定狀態, ...
      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === lineUserId && data[i][4] === 'active') {
          console.log(`✅ 找到綁定: ${data[i][2]}`);
          return {
            success: true,
            isBound: true,
            email: data[i][2],
            name: data[i][3]
          };
        }
      }
      
      console.log('⚠️ 未找到綁定記錄');
      return { success: true, isBound: false };
      
    } catch (error) {
      console.error('❌ 檢查綁定失敗:', error);
      return { success: false, isBound: false, error: error.toString() };
    }
  },
  
  /**
   * 呼叫後端 API（保留向下相容）
   * @param {string} action - API 動作
   * @param {Object} params - 參數
   * @returns {Object} - API 回應
   * @private
   */
  _callBackendAPI: function(action, params) {
    try {
      const baseUrl = API_ENDPOINTS.LINE_OA_BACKEND;
      
      const urlParams = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const fullUrl = `${baseUrl}?action=${action}&${urlParams}`;
      
      const response = UrlFetchApp.fetch(fullUrl, {
        method: 'GET',
        muteHttpExceptions: true
      });
      
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      if (responseCode === 200) {
        return JSON.parse(responseText);
      } else {
        return { success: false, error: `API 錯誤: ${responseCode}` };
      }
      
    } catch (error) {
      console.error(`API 呼叫異常 (${action}):`, error);
      return { success: false, error: error.toString() };
    }
  },
  
  /**
   * 發送綁定成功訊息
   * @param {string} userId - LINE User ID
   * @param {Object} memberData - 會員資料
   * @param {string} email - Email
   * @private
   */
  _sendBindingSuccessMessage: function(userId, memberData, email) {
    const message = {
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
              color: BRAND_COLORS.SUCCESS
            },
            {
              type: 'text',
              text: '恭喜獲得新會員專屬折扣',
              size: 'sm',
              color: BRAND_COLORS.TEXT_LIGHT
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `歡迎，${memberData.name || email}！`,
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
                  color: BRAND_COLORS.PRIMARY,
                  align: 'center'
                },
                {
                  type: 'text',
                  text: 'LINE100',
                  weight: 'bold',
                  size: '3xl',
                  align: 'center',
                  margin: 'md',
                  color: BRAND_COLORS.PRIMARY
                },
                {
                  type: 'text',
                  text: '💰 享有額外優惠',
                  size: 'sm',
                  align: 'center',
                  color: BRAND_COLORS.TEXT_LIGHT
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
              color: BRAND_COLORS.PRIMARY
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
    
    LineService.sendPush(userId, message);
  },
  
  /**
   * 發送綁定失敗訊息
   * @param {string} userId - LINE User ID
   * @param {string} errorText - 錯誤說明
   * @private
   */
  _sendBindingFailedMessage: function(userId, errorText) {
    const message = {
      type: 'flex',
      altText: '會員驗證結果',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🤔 找不到您的會員資料',
              weight: 'bold',
              size: 'xl',
              color: BRAND_COLORS.PRIMARY
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '請選擇以下選項：',
              weight: 'bold',
              margin: 'md'
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
                type: 'message',
                label: '✅ 我已經是會員（重新輸入信箱）',
                text: '重新綁定'
              },
              style: 'primary',
              color: BRAND_COLORS.PRIMARY
            },
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '🆕 我還不是會員（立即註冊）',
                uri: 'https://www.takemejapan.com/account/login'
              },
              margin: 'sm',
              style: 'secondary'
            },
            {
              type: 'text',
              text: '💡 註冊完成後，請回來重新綁定會員帳號',
              size: 'xs',
              color: BRAND_COLORS.TEXT_LIGHT,
              margin: 'md',
              wrap: true
            }
          ]
        }
      }
    };
    
    LineService.sendPush(userId, message);
  }
};

// ==========================================
// 向下相容：保留舊函數名稱
// ==========================================

/**
 * 處理會員綁定（舊版，向下相容）
 */
function handleMemberBinding(event) {
  MemberService.handleBinding(event);
}

/**
 * 顯示信箱輸入指引（舊版，向下相容）
 */
function showEmailInputGuide(event) {
  MemberService.showEmailInputGuide(event);
}

/**
 * 處理 Email 驗證（舊版，向下相容）
 */
function handleEmailVerification(event, email) {
  MemberService.handleEmailVerification(event, email);
}

/**
 * 呼叫後端 API（舊版，向下相容）
 */
function callBackendAPIGet(action, params) {
  return MemberService._callBackendAPI(action, params);
}

/**
 * 綁定成功訊息（舊版，向下相容）
 */
function sendSuccessBindingWithDiscountPush(userId, memberData, email) {
  MemberService._sendBindingSuccessMessage(userId, memberData, email);
}

/**
 * 綁定失敗訊息（舊版，向下相容）
 */
function sendBindingFailedMessagePush(userId, errorText) {
  MemberService._sendBindingFailedMessage(userId, errorText);
}
