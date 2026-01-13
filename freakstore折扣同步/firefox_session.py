# firefox_session.py - 修正版 (實際使用 Chrome)
import undetected_chromedriver as uc
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time
import logging
import os
import tempfile
import hashlib

# 全域變數
_driver = None

# ===== 統一的顏色處理邏輯（以建檔系統為準） =====
COLOR_MAP = {
    "ブラック": "BLK", "ホワイト": "WHT", "グレー": "GRY", "チャコール": "CHC", "チャコールグレー": "GRY",
    "ネイビー": "NVY", "ブルー": "BLU", "ライトブルー": "LBL", "ベージュ": "BEI",
    "ブラウン": "BRN", "カーキ": "KHA", "オリーブ": "OLV", "グリーン": "GRN",
    "ダークグリーン": "DGN", "イエロー": "YEL", "マスタード": "MUS", "オレンジ": "ORG",
    "レッド": "RED", "ピンク": "PNK", "パープル": "PUR", "ワイン": "WIN",
    "アイボリー": "IVY", "シルバー": "SLV", "ゴールド": "GLD", "ミント": "MNT",
    "サックス": "SAX", "モカ": "MOC", "テラコッタ": "TER", "ラベンダー": "LAV",
    "スモーキーピンク": "SPK", "スモーキーブルー": "SBL", "スモーキーグリーン": "SGN"
}

# 新增：日文顏色 → 中文顏色（與建檔系統一致）
COLOR_DISPLAY_MAP = {
    "ブラック": "黑色", "ホワイト": "白色", "グレー": "灰色", "チャコールグレー": "鐵灰",
    "ネイビー": "深藍", "ブルー": "藍色", "ライトブルー": "天空藍", "ベージュ": "奶茶",
    "ブラウン": "棕色", "カーキ": "卡其", "オリーブ": "軍綠", "グリーン": "綠色",
    "ダークグリーン": "深綠", "イエロー": "黃色", "マスタード": "奶黃", "オレンジ": "橘色",
    "レッド": "紅色", "ピンク": "淡粉", "パープル": "紫色", "ワイン": "酒紅",
    "アイボリー": "象牙白", "シルバー": "銀色", "ゴールド": "金色", "ミント": "薄荷綠",
    "サックス": "丹寧藍", "モカ": "摩卡", "テラコッタ": "TER", "ラベンダー": "薰衣草紫",
    "スモーキーピンク": "SPK", "スモーキーブルー": "SBL", "スモーキーグリーン": "SGN",
    "ライトグレー": "亮灰", "ワインレッド": "酒紅", "サックスブルー": "靛藍"
}

def simplify_product_name(name):
    return ''.join([c[0].upper() for c in name if '\u4e00' <= c <= '\u9fff' or c.isalpha()])

def simplify_color_name(color_name):
    for jp, code in COLOR_MAP.items():
        if jp in color_name:
            return code
    return "UNK"

def short_hash(text, length=4):
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:length].upper()

def generate_sku(product_name, color, size):
    """與建檔系統完全一致的 SKU 生成邏輯"""
    prefix = "FS"
    color_code = simplify_color_name(color)
    # 直接使用原始參數生成哈希值
    hash_part = short_hash(f"{product_name}-{color}-{size}")
    return f"{prefix}-{hash_part}-{color_code}-{size}"

