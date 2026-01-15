// ==========================================
// Controller.gs - LINE Bot 路由控制模組
// 版本：v4.0 模組化架構
// 說明：處理 Webhook 入口與事件分發
// ==========================================

/**
 * 處理 HTTP POST 請求（主要 Webhook 入口）
 * LINE 平台會將所有事件 POST 到這裡
 * @param {Object} e - HTTP POST 請求物件
 * @returns {TextOutput} - 返回 OK 給 LINE 平台
 */
function doPost(e) {
  // 🔴 診斷模式：記錄所有收到的請求
  const diagnosticLog = [];
  diagnosticLog.push('⏰ 時間: ' + new Date().toLocaleString('zh-TW'));
  
  try {
    // 🔴 記錄原始請求到 NotificationsLog（用於診斷）
    try {
      const logSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('NotificationsLog');
      if (logSheet) {
        const rawData = e && e.postData ? e.postData.contents : 'NO_DATA';
        const preview = rawData ? rawData.substring(0, 200) : 'EMPTY';
        logSheet.appendRow([new Date(), 'doPost 收到請求', preview]);
      }
    } catch (logError) {
      console.log('日誌記錄失敗:', logError.message);
    }
    
    // 驗證請求格式
    if (!e || !e.postData || !e.postData.contents) {
      diagnosticLog.push('❌ 請求格式錯誤');
      console.log(diagnosticLog.join('\n'));
      return ContentService.createTextOutput('OK');
    }
    
    // 解析請求內容
    const data = JSON.parse(e.postData.contents);
    
    // 🔴 檢查是否為 BEAMS URL 抓取請求（來自 F12 Console 腳本）
    if (data.action && (data.action === 'addBeamsUrls' || 
        data.action === 'clearBeamsUrls' || 
        data.action === 'checkUrl')) {
      diagnosticLog.push('🔗 BEAMS URL 請求: ' + data.action);
      diagnosticLog.push('📊 URL 數量: ' + (data.urls ? data.urls.length : 0));
      console.log(diagnosticLog.join('\n'));
      
      // 導向 BeamsUrlService 處理
      const result = addBeamsUrls(data.urls || [], data.pageNumber || 0, data.isLastBatch || false, data.mode || '');
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 原本的 LINE 事件處理
    const events = data.events || [];
    
    diagnosticLog.push('📊 事件數量: ' + events.length);
    
    if (events.length === 0) {
      diagnosticLog.push('⚠️ 沒有事件 (非 LINE 也非 BEAMS 請求)');
      diagnosticLog.push('📋 收到的 action: ' + (data.action || 'undefined'));
      console.log(diagnosticLog.join('\n'));
      return ContentService.createTextOutput('OK');

    }

    
    // 處理每個事件
    events.forEach((event, index) => {
      diagnosticLog.push(`🔄 事件 ${index + 1}: ${event.type}`);
      
      try {
        switch (event.type) {
          case 'message':
            diagnosticLog.push('💬 訊息: ' + (event.message && event.message.text ? event.message.text : '(無文字)'));
            handleMessage(event);
            break;
          case 'follow':
            handleFollow(event);
            break;
          case 'postback':
            diagnosticLog.push('📌 Postback: ' + (event.postback && event.postback.data ? event.postback.data : '(無)'));
            handlePostback(event);
            break;
          default:
            diagnosticLog.push('❓ 未知事件類型');
        }
      } catch (eventError) {
        diagnosticLog.push(`❌ 事件處理錯誤: ${eventError.toString()}`);
      }
    });
    
    diagnosticLog.push('✅ 處理完成');
    console.log(diagnosticLog.join('\n'));
    
    return ContentService.createTextOutput('OK');
    
  } catch (error) {
    diagnosticLog.push('🚨 主要錯誤: ' + error.toString());
    console.log(diagnosticLog.join('\n'));
    return ContentService.createTextOutput('Error: ' + error.toString());
  }
}

/**
 * 處理 HTTP GET 請求
 * 用於狀態查詢和健康檢查
 * @param {Object} e - HTTP GET 請求物件
 * @returns {TextOutput} - JSON 格式的狀態回應
 */
function doGet(e) {
  const action = e.parameter.action || 'status';
  
  if (action === 'status') {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'LINE Bot 系統運作正常',
        timestamp: new Date().toISOString(),
        version: '4.0-Modular'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService
    .createTextOutput('Unknown action')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * 處理訊息事件
 * 根據訊息內容分發到對應的 Service
 * 🔴 恢復先前可運作版本的邏輯
 * @param {Object} event - LINE 訊息事件
 */
function handleMessage(event) {
  console.log('🚨 handleMessage 被調用');
  console.log('📋 用戶ID:', event.source.userId);
  console.log('📋 訊息文字:', event.message.text);
  console.log('📋 Reply Token:', event.replyToken);
  
  try {
    const userId = event.source.userId;
    const messageText = event.message.text;
    
    console.log('🔍 開始處理訊息邏輯...');

    // 🔴 檢查訊息類型，只處理文字訊息
    if (event.message.type !== 'text') {
      console.log(`📸 收到非文字訊息 (${event.message.type})，靜默忽略`);
      return;
    }

    // ========== 會員綁定流程 ==========
    if (messageText.includes('綁定') || messageText.includes('會員') ||
        messageText === '重新綁定' || messageText === '輸入信箱綁定') {
      
      if (messageText === '輸入信箱綁定') {
        console.log('🎯 直接觸發信箱輸入指引');
        MemberService.showEmailInputGuide(event);
      } else {
        console.log('🎯 觸發會員身份確認流程');
        MemberService.handleBinding(event);
      }
      return;
    }
    
    // ========== Email 格式驗證 ==========
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(messageText)) {
      console.log('🎯 觸發 Email 驗證流程');
      MemberService.handleEmailVerification(event, messageText);
      return;
    }

    // 🔴 診斷日誌：紀錄傳入訊息
    console.log('📩 處理訊息內容:', `"${messageText}"`);

    const cleanText = messageText.trim();
    
    // ========== BEAMS 功能總開關檢查 ==========
    // 🔴 如果 BEAMS 活動已關閉，則跳過所有 BEAMS 相關邏輯
    if (!BEAMS_CONFIG.ENABLED) {
      // BEAMS 功能已關閉，直接跳到後續的一般訊息處理
      console.log('ℹ️ BEAMS 活動功能已關閉 (BEAMS_CONFIG.ENABLED = false)');
    } else {
      // ========== BEAMS 商品 URL 識別（優先處理） ==========
      // 🔴 注意：URL 必須在關鍵字之前判斷，否則 URL 中的 "beams" 會觸發關鍵字
      const isBeamsUrl = BEAMS_CONFIG.URL_PATTERN.test(cleanText);
      console.log('🧪 BEAMS URL 檢測結果:', isBeamsUrl);
      
      if (isBeamsUrl) {
        console.log('🔗 偵測到 BEAMS 商品 URL');
        handleBeamsProductQuery(event, cleanText);
        return;
      }
    }
    
    // ========== 以下 BEAMS 邏輯也受開關控制 ==========
    if (BEAMS_CONFIG.ENABLED) {
      // ========== BEAMS 促銷活動流程（關鍵字觸發） ==========
      // 觸發關鍵字：「想了解beams活動」等
      const isBeamsTrigger = BEAMS_CONFIG.TRIGGER_KEYWORDS.some(keyword =>
        cleanText.toLowerCase() === keyword.toLowerCase()  // 改為完全匹配
      );
      
      if (isBeamsTrigger) {
        console.log('🎯 觸發 BEAMS 促銷活動流程');
        handleBeamsSaleWelcome(event);
        return;
      }

      
      // ========== BEAMS 狀態機處理 ==========
      const userState = StateService.getState(userId);
      
      if (userState.state === StateService.STATES.WAITING_FOR_BEAMS_SPEC) {
        console.log('📝 處理 BEAMS 商品規格輸入');
        handleBeamsSpecInput(event, messageText, userState.data);
        return;
      }
      
      // 處理 BEAMS 價格輸入（用戶手動輸入日幣價格）
      if (userState.state === StateService.STATES.WAITING_FOR_BEAMS_PRICE) {
        console.log('💴 處理 BEAMS 價格輸入');
        handleBeamsPriceInput(event, messageText, userState.data);
        return;
      }
    }

    // ========== 網址偵測（非 BEAMS，轉交人工） ==========
    const urlPattern = /^https?:\/\/[^\s]+/i;
    if (urlPattern.test(messageText.trim())) {
      console.log('🔗 檢測到非 BEAMS 網址，轉交人工客服處理');
      return;
    }

    // ========== 商品資訊偵測（轉交人工） ==========
    const isProductInfo = PRODUCT_INFO_PATTERNS.some(pattern =>
      pattern.test(messageText)
    );
    
    if (isProductInfo) {
      console.log('🛍️ 檢測到商品資訊，轉交人工客服處理');
      return;
    }
    
    // ========== 訂單查詢（支援新舊關鍵字） ==========
    // 新關鍵字：「📦 查詢我的訂單」
    // 舊關鍵字：「我的訂單」（向下相容舊版 Rich Menu）
    if (messageText === '📦 查詢我的訂單' || messageText === '我的訂單') {
      console.log('🎯 觸發訂單查詢流程，關鍵字:', messageText);
      handleOrderQuery(event);
      return;
    }
    
    // ========== 物流追蹤（支援新舊關鍵字） ==========
    // 新關鍵字：「🚚 查詢物流狀態」
    // 舊關鍵字：「物流追蹤」（向下相容舊版 Rich Menu）
    if (messageText === '🚚 查詢物流狀態' || messageText === '物流追蹤') {
      console.log('🎯 觸發物流追蹤流程，關鍵字:', messageText);
      handleTrackingQuery(event);
      return;
    }
    
    // ========== 會員綁定（支援新舊關鍵字） ==========
    // 新關鍵字：「🔗 開始會員綁定」
    // 舊關鍵字：「會員綁定」（向下相容舊版 Rich Menu 和 Flex 按鈕）
    if (messageText === '🔗 開始會員綁定' || messageText === '會員綁定') {
      console.log('🎯 觸發會員綁定流程，關鍵字:', messageText);
      MemberService.handleBinding(event);
      return;
    }
    
    // ========== 系統測試 ==========
    if (messageText === '測試' || messageText === 'test') {
      console.log('🎯 觸發測試流程');
      sendWelcomeMessage(event.replyToken, userId);
      return;
    }
    
    // ========== 關鍵字自動回覆 ==========
    const shouldAutoReply = STRICT_KEYWORDS.some(item => {
      const lowerText = messageText.toLowerCase().trim();
      const lowerKeyword = item.keyword.toLowerCase();
      
      if (item.type === 'exact') {
        return lowerText === lowerKeyword;
      } else {
        return lowerText.startsWith(lowerKeyword);
      }
    });

    if (shouldAutoReply) {
      console.log('🎯 觸發關鍵字自動回應');
      // 發送幫助訊息
      const helpMessage = {
        type: 'text',
        text: '您好！我是 Take Me Japan 智能助理 👋\n\n請點選下方選單選擇您需要的服務：\n\n📦 我的訂單 - 查看訂單狀態\n🚚 物流追蹤 - 查詢物流進度\n🔗 會員綁定 - 綁定您的帳號'
      };
      LineService.sendReply(event.replyToken, helpMessage);
    } else {
      console.log('🔇 非關鍵字訊息，保持靜默（轉交人工客服）');
      console.log('📝 訊息內容:', messageText);
    }
    
  } catch (error) {
    console.error('❌ handleMessage 錯誤:', error);
    console.error('❌ 錯誤堆疊:', error.stack);
    LineService.sendError(event.replyToken, '系統暫時無法處理您的請求，請稍後再試');
  }
}

/**
 * 處理新用戶加入事件
 * 發送歡迎訊息並引導會員綁定
 * @param {Object} event - LINE follow 事件
 */
function handleFollow(event) {
  try {
    const userId = event.source.userId;
    
    // 建立歡迎訊息 Flex Message
    const message = {
      type: 'flex',
      altText: '歡迎加入 Take Me Japan！',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '👋 歡迎加入',
              size: 'md'
            },
            {
              type: 'text',
              text: 'Take Me Japan',
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
              text: '為了提供更好的服務，請先告訴我們您的會員狀態',
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
                label: '✅ 我已經是會員（綁定帳號）',
                text: '會員綁定'
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
    
  } catch (error) {
    console.error('處理新用戶加入失敗:', error);
  }
}

/**
 * 處理 Postback 事件
 * 🔴 v4.1 強化：Rich Menu 改用 Postback，全面取代關鍵字觸發
 * @param {Object} event - LINE postback 事件
 */
function handlePostback(event) {
  try {
    const userId = event.source.userId;
    const data = event.postback.data;
    console.log('📌 處理 Postback:', data);
    
    // 解析 postback data（格式：action=xxx&param1=yyy）
    const params = {};
    data.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      params[key] = decodeURIComponent(value || '');
    });
    
    const action = params.action || '';
    console.log('🎯 Postback Action:', action);
    
    // ========== Rich Menu Postback 處理 ==========
    switch (action) {
      // 🆕 查詢訂單（Rich Menu）
      case 'query_order':
        console.log('📦 Rich Menu: 查詢訂單');
        OrderService.handleOrderQuery(event);
        return;
      
      // 🆕 查詢物流（Rich Menu）
      case 'query_tracking':
        console.log('🚚 Rich Menu: 查詢物流');
        TrackingService.handleTrackingQuery(event);
        return;
      
      // 🆕 開始會員綁定（設定狀態機）
      case 'start_binding':
        console.log('🔗 開始會員綁定流程（設定等待 Email 狀態）');
        StateService.setWaitingForEmail(userId);
        MemberService.showEmailInputGuide(event);
        return;
      
      // 舊版相容：member_binding
      case 'member_binding':
        MemberService.handleBinding(event);
        return;
      
      // 舊版相容：check_order
      case 'check_order':
        OrderService.handleOrderQuery(event);
        return;
      
      // 舊版相容：track_shipping
      case 'track_shipping':
        TrackingService.handleTrackingQuery(event);
        return;
      
      // 靜默點擊
      case 'no_action':
        console.log('👻 靜默點擊，不回應');
        return;
      
      // ========== 缺貨回應處理 ==========
      case 'oos_wait':
        console.log('📦 顧客選擇：願意等待');
        handleOOSWait(event, params);
        return;
      
      case 'oos_refund':
        console.log('📦 顧客選擇：不願等待（退款）');
        handleOOSRefund(event, params);
        return;
      
      // ========== BEAMS 促銷活動 Postback ==========
      // 🔴 如果 BEAMS 功能關閉，這些 Postback 將被忽略
      case 'beams_categories':
      case 'beams_order':
      case 'beams_get_quote':
      case 'beams_purchase':
        if (!BEAMS_CONFIG.ENABLED) {
          console.log('ℹ️ BEAMS Postback 被忽略 (功能已關閉):', action);
          return;
        }
        if (action === 'beams_categories') {
          console.log('📂 BEAMS: 顯示類別選單');
          handleBeamsCategorySelection(event);
        } else if (action === 'beams_order') {
          console.log('🛒 BEAMS: 下單請求');
          handleBeamsOrderRequest(event, params);
        } else if (action === 'beams_get_quote') {
          console.log('💰 BEAMS: 報價請求');
          handleBeamsGetQuote(event, params);
        } else if (action === 'beams_purchase') {
          console.log('🛒 BEAMS: 購買請求');
          handleBeamsPurchase(event, params);
        }
        return;

      
      default:
        // 處理舊版 postback 格式
        if (data.startsWith('order_')) {
          handleOrderPostback(event, data);
        } else if (data.startsWith('tracking_')) {
          handleTrackingPostback(event, data);
        } else {
          console.log('❓ 未知的 postback:', data);
        }
    }
    
  } catch (error) {
    console.error('處理 Postback 失敗:', error);
  }
}

/**
 * 處理缺貨「願意等待」選擇
 * @param {Object} event - LINE postback 事件
 * @param {Object} params - Postback 參數
 */
function handleOOSWait(event, params) {
  const userId = event.source.userId;
  const orderNumber = params.orderNumber || '';
  
  try {
    // 1. 更新 Tower 採購備註
    if (orderNumber) {
      OOSNotificationService.updateCustomerChoice(orderNumber, '客戶選擇等待');
    }
    
    // 2. 發送回饋訊息
    LineService.sendPush(userId, {
      type: 'text',
      text: '感謝您願意耐心等待，如不需要等時，請主動告知客服人員，我們會協助您後續動作。'
    });
    
    console.log('✅ 缺貨等待處理完成:', orderNumber);
    
  } catch (error) {
    console.error('❌ 處理缺貨等待失敗:', error);
    LineService.sendPush(userId, {
      type: 'text',
      text: '系統處理時發生錯誤，請稍後再試或聯繫客服。'
    });
  }
}

/**
 * 處理缺貨「不願等待」選擇
 * @param {Object} event - LINE postback 事件
 * @param {Object} params - Postback 參數
 */
function handleOOSRefund(event, params) {
  const userId = event.source.userId;
  const orderNumber = params.orderNumber || '';
  
  try {
    // 1. 更新 Tower 採購備註
    if (orderNumber) {
      OOSNotificationService.updateCustomerChoice(orderNumber, '客戶選擇退款');
    }
    
    // 2. 發送回饋訊息
    LineService.sendPush(userId, {
      type: 'text',
      text: '幫您轉接真人客服協助退款，請稍等片刻。'
    });
    
    console.log('✅ 缺貨退款處理完成:', orderNumber);
    
  } catch (error) {
    console.error('❌ 處理缺貨退款失敗:', error);
    LineService.sendPush(userId, {
      type: 'text',
      text: '系統處理時發生錯誤，請稍後再試或聯繫客服。'
    });
  }
}

// ==========================================
// 以下為暫時保留的舊函數（待後續重構移至各 Service）
// ==========================================

/**
 * 處理訂單 Postback（暫時保留）
 */
function handleOrderPostback(event, data) {
  console.log('處理訂單 postback:', data);
}

/**
 * 處理物流 Postback（暫時保留）
 */
function handleTrackingPostback(event, data) {
  console.log('處理物流 postback:', data);
}

/**
 * 發送歡迎/測試訊息
 * @param {string} replyToken - LINE Reply Token
 * @param {string} userId - LINE User ID
 */
function sendWelcomeMessage(replyToken, userId) {
  try {
    const message = {
      type: 'flex',
      altText: '系統測試成功！',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '✅ 系統運作正常',
              weight: 'bold',
              size: 'xl',
              color: '#28a745'
            },
            {
              type: 'text',
              text: '您的 LINE Bot 連線成功！',
              margin: 'md',
              wrap: true
            },
            {
              type: 'text',
              text: '用戶ID: ' + userId,
              size: 'xs',
              color: '#999999',
              margin: 'lg'
            }
          ]
        }
      }
    };
    
    LineService.sendReply(replyToken, message);
    
  } catch (error) {
    console.error('sendWelcomeMessage 錯誤:', error);
  }
}

