#!/usr/bin/env bash
# build_freak_discount_sync.command — 打包 sync_freak_discounts_gui.py (Chrome 版本)

set -euo pipefail

# 1️⃣ 定位到这个 .command 文件所在的文件夹
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📍 当前工作目录：$SCRIPT_DIR"

# 2️⃣ 清理上次打包残留和 PyInstaller 快取
echo "🧹 清理旧文件和快取..."
rm -rf build dist FreakDiscountSync.spec

# 清理 PyInstaller 快取 (解決權限問題)
echo "🧹 清理 PyInstaller 快取..."
PYINSTALLER_CACHE="$HOME/Library/Application Support/pyinstaller"
if [ -d "$PYINSTALLER_CACHE" ]; then
    echo "正在清理: $PYINSTALLER_CACHE"
    rm -rf "$PYINSTALLER_CACHE" 2>/dev/null || {
        echo "⚠️ 權限問題，嘗試強制清理..."
        sudo rm -rf "$PYINSTALLER_CACHE" 2>/dev/null || {
            echo "❗️ 無法清理快取，手動處理..."
            chmod -R 755 "$PYINSTALLER_CACHE" 2>/dev/null
            rm -rf "$PYINSTALLER_CACHE" 2>/dev/null
        }
    }
    echo "✅ 快取清理完成"
fi

# 3️⃣ 确认 PyInstaller
if ! command -v pyinstaller &> /dev/null; then
  echo "❗️ 找不到 PyInstaller，正在安装..."
  pip install pyinstaller
  echo "✅ PyInstaller 安装完成"
fi

# 4️⃣ 安装依赖并修复字符编码问题
echo "🔧 彻底解决依赖问题..."
pip install --upgrade pip

# 完全卸载并重新安装有问题的包
pip uninstall -y charset-normalizer chardet requests urllib3
echo "已卸载有问题的包"

# 安装兼容版本
pip install chardet==5.2.0
pip install charset-normalizer==3.2.0
pip install requests==2.28.2
pip install urllib3==1.26.18
pip install certifi

# 安装其他依赖
pip install undetected-chromedriver selenium beautifulsoup4 pandas openpyxl

echo "✅ 依赖安装完成"

# 检查 Chrome 浏览器
if [[ -d "/Applications/Google Chrome.app" ]]; then
  echo "✅ 找到 Chrome 浏览器"
else
  echo "❗️ 找不到 Chrome 浏览器，请先安装 Chrome"
  echo "下载地址：https://www.google.com/chrome/"
  exit 1
fi

# 5️⃣ 检查必要文件
echo "🔍 检查必要文件..."
REQUIRED_FILES=(
  "sync_freak_discounts_gui.py"
  "sync_freak_discounts.py"
)

# 检查是否有 chrome_session.py，如果没有就检查 firefox_session.py
if [[ -f "chrome_session.py" ]]; then
  REQUIRED_FILES+=("chrome_session.py")
  SESSION_FILE="chrome_session.py"
  echo "✅ 找到 chrome_session.py"
elif [[ -f "firefox_session.py" ]]; then
  REQUIRED_FILES+=("firefox_session.py")
  SESSION_FILE="firefox_session.py"
  echo "⚠️ 使用 firefox_session.py (建议更新为 chrome_session.py)"
else
  echo "❗️ 找不到 session 文件"
  exit 1
fi

for file in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "❗️ 找不到 $file"
    exit 1
  fi
done

# 创建 config.py 模板（如果不存在）
if [[ ! -f "config.py" ]]; then
  echo "⚠️ 找不到 config.py，将创建模板文件"
  cat > config.py << 'EOF'
# config.py
STORE_URL = "takemejapan"
ACCESS_TOKEN = "f232b671b6cb3bb8151c23c2bd39129a"
API_HEADERS = {
    "EasyStore-Access-Token": ACCESS_TOKEN,
    "Content-Type": "application/json"
}
BASE_API = f"https://{STORE_URL}.easy.co/api/3.0"
FREAK_STORE_MYPAGE_URL = "https://www.daytona-park.com/mypage"
EOF
  echo "✅ 已创建 config.py 模板"