def setup_firefox_session():
    """設置 Chrome 會話並執行登入 (修正版)"""
    global _driver
    
    if _driver:
        print("DEBUG: 重用現有瀏覽器")
        # 檢查是否已經登入
        try:
            current_url = _driver.current_url
            if "daytona-park.com" in current_url:
                return _driver
        except:
            pass
    
    print("DEBUG: 創建新瀏覽器")
    
    try:
        # 創建 Chrome 選項 (修正版 - 根據建議)
        options = uc.ChromeOptions()
        
        # ✅ 修正：如果需要 headless，使用正確的方式
        # options.add_argument("--headless=new")  # 如果需要 headless 模式，取消註釋
        
        # 基本設定
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1280,800')
        options.add_argument('--disable-features=TranslateUI')
        options.add_argument('--lang=ja-JP')
        
        # 🔐 模擬一般使用者 UA
        options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36')
        
        # SSL 和安全性設定
        options.add_argument('--ignore-ssl-errors=yes')
        options.add_argument('--ignore-certificate-errors')
        
        # 禁用通知和彈窗
        prefs = {
            "profile.default_content_setting_values.notifications": 2,
            "profile.default_content_settings.popups": 0,
            "credentials_enable_service": False,
            "profile.password_manager_enabled": False
        }
        options.add_experimental_option("prefs", prefs)
        
        # 排除自動化開關
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # 創建 Chrome 驅動程式 (修正版)
        _driver = uc.Chrome(
            options=options,
            version_main=137,        # 你目前使用的 Chrome 主版本
                    # ✅ 修正：不使用 headless（如果需要 headless，設為 True）
            use_subprocess=True
        )
        
        # 執行 JavaScript 來隱藏自動化特徵
        _driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
            'source': '''
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                })
                window.navigator.chrome = {
                    runtime: {},
                };
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['ja-JP', 'ja'],
                });
            '''
        })
        
        # 設置等待時間
        _driver.implicitly_wait(10)
        
        # 設置視窗大小
        _driver.set_window_size(1200, 800)
        
        print("✅ Chrome 瀏覽器啟動成功")
        
        # 導航到 Freak Store 登入頁面
        try:
            login_url = "https://www.daytona-park.com/mypage"
            print(f"正在導航到登入頁面: {login_url}")
            _driver.get(login_url)
            
            # 等待頁面載入
            WebDriverWait(_driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            print("✅ 已導航到 Freak Store 登入頁面")
            
            # 這裡可以添加自動登入邏輯 (如果需要)
            # 目前先讓用戶手動登入
            
        except Exception as e:
            print(f"⚠️ 導航到登入頁面失敗: {e}")
        
        return _driver
        
    except Exception as e:
        print(f"❌ Chrome 啟動失敗: {e}")
        
        # 備用方案：使用標準 selenium Chrome
        try:
            print("🔄 嘗試使用標準 Chrome WebDriver...")
            from selenium.webdriver.chrome.service import Service
            from selenium.webdriver.chrome.options import Options
            
            chrome_options = Options()
            
            # ✅ 修正：使用正確的 headless 設定
            # chrome_options.add_argument("--headless=new")  # 如果需要 headless，取消註釋
            
            # 基本反偵測設定
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--window-size=1280,800')
            chrome_options.add_argument('--lang=ja-JP')
            
            # User-Agent
            chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36')
            
            # SSL 設定
            chrome_options.add_argument('--ignore-ssl-errors=yes')
            chrome_options.add_argument('--ignore-certificate-errors')
            
            # 排除自動化開關
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            
            # 設定偏好
            prefs = {
                "credentials_enable_service": False,
                "profile.password_manager_enabled": False
            }
            chrome_options.add_experimental_option("prefs", prefs)
            
            _driver = webdriver.Chrome(options=chrome_options)
            
            # 執行反偵測 JavaScript
            _driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                'source': '''
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    })
                '''
            })
            
            _driver.implicitly_wait(10)
            _driver.set_window_size(1200, 800)
            
            # 導航到登入頁面
            _driver.get("https://www.daytona-park.com/mypage")
            
            print("✅ 標準 Chrome WebDriver 啟動成功")
            return _driver
            
        except Exception as e2:
            print(f"❌ 標準 Chrome 也失敗: {e2}")
            raise Exception(f"無法啟動 Chrome 瀏覽器: {e}")

