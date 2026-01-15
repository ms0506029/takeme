/**
 * BEAMS 會員限定促銷商品爬蟲服務
 * 
 * 功能：
 * 1. 自動登入 BEAMS 會員帳號
 * 2. 檢測商品是否有「ビームスクラブ会員限定 優待セール対象」標記
 * 3. 抓取商品原價
 * 4. 維持 Session 避免重複登入
 * 
 * 環境變數：
 * - BEAMS_EMAIL: BEAMS 會員 Email
 * - BEAMS_PASSWORD: BEAMS 會員密碼
 * 
 * 使用 @sparticuz/chromium 輕量版 Chromium，專為 Cloud Functions 優化
 */

const functions = require('@google-cloud/functions-framework');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// ============================================================
// 全域變數：維持瀏覽器和登入狀態
// ============================================================
let browser = null;
let page = null;
let isLoggedIn = false;
let lastLoginTime = null;

// 登入有效期限（4小時後重新登入）
const LOGIN_EXPIRY_MS = 4 * 60 * 60 * 1000;

// ============================================================
// 初始化瀏覽器（使用 @sparticuz/chromium）
// ============================================================
async function initBrowser() {
    if (!browser) {
        console.log('🚀 初始化瀏覽器...');
        
        // 取得 @sparticuz/chromium 的執行路徑
        const executablePath = await chromium.executablePath();
        
        // 增加更多的啟動參數來繞過反爬蟲檢測
        const launchArgs = [
            ...chromium.args,
            '--disable-blink-features=AutomationControlled',  // 隱藏自動化標記
            '--disable-features=IsolateOrigins,site-per-process',
            '--lang=ja-JP',  // 設定日文語言
        ];
        
        browser = await puppeteer.launch({
            args: launchArgs,
            defaultViewport: { width: 1920, height: 1080 },  // 設定較大的視窗
            executablePath: executablePath,
            headless: chromium.headless,
        });
        
        page = await browser.newPage();
        
        // 設定更完整的瀏覽器指紋
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // 設定語言和地區
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        });
        
        // 繞過 webdriver 檢測
        await page.evaluateOnNewDocument(() => {
            // 隱藏 webdriver 標記
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            
            // 模擬真實的 plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            
            // 模擬真實的語言
            Object.defineProperty(navigator, 'languages', {
                get: () => ['ja-JP', 'ja', 'en-US', 'en'],
            });
        });
        
        console.log('✅ 瀏覽器初始化完成（已啟用反反爬蟲設定）');
    }
    return { browser, page };
}

