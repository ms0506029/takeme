# config.py - 批量上架系統設定檔

# Daytona商品頁設定
FREAK_STORE_LOGIN_URL = "https://www.daytona-park.com/auth/login"
FREAK_STORE_MYPAGE_URL = "https://www.daytona-park.com/mypage"

# Easy Store API 設定
STORE_URL = "takemejapan"
ACCESS_TOKEN = "f232b671b6cb3bb8151c23c2bd39129a"
API_HEADERS = {
    "EasyStore-Access-Token": ACCESS_TOKEN,
    "Content-Type": "application/json"
}
BASE_API = f"https://{STORE_URL}.easy.co/api/3.0"

# Cloudinary 設定（請確保這些值是正確的）
CLOUDINARY_CONFIG = {
    "cloud_name": "djbn6athy",
    "api_key": "382996328337748",
    "api_secret": "rN6u-ItvedJMSrfHcyeX5jfjpJw"
}

# 批量處理設定
BATCH_SETTINGS = {
    "max_products": 25,           # 最大同時處理商品數
    "max_images_per_product": 50, # 每個商品最大圖片數
    "request_delay": 2,           # 請求間隔（秒）
    "retry_attempts": 3,          # 失敗重試次數
    "timeout": 30                 # 請求超時時間（秒）
}

# Excel匯出設定
EXCEL_SETTINGS = {
    "default_published": "TRUE",
    "default_taxable": "FALSE",
    "default_free_shipping": "FALSE",
    "default_track_inventory": "TRUE",
    "default_inventory_policy": "deny",
    "default_enabled": "TRUE",
    "default_weight_unit": "kg"
}

# 圖片處理設定
IMAGE_SETTINGS = {
    "download_timeout": 20,       # 圖片下載超時
    "max_file_size": 10 * 1024 * 1024,  # 最大檔案大小 10MB
    "allowed_formats": ['.jpg', '.jpeg', '.png', '.webp'],
    "quality": 85                 # 壓縮品質
}

# 日誌設定
LOG_SETTINGS = {
    "enable_file_log": True,      # 是否啟用檔案日誌
    "log_file": "batch_processing.log",
    "log_level": "INFO"
}

# 預設HTML模板
DEFAULT_HTML_TEMPLATE = '''<p style="box-sizing: inherit;"><strong><span style="color: rgb(235, 107, 86);">＊此商品為「</span><span style="box-sizing: inherit; color: rgb(235, 107, 86);">預購商品</span><span style="color: rgb(235, 107, 86);">」，付款完成後訂單才成立！</span></strong></p><ul style='font-size: 16px; font-style: normal; font-variant-caps: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration: none; box-sizing: inherit; caret-color: rgba(51, 51, 51, 0.75); color: rgba(51, 51, 51, 0.75); font-weight: 700; letter-spacing: 0.6px; font-family: HelveticaNeue, "Helvetica Neue", Helvetica, Arial, sans-serif;'><li style="box-sizing: inherit;">現貨：<span style="box-sizing: inherit; font-weight: 700;">２</span>天內寄出，約<span style="box-sizing: inherit; font-weight: 700;">２-３</span>天到貨。</li><li style="box-sizing: inherit;">預購：下單後約 7<span style="box-sizing: inherit; font-weight: 700;">-14 個工作天(不包含週末例假)安排出貨</span>，約<span style="box-sizing: inherit; font-weight: 700;">２-３</span>天到貨。</li></ul>
<p><span style="font-size: 18px;"><strong><span style="color: rgb(201, 145, 93);">商品規格</span></strong></span></p>
<p>尺寸表</p><p>{size_table}</p><p></p>
<p data-empty="true"><strong><span style="font-size: 18px; color: rgb(201, 145, 93);">⚠️ 購物須知</span></strong></p>
<ol><li>下單前請確認價錢、尺寸、顏色、數量。</li><li>代購商品屬客製化給付，不適用於七天鑑賞期。</li><li>售出後若無重大瑕疵，一律無法提供退換貨。</li><li>為保護雙方權益，開箱前請全程錄影。</li></ol>
<ul><li><span style="font-size: 14px;">下單前請詳閱</span><span style="font-size: 18px;">&nbsp;<a href="https://takemejapan.easy.co/pages/%E8%B3%BC%E8%B2%B7%E9%A0%88%E7%9F%A5%E5%8F%8A%E9%80%80%E8%B2%A8%E8%B3%87%E8%A8%8A" rel="noopener noreferrer" target="_blank">購物須知</a> 、 <a href="https://takemejapan.easy.co/pages/%E9%80%80%E6%8F%9B%E8%B2%A8%E8%AA%AA%E6%98%8E" rel="noopener noreferrer" target="_blank">退換貨說明</a>&nbsp;</span></li>
<li><span style="font-size: 14px;">對商品有任何疑問請先諮詢</span><span style="font-size: 18px;">&nbsp;</span><a href="https://line.me/R/ti/p/@968mrafh"><strong><span style="font-size: 18px; color: rgb(255, 255, 255); background-color: rgb(65, 168, 95);">LINE線上客服</span></strong></a>&nbsp;&nbsp;&nbsp;( 客服時間：12:00-21:00 )</li></ul>'''
