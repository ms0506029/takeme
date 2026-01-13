# config.py

FREAK_STORE_LOGIN_URL   = "https://www.daytona-park.com/auth/login"
FREAK_STORE_MYPAGE_URL  = "https://www.daytona-park.com/mypage"      # ← 你实际的会员页地址

STORE_URL = "takemejapan"
ACCESS_TOKEN = "f232b671b6cb3bb8151c23c2bd39129a"
API_HEADERS = {
    "EasyStore-Access-Token": ACCESS_TOKEN,
    "Content-Type": "application/json"
}
BASE_API = f"https://{STORE_URL}.easy.co/api/3.0"