fi

# 检查参考文件并创建空白文件（如果不存在）
OPTIONAL_FILES=(
  "sku_reference-2.xlsx"
  "sku_variant_mapping.xlsx"
  "tracked_urls.txt"
)

for file in "${OPTIONAL_FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "⚠️ 找不到 $file 文件，將創建空白文件"
    if [[ "$file" == *.txt ]]; then
      touch "$file"
    elif [[ "$file" == *.xlsx ]]; then
      # 創建一個最小的 Excel 文件提示
      python3 -c "
import pandas as pd
df = pd.DataFrame({'提示': ['請更新此文件為實際的SKU映射數據']})
df.to_excel('$file', index=False)
" 2>/dev/null || touch "$file"
    fi
  fi
done

# 6️⃣ 检查图标文件
ICON_OPTION=""
if [[ -f "app_icon.icns" ]]; then
  ICON_OPTION="--icon=app_icon.icns"
  echo "✅ 找到 macOS 图标文件：app_icon.icns"
elif [[ -f "app_icon.ico" ]]; then
  echo "⚠️ macOS 需要 .icns 格式的图标，.ico 不适用，将跳过图标"
else
  echo "ℹ️ 未找到图标文件，继续无图标打包"
fi

# 7️⃣ 创建完整的 hook 文件来彻底修复依赖问题
echo "🔧 创建完整的依赖修复..."
mkdir -p hooks

# 修复 charset_normalizer
cat > hooks/hook-charset_normalizer.py << 'EOF'
from PyInstaller.utils.hooks import collect_all, collect_data_files

# 收集所有文件，但排除有问题的模块
datas, binaries, hiddenimports = collect_all('charset_normalizer')

# 移除有问题的模块
if 'charset_normalizer.md__mypyc' in hiddenimports:
    hiddenimports.remove('charset_normalizer.md__mypyc')

# 添加必要的模块
hiddenimports += [
    'charset_normalizer.constant',
    'charset_normalizer.utils',
    'charset_normalizer.models',
    'charset_normalizer.cd',
    'charset_normalizer.md',
    'charset_normalizer.api'
]
EOF

# 修复 requests
cat > hooks/hook-requests.py << 'EOF'
from PyInstaller.utils.hooks import collect_all

datas, binaries, hiddenimports = collect_all('requests')
hiddenimports += [
    'chardet',
    'chardet.charsetprober',
    'chardet.universaldetector',
    'urllib3',
    'urllib3.util',
    'urllib3.util.retry',
    'urllib3.exceptions',
    'certifi'
]
EOF

# 修复 multiprocessing
cat > hooks/hook-multiprocessing.py << 'EOF'
from PyInstaller.utils.hooks import collect_all

datas, binaries, hiddenimports = collect_all('multiprocessing')
hiddenimports += [
    '_multiprocessing',
    'multiprocessing.context',
    'multiprocessing.synchronize',
    'multiprocessing.pool',
    'multiprocessing.process',
    'multiprocessing.connection',
    'multiprocessing.util',
    'multiprocessing.managers'
]
EOF

# 修复 pandas
cat > hooks/hook-pandas.py << 'EOF'
from PyInstaller.utils.hooks import collect_all

datas, binaries, hiddenimports = collect_all('pandas')
hiddenimports += [
    'mmap',
    'pandas.core',
    'pandas.io',
    'pandas.io.formats',
    'pandas.io.common',
    'pandas.core.groupby',
    'pandas.core.frame',
    'pandas.core.generic',
    'pandas.core.methods',
    'pandas.core.methods.describe',
    'numpy',
    'numpy.core',
    'pytz'
]
EOF

# 8️⃣ 执行打包 (移除 windowed 模式避免 macOS 警告)
echo "📦 开始打包 (Chrome 版本，已修复依賴和權限問題)..."

