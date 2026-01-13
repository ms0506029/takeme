import hashlib
from collections import OrderedDict

# 定義顏色映射
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

# 僅保留中文字或英文字母的首字母並轉為大寫
def simplify_product_name(name):
    # 將名稱按空格分割成詞
    words = name.split()
    # 對於每個詞，只取首字母
    simplified = ''.join([word[0].upper() if word else '' for word in words])
    return simplified

def simplify_color_name(color_name):
    for jp, code in COLOR_MAP.items():
        if jp in color_name:
            return code
    return "UNK"

def short_hash(text, length=4):
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:length].upper()

def generate_sku(product_name, color, size):
    prefix = "FS"
    color_code = simplify_color_name(color)
    # 直接使用原始參數生成哈希值
    hash_part = short_hash(f"{product_name}-{color}-{size}")
    return f"{prefix}-{hash_part}-{color_code}-{size}"
