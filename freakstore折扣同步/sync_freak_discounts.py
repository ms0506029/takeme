# sync_freak_discounts.py (核心模組) - 修正版
import requests
from bs4 import BeautifulSoup
import pandas as pd
import json
import logging
from datetime import datetime
import re
import os
import config
import hashlib
import sys

# 如果是 PyInstaller/Frozen 打包后运行，文件会被解到 sys._MEIPASS
if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(__file__)

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')

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

# 僅保留中文字或英文字母的首字母並轉為大寫
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
    """與建檔系統完全一致的 SKU 生成規則"""
    prefix = "FS"
    color_code = simplify_color_name(color)
    # 直接使用原始參數生成哈希值
    hash_part = short_hash(f"{product_name}-{color}-{size}")
    return f"{prefix}-{hash_part}-{color_code}-{size}"

def resource_path(relative_path):
    """ 获取资源的绝对路径 """
    # 打印出当前工作目录和相对路径
    print(f"请求路径: {relative_path}")
    print(f"当前目录: {os.getcwd()}")
    
    # 尝试多个可能的位置
    possible_paths = [
        os.path.abspath(relative_path),  # 当前目录
        os.path.join(os.path.dirname(os.path.abspath(__file__)), relative_path),  # 脚本所在目录
        os.path.join(os.path.dirname(sys.executable), relative_path),  # 可执行文件所在目录
    ]
    
    # 如果 PyInstaller 打包环境中
    if hasattr(sys, '_MEIPASS'):
        possible_paths.append(os.path.join(sys._MEIPASS, relative_path))
    
    # 尝试父目录
    parent_dir = os.path.abspath('..')
    possible_paths.append(os.path.join(parent_dir, relative_path))
    
    # 检查每个可能的路径
    for path in possible_paths:
        print(f"检查路径: {path}")
        if os.path.exists(path):
            print(f"找到文件: {path}")
            return path
            
    # 如果所有路径都不存在，返回相对路径并打印警告
    print(f"警告: 无法找到文件 {relative_path}，尝试使用相对路径")
    return relative_path

