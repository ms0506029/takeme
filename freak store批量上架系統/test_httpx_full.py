#!/usr/bin/env python3
"""
完整測試：使用新的 httpx HTTP/2 圖片下載
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from selenium_fetcher import fetch_html_from_url
from html_parser import parse_html_to_data
from api_direct_processor import APIDirectProcessor

def test_full_download():
    test_url = "https://www.daytona-park.com/item/3232375300006?color=33"
    
    print("=" * 60)
    print("🧪 完整測試：httpx HTTP/2 圖片下載")
    print("=" * 60)
    print(f"📍 商品網址: {test_url}")
    print()
    
    # Step 1: 獲取 HTML
    print("📥 Step 1: 獲取網頁內容...")
    html = fetch_html_from_url(test_url)
    
    if not html:
        print("❌ 無法獲取網頁內容")
        return False
    
    print(f"✅ 獲取成功 ({len(html):,} 字符)")
    
    # Step 2: 解析圖片 URL
    print()
    print("🔍 Step 2: 解析圖片 URL...")
    parsed_data = parse_html_to_data(html)
    images = parsed_data.get("images", [])
    
    # 過濾有效圖片
    valid_images = [url for url in images if '.jpg' in url or '.png' in url or '.webp' in url]
    print(f"✅ 找到 {len(valid_images)} 張有效圖片")
    
    # Step 3: 使用 APIDirectProcessor 下載（前 10 張）
    print()
    print("📸 Step 3: 使用 httpx HTTP/2 下載圖片（前 10 張）...")
    
    api = APIDirectProcessor()
    result = api.download_images_to_custom_folder(
        valid_images[:10],
        "httpx_test_商品",
        referer=test_url
    )
    
    # 結果
    print()
    print("=" * 60)
    print("📊 測試結果")
    print("=" * 60)
    print(f"✅ 成功: {result['downloaded_count']} 張")
    print(f"❌ 失敗: {result['failed_count']} 張")
    print(f"📁 儲存位置: {result['folder_path']}")
    
    if result['downloaded_count'] > 0:
        # 顯示下載的檔案
        folder = result['folder_path']
        if os.path.exists(folder):
            print()
            print("📄 已下載的檔案:")
            for f in sorted(os.listdir(folder)):
                fpath = os.path.join(folder, f)
                size = os.path.getsize(fpath)
                print(f"   - {f} ({size:,} bytes)")
        
        print()
        print("🎉 測試成功！httpx HTTP/2 下載方法有效！")
        return True
    else:
        print()
        print("❌ 測試失敗，沒有成功下載任何圖片")
        return False

if __name__ == "__main__":
    success = test_full_download()
    sys.exit(0 if success else 1)
