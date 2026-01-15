/**
 * DebugService.gs - LINE Bot 完整偵錯工具
 * 
 * 📌 使用方式：
 * 1. 在 GAS 編輯器上方的函數下拉選單中選擇要執行的測試函數
 * 2. 點擊「執行」按鈕
 * 3. 查看下方的「執行紀錄」來觀察詳細日誌
 */

// ============================================================
// 🔴 測試對象 LINE ID（請在此設定）
// ============================================================
const TEST_LINE_USER_ID = 'Ub7d6041fb4be4bd15cb13c26953b3bfb';

// ============================================================
// 📤 Push 測試：直接發送訊息給測試用戶
// ============================================================

/**
 * 測試 1：發送歡迎訊息 Flex
 */
function pushTest_WelcomeMessage() {
  console.log('🧪 ========== 測試：歡迎訊息 ==========');
  console.log('📤 目標用戶:', TEST_LINE_USER_ID);
  
  try {
    const welcomeMessage = BeamsFlexBuilder.buildWelcomeMessage();
    const result = LineService.sendPush(TEST_LINE_USER_ID, welcomeMessage);
    console.log('✅ 發送結果:', result ? '成功' : '失敗');
  } catch (error) {
    console.error('❌ 發送錯誤:', error.message);
  }
}

/**
 * 測試 2：發送「確認為活動商品」Flex（含報價/購買按鈕）
 */
function pushTest_DiscountProductConfirm() {
  console.log('🧪 ========== 測試：活動商品確認 Flex ==========');
  console.log('📤 目標用戶:', TEST_LINE_USER_ID);
  
  const testUrl = 'https://www.beams.co.jp/item/beams/tops/11130412147/?color=79';
  const testProductId = '11130412147';
  
  try {
    const confirmMessage = BeamsFlexBuilder.buildDiscountProductConfirm(testUrl, testProductId);
    const result = LineService.sendPush(TEST_LINE_USER_ID, confirmMessage);
    console.log('✅ 發送結果:', result ? '成功' : '失敗');
  } catch (error) {
    console.error('❌ 發送錯誤:', error.message);
  }
}

/**
 * 測試 3：發送「請輸入日幣價格」Flex
 */
function pushTest_PriceInputPrompt() {
  console.log('🧪 ========== 測試：價格輸入提示 ==========');
  console.log('📤 目標用戶:', TEST_LINE_USER_ID);
  
  const testUrl = 'https://www.beams.co.jp/item/beams/tops/11130412147/';
  
  try {
    const pricePrompt = BeamsFlexBuilder.buildPriceInputPrompt(testUrl);
    const result = LineService.sendPush(TEST_LINE_USER_ID, pricePrompt);
    console.log('✅ 發送結果:', result ? '成功' : '失敗');
  } catch (error) {
    console.error('❌ 發送錯誤:', error.message);
  }
}

/**
 * 測試 4：發送「購買引導」Flex
 */
function pushTest_PurchaseGuide() {
  console.log('🧪 ========== 測試：購買引導 ==========');
  console.log('📤 目標用戶:', TEST_LINE_USER_ID);
  
  const testUrl = 'https://www.beams.co.jp/item/beams/tops/11130412147/';
  
  try {
    const purchaseGuide = BeamsFlexBuilder.buildPurchaseGuide(testUrl);
    const result = LineService.sendPush(TEST_LINE_USER_ID, purchaseGuide);
    console.log('✅ 發送結果:', result ? '成功' : '失敗');
  } catch (error) {
    console.error('❌ 發送錯誤:', error.message);
  }
}

/**
 * 測試 5：發送「類別選單」Flex
 */
function pushTest_CategoryCarousel() {
  console.log('🧪 ========== 測試：類別選單 ==========');
  console.log('📤 目標用戶:', TEST_LINE_USER_ID);
  
  try {
    const categoryMessage = BeamsFlexBuilder.buildCategoryCarousel();
    const result = LineService.sendPush(TEST_LINE_USER_ID, categoryMessage);
    console.log('✅ 發送結果:', result ? '成功' : '失敗');
  } catch (error) {
    console.error('❌ 發送錯誤:', error.message);
  }
}

/**
 * 測試 6：發送模擬報價結果
 */