// ==========================================
// BEAMS 促銷活動處理函數
// ==========================================

/**
 * 處理 BEAMS 促銷活動歡迎訊息
 * 觸發關鍵字：「想了解beams活動」
 * @param {Object} event - LINE 事件
 */
function handleBeamsSaleWelcome(event) {
  try {
    console.log('🎉 發送 BEAMS 活動歡迎訊息');
    
    // 檢查活動是否已結束
    if (BeamsSaleService.isCampaignEnded()) {
      LineService.sendReply(event.replyToken, BeamsFlexBuilder.buildCampaignEndedMessage());
      return;
    }
    
    // 發送歡迎訊息
    const welcomeMessage = BeamsFlexBuilder.buildWelcomeMessage();
    LineService.sendReply(event.replyToken, welcomeMessage);
    
  } catch (error) {
    console.error('❌ handleBeamsSaleWelcome 錯誤:', error);
    LineService.sendError(event.replyToken, '系統暫時無法處理您的請求，請稍後再試');
  }
}

/**
 * 處理 BEAMS 商品 URL 查詢
 * 使用 Google Sheets 中的折扣商品 URL 清單進行快速比對
 * @param {Object} event - LINE 事件
 * @param {string} url - BEAMS 商品 URL
 */
function handleBeamsProductQuery(event, url) {
  try {
    const userId = event.source.userId;
    console.log('🔍 查詢 BEAMS 商品:', url);
    
    // 檢查活動是否已結束
    if (BeamsSaleService.isCampaignEnded()) {
      LineService.sendReply(event.replyToken, BeamsFlexBuilder.buildCampaignEndedMessage());
      return;
    }
    
    // 使用 URL 清單比對（快速查詢，不需要爬蟲）
    const isDiscountProduct = isBeamsDiscountProduct(url);
    
    // 提取商品 ID
    const productIdMatch = url.match(/\/item\/.*\/(\d+)/);
    const productId = productIdMatch ? productIdMatch[1] : '';
    
    if (isDiscountProduct) {
      // 商品在折扣清單中 → 顯示確認訊息與選項按鈕
      console.log('✅ 商品在折扣清單中');
      
      // 發送折扣商品確認 Flex（包含「報價」與「購買」按鈕）
      LineService.sendReply(event.replyToken,
        BeamsFlexBuilder.buildDiscountProductConfirm(url, productId)
      );
      
    } else {
      // 商品不在折扣清單中
      console.log('❌ 商品不在折扣清單中');
      
      LineService.sendReply(event.replyToken, {
        type: 'flex',
        altText: '商品查詢結果',
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '❌ 此商品不在活動折扣範圍',
                weight: 'bold',
                size: 'lg',
                color: '#dc3545'
              },
              {
                type: 'text',
                text: '這個商品目前沒有參與 BEAMS 每半年一次的超級折扣活動。',
                wrap: true,
                margin: 'md',
                color: '#666666'
              },
              {
                type: 'text',
                text: '如需購買，請直接聯繫客服詢問一般代購價格。',
                wrap: true,
                margin: 'md',
                color: '#666666'
              }
            ]
          }
        }
      });
    }
    
  } catch (error) {
    console.error('❌ handleBeamsProductQuery 錯誤:', error);
    LineService.sendPush(event.source.userId, {
      type: 'text',
      text: '❌ 查詢過程發生錯誤，請稍後再試或聯繫客服'
    });
  }
}


