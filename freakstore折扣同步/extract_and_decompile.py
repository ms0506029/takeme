#!/usr/bin/env python3
# extract_and_decompile.py
#
# 自動化提取並反編譯 PyInstaller 打包的可執行檔
# 使用前請：
# 1. 將 pyinstxtractor.py 放在同一目錄
# 2. pip install uncompyle6

import os
import subprocess
import sys

# TODO: 如果有多平台需求，可改成命令列參數讀取
# Path to the bundled executable inside 解壓後的目錄
binary_path = os.path.join(
    'DiscountSync_app_extracted',
    'DiscountSync.app',
    'Contents',
    'MacOS',
    'DiscountSync'
)

# 名稱約定：pyinstxtractor.py、extract_and_decompile.py 放同一層
extractor_script = 'pyinstxtractor.py'

# 輸出資料夾
output_dir = 'extracted_pyc'
decompiled_dir = 'decompiled_source'

# 建立資料夾
os.makedirs(output_dir, exist_ok=True)
os.makedirs(decompiled_dir, exist_ok=True)

# 1. 提取 .pyc
print(f"[*] Extracting .pyc files from: {binary_path}")
ret = subprocess.run(
    [sys.executable, extractor_script, binary_path, '-o', output_dir],
    capture_output=True
)
if ret.returncode != 0:
    print("[ERROR] Extraction failed:")
    print(ret.stderr.decode())
    sys.exit(1)
print("[+] Extraction complete.")

# 2. 反編譯所有 .pyc
print("[*] Decompiling .pyc files...")
for root, dirs, files in os.walk(output_dir):
    for fname in files:
        if not fname.endswith('.pyc'):
            continue
        pyc_path = os.path.join(root, fname)
        # 保留相對結構
        rel_root = os.path.relpath(root, output_dir)
        dest_dir = os.path.join(decompiled_dir, rel_root)
        os.makedirs(dest_dir, exist_ok=True)

        out_py = os.path.join(dest_dir, fname[:-4] + '.py')
        cmd = ['uncompyle6', '-o', out_py, pyc_path]
        proc = subprocess.run(cmd, capture_output=True)
        if proc.returncode != 0:
            print(f"[ERROR] Failed to decompile {pyc_path}")
            print(proc.stderr.decode())
        else:
            print(f"[OK] Decompiled → {out_py}")

print("[+] All done. Decompiled sources are in:", decompiled_dir)
