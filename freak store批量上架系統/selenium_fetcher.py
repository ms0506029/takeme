from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import random
import os
import base64

def fetch_html_from_url(url, save_path="page_source.html", wait_seconds=15):
    print("🧭 開始載入頁面：", url)

    # 設定 Firefox 選項
    options = Options()
    #options.add_argument("--headless")  # 如果需要看到瀏覽器，註釋這行
    
    # 反反爬蟲設定
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--window-size=1920,1080")
    
    # 模擬真實瀏覽器
    options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    # 禁用一些可能干擾的功能
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-plugins")
    options.add_argument("--disable-images")  # 加快載入速度
    
    # 設定偏好
    options.set_preference("dom.webdriver.enabled", False)
    options.set_preference("useAutomationExtension", False)
    options.set_preference("javascript.enabled", True)

    driver = None
    
    try:
        # 初始化 WebDriver
        print("🔧 初始化 Firefox WebDriver...")
        driver = webdriver.Firefox(options=options)
        
        # 隱藏webdriver特徵
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        # 設定超時
        driver.set_page_load_timeout(45)
        driver.implicitly_wait(15)
        
        # 直接訪問目標頁面
        print(f"🎯 直接訪問目標頁面: {url}")
        driver.get(url)
        
        # 等待基本載入
        time.sleep(5)
        
        # 檢查是否被重定向
        current_url = driver.current_url
        print(f"📍 當前URL: {current_url}")
        
        if "daytona-park.com" not in current_url:
            print("⚠️ 頁面被重定向，可能遇到反爬蟲機制")
            
        # 處理Cookie同意
        try:
            print("🍪 尋找並點擊Cookie同意按鈕...")
            
            # 多種可能的Cookie按鈕選擇器
            cookie_selectors = [
                "#consentButton",
                ".consent-button",
                "[data-consent]",
                "button[class*='consent']",
                "button[class*='cookie']",
                "button[class*='agree']"
            ]
            
            for selector in cookie_selectors:
                try:
                    consent_button = WebDriverWait(driver, 3).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                    )
                    driver.execute_script("arguments[0].click();", consent_button)
                    print(f"✅ Cookie按鈕點擊成功: {selector}")
                    time.sleep(2)
                    break
                except:
                    continue
                    
        except:
            print("🍪 未找到Cookie按鈕，繼續...")

        # 等待頁面完全載入
        print("⏳ 等待頁面完全載入...")
        
        # 使用多種方式等待
        try:
            WebDriverWait(driver, 20).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
            print("✅ 頁面readyState完成")
        except:
            print("⚠️ 頁面readyState等待超時")
        
        # 額外等待動態內容
        time.sleep(8)
        
        # 尋找商品內容
        print("🔍 尋找商品內容...")
        product_found = False
        
        # 多種商品名稱選擇器
        name_selectors = [
            ".block-goods-name",
            ".goods-name",
            ".product-name",
            ".item-name",
            ".product-title",
            "h1",
            ".title"
        ]
        
        for selector in name_selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                for element in elements:
                    text = element.text.strip()
                    if text and len(text) > 5:  # 有意義的文字
                        print(f"✅ 找到商品名稱 ({selector}): {text[:50]}...")
                        product_found = True
                        break
                if product_found:
                    break
            except:
                continue
        
        if not product_found:
            print("⚠️ 未找到明確的商品名稱，檢查其他內容...")
            
            # 檢查頁面標題
            try:
                title = driver.title
                print(f"📄 頁面標題: {title}")
                if title and "daytona" in title.lower():
                    print("✅ 標題包含daytona，可能是正確頁面")
            except:
                pass
                
            # 檢查是否有價格信息
            price_selectors = [".price", ".cost", ".yen", "[class*='price']", "[class*='cost']"]
            for selector in price_selectors:
                try:
                    price_elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    if price_elements:
                        print(f"💰 找到價格元素: {len(price_elements)}個")
                        break
                except:
                    continue

        # 智能滾動載入更多內容
        print("📜 滾動頁面載入完整內容...")
        try:
            # 模擬人類滾動行為
            scroll_pause_time = 2
            screen_height = driver.execute_script("return window.screen.height;")
            
            i = 1
            while True:
                # 滾動一個螢幕高度
                driver.execute_script(f"window.scrollTo(0, {screen_height}*{i});")
                i += 1
                time.sleep(scroll_pause_time)
                
                # 檢查是否到達底部
                scroll_height = driver.execute_script("return document.body.scrollHeight;")
                if (screen_height) * i > scroll_height:
                    break
                    
                # 最多滾動5次
                if i > 5:
                    break
            
            # 滾回頂部
            driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(3)
            
        except Exception as scroll_error:
            print(f"⚠️ 滾動失敗: {scroll_error}")

        # 獲取最終HTML
        page_source = driver.page_source
        
        if not page_source:
            raise Exception("無法獲取頁面HTML內容")
        
        print(f"📄 頁面內容長度: {len(page_source):,} 字符")
        
        # 內容質量檢查
        quality_indicators = {
            'daytona': 'daytona' in page_source.lower(),
            'product/item': any(word in page_source.lower() for word in ['product', 'item', 'goods']),
            'price/cost': any(word in page_source.lower() for word in ['price', 'cost', 'yen', '円']),
            'size': any(word in page_source.lower() for word in ['size', 'サイズ', 'cm']),
            'image': 'img' in page_source.lower()
        }
        
        quality_score = sum(quality_indicators.values())
        print(f"📊 內容質量評分: {quality_score}/5")
        
        for indicator, found in quality_indicators.items():
            status = "✅" if found else "❌"
            print(f"   {status} {indicator}")
        
        if quality_score < 2:
            print("⚠️ 內容質量較低，可能爬取不完整")
        
        # 儲存HTML
        with open(save_path, "w", encoding="utf-8") as f:
            f.write(page_source)
        print(f"💾 HTML已儲存至: {save_path}")
        
        return page_source

    except Exception as e:
        print(f"❌ 爬取過程發生錯誤: {e}")
        
        # 錯誤時也嘗試獲取部分內容
        try:
            if driver:
                error_html = driver.page_source
                if error_html and len(error_html) > 1000:
                    error_path = f"error_{save_path}"
                    with open(error_path, "w", encoding="utf-8") as f:
                        f.write(error_html)
                    print(f"💾 錯誤時的HTML已儲存至: {error_path}")
                    return error_html
        except:
            pass
            
        return None

    finally:
        if driver:
            try:
                driver.quit()
                print("🛑 頁面抓取完成，已自動關閉瀏覽器視窗 (driver.quit)")
            except:
                pass