/**
 * 處理 BEAMS 商品規格輸入（顏色、尺寸、數量）
 * @param {Object} event - LINE 事件
 * @param {string} input - 用戶輸入
 * @param {Object} stateData - 狀態附加資料
 */
function handleBeamsSpecInput(event, input, stateData) {
  try {
    const userId = event.source.userId;
    console.log('📝 處理規格輸入:', input);
    console.log('📦 狀態資料:', JSON.stringify(stateData));
    
    // 解析輸入（格式：顏色, 尺寸, 數量）
    const parts = input.split(/[,，\s]+/).filter(p => p.trim());
    
    if (parts.length < 2) {
      LineService.sendReply(event.replyToken, {
        type: 'text',
        text: '⚠️ 格式錯誤！\n\n請依照格式輸入：顏色, 尺寸, 數量\n例如：BLACK, L, 1'
      });
      return;
    }
    
    const color = parts[0].trim();
    const size = parts[1].trim();
    const quantity = parts[2] ? parts[2].trim() : '1';
    
    // 清除狀態
    StateService.clearState(userId);
    
    // 準備訂單資料（用於記錄與通知）
    const orderInfo = {
      lineUserId: userId,
      productId: stateData.productId || '',
      productUrl: stateData.url || stateData.productUrl || '',
      color: color,
      size: size,
      quantity: quantity,
      timestamp: new Date().toISOString()
    };
    
    console.log('📋 訂單資訊:', JSON.stringify(orderInfo));
    
    // 發送確認訊息給顧客
    const confirmMessage = {
      type: 'flex',
      altText: '✅ 已收到您的購買需求',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#27AE60',
          paddingAll: '15px',
          contents: [
            {
              type: 'text',
              text: '✅ 已收到您的購買需求',
              color: '#FFFFFF',
              weight: 'bold',
              size: 'lg'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '20px',
          contents: [
            {
              type: 'text',
              text: '您的商品規格：',
              weight: 'bold',
              size: 'md'
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'md',
              contents: [
                { type: 'text', text: '顏色', color: '#666666', flex: 1 },
                { type: 'text', text: color, weight: 'bold', align: 'end', flex: 2 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              contents: [
                { type: 'text', text: '尺寸', color: '#666666', flex: 1 },
                { type: 'text', text: size, weight: 'bold', align: 'end', flex: 2 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              contents: [
                { type: 'text', text: '數量', color: '#666666', flex: 1 },
                { type: 'text', text: quantity, weight: 'bold', align: 'end', flex: 2 }
              ]
            },
            {
              type: 'separator',
              margin: 'lg'
            },
            {
              type: 'text',
              text: '📸 請傳送商品頁面截圖，我們會盡快為您確認庫存狀況並提供購買連結！',
              size: 'sm',
              color: '#666666',
              margin: 'lg',
              wrap: true
            }
          ]
        }
      }
    };
    
    LineService.sendReply(event.replyToken, confirmMessage);
    console.log('✅ 已發送購買需求確認訊息');
    
  } catch (error) {
    console.error('❌ handleBeamsSpecInput 錯誤:', error);
    console.error('📍 錯誤堆疊:', error.stack);
    StateService.clearState(event.source.userId);
    LineService.sendError(event.replyToken, '處理購買需求時發生錯誤，請稍後再試');
  }
}


/**
 * 處理 BEAMS 類別選擇（Postback）
 * @param {Object} event - LINE 事件
 */
function handleBeamsCategorySelection(event) {
  try {
    console.log('📂 發送 BEAMS 類別選單');
    
    const categoryMessage = BeamsFlexBuilder.buildCategoryCarousel();
    LineService.sendReply(event.replyToken, categoryMessage);
    
  } catch (error) {
    console.error('❌ handleBeamsCategorySelection 錯誤:', error);
    LineService.sendError(event.replyToken, '無法載入類別選單');
  }
}

/**
 * 處理 BEAMS 下單請求（Postback）
 * @param {Object} event - LINE 事件
 * @param {Object} params - Postback 參數
 */
function handleBeamsOrderRequest(event, params) {
  try {
    const userId = event.source.userId;
    const productId = params.productId;
    const jpyPrice = parseInt(params.price);
    
    console.log('🛒 BEAMS 下單請求:', productId);
    
    // 從快取取得商品資訊
    const productInfo = BeamsSaleService.checkCache(productId);
    
    if (!productInfo) {
      LineService.sendReply(event.replyToken, {
        type: 'text',
        text: '❌ 商品資訊已過期，請重新查詢'
      });
      return;
    }
    
    // 設定等待規格輸入狀態
    StateService.setState(userId, StateService.STATES.WAITING_FOR_BEAMS_SPEC, {
      productId: productId,
      productUrl: `https://www.beams.co.jp/item/beams/item/${productId}/`,
      productName: productInfo.productName,
      jpyPrice: productInfo.originalPrice,
    });
    
    // 發送規格輸入提示
    const promptMessage = BeamsFlexBuilder.buildSpecInputPrompt(productInfo);
    LineService.sendReply(event.replyToken, promptMessage);
    
  } catch (error) {
    console.error('❌ handleBeamsOrderRequest 錯誤:', error);
    LineService.sendError(event.replyToken, '下單請求處理失敗');
  }
}

/**
 * 處理 BEAMS 價格輸入（用戶手動輸入日幣價格）
 * 根據公式計算報價：(日幣 × 0.7 × 0.21) + 350
 * @param {Object} event - LINE 事件
 * @param {string} input - 用戶輸入的價格
 * @param {Object} stateData - 狀態附加資料（包含商品 URL）
 */
function handleBeamsPriceInput(event, input, stateData) {
  try {
    const userId = event.source.userId;
    
    // 清理輸入（移除逗號、空格等）
    const cleanInput = input.replace(/[,，\s¥円]/g, '');
    const jpyPrice = parseInt(cleanInput);
    
    // 驗證輸入是否為有效數字
    if (isNaN(jpyPrice) || jpyPrice <= 0) {
      LineService.sendReply(event.replyToken, {
        type: 'text',
        text: '⚠️ 請輸入有效的日幣價格（只需輸入數字）\n\n例如：12000'
      });
      return;
    }
    
    // 清除狀態
    StateService.clearState(userId);
    
    // 取得公式參數（從 Config.gs 讀取）
    const formula = BEAMS_CONFIG.PRICE_FORMULA;
    
    // 計算報價公式：(日幣 × 折扣率 × 匯率) + 服務費
    const discountedPrice = jpyPrice * formula.DISCOUNT_RATE;
    const twdPrice = Math.round(discountedPrice * formula.EXCHANGE_RATE + formula.SERVICE_FEE);
    
    console.log(`💴 計算報價: JPY ${jpyPrice} → TWD ${twdPrice} (套用服務費: ${formula.SERVICE_FEE})`);

    
    // 發送報價結果
    const quoteMessage = {
      type: 'flex',
      altText: 'BEAMS 商品報價',
      contents: {
        type: 'bubble',
        styles: {
          header: { backgroundColor: '#FF6B00' },
          body: { backgroundColor: '#FFFEF5' }
        },
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🏷️ BEAMS 會員限定報價',
              color: '#FFFFFF',
              weight: 'bold',
              size: 'lg'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '原價（日幣）', color: '#666666', flex: 1 },
                { type: 'text', text: '¥' + jpyPrice.toLocaleString(), weight: 'bold', align: 'end', flex: 1 }
              ]
            },
            
            { type: 'separator', margin: 'lg' },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'lg',
              contents: [
                { type: 'text', text: '報價（台幣）', color: '#FF6B00', weight: 'bold', flex: 1 },
                { type: 'text', text: 'NT$ ' + twdPrice.toLocaleString(), color: '#FF6B00', weight: 'bold', size: 'xl', align: 'end', flex: 1 }
              ]
            },
            {
              type: 'text',
              text: '報價已包含國際物流，倉儲等相關費用，如需下單，請直接點選剛剛對會框的「我要購買此商品」按鈕。',
              size: 'sm',
              color: '#666666',
              margin: 'lg',
              wrap: true
            }

          ]
        }
      }
    };
    
    LineService.sendReply(event.replyToken, quoteMessage);
    console.log('✅ 報價發送成功');
    
  } catch (error) {
    console.error('❌ handleBeamsPriceInput 錯誤:', error);
    LineService.sendReply(event.replyToken, {
      type: 'text',
      text: '❌ 計算報價時發生錯誤，請稍後再試'
    });
  }
}

