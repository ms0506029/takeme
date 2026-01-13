#!/usr/bin/env python3
"""
測試：使用 httpx with HTTP/2 下載圖片
"""

import httpx
import os
import sys

def test_httpx_download():
    test_url = "https://images.daytona-park.com/items/original/3232375300006/3232375300006-_16.jpg"
    referer = "https://www.daytona-park.com/item/3232375300006?color=33"
    
    print("=" * 60)
    print("🧪 測試：使用 httpx 下載圖片")
    print("=" * 60)
    print(f"📍 圖片 URL: {test_url}")
    print()
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": referer,
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "image",
        "sec-fetch-mode": "no-cors",
        "sec-fetch-site": "same-site",
    }
    
    # 測試 HTTP/2
    print("🔄 嘗試 HTTP/2...")
    try:
        with httpx.Client(http2=True, timeout=60.0) as client:
            response = client.get(test_url, headers=headers)
            print(f"   狀態碼: {response.status_code}")
            print(f"   HTTP 版本: {response.http_version}")
            if response.status_code == 200:
                with open("/tmp/httpx_test.jpg", "wb") as f:
                    f.write(response.content)
                print(f"   ✅ 成功！檔案大小: {len(response.content):,} bytes")
                return True
    except Exception as e:
        print(f"   ❌ HTTP/2 失敗: {e}")
    
    # 測試 HTTP/1.1
    print()
    print("🔄 嘗試 HTTP/1.1...")
    try:
        with httpx.Client(http2=False, timeout=60.0) as client:
            response = client.get(test_url, headers=headers)
            print(f"   狀態碼: {response.status_code}")
            if response.status_code == 200:
                with open("/tmp/httpx_test.jpg", "wb") as f:
                    f.write(response.content)
                print(f"   ✅ 成功！檔案大小: {len(response.content):,} bytes")
                return True
    except Exception as e:
        print(f"   ❌ HTTP/1.1 失敗: {e}")
    
    return False

if __name__ == "__main__":
    success = test_httpx_download()
    sys.exit(0 if success else 1)