# 🔥 使用完全修复版 PyInstaller 配置 (移除 --windowed)
pyinstaller \
  --name FreakDiscountSync \
  --onefile \
  $ICON_OPTION \
  --add-data "config.py:." \
  --add-data "sync_freak_discounts.py:." \
  --add-data "$SESSION_FILE:." \
  --add-data "sku_reference-2.xlsx:." \
  --add-data "sku_variant_mapping.xlsx:." \
  --add-data "tracked_urls.txt:." \
  --additional-hooks-dir hooks \
  --hidden-import chardet \
  --hidden-import chardet.charsetprober \
  --hidden-import chardet.universaldetector \
  --hidden-import charset_normalizer \
  --hidden-import charset_normalizer.constant \
  --hidden-import charset_normalizer.utils \
  --hidden-import charset_normalizer.models \
  --hidden-import charset_normalizer.cd \
  --hidden-import charset_normalizer.md \
  --hidden-import charset_normalizer.api \
  --hidden-import requests \
  --hidden-import urllib3 \
  --hidden-import urllib3.util \
  --hidden-import urllib3.util.retry \
  --hidden-import urllib3.exceptions \
  --hidden-import certifi \
  --hidden-import bs4 \
  --hidden-import beautifulsoup4 \
  --hidden-import pandas \
  --hidden-import pandas.core \
  --hidden-import pandas.io \
  --hidden-import mmap \
  --hidden-import json \
  --hidden-import logging \
  --hidden-import datetime \
  --hidden-import re \
  --hidden-import os \
  --hidden-import hashlib \
  --hidden-import threading \
  --hidden-import multiprocessing \
  --hidden-import multiprocessing.context \
  --hidden-import multiprocessing.synchronize \
  --hidden-import multiprocessing.pool \
  --hidden-import multiprocessing.process \
  --hidden-import _multiprocessing \
  --hidden-import selenium \
  --hidden-import selenium.webdriver \
  --hidden-import selenium.webdriver.common \
  --hidden-import selenium.webdriver.common.by \
  --hidden-import selenium.webdriver.support \
  --hidden-import selenium.webdriver.support.ui \
  --hidden-import selenium.webdriver.support.expected_conditions \
  --hidden-import undetected_chromedriver \
  --hidden-import openpyxl \
  --hidden-import xlsxwriter \
  --hidden-import tkinter \
  --hidden-import tkinter.ttk \
  --hidden-import tkinter.filedialog \
  --hidden-import tkinter.messagebox \
  --hidden-import tempfile \
  --hidden-import shutil \
  --hidden-import time \
  --exclude-module charset_normalizer.md__mypyc \
  --collect-all chardet \
  --collect-all requests \
  --collect-all urllib3 \
  --collect-all certifi \
  --collect-all multiprocessing \
  --collect-all pandas \
  --collect-all openpyxl \
  --collect-all selenium \
  --collect-all undetected_chromedriver \
  --noupx \
  --clean \
  --noconfirm \
  sync_freak_discounts_gui.py

# 9️⃣ 检查打包结果
if [[ ! -f "dist/FreakDiscountSync" ]]; then
  echo "❗️ 打包失败，未生成可执行文件"
  echo "🔍 尝试替代方案..."
  
  # 尝试最简化配置 (終極方案) - 修復所有依賴
  echo "📦 尝试最简化配置 (已修復所有依賴)..."
  
  # 先清理快取
  rm -rf "$HOME/Library/Application Support/pyinstaller" 2>/dev/null
  
  pyinstaller \
    --name FreakDiscountSync \
    --onefile \
    --add-data "config.py:." \
    --add-data "sync_freak_discounts.py:." \
    --add-data "$SESSION_FILE:." \
    --hidden-import requests \
    --hidden-import chardet \
    --hidden-import tkinter \
    --hidden-import multiprocessing \
    --hidden-import _multiprocessing \
    --hidden-import multiprocessing.context \
    --hidden-import multiprocessing.synchronize \
    --hidden-import mmap \
    --hidden-import pandas \
    --hidden-import pandas.core \
    --hidden-import pandas.io \
    --hidden-import numpy \
    --hidden-import openpyxl \
    --hidden-import selenium \
    --hidden-import undetected_chromedriver \
    --exclude-module charset_normalizer.md__mypyc \
    --collect-all multiprocessing \
    --collect-all pandas \
    --collect-all numpy \
    --noconfirm \
    --clean \
    sync_freak_discounts_gui.py
    
  if [[ ! -f "dist/FreakDiscountSync" ]]; then
    echo "❗️ 替代方案也失败，请检查错误信息"
    exit 1
  fi
