# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['batch_run_gui_improved.py'],
    pathex=[],
    binaries=[],
    datas=[('api_direct_processor.py', '.'), ('html_parser.py', '.'), ('selenium_fetcher.py', '.'), ('config.py', '.')],
    hiddenimports=['requests', 'selenium', 'pandas', 'openpyxl', 'tkinter', 'concurrent.futures'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='BatchProductUploader',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='BatchProductUploader',
)
app = BUNDLE(
    coll,
    name='BatchProductUploader.app',
    icon=None,
    bundle_identifier=None,
)
