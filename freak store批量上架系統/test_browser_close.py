from selenium import webdriver
from selenium.webdriver.firefox.options import Options
import time
import os
import sys

# 添加模組路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from html_parser import parse_html_to_data
from api_direct_processor import APIDirectProcessor

def fetch_html_and_close(url):
    """模擬抓取後立即關閉視窗的行為"""
    print(f"🧭 [測試] 啟動瀏覽器抓取: {url}")
    
    options = Options()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    # 設置偏好
    options.set_preference("dom.webdriver.enabled", False)
    options.set_preference("useAutomationExtension", False)
    
    driver = webdriver.Firefox(options=options)
    
    try:
        # 隱藏webdriver特徵
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        driver.get(url)
        time.sleep(5) # 等待載入
        
        html = driver.page_source
        print(f"✅ 成功獲取 HTML ({len(html)} 字符)")
        return html
        
    except Exception as e:
        print(f"❌ 抓取失敗: {e}")
        return None
        
    finally:
        print("🔒 [測試] 正在關閉瀏覽器視窗 (driver.quit)...")
        driver.quit()
        print("✅ 瀏覽器已關閉")

def run_test():
    urls = [
        "https://www.daytona-park.com/item/3232375300006?color=33",
        "https://www.daytona-park.com/item/3222375300012?color=03"
    ]
    
    processor = APIDirectProcessor()
    
    print("="*60)
    print("🧪 測試：抓取後立即關閉視窗是否影響 HTTP/2 圖片下載")
    print("="*60)
    
    for i, url in enumerate(urls):
        print(f"\n📍 測試商品 {i+1}: {url}")
        
        # 1. 抓取並關閉
        html = fetch_html_and_close(url)
        if not html:
            print("❌ 跳過測試 (HTML獲取失敗)")
            continue
            
        # 2. 解析
        data = parse_html_to_data(html)
        images = data.get("images", [])
        valid_images = [img for img in images if '.jpg' in img or '.png' in img or '.webp' in img]
        
        print(f"🔍 解析到 {len(valid_images)} 張圖片")
        
        # 3. 下載圖片 (限制5張)
        test_images = valid_images[:5]
        folder_name = f"test_close_window_{i+1}"
        
        print(f"📸 嘗試下載 5 張圖片 (此時瀏覽器已關閉)...")
        result = processor.download_images_to_custom_folder(test_images, folder_name, referer=url)
        
        if result['downloaded_count'] > 0:
            print(f"🎉 成功下載 {result['downloaded_count']} 張圖片！")
        else:
            print(f"❌ 下載失敗")

if __name__ == "__main__":
    run_test()
