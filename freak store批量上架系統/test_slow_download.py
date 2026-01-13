#!/usr/bin/env python3
"""
測試：單線程慢速下載（帶 Referer）
基於用戶觀察：圖片無需 Cookie，可能是請求太快被擋
"""

import sys
import os
import time
import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from selenium_fetcher import fetch_html_from_url
from html_parser import parse_html_to_data

def download_image_slow(url, save_path, referer, timeout=60):
    """單次下載，帶完整 headers"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": referer,
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "cross-site"
    }
    
    try:
        print(f"   嘗試下載: {url[:70]}...")
        response = requests.get(url, headers=headers, timeout=timeout)
        
        if response.status_code == 200:
            # 確認是圖片內容（不是錯誤頁面）
            content_type = response.headers.get('Content-Type', '')
            if 'image' in content_type or len(response.content) > 5000:
                os.makedirs(os.path.dirname(save_path), exist_ok=True)
                with open(save_path, "wb") as f:
                    f.write(response.content)
                print(f"   ✅ 成功！檔案大小: {len(response.content):,} bytes")
                return True
            else:
                print(f"   ❌ 回應不是圖片: {content_type}")
                return False
        else:
            print(f"   ❌ HTTP {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"   ❌ 超時")
        return False
    except Exception as e:
        print(f"   ❌ 錯誤: {e}")
        return False

def test_slow_download():
    test_url = "https://www.daytona-park.com/item/3232375300006?color=33"
    
    print("=" * 60)
    print("🧪 測試：單線程慢速下載")
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
    
    # 過濾掉非圖片 URL
    valid_images = [url for url in images if url.startswith('https://images.') and '.jpg' in url]
    print(f"✅ 找到 {len(valid_images)} 張有效圖片")
    
    if not valid_images:
        print("❌ 沒有找到有效圖片")
        return False
    
    # Step 3: 慢速下載（只測試前 5 張）
    print()
    print("📸 Step 3: 開始慢速下載（前 5 張，每張間隔 3 秒）...")
    
    save_folder = "images/slow_test"
    os.makedirs(save_folder, exist_ok=True)
    
    success_count = 0
    fail_count = 0
    
    for i, img_url in enumerate(valid_images[:5]):
        print(f"\n🔄 下載第 {i+1}/5 張...")
        
        ext = os.path.splitext(img_url)[1].split('?')[0] or '.jpg'
        save_path = os.path.join(save_folder, f"image_{i+1}{ext}")
        
        if download_image_slow(img_url, save_path, referer=test_url):
            success_count += 1
        else:
            fail_count += 1
        
        # 等待 3 秒再下載下一張
        if i < 4:
            print("   ⏳ 等待 3 秒...")
            time.sleep(3)
    
    # 結果
    print()
    print("=" * 60)
    print("📊 測試結果")
    print("=" * 60)
    print(f"✅ 成功: {success_count} 張")
    print(f"❌ 失敗: {fail_count} 張")
    print(f"📁 儲存位置: {save_folder}")
    
    if success_count > 0:
        # 顯示下載的檔案
        print()
        print("📄 已下載的檔案:")
        for f in os.listdir(save_folder):
            fpath = os.path.join(save_folder, f)
            size = os.path.getsize(fpath)
            print(f"   - {f} ({size:,} bytes)")
        print()
        print("🎉 測試成功！慢速下載方法有效！")
        return True
    else:
        print()
        print("❌ 測試失敗")
        return False

if __name__ == "__main__":
    success = test_slow_download()
    sys.exit(0 if success else 1)
