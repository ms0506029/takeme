#!/usr/bin/env python3
"""測試圖片下載修復"""

import sys
import os

# 設定路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from selenium_fetcher import fetch_html_from_url
from html_parser import parse_html_to_data
from api_direct_processor import APIDirectProcessor

def test_image_download():
    test_url = "https://www.daytona-park.com/item/3232375300006?color=33"
    
    print("=" * 60)
    print("🧪 開始測試圖片下載修復")
    print("=" * 60)
    print(f"📍 測試網址: {test_url}")
    print()
    
    # Step 1: 獲取HTML和cookies
    print("📥 Step 1: 獲取網頁內容和cookies...")
    result = fetch_html_from_url(test_url)
    
    if isinstance(result, tuple):
        html, cookies = result
        print(f"✅ 成功獲取HTML ({len(html):,} 字符)")
        print(f"🍪 成功獲取 {len(cookies)} 個cookies")
        for name in list(cookies.keys())[:5]:
            print(f"   - {name}")
        if len(cookies) > 5:
            print(f"   ... 還有 {len(cookies) - 5} 個")
    else:
        html = result
        cookies = {}
        print(f"⚠️ 舊版返回格式，無cookies")
    
    if not html:
        print("❌ 無法獲取網頁內容")
        return False
    
    print()
    
    # Step 2: 解析商品數據
    print("🔍 Step 2: 解析商品數據...")
    parsed_data = parse_html_to_data(html)
    
    if not parsed_data:
        print("❌ 無法解析商品數據")
        return False
    
    print(f"✅ 商品名稱: {parsed_data.get('name', 'N/A')}")
    print(f"✅ 品牌: {parsed_data.get('brand', 'N/A')}")
    
    images = parsed_data.get("images", [])
    print(f"✅ 找到 {len(images)} 張圖片")
    
    if images:
        print("   前3張圖片URL:")
        for i, url in enumerate(images[:3]):
            print(f"   {i+1}. {url[:80]}...")
    
    print()
    
    # Step 3: 測試下載（只下載前5張）
    print("📸 Step 3: 測試下載圖片（前5張）...")
    
    api_processor = APIDirectProcessor()
    test_images = images[:5]
    
    result = api_processor.download_images_to_custom_folder(
        test_images, 
        "測試商品_" + parsed_data.get('name', 'test')[:20],
        cookies
    )
    
    print()
    print("=" * 60)
    print("📊 測試結果")
    print("=" * 60)
    print(f"✅ 成功下載: {result['downloaded_count']} 張")
    print(f"❌ 失敗: {result['failed_count']} 張")
    print(f"📁 儲存位置: {result['folder_path']}")
    
    if result['errors']:
        print("⚠️ 錯誤:")
        for error in result['errors']:
            print(f"   - {error}")
    
    print()
    
    if result['downloaded_count'] > 0:
        print("🎉 測試成功！圖片下載修復有效！")
        return True
    else:
        print("❌ 測試失敗，圖片下載仍有問題")
        return False

if __name__ == "__main__":
    success = test_image_download()
    sys.exit(0 if success else 1)