function pushTest_QuoteResult() {
  console.log('🧪 ========== 測試：報價結果 ==========');
  console.log('📤 目標用戶:', TEST_LINE_USER_ID);
  
  const jpyPrice = 12000;
  const formula = BEAMS_CONFIG.PRICE_FORMULA;
  const discountedPrice = jpyPrice * formula.DISCOUNT_RATE;
  const twdPrice = Math.round(discountedPrice * formula.EXCHANGE_RATE + formula.SERVICE_FEE);

  
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
              { type: 'text', text: '會員價（日幣）', color: '#666666', flex: 1 },
              { type: 'text', text: '¥' + jpyPrice.toLocaleString(), weight: 'bold', align: 'end', flex: 1 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '折扣後（7折）', color: '#666666', flex: 1 },
              { type: 'text', text: '¥' + discountedPrice.toLocaleString(), weight: 'bold', align: 'end', flex: 1 }
            ]
          },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'lg',
            contents: [
              { type: 'text', text: '代購價（台幣）', color: '#FF6B00', weight: 'bold', flex: 1 },
              { type: 'text', text: 'NT$ ' + twdPrice.toLocaleString(), color: '#FF6B00', weight: 'bold', size: 'xl', align: 'end', flex: 1 }
            ]
          },
          {
            type: 'text',
            text: '如需下單，請直接回覆「我要購買」並附上商品規格（顏色、尺寸、數量）及截圖',
            size: 'sm',
            color: '#666666',
            margin: 'lg',
            wrap: true
          }
        ]
      }
    }
  };
  
  try {
    const result = LineService.sendPush(TEST_LINE_USER_ID, quoteMessage);
    console.log('✅ 發送結果:', result ? '成功' : '失敗');
  } catch (error) {
    console.error('❌ 發送錯誤:', error.message);
  }
}

// ============================================================
// 🔍 單元測試：URL 比對邏輯
// ============================================================

/**
 * 測試 URL 正則表達式匹配
 */
function testUrlPatternMatching() {
  console.log('🔍 ========== 測試 URL 正則匹配 ==========');
  
  const testUrls = [
    'https://www.beams.co.jp/item/beams/tops/11130412147/?color=79',
    'https://www.beams.co.jp/item/beams/tops/11130412147/',
    'https://www.beams.co.jp/item/beams/tops/11130412147',
    'beams.co.jp/item/beams/tops/11130412147'
  ];
  
  const pattern = BEAMS_CONFIG.URL_PATTERN;
  console.log('使用正則:', pattern.toString());
  
  testUrls.forEach(url => {
    const match = pattern.test(url);
    console.log(`${match ? '✅' : '❌'} ${url}`);
  });
}

/**
 * 測試折扣商品 ID 比對
 */
function testProductIdLookup() {
  console.log('🔍 ========== 測試商品 ID 查詢 ==========');
  
  const testUrl = 'https://www.beams.co.jp/item/beams/tops/11130412147/?color=79';
  
  try {
    // 1. 測試 ID 提取
    const match = testUrl.match(/\/item\/.*\/(\d+)/);
    if (match) {
      console.log('📌 提取的商品 ID:', match[1]);
    } else {
      console.log('❌ 無法從 URL 提取商品 ID');
      return;
    }
    
    // 2. 測試載入折扣 ID 清單
    const ids = loadAllBeamsProductIds();
    console.log(`📊 折扣清單共有 ${ids.length} 個商品 ID`);
    
    if (ids.length > 0) {
      console.log('🔢 前 5 筆 ID:', ids.slice(0, 5).join(', '));
    }
    
    // 3. 測試比對
    const isDiscount = isBeamsDiscountProduct(testUrl);
    console.log(`🎯 比對結果: ${isDiscount ? '✅ 是折扣商品' : '❌ 不是折扣商品'}`);
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error('📍 錯誤堆疊:', error.stack);
  }
}

// ============================================================
// ⚙️ 系統配置檢查
// ============================================================

/**
 * 全面檢查系統配置
 */