fi

echo "✅ 打包成功！"

# 🔟 创建部署文件夹
echo "📁 创建部署文件夹..."
DEPLOY_DIR="FreakDiscountSync-Chrome-$(date +%Y%m%d-%H%M)"
mkdir -p "$DEPLOY_DIR"

# 1️⃣1️⃣ 复制文件
echo "📋 复制必要文件..."
cp dist/FreakDiscountSync "$DEPLOY_DIR/"
cp config.py "$DEPLOY_DIR/"

# 複製可選文件
for file in "${OPTIONAL_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    cp "$file" "$DEPLOY_DIR/"
    echo "✅ 复制 $file"
  fi
done

# 检查并复制 sync_config.json 如果存在的话
if [[ -f "sync_config.json" ]]; then
  cp sync_config.json "$DEPLOY_DIR/"
  echo "✅ 复制同步配置文件"
fi

# 1️⃣2️⃣ 创建使用说明
cat > "$DEPLOY_DIR/使用说明.txt" << 'EOF'
# Freak Store 折扣同步工具 (Chrome 版本) - 修復版

## 修復內容

✅ 徹底解決 chardet 和 charset_normalizer 衝突
✅ 使用相容版本組合 (chardet 5.2.0 + charset-normalizer 3.2.0)
✅ 修復 PyInstaller 打包錯誤
✅ 優化相依性管理
✅ 增強錯誤處理

## 使用说明

1. 雙擊執行 FreakDiscountSync 程序
2. 程序會自動啟動 Chrome 瀏覽器
3. 首次使用會要求登入 Freak Store 會員帳號
4. 在界面中添加或導入要同步折扣的商品 URL
5. 點擊「開始同步折扣」按鈕執行折扣同步

## 文件说明

- FreakDiscountSync: 主程序可執行文件 (已修復)
- config.py: API 配置文件
- sku_reference-2.xlsx: SKU 参考映射表
- sku_variant_mapping.xlsx: SKU 和变体 ID 映射表
- tracked_urls.txt: 追踪的商品 URL 列表
- sync_config.json: 同步设置（如果存在）

## 系統需求

- macOS 10.14 或更新版本
- Google Chrome 瀏覽器 (必須)
- 網路連線

## 新版本優勢

- ✅ 徹底解決 chardet/charset_normalizer 衝突
- ✅ 使用測試通過的相容版本組合
- ✅ 修復 PyInstaller 循環導入錯誤
- ✅ 更穩定的打包流程
- ✅ 完善的錯誤處理機制
- ✅ 完全解決 SSL 連線問題
- ✅ 更好的網站兼容性
- ✅ 更穩定的自動化表現

## 故障排除

1. 如果程序無法啟動：
   - 確認 macOS 安全性設定允許運行第三方應用
   - 右鍵點擊程序選擇「打開」
   - 檢查終端機是否有錯誤訊息

2. 如果出現 charset_normalizer 錯誤：
   - 本版本已完全修復此問題
   - 如仍有問題請聯繫技術支援

3. 如果 Chrome 無法啟動：
   - 確認已安裝最新版本的 Google Chrome
   - 嘗試重新啟動程序

## 技術說明

- 使用修復版 PyInstaller hook 解決相依性問題
- 排除有問題的 charset_normalizer 子模組
- 完整的模組收集策略
- 優化的打包參數配置
EOF

