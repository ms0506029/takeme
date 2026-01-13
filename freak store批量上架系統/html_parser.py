#html_parser

from bs4 import BeautifulSoup
import os
import sys
import re
from collections import defaultdict, OrderedDict
import warnings
import requests
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import pandas as pd

warnings.filterwarnings("ignore", category=UserWarning)

if hasattr(sys, '_MEIPASS'):
    base_path = sys._MEIPASS
else:
    base_path = os.path.dirname(os.path.abspath(__file__))

image_folder = os.path.join(base_path, "images")
BASE_URL = "https://www.daytona-park.com"

def fetch_html_from_url(url):
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
        response = requests.get(url)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"[ERROR] 無法載入網頁：{e}")
        return ""

stock_status_map = {
    "残りわずか": 2,
    "在庫あり": 10,
    "取り寄せ": 5,
    "在庫なし": 0,
    "予約": 7,
    "残り1点": 0
}

DIMENSION_LABEL_MAP = {
    # 衣服／褲子（原本已有的）
    "ウエスト": "腰圍", "ヒップ": "臀圍", "股上": "褲襠",
    "股下": "褲長", "着丈": "衣長", "肩幅": "肩寬",
    "身幅": "胸寬", "袖丈": "袖長", "そで丈": "袖長",
    # 帽子
    "内周": "頭圍", "深さ": "帽深", "つば幅": "簷寬", "つば長": "簷長",
    # 鞋子
    "長さ": "鞋長",  "かかと高さ": "鞋跟高",
    # 包包
    "縦": "長", "横": "寬", "幅": "寬", "高さ": "長",
    "持ち手高さ": "提把高", "ショルダー長さ": "揹帶長度", "ショルダ": "揹帶長度",
    "マチ": "包包深度",
    # 其他小物（可自行擴充）
    "直徑": "長", "横": "寬", "幅": "寬", "高さ": "長",
}

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

# 新增：日文顏色 → 中文顏色
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
    for jp_color, code in COLOR_MAP.items():
        if jp_color in color_name:
            return code
    return "UNK"

def short_hash(text, length=4):
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:length].upper()

def generate_sku(product_name, color, size):
    prefix = "FS"
    color_code = simplify_color_name(color)
    hash_part = short_hash(f"{product_name}-{color}-{size}")
    return f"{prefix}-{hash_part}-{color_code}-{size}"

def sort_sizes(sizes):
    order = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    return sorted(sizes, key=lambda x: order.index(x) if x in order else len(order))

def parse_size_table_html(html):
    soup = BeautifulSoup(html, "html.parser")
    table = soup.select_one("table")
    if not table:
        return ""
    rows = table.select("tr")
    if not rows:
        return ""
    headers = [th.get_text(strip=True) for th in rows[0].select("th")]
    converted_headers = []
    for h in headers[1:]:
        conv = DIMENSION_LABEL_MAP.get(h, h)  # 新增：若有映射則替換，否則保留原日文
        converted_headers.append(conv)
        
    result = []
    for row in rows[1:]:
        cols = [td.get_text(strip=True) for td in row.select("td")]
        if not cols:
            continue
        size = cols[0]
        values = cols[1:]
        parts = [f"{h} {v}" for h, v in zip(converted_headers, values)]
        result.append(f"{size}：{' / '.join(parts)}cm")
    return "\n".join(result)

def download_image(url, save_path, retries=5, timeout=20):
    for attempt in range(retries):
        try:
            response = requests.get(url, timeout=timeout)
            if response.status_code == 200:
                os.makedirs(os.path.dirname(save_path), exist_ok=True)
                with open(save_path, "wb") as f:
                    f.write(response.content)
                print(f"✅ 圖片下載成功：{url}")
                return True
        except Exception as e:
            print(f"❌ 圖片下載錯誤：{url} | {e}")
    return False

def download_all_images(image_urls, folder_name="images", product_name="商品"):
    safe_name = re.sub(r'[\\/*?:"<>|]', "_", product_name.strip()) or "unknown"
    save_folder = os.path.join(folder_name, safe_name)
    results = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            executor.submit(download_image, url, os.path.join(save_folder, os.path.basename(url))): url
            for url in image_urls
        }
        for future in as_completed(futures):
            url = futures[future]
            success = future.result()
            results.append({"url": url, "success": success})
    return results