/**
 * 處理 BEAMS「我想知道報價」按鈕點擊
 * @param {Object} event - LINE 事件
 * @param {Object} params - Postback 參數
 */
function handleBeamsGetQuote(event, params) {
  try {
    const userId = event.source.userId;
    const productUrl = params.url || '';
    const productId = params.productId || '';
    
    console.log('💰 處理報價請求:', productUrl);
    
    // 設定等待價格輸入狀態
    StateService.setState(userId, StateService.STATES.WAITING_FOR_BEAMS_PRICE, {
      url: productUrl,
      productId: productId,
      timestamp: new Date().toISOString()
    });
    
    // 發送價格輸入提示
    LineService.sendReply(event.replyToken,
      BeamsFlexBuilder.buildPriceInputPrompt(productUrl)
    );
    
  } catch (error) {
    console.error('❌ handleBeamsGetQuote 錯誤:', error);
    LineService.sendError(event.replyToken, '報價請求處理失敗');
  }
}

/**
 * 處理 BEAMS「我要購買此商品」按鈕點擊
 * @param {Object} event - LINE 事件
 * @param {Object} params - Postback 參數
 */
function handleBeamsPurchase(event, params) {
  try {
    const userId = event.source.userId;
    const productUrl = params.url || '';
    const productId = params.productId || '';
    
    console.log('🛒 處理購買請求:', productUrl);
    
    // 設定等待規格輸入狀態
    StateService.setState(userId, StateService.STATES.WAITING_FOR_BEAMS_SPEC, {
      url: productUrl,
      productId: productId,
      timestamp: new Date().toISOString()
    });
    
    // 發送購買引導訊息
    LineService.sendReply(event.replyToken,
      BeamsFlexBuilder.buildPurchaseGuide(productUrl)
    );
    
  } catch (error) {
    console.error('❌ handleBeamsPurchase 錯誤:', error);
    LineService.sendError(event.replyToken, '購買請求處理失敗');
  }
}
