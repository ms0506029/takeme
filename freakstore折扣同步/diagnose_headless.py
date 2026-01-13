# check_imports.py - 檢查哪個 firefox_session 被載入

import sys
import importlib
import os

print("🔍 檢查 Python 模組載入情況...")
print("=" * 60)

# 列出所有 firefox_session 相關檔案
print("\n📁 當前目錄中的 firefox_session 檔案：")
for file in os.listdir('.'):
    if 'firefox_session' in file and file.endswith('.py'):
        print(f"  - {file}")

# 檢查已載入的模組
print("\n📦 已載入的 firefox_session 模組：")
for name, module in sys.modules.items():
    if 'firefox_session' in name:
        print(f"  模組名: {name}")
        if hasattr(module, '__file__'):
            print(f"  檔案路徑: {module.__file__}")

# 嘗試 import 並查看載入哪個檔案
print("\n🧪 測試 import firefox_session：")
try:
    # 先清除可能的快取
    if 'firefox_session' in sys.modules:
        del sys.modules['firefox_session']
    
    import firefox_session
    print(f"  載入的檔案: {firefox_session.__file__}")
    
    # 檢查是否有 headless 相關的屬性或程式碼
    import inspect
    source = inspect.getsource(firefox_session)
    if 'headless' in source:
        lines = source.split('\n')
        for i, line in enumerate(lines):
            if 'headless' in line and 'add_argument' not in line:
                print(f"  ⚠️  第 {i+1} 行發現 headless: {line.strip()}")
                
except Exception as e:
    print(f"  ❌ 載入失敗: {e}")

print("\n" + "=" * 60)