function checkSystemConfig() {
  console.log('⚙️ ========== 系統配置檢查 ==========');
  
  // 1. 檢查常數定義
  console.log('\n📋 常數定義:');
  console.log('  SPREADSHEET_ID:', typeof SPREADSHEET_ID !== 'undefined' ? '✅ ' + SPREADSHEET_ID : '❌ 未定義');
  console.log('  MAIN_SHEET_ID:', typeof MAIN_SHEET_ID !== 'undefined' ? '✅ 已定義' : '❌ 未定義');
  console.log('  LINE_CONFIG:', typeof LINE_CONFIG !== 'undefined' ? '✅ 已定義' : '❌ 未定義');
  console.log('  BEAMS_CONFIG:', typeof BEAMS_CONFIG !== 'undefined' ? '✅ 已定義' : '❌ 未定義');
  
  // 2. 檢查試算表連線
  console.log('\n📊 試算表連線:');
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('  試算表名稱:', ss.getName());
    
    const urlSheet = ss.getSheetByName('BEAMS_Discount_URLs');
    if (urlSheet) {
      const rowCount = urlSheet.getLastRow() - 1;
      console.log('  BEAMS_Discount_URLs:', `✅ ${rowCount} 筆資料`);
    } else {
      console.log('  BEAMS_Discount_URLs:', '❌ 工作表不存在');
    }
  } catch (e) {
    console.log('  連線失敗:', e.message);
  }
  
  // 3. 檢查活動狀態
  console.log('\n📅 活動狀態:');
  console.log('  活動結束時間:', BEAMS_CONFIG.CAMPAIGN_END);
  console.log('  活動是否結束:', BeamsSaleService.isCampaignEnded() ? '❌ 已結束' : '✅ 進行中');
  console.log('  剩餘時間:', BeamsSaleService.getCampaignRemainingTime());
}

// ============================================================
// 🚀 一鍵執行所有 Push 測試
// ============================================================

/**
 * 執行所有 Flex Message Push 測試
 */
function pushTest_ALL() {
  console.log('🚀 ========== 開始執行所有 Push 測試 ==========');
  console.log('📤 目標用戶:', TEST_LINE_USER_ID);
  console.log('⏳ 每個測試間隔 2 秒...\n');
  
  pushTest_WelcomeMessage();
  Utilities.sleep(2000);
  
  pushTest_DiscountProductConfirm();
  Utilities.sleep(2000);
  
  pushTest_PriceInputPrompt();
  Utilities.sleep(2000);
  
  pushTest_PurchaseGuide();
  Utilities.sleep(2000);
  
  pushTest_CategoryCarousel();
  Utilities.sleep(2000);
  
  pushTest_QuoteResult();
  
  console.log('\n🎉 ========== 所有測試完成 ==========');
}

// ============================================================
// 🔗 BEAMS URL 同步測試
// ============================================================

/**
 * 測試：直接寫入 BEAMS 折扣商品 URL
 * 🔴 在 GAS 編輯器執行此函數來測試 addBeamsUrls 是否正常工作
 */
function testAddBeamsUrls() {
  console.log('🧪 ========== 測試 addBeamsUrls 函數 ==========');
  
  // 測試用的 URL
  const testUrls = [
    'https://www.beams.co.jp/item/beams/tops/11130412147/',
    'https://www.beams.co.jp/item/beams/pants/11210299791/',
    'https://www.beams.co.jp/item/beams/blouson/11185607139/',
    'https://www.beams.co.jp/item/beams/jacket/18160001359/',
    'https://www.beams.co.jp/item/bming/tops/94180202443/'
  ];
  
  console.log('📤 測試資料:', testUrls.length, '個 URL');
  
  try {
    // 直接呼叫 addBeamsUrls 函數
    const result = addBeamsUrls(testUrls, 1, true, '');
    
    console.log('✅ 函數執行成功');
    console.log('📊 結果:', JSON.stringify(result));
    
    // 確認工作表
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('BEAMS_Discount_URLs');
    
    if (sheet) {
      const lastRow = sheet.getLastRow();
      console.log('📋 工作表現有資料行數:', lastRow - 1);
    } else {
      console.log('❌ 工作表不存在！');
    }
    
  } catch (error) {
    console.error('❌ 執行錯誤:', error.message);
    console.error('📍 錯誤堆疊:', error.stack);
  }
}

/**
 * 測試：檢查 SPREADSHEET_ID 是否正確
 */
function testSpreadsheetConnection() {
  console.log('🧪 ========== 測試試算表連線 ==========');
  
  console.log('📋 SPREADSHEET_ID:', SPREADSHEET_ID);
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('✅ 試算表連線成功');
    console.log('📋 試算表名稱:', ss.getName());
    
    // 列出所有工作表
    const sheets = ss.getSheets();
    console.log('📋 工作表數量:', sheets.length);
    sheets.forEach(sheet => {
      console.log('   -', sheet.getName(), '(', sheet.getLastRow(), '行 )');
    });
    
  } catch (error) {
    console.error('❌ 連線失敗:', error.message);
  }
}
