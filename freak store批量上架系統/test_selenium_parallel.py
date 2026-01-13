#!/usr/bin/env python3
"""
測試：使用 Selenium 並行下載圖片
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from selenium_fetcher import fetch_html_and_download_images

def test_selenium_parallel_download():
    test_url = "https://www.daytona-park.com/item/3232375300006?color=33"
    product_name = "測試商品_並行下載"
    save_folder = "images/selenium_parallel_test"
    
    print("=" * 60)
    print("🧪 測試：Selenium 並行下載圖片")
    print("=" * 60)
    print(f"📍 測試網址: {test_url}")
    print(f"📁 儲存位置: {save_folder}")
    print()
    
    result = fetch_html_and_download_images(
        url=test_url,
        image_save_folder=save_folder,
        product_name=product_name
    )
    
    if result:
        download_result = result['download_result']
        
        print()
        print("=" * 60)
        print("📊 測試結果")
        print("=" * 60)
        print(f"✅ 成功下載: {download_result['success_count']} 張")
        print(f"❌ 失敗: {download_result['failed_count']} 張")
        print(f"📁 儲存位置: {save_folder}")
        
        if download_result['success_count'] > 0:
            print()
            print("🎉 測試成功！Selenium 並行下載方法有效！")
            return True
        else:
            print()
            print("❌ 測試失敗，沒有成功下載任何圖片")
            return False
    else:
        print("❌ 測試失敗，無法獲取結果")
        return False

if __name__ == "__main__":
    success = test_selenium_parallel_download()
    sys.exit(0 if success else 1)
