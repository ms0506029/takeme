#!/bin/bash
# 啟動_Freak_Store_同步工具.command

# 設定腳本位置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 啟動 Freak Store 折扣同步工具..."
echo "📍 工作目錄：$SCRIPT_DIR"

# 檢查 Python 3
if ! command -v python3 &> /dev/null; then
    echo "❗️ 找不到 Python 3，請先安裝 Python"
    echo "下載地址：https://www.python.org/downloads/"
    read -p "按 Enter 鍵關閉..."
    exit 1
fi

# 檢查必要檔案
if [[ ! -f "sync_freak_discounts_gui.py" ]]; then
    echo "❗️ 找不到主程式檔案：sync_freak_discounts_gui.py"
    read -p "按 Enter 鍵關閉..."
    exit 1
fi

# 檢查依賴
echo "🔍 檢查 Python 依賴..."
python3 -c "
try:
    import tkinter
    import pandas
    import requests
    import selenium
    import undetected_chromedriver
    import bs4  # 正確的導入方式
    import openpyxl
    print('✅ 所有依賴正常')
except ImportError as e:
    print(f'❌ 缺少依賴：{e}')
    print('請執行：pip3 install pandas requests selenium undetected-chromedriver beautifulsoup4 openpyxl')
    exit(1)
"

if [ $? -ne 0 ]; then
    echo ""
    echo "💡 安裝依賴指令："
    echo "pip3 install pandas requests selenium undetected-chromedriver beautifulsoup4 openpyxl"
    read -p "按 Enter 鍵關閉..."
    exit 1
fi

# 檢查 Chrome 瀏覽器
if [[ ! -d "/Applications/Google Chrome.app" ]]; then
    echo "⚠️ 找不到 Chrome 瀏覽器"
    echo "請先安裝 Chrome：https://www.google.com/chrome/"
    echo "程式仍會嘗試啟動..."
fi

echo ""
echo "🎉 環境檢查完成，正在啟動程式..."
echo "===================================="

# 啟動程式
python3 sync_freak_discounts_gui.py

echo ""
echo "===================================="
echo "程式已結束"
read -p "按 Enter 鍵關閉終端..."