def parse_html_to_data(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    data = {}

    name_tag = soup.select_one(".block-goods-name h1")
    data["name"] = name_tag.get_text(strip=True) if name_tag else ""

    brand_tag = soup.select_one(".block-goods-brand-name a")
    data["brand"] = brand_tag.get_text(strip=True) if brand_tag else ""

    price_tag = soup.select_one(".block-goods-price--price.price.js-enhanced-ecommerce-goods-price")
    default_price_tag = soup.select_one(".block-goods-price--default-price")
    discount_tag = soup.select_one(".block-goods-price--sale-dratio")

    def extract_price(text): return re.sub(r"[^\d]", "", text) if text else ""

    data["price"] = extract_price(price_tag.get_text(strip=True)) if price_tag else ""
    data["default_price"] = extract_price(default_price_tag.get_text(strip=True)) if default_price_tag else ""
    data["discount_ratio"] = discount_tag.get_text(strip=True) if discount_tag else ""

    stock_list = []
    stock_qty_list = []
    stock_dict = defaultdict(dict)
    stock_qty = {}
    raw_colors = {}  # 新增：存储每个中文颜色对应的原始日文颜色

    color_blocks = soup.select(".block-goods-color-variation-box")
    for color_block in color_blocks:
        color_tag = color_block.select_one(".block-goods-color-variation-name-text")
        # 先讀出原始日文顏色
        raw_color = color_tag.get_text(strip=True) if color_tag else ""
        # 再對照映射表轉成中文，找不到就保留原文
        display_color = COLOR_DISPLAY_MAP.get(raw_color, raw_color)
        # 最終用 display_color 作為後續所有 stock 與 sku 的「顏色」
        raw_colors[display_color] = raw_color
        # 最終用 display_color 作為後續所有 stock 的「顏色」
        color = display_color
        size_boxes = color_block.select(".block-goods-color-variation-size-stock-box")
        for box in size_boxes:
            size_tag = box.select_one(".block-goods-color-variation-size-value")
            stock_tag = box.select_one('[class^="block-goods-stockstatus"]')
            size = size_tag.get_text(strip=True) if size_tag else ""
            stock_status = stock_tag.get_text(strip=True) if stock_tag else "尚未擷取到資料"
            stock_dict[color][size] = stock_status
            qty = stock_status_map.get(stock_status, "")
            stock_qty[(size, color)] = qty

    size_order = sort_sizes(list({size for sizes in stock_dict.values() for size in sizes}))
    for color, sizes in sorted(stock_dict.items()):
        for size in size_order:
            stock = stock_dict[color].get(size, '尚未擷取到資料')
            qty = stock_qty.get((size, color), '')
            stock_list.append([size, color, stock])
            stock_qty_list.append(qty)

    data["stocks"] = stock_list
    data["stocks_qty"] = stock_qty_list
    data["sizes"] = size_order

    image_tags = soup.select("div.image-list img")
    image_urls = [urljoin(BASE_URL, img.get("src")) for img in image_tags if img.get("src")]
    data["images"] = image_urls
    main_img_tag = soup.select_one(".block-goods-color-variation-img img")
    data["main_image"] = urljoin(BASE_URL, main_img_tag.get("src")) if main_img_tag else ""

    # 移除自動下載，改由API處理器控制

    size_table_tag = soup.select_one(".block-goods-product-size-table")
    if size_table_tag:
        html = str(size_table_tag)
        data["size_table_html"] = html
        try:
            data["parsed_size_table"] = parse_size_table_html(html)
        except Exception as e:
            print(f"⚠️ 尺寸表解析錯誤：{e}")
            data["parsed_size_table"] = ""
    else:
        data["size_table_html"] = ""
        data["parsed_size_table"] = ""

    generated_skus = []
    for (size, color, _) in data.get("stocks", []):
        # 使用原始日文颜色生成SKU
        raw_color = raw_colors.get(color, color)
        sku = generate_sku(data["name"], raw_color, size)
        generated_skus.append({
            "顏色": color,
            "尺寸": size,
            "Freak SKU": sku
        })
    data["skus"] = generated_skus

    return data