class FreakDiscountSyncer:
    def __init__(self, sku_mapping_file='sku_variant_mapping.xlsx', sku_reference_file='sku_reference-2.xlsx'):
        # 讀取主要 SKU 映射
        # 使用 resource_path 获取文件路径
        sku_mapping_path = resource_path(sku_mapping_file)
        sku_reference_path = resource_path(sku_reference_file)
        
        # 使用绝对路径读取文件
        logging.info(f"读取映射文件: {sku_mapping_path}")
        self.variant_df = pd.read_excel(sku_mapping_path, engine='openpyxl')
        logging.info(f"variant mapping 列名: {self.variant_df.columns.tolist()}")
        
        logging.info(f"读取参考文件: {sku_reference_path}")
        self.ref_df = pd.read_excel(sku_reference_path, engine='openpyxl')
        logging.info(f"reference mapping 列名: {self.ref_df.columns.tolist()}")
        
        
        # 首先从 sku_reference-2.xlsx 创建映射
        self.sku_map = dict(zip(
          self.ref_df['Freak SKU（請填入）'].astype(str).str.strip(),
          self.ref_df['EasyStore SKU'].astype(str).str.strip()
        ))
        
        # 然后从 variant_df 添加映射 (如果 SKU 列同时作为 Freak SKU 和 Easy SKU)
        for _, row in self.variant_df.iterrows():
            if pd.notna(row.get('SKU')):
                sku = str(row['SKU']).strip()
                self.sku_map[sku] = sku  # 同一个 SKU 直接映射到自己
        
        logging.info(f"已載入 {len(self.sku_map)} 個 Freak→Easy SKU 映射")
        
        print(">>> sku_variant_mapping.xlsx dtypes:\n", self.variant_df.dtypes)
        print(">>> sku_variant_mapping.xlsx SKU head(10):\n", self.variant_df['SKU'].astype(str).head(10))

    def get_freak_product_info(self, url):
        """從 Freak Store 網頁抓取商品資訊 (使用 Firefox 會員模式)"""
        from firefox_session import get_freak_product_info
        return get_freak_product_info(url)
            
    def calculate_easy_discount(self, freak_discount_pct):
        """根據規則計算Easy Store折扣百分比"""
        return freak_discount_pct

    def get_variant_id_by_sku(self, easy_sku):
        """
        只從本地 variant_df 查一次，立刻回傳 PID/VID/price/compare_at_price，
        不再做全站掃描。
        """
        easy_sku_str = str(easy_sku).strip()

        # 1) EasyStore SKU -> 本地 variant_df
        row = self.variant_df[
            self.variant_df['SKU'].astype(str).str.strip() == easy_sku_str
        ]
        if not row.empty:
            pid = int(row['product_id'].iat[0])
            vid = int(row['Variant ID'].iat[0])
            logging.info(f"從本地 variant 表找到: {easy_sku_str} -> PID={pid}, VID={vid}")

            return {
                "product_id": pid,
                "variant_id": vid,
                # 如果你的 mapping 表也有 price/compare_at_price 欄位，可以直接拿，
                # 否則這裡會回傳 None
                "price": row.get('price', [0]).iat[0] if 'price' in row else 0,
                "compare_at_price": row.get('compare_at_price', [0]).iat[0] if 'compare_at_price' in row else 0
            }

        # 2) 本地找不到，就直接報錯
        logging.error(f"找不到對應的 Variant ID (只查本地表): {easy_sku_str}")
        raise ValueError(f"找不到對應的 Variant ID: {easy_sku_str}")

    def update_variant_price(self, product_id, variant_id, new_price):
        """更新EasyStore商品變體的價格"""
        try:
            url = f"{config.BASE_API}/products/{product_id}/variants/{variant_id}.json"
            payload = {"variant": {"price": new_price}}
            # （也可以改用 PUT，看你庫存更新那邊用的是 PUT）
            resp = requests.put(url, headers=config.API_HEADERS, json=payload)
            resp.raise_for_status()
            return resp.json()
            
        except Exception as e:
            logging.error(f"更新變體價格失敗: {variant_id} => {e}")
            raise
            
    def get_all_product_variants(self, product_id):
        """獲取指定商品的所有變體"""
        try:
            url = f"{config.BASE_API}/products/{product_id}.json"
            resp = requests.get(url, headers=config.API_HEADERS)
            resp.raise_for_status()
            
            product_data = resp.json().get("product", {})
            variants = product_data.get("variants", [])
            
            
            # 确保价格字段是数值类型
            for variant in variants:
                try:
                    if "price" in variant:
                        variant["price"] = int(variant["price"]) if variant["price"] else 0
                    if "compare_at_price" in variant:
                        cap = variant["compare_at_price"]
                        variant["compare_at_price"] = int(cap) if cap and str(cap).strip() else None
                except (TypeError, ValueError):
                    logging.warning(f"转换变体价格类型失败: {variant.get('id')}")
            
            logging.info(f"獲取到商品 {product_id} 的 {len(variants)} 個變體")
            return variants
            
        except Exception as e:
            logging.error(f"獲取商品變體失敗: {product_id} => {e}")
            raise

    def sync_discount(self, url, apply_additional_discount=False):
        """同步單一URL的折扣到EasyStore所有變體的售價（使用建檔系統的SKU生成邏輯）"""
        try:
            # 1. 獲取 Freak Store 商品信息
            product_info = self.get_freak_product_info(url)
            
            # 2. 使用建檔系統的邏輯生成 SKU
            tried_skus = set()
            matched_sku = None
            easy_sku = None
            
            print(f"🔍 開始 SKU 匹配，商品資訊:")
            print(f"  商品名稱: {product_info['product_name']}")
            print(f"  主要顏色: {product_info['color']}")
            print(f"  主要尺寸: {product_info['size']}")
            print(f"  庫存組合: {product_info['stocks']}")
            print(f"  原始顏色映射: {product_info.get('raw_colors', {})}")
            
            # 首先嘗試 URL 映射
            url_to_sku_map = {
                "https://www.daytona-park.com/item/1021411300003?color=13": "FS-8680-BLK-S"
            }
            
            if url in url_to_sku_map:
                freak_sku = url_to_sku_map[url]
                if freak_sku in self.sku_map:
                    matched_sku = freak_sku
                    easy_sku = self.sku_map[freak_sku]
                    logging.info(f"從 URL 映射表找到 SKU: {freak_sku} -> {easy_sku}")
            
            # 如果沒有映射，使用建檔系統的邏輯生成 SKU
            if not matched_sku:
                print("🔍 開始使用建檔系統邏輯生成 SKU...")
                
                # 策略 1: 對每個庫存組合使用原始日文顏色生成 SKU
                for size, display_color, stock_status in product_info.get('stocks', []):
                    # 獲取對應的原始日文顏色
                    raw_color = product_info.get('raw_colors', {}).get(display_color, display_color)
                    
                    # 使用原始日文顏色生成 SKU（與建檔系統一致）
                    freak_sku = generate_sku(
                        product_info['product_name'],
                        raw_color,  # 使用原始日文顏色
                        size
                    )
                    
                    print(f"  嘗試 SKU: {freak_sku} (商品={product_info['product_name']}, 顏色={raw_color}, 尺寸={size})")
                    tried_skus.add(freak_sku)
                    
                    if freak_sku in self.sku_map:
                        matched_sku = freak_sku
                        easy_sku = self.sku_map[freak_sku]
                        print(f"✅ 找到匹配的 SKU: {freak_sku} -> {easy_sku}")
                        break
                    else:
                        # 也嘗試直接從 variant_df 查找
                        variant_match = self.variant_df[self.variant_df['SKU'].astype(str).str.strip() == freak_sku.strip()]
                        if not variant_match.empty:
                            matched_sku = freak_sku
                            easy_sku = freak_sku  # 使用 SKU 作为 easy_sku
                            print(f"✅ 直接从 variant_df 找到 SKU: {freak_sku}")
                            break
            
            # 如果還是找不到，嘗試其他策略
            if not matched_sku:
                print("🔍 嘗試其他策略...")
                
                # 策略 2: 使用主要顏色和不同尺寸的組合
                main_color = product_info['color']
                raw_main_color = product_info.get('raw_colors', {}).get(main_color, main_color)
                
                common_sizes = ["S", "M", "L", "XL", "ONE SIZE"]
                for common_size in common_sizes:
                    size_sku = generate_sku(
                        product_info['product_name'],
                        raw_main_color,
                        common_size
                    )
                    
                    if size_sku not in tried_skus:
                        tried_skus.add(size_sku)
                        print(f"  嘗試常用尺寸 SKU: {size_sku}")
                        
                        if size_sku in self.sku_map:
                            matched_sku = size_sku
                            easy_sku = self.sku_map[size_sku]
                            print(f"✅ 從常用尺寸找到 SKU: {size_sku} -> {easy_sku}")
                            break
                        else:
                            # 也嘗試直接從 variant_df 查找
                            variant_match = self.variant_df[self.variant_df['SKU'].astype(str).str.strip() == size_sku.strip()]
                            if not variant_match.empty:
                                matched_sku = size_sku
                                easy_sku = size_sku
                                print(f"✅ 直接从 variant_df 找到常用尺寸 SKU: {size_sku}")
                                break
            
            if not matched_sku:
                logging.error(f"嘗試了 {len(tried_skus)} 種 SKU 組合，仍找不到匹配:")
                for i, sku in enumerate(tried_skus):
                    logging.error(f"  {i+1}. {sku}")
                    
                # 列出前幾個現有的 SKU 作為參考
                logging.error("參考現有 SKU:")
                for i, sku in enumerate(list(self.sku_map.keys())[:5]):
                    logging.error(f"  {i+1}. {sku}")
                
                raise ValueError(f"找不到對應的 Easy Store SKU")
            
            # 3. 計算 Easy Store 折扣
            freak_discount = product_info['discount_pct']
            easy_discount = self.calculate_easy_discount(freak_discount)
            
            # 4. 取得 Easy Store 商品和變體信息
            variant_info = self.get_variant_id_by_sku(easy_sku)
            product_id = variant_info["product_id"]
            reference_variant_id = variant_info["variant_id"]
            reference_price = variant_info["price"] or 0
            reference_compare_price = variant_info["compare_at_price"] or reference_price or 0
            
            # 5. 獲取此商品的所有變體
            all_variants = self.get_all_product_variants(product_id)
            
            # 記錄更新結果
            updated_variants = []
            need_additional_discount = False
            final_price = 0
            
            # 6. 對所有變體應用相同折扣
            for variant in all_variants:
                variant_id = variant["id"]

                # —— 1) 先把 price / compare_at_price 轉成整數 ——
                try:
                    price = int(float(variant.get("price", 0)))
                except (TypeError, ValueError):
                    price = 0
                try:
                    compare = int(float(variant.get("compare_at_price", price)))
                except (TypeError, ValueError):
                    compare = price

                # —— 2) 按規則計算折扣後價格 ——
                discounted_price = round(compare * (100 - easy_discount) / 100)
                if discounted_price > 5000 and apply_additional_discount:
                    final_price = round(discounted_price * 0.85)
                else:
                    final_price = discounted_price

                # —— 3) 用 PUT 更新價格，並確保 URL 帶 .json ——
                url = f"{config.BASE_API}/products/{product_id}/variants/{variant_id}.json"
                resp = requests.put(url, headers=config.API_HEADERS, json={"variant": {"price": final_price}})
                resp.raise_for_status()
                logging.info(f"已更新變體 {variant_id} 價格: {compare} → {final_price} (HTTP {resp.status_code})")

                # 記錄結果
                updated_variants.append({
                    "variant_id": variant_id,
                    "sku": variant.get("sku", ""),
                    "original_price": compare,
                    "discounted_price": discounted_price,
                    "final_price": final_price
                })

            
            # 7. 返回結果
            return {
                'success': True,
                'sku': matched_sku,
                'easy_sku': easy_sku,
                'url': url,
                'freak_discount': freak_discount,
                'easy_discount': easy_discount,
                'original_price': reference_compare_price or 0,
                'discounted_price': round((reference_compare_price or 0) * (100 - easy_discount) / 100),
                'final_price': final_price,
                'high_price': need_additional_discount,
                'additional_discount_applied': need_additional_discount and apply_additional_discount,
                'product_id': product_id,
                'variant_id': reference_variant_id,
                'updated_variants_count': len(updated_variants),
                'updated_variants': updated_variants
            }
        except Exception as e:
            logging.error(f"同步折扣失敗: {url} => {e}")
            return {
                'success': False,
                'url': url,
                'error': str(e)
            }
