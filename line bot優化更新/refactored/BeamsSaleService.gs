/**
 * ============================================================
 * BeamsSaleService.gs
 * BEAMS Club 會員限定促銷系統 - 核心服務
 * ============================================================
 * 
 * 功能：
 * 1. 查詢商品資訊（快取優先，無快取則呼叫爬蟲）
 * 2. 計算台幣報價
 * 3. 儲存訂單
 * 4. 類別導航
 * 
 * 版本：v1.0.0
 * 更新日期：2025-12-26
 */

const BeamsSaleService = {
    
    // ============================================================
    // 設定（引用自 Config.gs）
    // ============================================================
    
    get CONFIG() {
        return BEAMS_CONFIG;
    },

    
    // ============================================================
    // URL 處理
    // ============================================================
    
    /**
     * 從 URL 提取商品 ID
     * @param {string} url - BEAMS 商品 URL
     * @returns {string|null} 商品 ID
     */
    extractProductId: function(url) {
        // URL 格式支援: 
        // 1. https://www.beams.co.jp/item/beams/tops/11130412147/
        // 2. https://www.beams.co.jp/zh-CHT/item/beamsplus/pants/38230099874/
        const match = url.match(/beams\.co\.jp\/.*item\/.*\/(\d+)/);
        return match ? match[1] : null;
    },
    
    /**
     * 檢查是否為有效的 BEAMS 商品 URL
     * @param {string} text - 輸入文字
     * @returns {boolean}
     */
    isBeamsProductUrl: function(text) {
        return /beams\.co\.jp\/.*item\//.test(text);
    },
    
    // ============================================================
    // 快取管理
    // ============================================================
    
    /**
     * 查詢快取
     * @param {string} productId - 商品 ID
     * @returns {Object|null} 快取資料
     */
    checkCache: function(productId) {
        try {
            const sheet = SpreadsheetApp.openById(MAIN_SHEET_ID)
                .getSheetByName(this.CONFIG.SHEETS.PRODUCT_CACHE);
            
            if (!sheet) {
                console.log('⚠️ 快取工作表不存在');
                return null;
            }
            
            const data = sheet.getDataRange().getValues();
            
            for (let i = 1; i < data.length; i++) {
                if (data[i][0] === productId) {
                    // 檢查是否過期（活動結束後失效）
                    const cachedAt = new Date(data[i][5]);
                    if (new Date() > this.CONFIG.CAMPAIGN_END) {
                        console.log('⚠️ 快取已過期（活動結束）');
                        return null;
                    }
                    
                    // 更新查詢次數
                    sheet.getRange(i + 1, 7).setValue((data[i][6] || 0) + 1);
                    
                    console.log('✅ 快取命中:', productId);
                    return {
                        productId: data[i][0],
                        productName: data[i][1],
                        hasDiscount: data[i][2],
                        originalPrice: data[i][3],
                        category: data[i][4],
                        cachedAt: data[i][5],
                        queryCount: data[i][6]
                    };
                }
            }
            
            console.log('ℹ️ 快取未命中:', productId);
            return null;
            
        } catch (error) {
            console.error('❌ 快取查詢失敗:', error);
            return null;
        }
    },
    
    /**
     * 寫入快取
     * @param {Object} data - 商品資料
     */
    saveToCache: function(data) {
        try {
            let sheet = SpreadsheetApp.openById(MAIN_SHEET_ID)
                .getSheetByName(this.CONFIG.SHEETS.PRODUCT_CACHE);
            
            // 如果工作表不存在，建立它
            if (!sheet) {
                sheet = this._createCacheSheet();
            }
            
            // 檢查是否已存在（更新而非重複新增）
            const existingData = sheet.getDataRange().getValues();
            for (let i = 1; i < existingData.length; i++) {
                if (existingData[i][0] === data.productId) {
                    // 更新現有記錄
                    sheet.getRange(i + 1, 1, 1, 7).setValues([[
                        data.productId,
                        data.productName,
                        data.hasDiscount,
                        data.originalPrice,
                        data.category || '',
                        new Date(),
                        (existingData[i][6] || 0) + 1
                    ]]);
                    console.log('✅ 快取更新完成:', data.productId);
                    return;
                }
            }
            
            // 新增記錄
            sheet.appendRow([
                data.productId,
                data.productName,
                data.hasDiscount,
                data.originalPrice,
                data.category || '',
                new Date(),
                1  // queryCount
            ]);
            
            console.log('✅ 快取寫入完成:', data.productId);
            
        } catch (error) {
            console.error('❌ 快取寫入失敗:', error);
        }
    },
    
    /**
     * 建立快取工作表
     * @private
     */
    _createCacheSheet: function() {
        const ss = SpreadsheetApp.openById(MAIN_SHEET_ID);
        const sheet = ss.insertSheet(this.CONFIG.SHEETS.PRODUCT_CACHE);
        
        // 設定標題列
        sheet.getRange(1, 1, 1, 7).setValues([[
            'productId',
            'productName',
            'hasDiscount',
            'originalPrice',
            'category',
            'cachedAt',
            'queryCount'
        ]]);
        
        // 格式化
        sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
        sheet.setFrozenRows(1);
        
        console.log('✅ 快取工作表已建立');
        return sheet;
    },
    
    // ============================================================
    // 爬蟲呼叫
    // ============================================================
    
    /**
     * 呼叫 Cloud Function 爬蟲
     * @param {string} url - 商品 URL
     * @returns {Object} 爬蟲結果
     */
    callScraper: function(url) {
        try {
            console.log('🔄 呼叫爬蟲服務...');
            
            const options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                payload: JSON.stringify({ url }),
                muteHttpExceptions: true,
                timeout: 60  // 60 秒超時
            };
            
            const response = UrlFetchApp.fetch(this.CONFIG.SCRAPER_URL, options);
            const statusCode = response.getResponseCode();
            const result = JSON.parse(response.getContentText());
            
            if (statusCode === 200 && result.success) {
                console.log('✅ 爬蟲成功:', result);
                return result;
            } else {
                console.error('❌ 爬蟲失敗:', result);
                return { success: false, error: result.error || '爬蟲服務錯誤' };
            }
            
        } catch (error) {
            console.error('❌ 爬蟲呼叫失敗:', error);
            return { success: false, error: error.toString() };
        }
    },
    
    // ============================================================
    // 商品查詢（主入口）
    // ============================================================
    
    /**
     * 查詢商品（快取優先）
     * @param {string} url - 商品 URL
     * @returns {Object} 商品資訊
     */
    queryProduct: function(url) {
        const productId = this.extractProductId(url);
        
        if (!productId) {
            return { success: false, error: '無效的商品 URL' };
        }
        
        // 步驟 1：查詢快取
        const cached = this.checkCache(productId);
        if (cached) {
            return {
                success: true,
                fromCache: true,
                ...cached,
                twdPrice: this.calculateTwdPrice(cached.originalPrice)
            };
        }
        
        // 步驟 2：呼叫爬蟲
        const scraped = this.callScraper(url);
        
        if (!scraped.success) {
            return scraped;
        }
        
        // 步驟 3：寫入快取
        this.saveToCache(scraped);
        
        // 步驟 4：計算報價
        return {
            success: true,
            fromCache: false,
            ...scraped,
            twdPrice: scraped.hasDiscount ? this.calculateTwdPrice(scraped.originalPrice) : null
        };
    },
    
    // ============================================================
    // 報價計算
    // ============================================================
    
    /**
     * 計算台幣報價
     * 公式：日幣 × 0.7 × 0.21 + $350
     * @param {number} jpyPrice - 日幣原價
     * @returns {number} 台幣報價
     */
    calculateTwdPrice: function(jpyPrice) {
        if (!jpyPrice || jpyPrice <= 0) return null;
        
        const { DISCOUNT_RATE, EXCHANGE_RATE, SERVICE_FEE } = this.CONFIG.PRICE_FORMULA;
        const twdPrice = Math.round(jpyPrice * DISCOUNT_RATE * EXCHANGE_RATE + SERVICE_FEE);
        
        console.log(`💰 報價計算: ¥${jpyPrice} × ${DISCOUNT_RATE} × ${EXCHANGE_RATE} + $${SERVICE_FEE} = NT$${twdPrice}`);
        return twdPrice;
    },
    
    // ============================================================
    // 訂單管理
    // ============================================================
    
    /**
     * 儲存訂單
     * @param {Object} orderData - 訂單資料
     * @returns {string} 訂單編號
     */
    saveOrder: function(orderData) {
        try {
            let sheet = SpreadsheetApp.openById(MAIN_SHEET_ID)
                .getSheetByName(this.CONFIG.SHEETS.ORDERS);
            
            // 如果工作表不存在，建立它
            if (!sheet) {
                sheet = this._createOrderSheet();
            }
            
            // 生成訂單編號
            const today = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd');
            const lastRow = sheet.getLastRow();
            const orderSeq = String(lastRow).padStart(3, '0');
            const orderId = `BEAMS${today}${orderSeq}`;
            
            // 寫入訂單
            sheet.appendRow([
                orderId,
                new Date(),
                orderData.lineUserId,
                orderData.productId,
                orderData.productUrl,
                orderData.productName,
                orderData.color,
                orderData.size,
                orderData.jpyPrice,
                orderData.twdPrice,
                orderData.screenshotUrl || '',
                'pending'  // 初始狀態
            ]);
            
            console.log('✅ 訂單儲存完成:', orderId);
            return orderId;
            
        } catch (error) {
            console.error('❌ 訂單儲存失敗:', error);
            throw error;
        }
    },
    
    /**
     * 建立訂單工作表
     * @private
     */
    _createOrderSheet: function() {
        const ss = SpreadsheetApp.openById(MAIN_SHEET_ID);
        const sheet = ss.insertSheet(this.CONFIG.SHEETS.ORDERS);
        
        // 設定標題列
        sheet.getRange(1, 1, 1, 12).setValues([[
            'orderId',
            'orderTime',
            'lineUserId',
            'productId',
            'productUrl',
            'productName',
            'color',
            'size',
            'jpyPrice',
            'twdPrice',
            'screenshotUrl',
            'status'
        ]]);
        
        // 格式化
        sheet.getRange(1, 1, 1, 12).setFontWeight('bold');
        sheet.setFrozenRows(1);
        
        console.log('✅ 訂單工作表已建立');
        return sheet;
    },
    
    // ============================================================
    // 類別導航
    // ============================================================
    
    /**
     * 取得類別列表（日中對照）
     * @returns {Array} 類別列表
     */
    getCategoryList: function() {
        return [
            { id: '10', jp: 'シャツ・ブラウス', zh: '襯衫・女用襯衫', url: 'https://www.beams.co.jp/brand/900000/?tree=10' },
            { id: '12', jp: 'Tシャツ・カットソー', zh: 'T恤・針織衫', url: 'https://www.beams.co.jp/brand/900000/?tree=12' },
            { id: '14', jp: 'トップス', zh: '上衣', url: 'https://www.beams.co.jp/brand/900000/?tree=14' },
            { id: '16', jp: 'ジャケット', zh: '外套', url: 'https://www.beams.co.jp/brand/900000/?tree=16' },
            { id: '18', jp: 'ブルゾン', zh: '夾克', url: 'https://www.beams.co.jp/brand/900000/?tree=18' },
            { id: '20', jp: 'コート', zh: '大衣', url: 'https://www.beams.co.jp/brand/900000/?tree=20' },
            { id: '24', jp: 'パンツ', zh: '褲子', url: 'https://www.beams.co.jp/brand/900000/?tree=24' },
            { id: '26', jp: 'スカート', zh: '裙子', url: 'https://www.beams.co.jp/brand/900000/?tree=26' },
            { id: '28', jp: 'ワンピース', zh: '連身裙', url: 'https://www.beams.co.jp/brand/900000/?tree=28' },
            { id: '30', jp: 'スーツ・ネクタイ', zh: '西裝・領帶', url: 'https://www.beams.co.jp/brand/900000/?tree=30' },
            { id: '34', jp: 'バッグ', zh: '包包', url: 'https://www.beams.co.jp/brand/900000/?tree=34' },
            { id: '36', jp: 'シューズ', zh: '鞋子', url: 'https://www.beams.co.jp/brand/900000/?tree=36' },
            { id: '40', jp: 'ファッション雑貨', zh: '流行配件', url: 'https://www.beams.co.jp/brand/900000/?tree=40' },
            { id: '42', jp: '財布・小物', zh: '錢包・小物', url: 'https://www.beams.co.jp/brand/900000/?tree=42' },
            { id: '48', jp: 'アクセサリー', zh: '飾品', url: 'https://www.beams.co.jp/brand/900000/?tree=48' },
            { id: '60', jp: '帽子', zh: '帽子', url: 'https://www.beams.co.jp/brand/900000/?tree=60' }
        ];
    },
    
    // ============================================================
    // 活動狀態
    // ============================================================
    
    /**
     * 檢查活動是否已結束
     * @returns {boolean}
     */
    isCampaignEnded: function() {
        return new Date() > this.CONFIG.CAMPAIGN_END;
    },
    
    /**
     * 取得活動剩餘時間
     * @returns {string}
     */
    getCampaignRemainingTime: function() {
        const now = new Date();
        const end = this.CONFIG.CAMPAIGN_END;
        const diff = end - now;
        
        if (diff <= 0) return '活動已結束';
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        return `剩餘 ${days} 天 ${hours} 小時`;
    }
};