def login_with_credentials(email, password):
    """使用帳號密碼自動登入 Freak Store"""
    driver = setup_firefox_session()
    
    try:
        # 確保在登入頁面
        if "mypage" not in driver.current_url:
            driver.get("https://www.daytona-park.com/mypage")
            
        # 等待登入表單載入
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "form"))
        )
        
        # 尋找 email 輸入框 (需要根據實際網站調整選擇器)
        email_selectors = [
            'input[type="email"]',
            'input[name="email"]',
            'input[name="login_id"]',
            '#email',
            '#login_id'
        ]
        
        email_input = None
        for selector in email_selectors:
            try:
                email_input = driver.find_element(By.CSS_SELECTOR, selector)
                break
            except:
                continue
                
        if not email_input:
            raise Exception("找不到 email 輸入框")
            
        # 尋找密碼輸入框
        password_selectors = [
            'input[type="password"]',
            'input[name="password"]',
            '#password'
        ]
        
        password_input = None
        for selector in password_selectors:
            try:
                password_input = driver.find_element(By.CSS_SELECTOR, selector)
                break
            except:
                continue
                
        if not password_input:
            raise Exception("找不到密碼輸入框")
        
        # 填入帳號密碼
        email_input.clear()
        email_input.send_keys(email)
        
        password_input.clear()
        password_input.send_keys(password)
        
        # 尋找登入按鈕
        login_selectors = [
            'input[type="submit"]',
            'button[type="submit"]',
            'button:contains("ログイン")',
            'input[value*="ログイン"]'
        ]
        
        login_button = None
        for selector in login_selectors:
            try:
                if ":contains(" in selector:
                    # 使用 XPath 處理文字匹配
                    login_button = driver.find_element(By.XPATH, f'//button[contains(text(), "ログイン")]')
                else:
                    login_button = driver.find_element(By.CSS_SELECTOR, selector)
                break
            except:
                continue
                
        if not login_button:
            raise Exception("找不到登入按鈕")
            
        # 點擊登入
        login_button.click()
        
        # 等待登入完成 (檢查 URL 變化或特定元素)
        time.sleep(3)
        
        # 檢查登入是否成功
        current_url = driver.current_url
        if "mypage" in current_url or "member" in current_url:
            print("✅ 登入成功")
            return True
        else:
            print("❌ 登入可能失敗，請檢查帳號密碼")
            return False
            
    except Exception as e:
        print(f"❌ 自動登入失敗: {e}")
        print("請手動登入")
        return False

def cleanup_firefox_session():
    """清理 Chrome 會話"""
    global _driver
    
    if _driver:
        try:
            _driver.quit()
            print("✅ Chrome 瀏覽器已關閉")
        except:
            pass
        finally:
            _driver = None

