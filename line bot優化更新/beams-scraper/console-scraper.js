/**
 * BEAMS 折扣商品抓取腳本 v5.1 (診斷+自動重置版)
 */

(async function() {
    const CONFIG = {
        GAS_WEBHOOK_URL: 'https://script.google.com/macros/s/AKfycbwr2pwPe021Jse1Lv97dQVDkcNZh1Juj7Np7-REz3HsjAcfr44T3pEeCHa7QbnnbYm7_Q/exec',
        STORAGE_KEY: 'beams_scraper_v5_state',
        PAGE_DELAY: 2500 
    };
    
    // 強制清除所有舊 key
    localStorage.removeItem('beams_scraper_state');
    
    function getState() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    }
    
    function saveState(state) {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state));
    }

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    function extractProductId(url) {
        const match = url.match(/\/item\/[^\/]+\/[^\/]+\/(\d+)/);
        return match ? match[1] : null;
    }
    
    function getCurrentPageNumber() {
        const urlParams = new URLSearchParams(window.location.search);
        return parseInt(urlParams.get('p')) || 1;
    }

    function extractProductsFromCurrentPage() {
        const links = document.querySelectorAll('a[href*="/item/"]');
        const products = new Map();
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href || !href.includes('/item/')) return;
            const fullUrl = href.startsWith('http') ? href : `https://www.beams.co.jp${href}`;
            const cleanUrl = fullUrl.split('?')[0];
            const productId = extractProductId(cleanUrl);
            if (productId && !products.has(productId)) {
                products.set(productId, cleanUrl);
            }
        });
        return products;
    }

    async function sendToGAS(urls, isLastBatch = false) {
        if (urls.length === 0 && !isLastBatch) return;
        try {
            await fetch(CONFIG.GAS_WEBHOOK_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addBeamsUrls',
                    mode: 'incremental',
                    urls: urls,
                    pageNumber: getCurrentPageNumber(),
                    isLastBatch: isLastBatch,
                    timestamp: new Date().toISOString()
                })
            });
            console.log(`✅ 已發送 ${urls.length} 個到 GAS`);
        } catch (e) {
            console.error('❌ 發送失敗:', e);
        }
    }

    // 主程式
    const currentPage = getCurrentPageNumber();
    let state = getState();

    // 如果是第一頁，且您想要重頭開始，請取消下面這行的註解
    // if (currentPage === 1) { localStorage.removeItem(CONFIG.STORAGE_KEY); state = null; }

    if (!state) {
        state = { collectedIds: [], totalSent: 0 };
        console.log('🆕 初始化全新狀態');
    }

    console.log(`� 執行第 ${currentPage} 頁...`);
    const pageProducts = extractProductsFromCurrentPage();
    const collectedIdsSet = new Set(state.collectedIds);
    const newUrls = [];

    pageProducts.forEach((url, id) => {
        if (!collectedIdsSet.has(id)) {
            collectedIdsSet.add(id);
            state.collectedIds.push(id);
            newUrls.push(url);
        }
    });

    console.log(`📊 本頁總計商品: ${pageProducts.size}`);
    console.log(`✨ 本頁新增商品: ${newUrls.length}`);
    console.log(`📈 累計唯一商品: ${state.collectedIds.length}`);

    if (newUrls.length > 0) {
        await sendToGAS(newUrls);
    }

    saveState(state);

    // 檢查分頁按鈕獲取下一頁
    const nextBtn = document.querySelector('.pagination .next a, a[href*="?p=' + (currentPage+1) + '"]');
    if (nextBtn && nextBtn.href) {
        console.log(`⏳ 準備至第 ${currentPage+1} 頁...`);
        await delay(CONFIG.PAGE_DELAY);
        window.location.href = nextBtn.href;
    } else {
        console.log('🏁 找不到下一頁，任務結束。');
        await sendToGAS([], true);
    }
})();
