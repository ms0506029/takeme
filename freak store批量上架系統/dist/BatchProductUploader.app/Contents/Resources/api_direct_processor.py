import os
import re
import time
import requests
import httpx
import pandas as pd
from datetime import datetime
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed
import json

# 匯入現有模組
try:
    from config import BASE_API, API_HEADERS
except ImportError as e:
    print(f"⚠️ 模組匯入警告: {e}")

class APIDirectProcessor:
    def __init__(self):
        self.processed_count = 0
        self.failed_count = 0
        self.created_products = []  # 儲存成功創建的商品
        # 創建共享的 httpx client（支援 HTTP/2）
        self.http_client = None
        
    def get_http_client(self):
        """獲取或創建 HTTP/2 client"""
        if self.http_client is None:
            self.http_client = httpx.Client(
                http2=True,
                timeout=60.0,
                follow_redirects=True
            )
        return self.http_client
        
    def sanitize_filename(self, name):
        """清理檔案名稱"""
        return re.sub(r'[\\/*?:"<>|]', "", name)
        
    def create_size_table_html(self, parsed_data):
        """根據爬取的尺寸表創建HTML格式"""
        size_table = parsed_data.get("parsed_size_table", "")
        
        if not size_table:
            return ""
            
        # 基本HTML模板
        html_template = '''<p style="box-sizing: inherit;"><strong><span style="color: rgb(235, 107, 86);">＊此商品為「</span><span style="box-sizing: inherit; color: rgb(235, 107, 86);">預購商品</span><span style="color: rgb(235, 107, 86);">」，付款完成後訂單才成立！</span></strong></p><ul style='font-size: 16px; font-style: normal; font-variant-caps: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration: none; box-sizing: inherit; caret-color: rgba(51, 51, 51, 0.75); color: rgba(51, 51, 51, 0.75); font-weight: 700; letter-spacing: 0.6px; font-family: HelveticaNeue, "Helvetica Neue", Helvetica, Arial, sans-serif;'><li style="box-sizing: inherit;">現貨：<span style="box-sizing: inherit; font-weight: 700;">２</span>天內寄出，約<span style="box-sizing: inherit; font-weight: 700;">２-３</span>天到貨。</li><li style="box-sizing: inherit;">預購：下單後約 7<span style="box-sizing: inherit; font-weight: 700;">-14 個工作天(不包含週末例假)安排出貨</span>，約<span style="box-sizing: inherit; font-weight: 700;">２-３</span>天到貨。</li></ul>
<p><span style="font-size: 18px;"><strong><span style="color: rgb(201, 145, 93);">商品規格</span></strong></span></p>
<p>尺寸表</p><p>{size_table}</p><p></p>
<p data-empty="true"><strong><span style="font-size: 18px; color: rgb(201, 145, 93);">⚠️ 購物須知</span></strong></p>
<ol><li>下單前請確認價錢、尺寸、顏色、數量。</li><li>代購商品屬客製化給付，不適用於七天鑑賞期。</li><li>售出後若無重大瑕疵，一律無法提供退換貨。</li><li>為保護雙方權益，開箱前請全程錄影。</li></ol>
<ul><li><span style="font-size: 14px;">下單前請詳閱</span><span style="font-size: 18px;">&nbsp;<a href="https://takemejapan.easy.co/pages/%E8%B3%BC%E8%B2%B7%E9%A0%88%E7%9F%A5%E5%8F%8A%E9%80%80%E8%B2%A8%E8%B3%87%E8%A8%8A" rel="noopener noreferrer" target="_blank">購物須知</a> 、 <a href="https://takemejapan.easy.co/pages/%E9%80%80%E6%8F%9B%E8%B2%A8%E8%AA%AA%E6%98%8E" rel="noopener noreferrer" target="_blank">退換貨說明</a>&nbsp;</span></li>
<li><span style="font-size: 14px;">對商品有任何疑問請先諮詢</span><span style="font-size: 18px;">&nbsp;</span><a href="https://line.me/R/ti/p/@968mrafh"><strong><span style="font-size: 18px; color: rgb(255, 255, 255); background-color: rgb(65, 168, 95);">LINE線上客服</span></strong></a>&nbsp;&nbsp;&nbsp;( 客服時間：12:00-21:00 )</li></ul>'''
        
        return html_template.format(size_table=size_table)
        
    def download_image_fast(self, url, save_path, referer="https://www.daytona-park.com/", retries=3, timeout=60):
        """使用 httpx HTTP/2 快速下載單張圖片"""
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "image/jpeg,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5",
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
        
        for attempt in range(retries):
            try:
                # 使用 httpx with HTTP/2
                with httpx.Client(http2=True, timeout=timeout, follow_redirects=True) as client:
                    response = client.get(url, headers=headers)
                    if response.status_code == 200 and len(response.content) > 1000:
                        os.makedirs(os.path.dirname(save_path), exist_ok=True)
                        with open(save_path, "wb") as f:
                            f.write(response.content)
                        return True
                    else:
                        print(f"   ⚠️ 第 {attempt+1} 次嘗試: HTTP {response.status_code}, 大小 {len(response.content)}")
            except Exception as e:
                if attempt == retries - 1:
                    print(f"❌ 圖片下載失敗: {url[:50]}... - {e}")
        return False
    
    def download_images_to_custom_folder(self, images, custom_name, referer="https://www.daytona-park.com/"):
        """下載圖片到自定義名稱的資料夾（使用 httpx HTTP/2）"""
        result = {
            'downloaded_count': 0,
            'failed_count': 0,
            'folder_path': '',
            'errors': []
        }
        
        if not images:
            return result
            
        # 限制最多150張圖片
        images = images[:150]
        
        # 創建圖片資料夾（使用自定義名稱）
        folder_name = self.sanitize_filename(custom_name)
        image_folder = os.path.join("images", folder_name)
        os.makedirs(image_folder, exist_ok=True)
        result['folder_path'] = image_folder
        
        print(f"📁 創建圖片資料夾: {image_folder}")
        print(f"📸 開始下載 {len(images)} 張圖片（使用 HTTP/2）...")
        
        # 使用多線程快速下載
        with ThreadPoolExecutor(max_workers=6) as executor:
            futures = {}
            for i, img_url in enumerate(images):
                ext = os.path.splitext(img_url)[1].split("?")[0] or '.jpg'
                filename = os.path.join(image_folder, f"{custom_name}_{i+1}{ext}")
                future = executor.submit(self.download_image_fast, img_url, filename, referer)
                futures[future] = (i+1, img_url, filename)
            
            for future in as_completed(futures):
                i, img_url, filename = futures[future]
                try:
                    success = future.result()
                    if success:
                        result['downloaded_count'] += 1
                        print(f"✅ 第 {i} 張圖片下載成功: {filename}")
                    else:
                        result['failed_count'] += 1
                        result['errors'].append(f"第{i}張圖片下載失敗")
                except Exception as e:
                    result['failed_count'] += 1
                    result['errors'].append(f"第{i}張圖片下載異常: {str(e)}")
                    print(f"❌ 圖片下載錯誤: {e}")
                    
        print(f"📊 圖片下載完成: 成功 {result['downloaded_count']}, 失敗 {result['failed_count']}")
        return result
        
    def create_product_via_api(self, product_data):
        """透過API直接創建商品到Easy Store - 完整偵錯版"""
        try:
            custom_name = product_data['custom_name']
            price = product_data['price']
            parsed_data = product_data['parsed_data']

            print(f"🚀 開始透過API創建商品: {custom_name}")
            self._debug_input_data(product_data, parsed_data)

            # 建立商品描述 HTML
            body_html = self.create_size_table_html(parsed_data)
            print(f"📝 商品描述 HTML 長度: {len(body_html)} 字符")

            # 提取和處理庫存、SKU 資料
            stocks = parsed_data.get("stocks", [])
            stocks_qty = parsed_data.get("stocks_qty", [])
            skus = parsed_data.get("skus", [])
            
            self._debug_stock_data(stocks, stocks_qty, skus)

            # 處理預設情況
            if not stocks:
                stocks = [("標準", "標準", "有庫存")]
                stocks_qty = [10]
                skus = [{"Freak SKU": f"{self.sanitize_filename(custom_name)}_STD"}]
                print("📝 使用預設庫存資料")

            # 分析顏色和尺寸
            colors_and_sizes = self._analyze_colors_and_sizes(stocks)
            all_colors = colors_and_sizes['colors']
            all_sizes = colors_and_sizes['sizes']
            
            print(f"📋 最終顏色清單: {all_colors}")
            print(f"📋 最終尺寸清單: {all_sizes}")

            # 根據成功案例格式構建 API payload
            api_payload = self._build_correct_api_payload(
                custom_name, body_html, parsed_data, price,
                all_colors, all_sizes, stocks, stocks_qty, skus
            )

            # 偵錯：顯示完整請求結構
            self._debug_api_payload(api_payload)

            # 發送 API 請求
            response_data = self._send_api_request(api_payload)
            
            # 偵錯：分析 API 回應
            self._debug_api_response(response_data)

            # 處理成功回應
            if response_data['success']:
                return self._handle_success_response(response_data, custom_name, stocks, parsed_data, price)
            else:
                return self._handle_error_response(response_data)

        except Exception as e:
            print(f"❌ create_product_via_api 發生異常: {str(e)}")
            import traceback
            traceback.print_exc()
            self.failed_count += 1
            return {
                'success': False,
                'error': f"異常錯誤: {str(e)}"
            }

    def _debug_input_data(self, product_data, parsed_data):
        """偵錯：輸入資料分析"""
        print(f"🔍 === 輸入資料偵錯 ===")
        print(f"   自定義名稱: {product_data.get('custom_name', 'N/A')}")
        print(f"   價格: {product_data.get('price', 'N/A')}")
        print(f"   品牌: {parsed_data.get('brand', 'N/A')}")
        print(f"   原始商品名: {parsed_data.get('name', 'N/A')}")
        print(f"   圖片數量: {len(parsed_data.get('images', []))}")
        print(f"   庫存資料: {len(parsed_data.get('stocks', []))} 個變體")

    def _debug_stock_data(self, stocks, stocks_qty, skus):
        """偵錯：庫存資料分析"""
        print(f"🔍 === 庫存資料偵錯 ===")
        print(f"   stocks 長度: {len(stocks)}")
        print(f"   stocks_qty 長度: {len(stocks_qty)}")
        print(f"   skus 長度: {len(skus)}")
        
        if stocks:
            print(f"   前3個 stocks: {stocks[:3]}")
        if stocks_qty:
            print(f"   前3個 stocks_qty: {stocks_qty[:3]}")
        if skus:
            print(f"   前3個 skus: {skus[:3]}")

    def _analyze_colors_and_sizes(self, stocks):
        """分析並整理顏色和尺寸"""
        all_colors = []
        all_sizes = []
        
        for (size, color, stock_status) in stocks:
            if color not in all_colors:
                all_colors.append(color)
            if size not in all_sizes:
                all_sizes.append(size)
        
        return {
            'colors': all_colors,
            'sizes': all_sizes,
            'total_combinations': len(stocks)
        }

    def _build_correct_api_payload(self, custom_name, body_html, parsed_data, price,
                              all_colors, all_sizes, stocks, stocks_qty, skus):
        """根據修改需求構建簡化的API格式"""
        print(f"🏗️ === 構建API Payload ===")
        
        # 基本商品結構
        api_payload = {
            "product": {
                "title": custom_name,
                "body_html": body_html,
                "vendor": parsed_data.get("brand", ""),
                "product_type": "服飾配件",
                "published": True,
                "tags": "批量上架,代購商品"
            }
        }

        # 🔥 強制使用單一變體（避免規格問題）
        print(f"📝 創建單一預設變體（總庫存：{sum(int(qty) if str(qty).isdigit() else 0 for qty in stocks_qty) if stocks_qty else 10}）")
        
        api_payload["product"]["variants"] = [
            {
                "title": "預設",
                "price": str(price),
                "compare_at_price": str(price),
                "inventory_quantity": sum(int(qty) if str(qty).isdigit() else 0 for qty in stocks_qty) if stocks_qty else 10,
                "inventory_management": "easystore",
                "inventory_policy": "deny",
                "sku": f"{self.sanitize_filename(custom_name)}_DEFAULT"
            }
        ]
        
        print(f"✅ API Payload 構建完成（單一變體模式）")
        return api_payload

    def _debug_api_payload(self, api_payload):
        """偵錯：API請求內容分析"""
        print(f"🔍 === API Payload 偵錯 ===")
        product = api_payload.get("product", {})
        
        print(f"   商品標題: {product.get('title', 'N/A')}")
        print(f"   品牌: {product.get('vendor', 'N/A')}")
        print(f"   是否包含 options: {'options' in product}")
        print(f"   變體數量: {len(product.get('variants', []))}")
        
        if 'options' in product:
            print(f"   Options: {product['options']}")
        
        if product.get('variants'):
            first_variant = product['variants'][0]
            print(f"   第一個變體: {first_variant}")
            
            # 檢查變體結構
            variant_keys = list(first_variant.keys())
            print(f"   變體包含欄位: {variant_keys}")

    def _send_api_request(self, api_payload):
        """發送API請求並處理回應"""
        endpoint = f"{BASE_API}/products.json"
        print(f"📤 發送API請求到: {endpoint}")
        
        # 顯示關鍵部分的 payload
        print("📤 API Payload 關鍵部分:")
        print(f"   title: {api_payload['product']['title']}")
        print(f"   variants 數量: {len(api_payload['product'].get('variants', []))}")
        if 'options' in api_payload['product']:
            print(f"   options: {api_payload['product']['options']}")

        try:
            response = requests.post(
                endpoint,
                headers=API_HEADERS,
                json=api_payload,
                timeout=30
            )
            
            return {
                'success': response.status_code in [200, 201],
                'status_code': response.status_code,
                'response_text': response.text,
                'response_json': response.json() if response.status_code in [200, 201] else None
            }
            
        except Exception as e:
            print(f"❌ API 請求異常: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'status_code': None,
                'response_text': None
            }

    def _debug_api_response(self, response_data):
        """偵錯：API回應分析"""
        print(f"🔍 === API 回應偵錯 ===")
        print(f"   成功: {response_data['success']}")
        print(f"   狀態碼: {response_data.get('status_code', 'N/A')}")
        
        if response_data['success'] and response_data.get('response_json'):
            product = response_data['response_json'].get('product', {})
            
            print(f"   創建的商品ID: {product.get('id', 'N/A')}")
            print(f"   商品標題: {product.get('title', 'N/A')}")
            
            # 分析變體結構
            variant_types = product.get('variant_types', [])
            variant_options = product.get('variant_options', [])
            variants = product.get('variants', [])
            
            print(f"   variant_types 數量: {len(variant_types)}")
            print(f"   variant_options 數量: {len(variant_options)}")
            print(f"   variants 數量: {len(variants)}")
            
            if variant_types:
                print(f"   variant_types: {[vt.get('name') for vt in variant_types]}")
            
            if variants:
                first_variant = variants[0]
                print(f"   第一個變體名稱: {first_variant.get('name', 'N/A')}")
                print(f"   第一個變體 options: {first_variant.get('options', 'N/A')}")
        
        elif not response_data['success']:
            print(f"   錯誤回應: {response_data.get('response_text', 'N/A')[:200]}")

    def _handle_success_response(self, response_data, custom_name, stocks, parsed_data, price):
        """處理成功回應"""
        result = response_data['response_json']['product']
        
        # 檢查創建的變體結構
        variant_types = result.get('variant_types', [])
        is_multi_variant = len(variant_types) > 1 and any(vt.get('name') in ['顏色', '尺寸', 'Color', 'Size'] for vt in variant_types)
        
        self.created_products.append({
            'custom_name': custom_name,
            'product_id': result["id"],
            'title': result["title"],
            'variants_count': len(result.get("variants", [])),
            'variant_types': [vt.get('name') for vt in variant_types],
            'is_multi_variant_success': is_multi_variant,
            'api_response': result ,
            'original_parsed_data': parsed_data,  # ✅ 加入這行！儲存原始解析資料
            'price': price  # ✅ 加入這行！儲存價格
        })
        
        self.processed_count += 1
        
        success_message = f'商品 "{custom_name}" 已成功上架到Easy Store (ID: {result["id"]})'
        
        if is_multi_variant:
            print("🎉 多維度變體創建成功！")
            success_message += f"\n✅ 成功創建多維度變體：{[vt.get('name') for vt in variant_types]}"
        else:
            print("⚠️ 創建為單一變體，可能需要手動設定多維度規格")
            if len(stocks) > 1:
                success_message += f"\n📋 檢測到 {len(stocks)} 個規格組合，建議檢查後台設定"
        
        print("✅ 商品創建成功!")
        
        return {
            'success': True,
            'product_id': result["id"],
            'title': result["title"],
            'message': success_message,
            'is_multi_variant_success': is_multi_variant,
            'variant_types': [vt.get('name') for vt in variant_types]
        }

    def _handle_error_response(self, response_data):
        """處理錯誤回應"""
        self.failed_count += 1
        
        error_details = {
            'status_code': response_data.get('status_code'),
            'response_text': response_data.get('response_text', '')[:500],
            'error': response_data.get('error', 'Unknown error')
        }
        
        print(f"❌ API 錯誤詳情: {error_details}")
        
        return {
            'success': False,
            'error': f"API錯誤 {error_details['status_code']}: {error_details['response_text']}",
            'error_details': error_details
        }

    
    def get_processing_stats(self):
        """獲取處理統計"""
        return {
            'processed_count': self.processed_count,
            'failed_count': self.failed_count,
            'created_products': self.created_products
        }
    
    def export_summary_report(self, file_path):
        """匯出處理結果摘要報告"""
        try:
            if not self.created_products:
                return {
                    'success': False,
                    'error': '沒有成功創建的商品可匯出'
                }
            
            # 準備報告數據
            report_data = []
            for product in self.created_products:
                report_data.append({
                    '自定義商品名稱': product['custom_name'],
                    'Easy Store商品ID': product['product_id'],
                    'Easy Store商品標題': product['title'],
                    '變體數量': product['variants_count'],
                    '創建時間': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    '狀態': '已成功上架'
                })
            
            # 創建DataFrame並匯出
            df = pd.DataFrame(report_data)
            df.to_excel(file_path, index=False)
            
            return {
                'success': True,
                'file_path': file_path,
                'products_count': len(self.created_products)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
            
    def export_complete_easystore_excel(self, products_list, file_path):
        """匯出完整的Easy Store格式Excel（包含所有規格組合）"""
        try:
            if not products_list:
                return {'success': False, 'error': '沒有商品資料可匯出'}
            
            print(f"🔄 開始匯出 {len(products_list)} 個商品的完整Excel...")
            
            # 準備Excel資料
            rows = []
            
            for product in products_list:
                # 🔥 關鍵修正：直接使用 created_products 中儲存的完整資料
                api_response = product.get('api_response', {})
                
                # 如果有儲存的原始解析資料，使用它
                if 'original_parsed_data' in product:
                    parsed_data = product['original_parsed_data']
                    print(f"✅ 使用商品 {product['custom_name']} 的原始解析資料")
                else:
                    print(f"⚠️ 商品 {product['custom_name']} 缺少原始解析資料，將使用預設值")
                    # 暫時跳過這個商品或使用最小資料
                    continue
                
                # 固定HTML描述
                body_html = self.create_size_table_html(parsed_data)
                
                # 處理每個規格組合
                stocks = parsed_data.get("stocks", [])
                stocks_qty = parsed_data.get("stocks_qty", [])
                skus = parsed_data.get("skus", [])
                
                for i, ((size, color, stock_status), qty) in enumerate(zip(stocks, stocks_qty)):
                    sku = (
                        skus[i]["Freak SKU"]
                        if i < len(skus) and isinstance(skus[i], dict)
                        else f"{self.sanitize_filename(product['custom_name'])}_{i+1}"
                    )
                    
                    row = {
                        "Handle": self.sanitize_filename(product['custom_name']),
                        "Title": product['custom_name'],
                        "Body (HTML)": body_html if i == 0 else "",  # 只有第一行有描述
                        "Published": "TRUE" if i == 0 else "",
                        "Taxable": "No",
                        "Track Inventory": "TRUE" if i == 0 else "",
                        "Option1 Name": "顏色" ,
                        "Option1 Value": color,
                        "Option2 Name": "尺寸" ,
                        "Option2 Value": size,
                        "SKU": sku,
                        "Price": product.get('price', ''),
                        "Compare At Price": product.get('price', ''),
                        "Inventory": qty if str(qty).isdigit() else 10,
                        "Inventory Policy": "deny",
                        "Enabled": "TRUE",
                        "Brands": parsed_data.get("brand", ""),
                        "Weight": 0,
                        "Length (cm)": 0,
                        "Width (cm)": 0,
                        "Height (cm)": 0,
                        "Cost Price": 0
                    }
                    
                    # 圖片只填第一行
                    if i == 0:
                        images = parsed_data.get("images", [])
                        for img_idx, img_url in enumerate(images[:12]):
                            row[f"Image{img_idx+1}"] = img_url
                    
                    rows.append(row)
            
            # 標準Easy Store欄位順序
            export_columns = [
                'Handle', 'Title', 'Meta Description', 'Body (HTML)', 'Published', 'Taxable', 'Free Shipping',
                'Track Inventory', 'Image1', 'Image2', 'Image3', 'Image4', 'Image5', 'Image6', 'Image7', 'Image8',
                'Image9', 'Image10', 'Image11', 'Image12', 'Collection1', 'Collection2', 'Collection3', 'Tags',
                'Brands', 'Vendor', 'Seller Note', 'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value',
                'Option3 Name', 'Option3 Value', 'SKU', 'Barcode', 'Weight', 'Weight Unit', 'Length (cm)', 'Width (cm)',
                'Height (cm)', 'Price', 'Cost Price', 'Inventory', 'Inventory Policy', 'Compare At Price', 'Enabled'
            ]
            
            # 建立DataFrame
            df = pd.DataFrame(rows)
            
            # 確保所有欄位都存在
            for col in export_columns:
                if col not in df.columns:
                    df[col] = ""
            
            # 依照標準順序排列
            df = df[export_columns]
            
            # 匯出Excel
            df.to_excel(file_path, index=False)
            
            print(f"✅ 完整Excel匯出成功：{file_path}")
            
            return {
                'success': True,
                'message': f'已匯出 {len(products_list)} 個商品的完整規格',
                'file_path': file_path,
                'total_rows': len(rows)
            }
            
        except Exception as e:
            print(f"❌ Excel匯出失敗：{str(e)}")
            return {'success': False, 'error': str(e)}
            
    def create_fusion_complete_excel(self, created_products, easystore_file_path, output_file_path):
        """整合融合功能：創建可直接匯入Easy Store的完整Excel"""
        try:
            import pandas as pd
            
            print(f"🔄 開始融合處理...")
            print(f"   API上架商品數：{len(created_products)}")
            print(f"   Easy Store檔案：{easystore_file_path}")
            
            # 1. 讀取Easy Store檔案
            if easystore_file_path.endswith('.xlsx'):
                easystore_data = pd.read_excel(easystore_file_path)
            else:
                easystore_data = pd.read_csv(easystore_file_path)
            
            print(f"   Easy Store資料：{len(easystore_data)} 行")
            
            # 2. 生成規格檔案資料（基於created_products）
            specs_rows = []
            
            for product in created_products:
                if 'original_parsed_data' not in product:
                    print(f"⚠️ 跳過商品 {product['custom_name']}：缺少原始解析資料")
                    continue
                
                parsed_data = product['original_parsed_data']
                custom_name = product['custom_name']
                price = product.get('price', '')
                
                # 處理每個規格組合
                stocks = parsed_data.get("stocks", [])
                stocks_qty = parsed_data.get("stocks_qty", [])
                skus = parsed_data.get("skus", [])
                
                # 如果沒有規格資料，使用預設值
                if not stocks:
                    stocks = [("標準", "標準", "有庫存")]
                    stocks_qty = [10]
                    skus = [{"Freak SKU": f"{self.sanitize_filename(custom_name)}_STD"}]
                
                # 建立每個規格組合的資料
                for i, ((size, color, stock_status), qty) in enumerate(zip(stocks, stocks_qty)):
                    sku = (
                        skus[i]["Freak SKU"]
                        if i < len(skus) and isinstance(skus[i], dict)
                        else f"{self.sanitize_filename(custom_name)}_{i+1}"
                    )
                    
                    specs_row = {
                        "Handle": self.sanitize_filename(custom_name),
                        "Title": custom_name,
                        "Option1 Name": "顏色",
                        "Option1 Value": color,
                        "Option2 Name": "尺寸",
                        "Option2 Value": size,
                        "SKU": sku,
                        "Price": price,
                        "Compare At Price": price,
                        "Inventory": qty if str(qty).isdigit() else 10,
                        "Taxable": "No"
                    }
                    
                    specs_rows.append(specs_row)
            
            specs_data = pd.DataFrame(specs_rows)
            print(f"   生成規格資料：{len(specs_data)} 行")
            
            # 3. 執行融合邏輯
            merged_results = []
            
            # 智能識別名稱欄位
            easystore_name_col = self._find_name_column(easystore_data)
            specs_name_col = 'Title'  # 規格資料固定使用Title
            
            if not easystore_name_col:
                raise Exception("無法識別Easy Store檔案的商品名稱欄位")
            
            print(f"   使用欄位進行匹配：{easystore_name_col} ↔ {specs_name_col}")
            
            # 按照規格檔案的每一行進行處理
            for _, specs_row in specs_data.iterrows():
                product_name = specs_row[specs_name_col]
                
                # 在Easy Store資料中找對應的商品
                matching_rows = easystore_data[
                    easystore_data[easystore_name_col] == product_name
                ]
                
                if len(matching_rows) > 0:
                    # 找到匹配的商品，融合資料
                    easystore_row = matching_rows.iloc[0]
                    merged_row = self._merge_single_product_fusion(easystore_row, specs_row, easystore_data.columns, specs_data.columns)
                    merged_results.append(merged_row)
                    print(f"✅ 融合商品：{product_name}")
                else:
                    # 如果Easy Store中沒有，直接使用規格資料
                    merged_row = dict(specs_row)
                    # 補完必要欄位
                    merged_row.update({
                        "Body (HTML)": "",
                        "Published": "TRUE",
                        "Track Inventory": "TRUE",
                        "Inventory Policy": "deny",
                        "Enabled": "TRUE"
                    })
                    merged_results.append(merged_row)
                    print(f"⚠️ Easy Store中未找到，使用規格資料：{product_name}")
            
            if not merged_results:
                raise Exception("沒有成功融合任何資料")
            
            # 4. 建立最終DataFrame並匯出
            merged_data = pd.DataFrame(merged_results)
            
            # 確保標準Easy Store欄位存在
            standard_columns = [
                'Handle', 'Title', 'Meta Description', 'Body (HTML)', 'Published', 'Taxable', 'Free Shipping',
                'Track Inventory', 'Image1', 'Image2', 'Image3', 'Image4', 'Image5', 'Image6', 'Image7', 'Image8',
                'Image9', 'Image10', 'Image11', 'Image12', 'Collection1', 'Collection2', 'Collection3', 'Tags',
                'Brands', 'Vendor', 'Seller Note', 'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value',
                'Option3 Name', 'Option3 Value', 'SKU', 'Barcode', 'Weight', 'Weight Unit', 'Length (cm)', 'Width (cm)',
                'Height (cm)', 'Price', 'Cost Price', 'Inventory', 'Inventory Policy', 'Compare At Price', 'Enabled'
            ]
            
            for col in standard_columns:
                if col not in merged_data.columns:
                    merged_data[col] = ""
            
            # 按標準順序排列
            available_cols = [col for col in standard_columns if col in merged_data.columns]
            merged_data = merged_data[available_cols]
            
            # 匯出Excel
            merged_data.to_excel(output_file_path, index=False)
            
            print(f"✅ 融合完整Excel匯出成功：{output_file_path}")
            
            return {
                'success': True,
                'message': f'已匯出融合後的完整格式',
                'file_path': output_file_path,
                'total_rows': len(merged_results)
            }
            
        except Exception as e:
            print(f"❌ 融合Excel匯出失敗：{str(e)}")
            return {'success': False, 'error': str(e)}

    def _find_name_column(self, df):
        """智能尋找名稱欄位"""
        possible_names = ['Title', 'title', '商品名稱', 'Name', 'name', 'Handle']
        for col in possible_names:
            if col in df.columns:
                return col
        return None

    def _merge_single_product_fusion(self, easystore_row, specs_row, easystore_columns, specs_columns):
        """融合單一商品資料（專用於融合功能）"""
        merged_row = {}
        
        # 優先使用Easy Store的基本資訊
        for col in easystore_columns:
            merged_row[col] = easystore_row[col]
            
        # 覆蓋或新增規格檔案的資訊
        for col in specs_columns:
            if col in ['Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value',
                      'SKU', 'Inventory', 'Price', 'Compare At Price', 'Taxable']:
                merged_row[col] = specs_row[col]
        
        # 強制補完關鍵欄位
        if 'Option1 Name' in merged_row:
            if pd.isna(merged_row['Option1 Name']) or merged_row['Option1 Name'] == '' or merged_row['Option1 Name'] is None:
                merged_row['Option1 Name'] = '顏色'
        
        if 'Option2 Name' in merged_row:
            if pd.isna(merged_row['Option2 Name']) or merged_row['Option2 Name'] == '' or merged_row['Option2 Name'] is None:
                merged_row['Option2 Name'] = '尺寸'
        
        # 確保Taxable為No
        merged_row['Taxable'] = 'No'
                
        return merged_row
