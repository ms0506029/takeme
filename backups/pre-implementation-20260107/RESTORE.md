# 備份還原說明

**備份時間：** 2026-01-07  
**備份原因：** 執行 Daytona Park 全功能實裝前的破壞性變更保護

---

## 備份內容

| 檔案/資料夾 | 原始路徑 | 說明 |
|------------|---------|------|
| `globals/` | `src/globals/` | Header.ts, Footer.ts (會被擴充欄位) |
| `ScrapbookRanking/` | `src/blocks/ScrapbookRanking/` | 會新增 Auto/Manual 模式欄位 |
| `RenderBlocks.tsx` | `src/blocks/RenderBlocks.tsx` | 會新增區塊註冊 |
| `Pages/` | `src/collections/Pages/` | 會新增 Blocks 到 layout |
| `Products/` | `src/collections/Products/` | 會新增審核狀態欄位 |

---

## 還原指令

如需還原所有變更，請執行以下指令：

```bash
# 進入專案目錄
cd /Users/chenyanxiang/Desktop/網頁開發

# 還原 Globals
cp -r backups/pre-implementation-20260107/globals/* src/globals/

# 還原 ScrapbookRanking Block
cp -r backups/pre-implementation-20260107/ScrapbookRanking/* src/blocks/ScrapbookRanking/

# 還原 RenderBlocks
cp backups/pre-implementation-20260107/RenderBlocks.tsx src/blocks/RenderBlocks.tsx

# 還原 Pages Collection
cp -r backups/pre-implementation-20260107/Pages/* src/collections/Pages/

# 還原 Products Collection
cp -r backups/pre-implementation-20260107/Products/* src/collections/Products/
```

---

## 一鍵還原腳本

```bash
#!/bin/bash
# restore.sh - 一鍵還原備份

BACKUP_DIR="backups/pre-implementation-20260107"
SRC_DIR="src"

cp -r $BACKUP_DIR/globals/* $SRC_DIR/globals/
cp -r $BACKUP_DIR/ScrapbookRanking/* $SRC_DIR/blocks/ScrapbookRanking/
cp $BACKUP_DIR/RenderBlocks.tsx $SRC_DIR/blocks/RenderBlocks.tsx
cp -r $BACKUP_DIR/Pages/* $SRC_DIR/collections/Pages/
cp -r $BACKUP_DIR/Products/* $SRC_DIR/collections/Products/

echo "✅ 還原完成！請重新啟動開發伺服器。"
```

---

## 注意事項

> [!WARNING]
> 還原後需要執行 `npm run dev` 重新啟動開發伺服器，讓 Payload 重新生成 Types。
