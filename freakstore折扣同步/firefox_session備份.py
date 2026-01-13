# firefox_session.py

import logging
import time
import re
import hashlib
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
import sys
import os
from config import FREAK_STORE_LOGIN_URL, FREAK_STORE_MYPAGE_URL


# Freak Store 會員頁面 URL
FREAK_STORE_MYPAGE_URL = "https://www.daytona-park.com/mypage"  # 请替换为实际的会员页面URL

def get_profile_path():
    """获取 Firefox 配置文件路径"""
    try:
        # 打包后运行
        if hasattr(sys, '_MEIPASS'):
            return os.path.join(sys._MEIPASS, "firefox_profile")
        # 开发环境
        else:
            return "/Users/chenyanxiang/Library/Application Support/Firefox/Profiles/kq1rlx9n.default-release-1747700335794"
    except:
        return "/Users/chenyanxiang/Library/Application Support/Firefox/Profiles/kq1rlx9n.default-release-1747700335794"

def get_geckodriver_path():
    """获取 geckodriver 路径"""
    try:
        # 打包后运行
        if hasattr(sys, '_MEIPASS'):
            if sys.platform.startswith('darwin'):  # macOS
                return os.path.join(sys._MEIPASS, "geckodriver")
            elif sys.platform.startswith('win'):   # Windows
                return os.path.join(sys._MEIPASS, "geckodriver.exe")
        # 开发环境
        else:
            return "/usr/local/bin/geckodriver"
    except:
        return "/usr/local/bin/geckodriver"
        
# Firefox 設定
PROFILE_PATH = get_profile_path()
GECKODRIVER_BIN = get_geckodriver_path()

# 顏色對照表
COLOR_MAP = {
    "ブラック": "BLK", "ホワイト": "WHT", "グレー": "GRY", "チャコール": "CHC",
    "ネイビー": "NVY", "ブルー": "BLU", "ライトブルー": "LBL", "ベージュ": "BEI",
    "ブラウン": "BRN", "カーキ": "KHA", "オリーブ": "OLV", "グリーン": "GRN",
    "ダークグリーン": "DGN", "イエロー": "YEL", "マスタード": "MUS", "オレンジ": "ORG",
    "レッド": "RED", "ピンク": "PNK", "パープル": "PUR", "ワイン": "WIN",
    "アイボリー": "IVY", "シルバー": "SLV", "ゴールド": "GLD", "ミント": "MNT",
    "サックス": "SAX", "モカ": "MOC", "テラコッタ": "TER", "ラベンダー": "LAV",
    "スモーキーピンク": "SPK", "スモーキーブルー": "SBL", "スモーキーグリーン": "SGN"
}

# 全局瀏覽器實例
_driver = None

# 在 firefox_session.py 中


def setup_firefox_session():
    """啟動並回傳全局唯一的 Firefox WebDriver (帶 profile)"""
    global _driver
    if _driver:
        return _driver

    options = Options()
    options.profile = PROFILE_PATH
    options.headless = False

    # SSL 認證鬆綁（關鍵）
    options.accept_insecure_certs = True
    options.set_preference("security.enterprise_roots.enabled", True)
    options.set_preference("security.cert_pinning.enforcement_level", 0)
    options.set_preference("security.ssl.enable_ocsp_stapling", False)
    options.set_preference("security.mixed_content.block_active_content", False)
    options.set_preference("security.mixed_content.block_display_content", False)
    options.set_preference("network.stricttransportsecurity.preloadlist", False)

    # 自動化標籤隱藏
    options.set_preference("dom.webdriver.enabled", False)
    options.set_preference("useAutomationExtension", False)
    
    service = Service(executable_path=GECKODRIVER_BIN)
    driver = webdriver.Firefox(service=service, options=options)
    driver.set_page_load_timeout(30)

    
    # 訪問 Freak Store 會員頁面以確認登入狀態
    try:
        logging.info(f"正在載入會員頁面確認登入狀態: {FREAK_STORE_MYPAGE_URL}")
        driver.get(FREAK_STORE_MYPAGE_URL)
        time.sleep(3)  # 等待頁面加載
        
        # 檢查是否成功登入
        if "會員" in driver.page_source or "マイページ" in driver.page_source or "ログアウト" in driver.page_source:
            logging.info("✓ 已確認登入 Freak Store 會員")
        else:
            logging.warning("⚠️ 可能未成功登入 Freak Store 會員，請先手動登入")
            logging.warning("⚠️ 瀏覽器已開啟，請自行登入 Freak Store，完成後不要關閉瀏覽器")
            input("👉 完成登入後，請回到此視窗，按 Enter 繼續 ...")
            
            # 完成手動登入後，再次檢查一次
            logging.info("🔄 再次檢查登入狀態 ...")
            driver.get(FREAK_STORE_MYPAGE_URL)
            time.sleep(3)
            
            if "會員" in driver.page_source or "マイページ" in driver.page_source or "ログアウト" in driver.page_source:
                logging.info("✓ 手動登入成功，已確認登入 Freak Store 會員")
            else:
                logging.error("❌ 手動登入後仍未檢測到登入狀態，請確認帳號是否正常")
                raise RuntimeError("未成功登入 Freak Store，流程中止")

    except Exception as e:
        logging.error(f"訪問會員頁面時出錯: {e}")
    
    _driver = driver
    logging.info("✅ Firefox 瀏覽器已啟動 (使用已登入的 profile)")
    return driver