def download_images_via_selenium(driver, image_urls, save_folder, product_name, batch_size=10):
    """使用 Selenium session 並行下載圖片
    
    Args:
        driver: Selenium WebDriver 實例
        image_urls: 圖片 URL 列表
        save_folder: 儲存資料夾
        product_name: 商品名稱（用於檔名）
        batch_size: 每批次並行下載數量
    """
    import base64
    import time
    
    print(f"📸 開始使用瀏覽器並行下載 {len(image_urls)} 張圖片...")
    print(f"   批次大小: {batch_size} 張/批")
    
    os.makedirs(save_folder, exist_ok=True)
    
    success_count = 0
    failed_count = 0
    
    # 分批處理
    for batch_start in range(0, len(image_urls), batch_size):
        batch_urls = image_urls[batch_start:batch_start + batch_size]
        batch_num = (batch_start // batch_size) + 1
        total_batches = (len(image_urls) + batch_size - 1) // batch_size
        
        print(f"🔄 處理第 {batch_num}/{total_batches} 批 ({len(batch_urls)} 張)...")
        
        # 構建 JavaScript 使用 img + canvas 下載腳本（避免 CORS）
        js_script = """
        const urls = arguments[0];
        const callback = arguments[arguments.length - 1];
        
        // 創建臨時容器
        const container = document.createElement('div');
        container.style.display = 'none';
        document.body.appendChild(container);
        
        Promise.all(
            urls.map((url, index) => new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';  // 嘗試啟用 CORS
                
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                        resolve({
                            index: index,
                            data: dataUrl.split(',')[1],
                            success: true
                        });
                    } catch (err) {
                        resolve({
                            index: index,
                            data: null,
                            success: false,
                            error: 'Canvas error: ' + err.toString()
                        });
                    }
                };
                
                img.onerror = (err) => {
                    resolve({
                        index: index,
                        data: null,
                        success: false,
                        error: 'Image load error'
                    });
                };
                
                img.src = url;
                container.appendChild(img);
            }))
        ).then(results => {
            document.body.removeChild(container);
            callback(results);
        });
        """
        
        try:
            # 執行並行下載
            results = driver.execute_async_script(js_script, batch_urls)
            
            # 儲存結果
            for result in results:
                global_index = batch_start + result['index']
                
                if result['success'] and result['data']:
                    try:
                        image_data = base64.b64decode(result['data'])
                        
                        # 從 URL 取得副檔名
                        ext = os.path.splitext(batch_urls[result['index']])[1].split('?')[0] or '.jpg'
                        filename = os.path.join(save_folder, f"{product_name}_{global_index + 1}{ext}")
                        
                        with open(filename, 'wb') as f:
                            f.write(image_data)
                        
                        success_count += 1
                        print(f"   ✅ 第 {global_index + 1} 張下載成功")
                    except Exception as e:
                        failed_count += 1
                        print(f"   ❌ 第 {global_index + 1} 張儲存失敗: {e}")
                else:
                    failed_count += 1
                    error_msg = result.get('error', '未知錯誤')
                    print(f"   ❌ 第 {global_index + 1} 張下載失敗: {error_msg}")
            
            # 批次間稍微延遲
            if batch_start + batch_size < len(image_urls):
                time.sleep(1)
                
        except Exception as e:
            print(f"   ❌ 批次 {batch_num} 執行失敗: {e}")
            failed_count += len(batch_urls)
    
    print(f"📊 下載完成: 成功 {success_count} 張, 失敗 {failed_count} 張")
    
    return {
        'success_count': success_count,
        'failed_count': failed_count,
        'total': len(image_urls)
    }

def fetch_html_and_download_images(url, image_save_folder, product_name, save_path="page_source.html", wait_seconds=15):
    """整合版：爬取 HTML 並下載圖片（不關閉瀏覽器直到完成）"""
    print("🧭 開始載入頁面並下載圖片：", url)
    
    # 設定 Firefox 選項
    options = Options()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    options.set_preference("dom.webdriver.enabled", False)
    options.set_preference("useAutomationExtension", False)
    options.set_preference("javascript.enabled", True)
    
    driver = None
    
    try:
        print("🔧 初始化 Firefox WebDriver...")
        driver = webdriver.Firefox(options=options)
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        driver.set_page_load_timeout(45)
        driver.set_script_timeout(300)  # 增加腳本超時時間以支援大量圖片下載
        driver.implicitly_wait(15)
        
        print(f"🎯 直接訪問目標頁面: {url}")
        driver.get(url)
        time.sleep(5)
        
        # 處理 Cookie 同意
        try:
            print("🍪 尋找並點擊Cookie同意按鈕...")
            cookie_selectors = ["#consentButton", ".consent-button", "[data-consent]"]
            for selector in cookie_selectors:
                try:
                    consent_button = WebDriverWait(driver, 3).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                    )
                    driver.execute_script("arguments[0].click();", consent_button)
                    print(f"✅ Cookie按鈕點擊成功: {selector}")
                    time.sleep(2)
                    break
                except:
                    continue
        except:
            print("🍪 未找到Cookie按鈕，繼續...")
        
        # 等待頁面完全載入
        print("⏳ 等待頁面完全載入...")
        WebDriverWait(driver, 20).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
        time.sleep(5)
        
        # 獲取 HTML
        page_source = driver.page_source
        print(f"📄 頁面內容長度: {len(page_source):,} 字符")
        
        # 儲存 HTML
        with open(save_path, "w", encoding="utf-8") as f:
            f.write(page_source)
        print(f"💾 HTML已儲存至: {save_path}")
        
        # 解析圖片 URL
        from html_parser import parse_html_to_data
        parsed_data = parse_html_to_data(page_source)
        image_urls = parsed_data.get("images", [])
        
        print(f"🖼️  找到 {len(image_urls)} 張圖片")
        
        # 使用 Selenium 下載圖片
        if image_urls:
            download_result = download_images_via_selenium(
                driver, 
                image_urls[:150],  # 限制最多 150 張
                image_save_folder,
                product_name,
                batch_size=10
            )
            
            return {
                'html': page_source,
                'parsed_data': parsed_data,
                'download_result': download_result
            }
        else:
            return {
                'html': page_source,
                'parsed_data': parsed_data,
                'download_result': {'success_count': 0, 'failed_count': 0, 'total': 0}
            }
        
    except Exception as e:
        print(f"❌ 錯誤: {e}")
        import traceback
        traceback.print_exc()
        return None

    finally:
        if driver:
            try:
                driver.quit()
                print("🛑 WebDriver已關閉")
            except:
                pass

# 測試函數
def test_enhanced_crawl():
    """測試增強版爬蟲"""
    test_url = "https://www.daytona-park.com/item/1162211500066"
    
    print("🧪 測試增強版爬蟲...")
    html = fetch_html_from_url(test_url, "enhanced_test.html")
    
    if html:
        print(f"✅ 爬取成功！HTML長度: {len(html):,}")
        return True
    else:
        print("❌ 爬取失敗！")
        return False

if __name__ == "__main__":
    test_enhanced_crawl()
