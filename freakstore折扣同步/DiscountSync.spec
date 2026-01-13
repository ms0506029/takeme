# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['sync_freak_discounts_gui.py'],
    pathex=[],
    binaries=[],
    datas=[
        # 使用絕對路徑以確保文件被找到
        ('/Users/chenyanxiang/Desktop/discount_update/sku_variant_mapping.xlsx', '.'),
        ('/Users/chenyanxiang/Desktop/discount_update/tracked_urls.txt', '.'),
        ('/Users/chenyanxiang/Desktop/discount_update/sku_reference-2.xlsx', '.'),
        # 如果有 config.py，也包含它
        ('/Users/chenyanxiang/Desktop/discount_update/config.py', '.'),
    ],
    hiddenimports=['freak_stock_fetcher'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='DiscountSync',
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
    name='DiscountSync',
)
app = BUNDLE(
    coll,
    name='DiscountSync.app',
    icon=None,
    bundle_identifier=None,
)
