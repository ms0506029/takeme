#!/usr/bin/env python3
"""
測試：使用瀏覽器直接下載圖片
這個方法使用 Selenium 執行 JavaScript 來下載圖片，
完全模擬瀏覽器行為，避免被伺服器阻擋
"""

import sys
import os
import time
import base64
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from html_parser import parse_html_to_data

def download_image_via_browser(driver, image_url, save_path, timeout=30):
    """使用瀏覽器下載單張圖片"""
    try:
        # 使用 JavaScript fetch API 下載圖片
        js_code = f"""
        return new Promise((resolve, reject) => {{
            fetch('{image_url}')
                .then(response => response.blob())
                .then(blob => {{
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => reject('Failed to read blob');
                    reader.readAsDataURL(blob);
                }})
                .catch(err => reject(err.toString()));
        }});
        """
        
        # 執行並等待結果
        result = driver.execute_async_script(f"""
            var callback = arguments[arguments.length - 1];
            {js_code}.then(data => callback({{success: true, data: data}}))
                     .catch(err => callback({{success: false, error: err}}));
        """)
        
        if result and result.get('success') and result.get('data'):
            # 解碼 base64 數據
            data_url = result['data']
            if ',' in data_url:
                base64_data = data_url.split(',')[1]
                image_data = base64.b64decode(base64_data)
                
                # 儲存圖片
                os.makedirs(os.path.dirname(save_path), exist_ok=True)
                with open(save_path, 'wb') as f:
                    f.write(image_data)
                return True
        
        return False
        
    except Exception as e:
        print(f"❌ 下載失敗: {e}")
        return False

def test_browser_download():
    test_url = "https://www.daytona-park.com/item/3232375300006?color=33"
    
    print("=" * 60)
    print("🧪 測試：使用瀏覽器直接下載圖片")
    print("=" * 60)
    print(f"📍 測試網址: {test_url}")
    print()
    
    # 設定 Firefox 選項
    options = Options()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    options.set_preference("dom.webdriver.enabled", False)
    options.set_preference("useAutomationExtension", False)
    
    driver = None
    
    try:
        print("🔧 初始化 Firefox WebDriver...")
        driver = webdriver.Firefox(options=options)
        driver.set_page_load_timeout(60)
        driver.set_script_timeout(60)
        
        # 載入頁面
        print(f"🎯 載入頁面: {test_url}")
        driver.get(test_url)
        time.sleep(5)
        
        # 處理 Cookie 同意
        try:
            consent_button = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "#consentButton"))
            )
            driver.execute_script("arguments[0].click();", consent_button)
            print("✅ Cookie按鈕點擊成功")
            time.sleep(2)
        except:
            print("🍪 未找到Cookie按鈕")
        
        # 等待頁面完全載入
        WebDriverWait(driver, 20).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
        time.sleep(5)
        
        # 獲取HTML並解析
        html = driver.page_source
        parsed_data = parse_html_to_data(html)
        
        print(f"✅ 商品名稱: {parsed_data.get('name', 'N/A')}")
        
        images = parsed_data.get("images", [])
        print(f"✅ 找到 {len(images)} 張圖片")
        
        # 測試下載前5張圖片
        test_images = images[:5]
        success_count = 0
        fail_count = 0
        
        output_folder = "images/browser_test"
        os.makedirs(output_folder, exist_ok=True)
        
        print()
        print("📸 開始下載圖片...")
        
        for i, img_url in enumerate(test_images):
            print(f"   下載第 {i+1} 張: {img_url[:60]}...")
            
            ext = os.path.splitext(img_url)[1].split("?")[0] or '.jpg'
            save_path = os.path.join(output_folder, f"image_{i+1}{ext}")
            
            if download_image_via_browser(driver, img_url, save_path):
                print(f"   ✅ 成功: {save_path}")
                success_count += 1
            else:
                print(f"   ❌ 失敗")
                fail_count += 1
        
        print()
        print("=" * 60)
        print("📊 測試結果")
        print("=" * 60)
        print(f"✅ 成功下載: {success_count} 張")
        print(f"❌ 失敗: {fail_count} 張")
        print(f"📁 儲存位置: {output_folder}")
        
        if success_count > 0:
            print()
            print("🎉 測試成功！瀏覽器下載方法有效！")
            return True
        else:
            print()
            print("❌ 測試失敗")
            return False
            
    except Exception as e:
        print(f"❌ 錯誤: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        if driver:
            driver.quit()
            print("🛑 WebDriver已關閉")

if __name__ == "__main__":
    success = test_browser_download()
    sys.exit(0 if success else 1)