def cleanup_firefox_session():
    """關閉瀏覽器，釋放資源"""
    global _driver
    if _driver:
        try:
            _driver.quit()
            logging.info("🗑️ Firefox 瀏覽器已關閉")
        except:
            pass
        _driver = None

def get_freak_product_info(url):
    """
    用 Selenium+Firefox profile 抓取商品信息，不生成 SKU
    返回: {'product_name','color','size','original_price','discounted_price','discount_pct','sizes','stocks'}
    """
    driver = setup_firefox_session()
    logging.info(f"📥 載入商品頁面: {url}")
    
    try:
        # 導航到商品頁面
        driver.get(url)
        time.sleep(3)  # 等待頁面加載
        
        # 檢查頁面是否成功加載
        if "商品詳細" in driver.page_source or "商品名" in driver.page_source:
            logging.info("✓ 商品頁面加載成功")
        else:
            logging.warning("⚠️ 商品頁面可能未正確加載，將嘗試解析當前頁面")
            # 嘗試重新加載
            driver.get(url)
            time.sleep(5)
            
        # 使用 BeautifulSoup 解析頁面
        html = driver.page_source
        soup = BeautifulSoup(html, 'html.parser')
        
        # 1. 獲取產品名稱
        name_tag = soup.select_one(".block-goods-name h1")
        product_name = name_tag.get_text(strip=True) if name_tag else ""
        
        # 2. 獲取價格信息
        price_tag = soup.select_one(".block-goods-price--price")
        default_price_tag = soup.select_one(".block-goods-price--default-price")
        discount_tag = soup.select_one(".block-goods-price--sale-dratio")
        
        def extract_price(text):
            if not text:
                return 0
            match = re.search(r"([0-9,]+)\s*円", text)
            if match:
                return int(match.group(1).replace(",", ""))
            return 0
        
        discounted_price = extract_price(price_tag.get_text(strip=True) if price_tag else "")
        original_price = extract_price(default_price_tag.get_text(strip=True) if default_price_tag else "")
        
        # 如果沒有原價但有折扣後價格，則將原價設為折扣後價格
        if original_price == 0 and discounted_price > 0:
            original_price = discounted_price
        
        # 獲取折扣率
        discount_pct = 0
        if discount_tag:
            discount_text = discount_tag.get_text(strip=True)
            match = re.search(r"(\d+)%\s*OFF", discount_text)
            if match:
                discount_pct = int(match.group(1))
                
        # 如果有原價和折扣價但沒有折扣率，從價差計算
        if original_price > discounted_price and discount_pct == 0:
            discount_pct = round((original_price - discounted_price) / original_price * 100)
            
        # 3. 獲取顏色和尺寸信息
        color_blocks = soup.select(".block-goods-color-variation-box")
        stocks = []
        stocks_dict = {}
        sizes_set = set()
        
        # 從 URL 提取 color 索引
        color_match = re.search(r"color=(\d+)", url)
        color_idx = int(color_match.group(1)) if color_match else 0
        
        # 預設顏色和尺寸
        color = "ブラック"
        size = "FREE"
        
        # 如果有顏色塊，從中提取信息
        if color_blocks:
            # 獲取所有尺寸和顏色
            for i, block in enumerate(color_blocks):
                color_tag = block.select_one(".block-goods-color-variation-name-text")
                block_color = color_tag.get_text(strip=True) if color_tag else "ブラック"
                
                size_boxes = block.select(".block-goods-color-variation-size-stock-box")
                for box in size_boxes:
                    size_tag = box.select_one(".block-goods-color-variation-size-value")
                    block_size = size_tag.get_text(strip=True) if size_tag else "FREE"
                    
                    sizes_set.add(block_size)
                    stocks.append((block_size, block_color))
                    stocks_dict[(block_size, block_color)] = True
            
            # 確定當前 URL 對應的顏色和尺寸
            if 0 <= color_idx < len(color_blocks):
                current_block = color_blocks[color_idx]
                color_tag = current_block.select_one(".block-goods-color-variation-name-text")
                color = color_tag.get_text(strip=True) if color_tag else "ブラック"
                
                # 如果有多個尺寸，使用第一個可用的
                size_boxes = current_block.select(".block-goods-color-variation-size-stock-box")
                if size_boxes:
                    size_tag = size_boxes[0].select_one(".block-goods-color-variation-size-value")
                    size = size_tag.get_text(strip=True) if size_tag else "FREE"
                else:
                    size = "FREE"
            
        # 標準化尺寸
        if size == "FREE":
            size = "ONE SIZE"
        
        # 對尺寸進行排序
        order = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
        sizes = sorted(list(sizes_set), key=lambda x: order.index(x) if x in order else len(order))
        
        logging.info(f"解析結果: 名稱={product_name} 顏色={color} 尺寸={size} 折扣={discount_pct}% 原價={original_price} 售價={discounted_price}")
        logging.info(f"所有尺寸: {sizes}")
        logging.info(f"庫存組合: {stocks}")
        
        return {
            "product_name": product_name,
            "color": color,
            "size": size,
            "original_price": original_price,
            "discounted_price": discounted_price,
            "discount_pct": discount_pct,
            "sizes": sizes,
            "stocks": stocks
        }
    except Exception as e:
        logging.error(f"獲取商品信息出錯: {e}")
        # 返回最小的數據結構，避免後續處理出錯
        return {
            "product_name": "",
            "color": "ブラック",
            "size": "FREE",
            "original_price": 0,
            "discounted_price": 0,
            "discount_pct": 0,
            "sizes": [],
            "stocks": []
        }
