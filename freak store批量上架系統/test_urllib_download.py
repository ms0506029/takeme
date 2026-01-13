#!/usr/bin/env python3
"""
測試：使用 urllib + cookiejar 下載圖片
"""

import sys
import os
import time
import http.cookiejar
import urllib.request
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from html_parser import parse_html_to_data

def test_urllib_download():
    test_url = "https://www.daytona-park.com/item/3232375300006?color=33"
    
    print("=" * 60)
    print("🧪 測試：使用 urllib + cookiejar 下載圖片")
    print("=" * 60)
    print(f"📍 測試網址: {test_url}")
    print()
    
    # 設定 Firefox 選項  
    options = Options()
    options.add_argument("--no-sandbox")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    options.set_preference("dom.webdriver.enabled", False)
    
    driver = None
    
    try:
        print("🔧 初始化 Firefox WebDriver...")
        driver = webdriver.Firefox(options=options)
        driver.set_page_load_timeout(60)
        
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
        
        # 獲取 cookies
        selenium_cookies = driver.get_cookies()
        print(f"🍪 獲取 {len(selenium_cookies)} 個cookies")
        
        # 獲取HTML並解析
        html = driver.page_source
        parsed_data = parse_html_to_data(html)
        
        print(f"✅ 商品名稱: {parsed_data.get('name', 'N/A')}")
        
        images = parsed_data.get("images", [])
        print(f"✅ 找到 {len(images)} 張圖片")
        
        # 過濾掉非圖片URL
        valid_images = [url for url in images if 'video-thumb' not in url and url.startswith('https://images.')]
        print(f"✅ 有效圖片: {len(valid_images)} 張")
        
        # 關閉瀏覽器
        driver.quit()
        driver = None
        print("🛑 WebDriver已關閉")
        
        # 建立 cookiejar
        cookie_jar = http.cookiejar.CookieJar()
        for cookie in selenium_cookies:
            c = http.cookiejar.Cookie(
                version=0,
                name=cookie['name'],
                value=cookie['value'],
                port=None,
                port_specified=False,
                domain=cookie.get('domain', '.daytona-park.com'),
                domain_specified=True,
                domain_initial_dot=cookie.get('domain', '.daytona-park.com').startswith('.'),
                path=cookie.get('path', '/'),
                path_specified=True,
                secure=cookie.get('secure', True),
                expires=cookie.get('expiry'),
                discard=False,
                comment=None,
                comment_url=None,
                rest={},
                rfc2109=False
            )
            cookie_jar.set_cookie(c)
        
        print(f"🍪 建立 CookieJar 完成，包含 {len(cookie_jar)} 個cookies")
        
        # 建立 opener
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
        
        # 設置 headers
        opener.addheaders = [
            ('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'),
            ('Accept', 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'),
            ('Accept-Language', 'ja,en-US;q=0.9,en;q=0.8'),
            ('Accept-Encoding', 'gzip, deflate, br'),
            ('Referer', 'https://www.daytona-park.com/'),
            ('Connection', 'keep-alive'),
            ('Sec-Fetch-Dest', 'image'),
            ('Sec-Fetch-Mode', 'no-cors'),
            ('Sec-Fetch-Site', 'same-site'),
        ]
        
        # 測試下載前5張圖片
        test_images = valid_images[:5]
        success_count = 0
        fail_count = 0
        
        output_folder = "images/urllib_test"
        os.makedirs(output_folder, exist_ok=True)
        
        print()
        print("📸 開始下載圖片...")
        
        for i, img_url in enumerate(test_images):
            print(f"   下載第 {i+1} 張: {img_url[:60]}...")
            
            ext = os.path.splitext(img_url)[1].split("?")[0] or '.jpg'
            save_path = os.path.join(output_folder, f"image_{i+1}{ext}")
            
            try:
                response = opener.open(img_url, timeout=60)
                image_data = response.read()
                
                if len(image_data) > 1000:  # 確保不是錯誤頁面
                    with open(save_path, 'wb') as f:
                        f.write(image_data)
                    file_size = len(image_data)
                    print(f"   ✅ 成功: {save_path} ({file_size:,} bytes)")
                    success_count += 1
                else:
                    print(f"   ❌ 失敗: 資料太小 ({len(image_data)} bytes)")
                    fail_count += 1
                    
            except Exception as e:
                print(f"   ❌ 失敗: {e}")
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
            print("🎉 測試成功！urllib 方法有效！")
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
    success = test_urllib_download()
    sys.exit(0 if success else 1)