def get_freak_product_info(url):
    """獲取 Freak Store 商品資訊 (使用與建檔系統相同的顏色處理邏輯)"""
    driver = setup_firefox_session()
    
    if not _driver:
        driver = setup_firefox_session()
    else:
        driver = _driver
    
    # 初始化商品資訊
    product_info = {
        'product_name': '',
        'color': '',
        'size': '',
        'original_price': 0,
        'current_price': 0,
        'discount_pct': 0,
        'stocks': [],
        'raw_colors': {}  # 新增：存储每个中文颜色对应的原始日文颜色
    }
    
    try:
        print(f"正在訪問: {url}")
        driver.get(url)
        
        # 檢查是否還在登入狀態
        current_url = driver.current_url
        print(f"當前頁面: {current_url}")
        
        # 等待頁面載入
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        
        # 檢查是否被重定向到登入頁面
        if "login" in driver.current_url or "auth" in driver.current_url:
            print("⚠️ 登入狀態已失效，需要重新登入")
            
            # 嘗試等待使用者手動登入
            print("請在瀏覽器中手動登入...")
            input("登入完成後，按 Enter 繼續...")
            
            # 重新訪問商品頁面
            driver.get(url)
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
        
        # 檢查頁面上是否有登入按鈕（表示未登入）
        try:
            login_button = driver.find_element(By.XPATH, "//a[contains(@href, 'login') or contains(text(), 'ログイン')]")
            if login_button:
                print("⚠️ 偵測到未登入狀態")
                # 可以選擇自動點擊登入或提示使用者
        except:
            # 找不到登入按鈕，可能已經登入
            pass
        
        # 取得頁面 HTML
        html = driver.page_source
        soup = BeautifulSoup(html, 'html.parser')
        
        # 1. 解析商品名稱
        try:
            title_elem = soup.find('h1')
            if title_elem:
                product_info['product_name'] = title_elem.get_text().strip()
                print(f"✅ 商品名稱: {product_info['product_name']}")
        except Exception as e:
            print(f"解析商品名稱失敗: {e}")
        
        # 2. 解析價格資訊
        try:
            price_tag = soup.select_one(".block-goods-price--price")
            default_price_tag = soup.select_one(".block-goods-price--default-price")
            discount_tag = soup.select_one(".block-goods-price--sale-dratio")
            
            def extract_price(text):
                if not text:
                    return 0
                import re
                match = re.search(r"([0-9,]+)\s*円", text)
                if match:
                    return int(match.group(1).replace(",", ""))
                return 0
            
            # 解析折扣價（當前價格）
            discounted_price = extract_price(price_tag.get_text(strip=True) if price_tag else "")
            
            # 解析原價
            original_price = extract_price(default_price_tag.get_text(strip=True) if default_price_tag else "")
            
            # 如果沒有原價但有折扣後價格，則將原價設為折扣後價格
            if original_price == 0 and discounted_price > 0:
                original_price = discounted_price
            
            # 解析折扣率
            discount_pct = 0
            if discount_tag:
                discount_text = discount_tag.get_text(strip=True)
                import re
                match = re.search(r"(\d+)%\s*OFF", discount_text)
                if match:
                    discount_pct = int(match.group(1))
            
            # 如果有原價和折扣價但沒有折扣率，從價差計算
            if original_price > discounted_price and discount_pct == 0:
                discount_pct = round((original_price - discounted_price) / original_price * 100, 1)
            
            # 設定解析結果
            product_info['current_price'] = discounted_price
            product_info['original_price'] = original_price
            product_info['discount_pct'] = discount_pct
            
            print(f"✅ 原價: {product_info['original_price']}")
            print(f"✅ 現價: {product_info['current_price']}")
            print(f"✅ 折扣: {product_info['discount_pct']}%")
                
        except Exception as e:
            print(f"解析價格失敗: {e}")
            product_info['current_price'] = 0
            product_info['original_price'] = 0
            product_info['discount_pct'] = 0
        
        # 3. 解析顏色和庫存資訊 (使用與建檔系統相同的邏輯)
        try:
            print("🔍 開始解析顏色和庫存資訊...")
            
            # 使用與建檔系統完全相同的邏輯
            color_blocks = soup.select(".block-goods-color-variation-box")
            stocks = []
            
            for color_block in color_blocks:
                color_tag = color_block.select_one(".block-goods-color-variation-name-text")
                # 先讀出原始日文顏色
                raw_color = color_tag.get_text(strip=True) if color_tag else ""
                # 再對照映射表轉成中文，找不到就保留原文
                display_color = COLOR_DISPLAY_MAP.get(raw_color, raw_color)
                # 存储映射關係
                product_info['raw_colors'][display_color] = raw_color
                
                size_boxes = color_block.select(".block-goods-color-variation-size-stock-box")
                for box in size_boxes:
                    size_tag = box.select_one(".block-goods-color-variation-size-value")
                    stock_tag = box.select_one('[class^="block-goods-stockstatus"]')
                    size = size_tag.get_text(strip=True) if size_tag else ""
                    stock_status = stock_tag.get_text(strip=True) if stock_tag else "尚未擷取到資料"
                    
                    stocks.append((size, display_color, stock_status))
            
            product_info['stocks'] = stocks
            
            # 如果有庫存資訊，使用第一個作為預設顏色和尺寸
            if stocks:
                first_size, first_color, _ = stocks[0]
                product_info['size'] = first_size
                product_info['color'] = first_color
                print(f"✅ 顏色: {first_color}")
                print(f"✅ 尺寸: {first_size}")
            
            print(f"✅ 庫存組合: {stocks}")
                
        except Exception as e:
            print(f"解析顏色和庫存失敗: {e}")
            # 設定預設值
            product_info['color'] = 'ブラック'
            product_info['size'] = 'ONE SIZE'
            product_info['stocks'] = [('ONE SIZE', 'ブラック', '')]
        
        # 4. 從URL提取商品ID作為SKU基礎
        try:
            import re
            url_match = re.search(r'/item/(\d+)', url)
            if url_match:
                item_id = url_match.group(1)
                print(f"✅ 商品ID: {item_id}")
                product_info['item_id'] = item_id
        except Exception as e:
            print(f"提取商品ID失敗: {e}")
        
        print("="*50)
        print("📋 最終解析結果:")
        for key, value in product_info.items():
            print(f"   {key}: {value}")
        print("="*50)
        
        return product_info
        
    except Exception as e:
        print(f"❌ 獲取商品資訊失敗: {e}")
        # 即使發生錯誤，也返回基本的 product_info 結構
        return product_info
    
    finally:
        # 不要在這裡關閉瀏覽器，保持會話
        pass