// ============================================================
// 登入 BEAMS 會員
// ============================================================
async function loginToBeams() {
    const email = process.env.BEAMS_EMAIL;
    const password = process.env.BEAMS_PASSWORD;
    
    if (!email || !password) {
        throw new Error('❌ 未設定 BEAMS_EMAIL 或 BEAMS_PASSWORD 環境變數');
    }
    
    // 檢查是否需要重新登入
    const now = Date.now();
    if (isLoggedIn && lastLoginTime && (now - lastLoginTime < LOGIN_EXPIRY_MS)) {
        console.log('✅ Session 有效，跳過登入');
        return true;
    }
    
    console.log('🔐 開始登入 BEAMS...');
    
    try {
        // 訪問用戶指定的正確登入頁面
        const loginUrl = 'https://account.beams.co.jp/mypage/LoginPageEC?startURL=%2Fmypage%2Fsetup%2Fsecur%2FRemoteAccessAuthorizationPage.apexp%3Fsource%3DCAAAAZtfnPhnMDAwMDAwMDAwMDAwMDAwAAABAu2H7D1pv5P8fGJC_sca6Xp6XSBx1LbzIMKOxunF2GbVdW-N1Z9wUAyEdTNVD1cIhvx9P3hd73hFwdVt5D2tZFsriFLsDvCetvu5AM9BA4M21hNGF1izc_COlV5xCKX36Ko93YPw1lUL18nZElOkIAsPwBeFJQ0xvWH7VDinvPkyAZwtK_xBbfneUqns5cDmHsPfV1qaeIyRZgMqR4L2kO4TfLbIjGX4iGcRipS2aJh75Ohk_jyzKdSS6blpuSczVl-kQWIPBw_pOXA3EUzcfjRHN27IxtaHEIKBcR7OIgGsgp_aE1PJajR5xE_2B0RkoTCDRBY6jJ4kvNNh0O3IHVH4aXPiaZNA-TvHmsUxRr6DnN_MhSzGRO5s7E5uoCkISgXRDiwjXZECTsvCtM0t9tC2bw53VBt4IxHZt7viKbZhlVszTfYDMjVZSThY5yuK89C6bK-hJGfodSQSK62OSVf0-OX2AfK2zXy5iJtZ40Pq28Mp_qAMCU9PyTYa8R4P9Ec660oXeWnYA-6TjwVVVyuwB2kmvvfCdASeuXit9bs8I562M5g7V21Q_p7Zf55ac4Hn7VzjcLjqMZuavtW32ivPK28h88LEd1ldCgPHiGxukIqwmFflgcRS7FCx9Bhhg75y1G-urhjid9meCRJcxfFvuy2RPoFJgp_ZAef0DX2tgq9fyRKyZUKzpT6jZXtq2TwSBw_117JviRpgXpZp_rupCLJCmn7Xv_2HOer5sGufgCPEnqrNFajHNNxPsO6HUDlmaIy4qSbWYySajwedMfKjipK_CyAimyPAVLm8dbOQ';
        
        await page.goto(loginUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });
        
        // 如果沒看到輸入框，印出當前網頁標題幫助診斷
        // 注意：ID 包含冒號，需要轉義或是使用 [id="..."]
        const emailSelector = 'input[id="loginPage:loginForm:emailaddr"]';
        const passwordSelector = 'input[id="loginPage:loginForm:login-password"]';
        const submitSelector = 'input[id="loginPage:loginForm:login-submit"]';

        try {
            await page.waitForSelector(emailSelector, { timeout: 15000 });
        } catch (e) {
            const title = await page.title();
            const url = page.url();
            console.error(`❌ 找不到登入欄位 ${emailSelector}。頁面標題: "${title}", 網址: ${url}`);
            throw new Error(`找不到登入欄位。網頁標題: "${title}"。可能網址已失效或需要重新產生 startURL。`);
        }
        
        // 輸入帳號密碼
        await page.type(emailSelector, email, { delay: 100 });
        await page.type(passwordSelector, password, { delay: 100 });
        
        // 點擊登入按鈕
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
            page.click(submitSelector)
        ]);
        
        // 驗證登入成功（檢查是否有會員專屬元素）
        // 增加診斷資訊：印出登入後的頁面標題和網址
        const currentUrl = page.url();
        const pageTitle = await page.title();
        console.log(`📍 登入後頁面標題: "${pageTitle}"`);
        console.log(`📍 登入後網址: ${currentUrl}`);
        
        // 取得頁面部分文字內容用於診斷
        const pageText = await page.evaluate(() => {
            return document.body.innerText.substring(0, 500);
        });
        console.log(`📍 頁面前500字: ${pageText.replace(/\n/g, ' ').substring(0, 200)}...`);
        
        // 先檢查是否為錯誤頁面
        if (currentUrl.includes('chrome-error://') || currentUrl.includes('about:blank') || pageTitle === '') {
            console.error(`❌ 導航失敗，遇到錯誤頁面。網址: ${currentUrl}`);
            throw new Error(`導航失敗，可能被網站封鎖。請確認網路連線或嘗試使用代理伺服器。`);
        }
        
        // 檢查多種可能的成功標記
        const loggedIn = await page.evaluate(() => {
            const text = document.body.innerText;
            return text.includes('ログアウト') || 
                   text.includes('マイページ') ||
                   text.includes('会員') ||
                   text.includes('ようこそ') ||
                   text.includes('お客様');
        });
        
        if (loggedIn) {
            isLoggedIn = true;
            lastLoginTime = now;
            console.log('✅ BEAMS 登入成功！');
            return true;
        } else {
            // 印出更多診斷資訊
            console.error(`❌ 驗證失敗。頁面標題: "${pageTitle}", 網址: ${currentUrl}`);
            throw new Error(`登入驗證失敗。頁面標題: "${pageTitle}"`);
        }
        
    } catch (error) {
        console.error('❌ 登入失敗:', error.message);
        isLoggedIn = false;
        lastLoginTime = null;
        throw error;
    }
}