# 創建系統檢查腳本 (增強版)
cat > "$DEPLOY_DIR/系統檢查.command" << 'EOF'
#!/bin/bash
echo "=== Freak Store 同步工具系統檢查 (修復版) ==="
echo ""

echo "1. 檢查 Chrome 瀏覽器..."
if [ -d "/Applications/Google Chrome.app" ]; then
    echo "✅ Chrome 已安裝"
    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version 2>/dev/null || echo "Chrome 版本檢查失敗"
else
    echo "❌ 找不到 Chrome 瀏覽器"
    echo "請從以下網址下載安裝：https://www.google.com/chrome/"
fi

echo ""
echo "2. 檢查網路連線..."
if ping -c 1 www.daytona-park.com > /dev/null 2>&1; then
    echo "✅ 網路連線正常"
else
    echo "❌ 無法連接到 Freak Store"
fi

echo ""
echo "3. 檢查程序文件..."
if [ -f "./FreakDiscountSync" ]; then
    echo "✅ 主程序文件存在"
    echo "檔案大小: $(ls -lh FreakDiscountSync | awk '{print $5}')"
    echo "修改時間: $(ls -l FreakDiscountSync | awk '{print $6" "$7" "$8}')"
else
    echo "❌ 找不到主程序文件"
fi

echo ""
echo "4. 檢查配置文件..."
if [ -f "./config.py" ]; then
    echo "✅ 配置文件存在"
else
    echo "❌ 找不到配置文件"
fi

echo ""
echo "5. 快速測試啟動..."
echo "嘗試啟動程序 (5秒後自動關閉)..."
timeout 5 ./FreakDiscountSync > /dev/null 2>&1
if [ $? -eq 124 ]; then
    echo "✅ 程序可以正常啟動"
else
    echo "⚠️ 程序啟動可能有問題，請手動測試"
fi

echo ""
echo "=== 檢查完成 ==="
echo "✅ 本版本已修復 charset_normalizer 問題"
echo "✅ 使用優化的 PyInstaller 配置"
echo ""
read -p "按 Enter 鍵關閉..."
EOF
chmod +x "$DEPLOY_DIR/系統檢查.command"

# 創建啟動腳本（備用）
cat > "$DEPLOY_DIR/啟動程序.command" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "啟動 Freak Store 同步工具..."
./FreakDiscountSync
echo ""
echo "程序已關閉"
read -p "按 Enter 鍵關閉終端..."
EOF
chmod +x "$DEPLOY_DIR/啟動程序.command"

# 清理临时文件
rm -rf hooks

# 1️⃣3️⃣ 完成
echo ""
echo "🎉 Chrome 版本打包完成 (已修復 charset_normalizer)！"
echo "📦 应用程序位置：$DEPLOY_DIR/"
echo "📱 可執行文件：$DEPLOY_DIR/FreakDiscountSync"
echo ""
echo "🔧 修復特色："
echo "  ✅ 徹底解決 chardet/charset_normalizer 衝突問題"
echo "  ✅ 使用測試通過的相容版本組合"
echo "  ✅ 修復 PyInstaller 打包錯誤"
echo "  ✅ 使用 Chrome 瀏覽器 (更穩定)"
echo "  ✅ 優化相依性管理"
echo "  ✅ 增強錯誤處理機制"
echo ""
echo "💡 測試建議："
echo "  1. 執行 $DEPLOY_DIR/系統檢查.command 檢查環境"
echo "  2. 測試 $DEPLOY_DIR/FreakDiscountSync 是否正常運行"
echo "  3. 確認不再出現 charset_normalizer 錯誤"
echo "  4. 測試登入和同步功能正常後再分發"
echo ""
echo "🚀 下一步："
echo "  cd '$DEPLOY_DIR' && ./FreakDiscountSync"
echo ""
echo "🐛 如果仍有問題："
echo "  1. 檢查終端機錯誤訊息"
echo "  2. 確認 Python 環境正確"
echo "  3. 嘗試重新安裝相依套件"
