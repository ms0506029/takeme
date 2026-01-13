import re
import os
import sys
import time
import hashlib
import pandas as pd
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from bs4 import BeautifulSoup
import warnings
import requests
warnings.filterwarnings("ignore", category=UserWarning)

# ─── 判斷執行路徑 ───
if getattr(sys, "frozen", False):
    exe_dir = os.path.dirname(sys.executable)
    PROJECT_ROOT = os.path.normpath(os.path.join(exe_dir, "..", "..", ".."))
else:
    PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

# === 顏色代碼對照 ===
COLOR_MAP = {
    "ブラック":"BLK","ホワイト":"WHT","グレー":"GRY","チャコール":"CHC",
    "ネイビー":"NVY","ブルー":"BLU","ライトブルー":"LBL","ベージュ":"BEI",
    "ブラウン":"BRN","カーキ":"KHA","オリーブ":"OLV","グリーン":"GRN",
    "ダークグリーン":"DGN","イエロー":"YEL","マスタード":"MUS","オレンジ":"ORG",
    "レッド":"RED","ピンク":"PNK","パープル":"PUR","ワイン":"WIN",
    "アイボリー":"IVY","シルバー":"SLV","ゴールド":"GLD","ミント":"MNT",
    "サックス":"SAX","モカ":"MOC","テラコッタ":"TER","ラベンダー":"LAV",
    "スモーキーピンク":"SPK","スモーキーブルー":"SBL","スモーキーグリーン":"SGN",
    "チャコールグレー":"CHG","ライトグレー":"LGY","オフ":"WHT"
}

# === 庫存狀態對應 ===
STOCK_MAP = {
    "残りわずか":2, "在庫あり":10, "取り寄せ":5,
    "在庫なし":0, "予約":7, "残り1点":0
}

def simplify_color_name(c):
    for jp, code in COLOR_MAP.items():
        if jp in c:
            return code
    return "UNK"

def short_hash(text, length=4):
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:length].upper()

def generate_sku(name, color, size):
    return f"FS-{ short_hash(f'{name}-{color}-{size}') }-{ simplify_color_name(color) }-{ size }"

def fetch_html_from_url(url, wait=10):
    opts = Options()
    opts.add_argument("--headless")
    opts.set_preference("intl.accept_languages","ja-JP,ja")
    driver = webdriver.Firefox(options=opts)
    driver.get(url)
    time.sleep(wait)
    html = driver.page_source
    driver.quit()
    return html
    
def parse_html_to_data(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    data = {}
    # 商品名称
    name_tag = soup.select_one(".block-goods-name h1")
    data["name"] = name_tag.get_text(strip=True) if name_tag else ""
    # 折后价
    price_tag = soup.select_one(".block-goods-price--price.price.js-enhanced-ecommerce-goods-price")
    data["price"] = re.sub(r"[^\d]", "", price_tag.get_text(strip=True)) if price_tag else ""
    # 原价
    default_price_tag = soup.select_one(".block-goods-price--default-price")
    data["default_price"] = re.sub(r"[^\d]", "", default_price_tag.get_text(strip=True)) if default_price_tag else ""
    # SKU 列表
    generated_skus = []
    color_blocks = soup.select(".block-goods-color-variation-box")
    for color_block in color_blocks:
        color = color_block.select_one(".block-goods-color-variation-name-text").get_text(strip=True)
        for box in color_block.select(".block-goods-color-variation-size-stock-box"):
            size = box.select_one(".block-goods-color-variation-size-value").get_text(strip=True)
            # 这里假设你已有 generate_sku() 方法
            sku = generate_sku(data["name"], color, size)
            generated_skus.append({"Freak SKU": sku})
    data["skus"] = generated_skus
    return data

def parse_html_to_stock_table(html):
    soup = BeautifulSoup(html,"html.parser")
    pname = soup.select_one(".block-goods-name h1")
    product_name = pname.get_text(strip=True) if pname else "UNKNOWN"
    rows = []
    for color_block in soup.select(".block-goods-color-variation-box"):
        color = (color_block.select_one(".block-goods-color-variation-name-text")
                 .get_text(strip=True))
        for box in color_block.select(".block-goods-color-variation-size-stock-box"):
            size = box.select_one(".block-goods-color-variation-size-value").get_text(strip=True)
            status = box.select_one('[class^="block-goods-stockstatus"]').get_text(strip=True)
            qty = STOCK_MAP.get(status, "")
            rows.append({
                "Freak SKU": generate_sku(product_name, color, size),
                "庫存數量": qty
            })
    return rows

def fetch_all_stock(tracked_urls_path: str="tracked_urls.txt",
                    output_path: str="stock_output.xlsx") -> str:
    # 1️⃣ 讀 URLs
    inpath = os.path.join(PROJECT_ROOT, tracked_urls_path)
    with open(inpath, "r", encoding="utf-8") as f:
        urls = [u.strip() for u in f if u.strip()]

    # 2️⃣ 逐一抓取
    all_rows = []
    for url in urls:
        html = fetch_html_from_url(url)
        rows = parse_html_to_stock_table(html)
        all_rows.extend(rows)

    # 3️⃣ 寫 Excel
    outpath = os.path.join(PROJECT_ROOT, output_path)
    df = pd.DataFrame(all_rows)
    df.to_excel(outpath, index=False)
    return outpath

if __name__ == "__main__":
    path = fetch_all_stock()
    print("✅ 已輸出", path)