// ============================================================
// 抓取商品資訊
// ============================================================
async function scrapeProduct(url) {
    console.log(`📦 開始抓取商品: ${url}`);
    
    try {
        // 訪問商品頁面
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // 等待頁面載入
        await page.waitForSelector('.item-detail-container', { timeout: 10000 });
        
        // 抓取商品資訊
        const productInfo = await page.evaluate(() => {
            // 檢查是否有折扣標記
            const saleDiv = document.querySelector('.item-sale .title');
            const hasDiscount = saleDiv && saleDiv.innerText.includes('優待セール対象');
            
            // 抓取原價（before-price）
            const beforePriceDiv = document.querySelector('.before-price');
            let originalPrice = null;
            if (beforePriceDiv) {
                const priceText = beforePriceDiv.innerText;
                const priceMatch = priceText.match(/[\d,]+/);
                if (priceMatch) {
                    originalPrice = parseInt(priceMatch[0].replace(/,/g, ''));
                }
            }
            
            // 如果沒有 before-price，嘗試抓取一般價格
            if (!originalPrice) {
                const priceDiv = document.querySelector('.item-price .price, .item-price-sale .sale-price');
                if (priceDiv) {
                    const priceText = priceDiv.innerText;
                    const priceMatch = priceText.match(/[\d,]+/);
                    if (priceMatch) {
                        originalPrice = parseInt(priceMatch[0].replace(/,/g, ''));
                    }
                }
            }
            
            // 抓取商品名稱
            const titleDiv = document.querySelector('.item-title');
            const productName = titleDiv ? titleDiv.innerText.trim() : '';
            
            // 抓取品牌/類別
            const labelDiv = document.querySelector('.item-label a');
            const category = labelDiv ? labelDiv.innerText.trim() : '';
            
            // 抓取商品 ID
            const hiddenGoodsInput = document.querySelector('#hidden_goods');
            const productId = hiddenGoodsInput ? hiddenGoodsInput.value : '';
            
            return {
                productId,
                productName,
                category,
                hasDiscount,
                originalPrice
            };
        });
        
        console.log(`✅ 商品抓取完成:`, productInfo);
        return productInfo;
        
    } catch (error) {
        console.error('❌ 商品抓取失敗:', error.message);
        throw error;
    }
}

// ============================================================
// 主要 Cloud Function 入口
// ============================================================
functions.http('scrapeBeamsProduct', async (req, res) => {
    // 設定 CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    
    const startTime = Date.now();
    
    try {
        // 取得商品 URL
        const url = req.body.url || req.query.url;
        
        if (!url) {
            res.status(400).json({
                success: false,
                error: '缺少 url 參數'
            });
            return;
        }
        
        // 驗證 URL 格式
        if (!url.includes('beams.co.jp/item/')) {
            res.status(400).json({
                success: false,
                error: '無效的 BEAMS 商品 URL'
            });
            return;
        }
        
        // 初始化瀏覽器
        await initBrowser();
        
        // 登入（如果需要）
        await loginToBeams();
        
        // 抓取商品資訊
        const productInfo = await scrapeProduct(url);
        
        const elapsedTime = Date.now() - startTime;
        console.log(`⏱️ 總耗時: ${elapsedTime}ms`);
        
        // 返回結果
        res.json({
            success: true,
            ...productInfo,
            url,
            scrapedAt: new Date().toISOString(),
            elapsedMs: elapsedTime
        });
        
    } catch (error) {
        console.error('🚨 錯誤:', error);
        
        res.status(500).json({
            success: false,
            error: error.message,
            scrapedAt: new Date().toISOString()
        });
    }
});

// ============================================================
// 健康檢查端點
// ============================================================
functions.http('health', (req, res) => {
    res.json({
        status: 'ok',
        isLoggedIn,
        lastLoginTime: lastLoginTime ? new Date(lastLoginTime).toISOString() : null,
        browserActive: !!browser
    });
});
