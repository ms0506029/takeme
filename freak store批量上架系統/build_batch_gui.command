#!/usr/bin/env bash
# build_batch_gui.command — Single‑folder 打包 batch_run_gui_improved.py

set -euo pipefail

# 1️⃣ 定位到這個 .command 檔所在的資料夾
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 2️⃣（可選）清理上次打包遺留
rm -rf build dist BatchProductUploader.spec

# 3️⃣ 確認 PyInstaller
if ! command -v pyinstaller &> /dev/null; then
  echo "❗️ 找不到 PyInstaller，請先：pip install pyinstaller"
  exit 1
fi

# 4️⃣ 確認所有必要檔案存在
echo "🔍 檢查必要檔案..."
required_files=(
  "batch_run_gui_improved.py"
  "api_direct_processor.py"
  "html_parser.py"
  "selenium_fetcher.py"
  "config.py"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "❌ 缺少檔案: $file"
    exit 1
  fi
done

echo "✅ 所有必要檔案都存在"

# 5️⃣ 執行 single‑folder 打包
echo "📦 開始打包 single‑folder 模式…"
pyinstaller \
  --name BatchProductUploader \
  --onedir \
  --windowed \
  --add-data "api_direct_processor.py:." \
  --add-data "html_parser.py:." \
  --add-data "selenium_fetcher.py:." \
  --add-data "config.py:." \
  --hidden-import=requests \
  --hidden-import=selenium \
  --hidden-import=pandas \
  --hidden-import=openpyxl \
  --hidden-import=tkinter \
  --hidden-import=concurrent.futures \
  batch_run_gui_improved.py

# 6️⃣ 完成
echo "✅ 打包完成！請看 dist/BatchProductUploader 資料夾"
echo "🚀 執行檔位置: dist/BatchProductUploader/BatchProductUploader"
