#!/bin/bash
# restore.sh - 一鍵還原 pre-implementation 備份
# 使用方式: chmod +x restore.sh && ./restore.sh

BACKUP_DIR="backups/pre-implementation-20260107"
SRC_DIR="src"

echo "🔄 開始還原備份..."

cp -r $BACKUP_DIR/globals/* $SRC_DIR/globals/
cp -r $BACKUP_DIR/ScrapbookRanking/* $SRC_DIR/blocks/ScrapbookRanking/
cp $BACKUP_DIR/RenderBlocks.tsx $SRC_DIR/blocks/RenderBlocks.tsx
cp -r $BACKUP_DIR/Pages/* $SRC_DIR/collections/Pages/
cp -r $BACKUP_DIR/Products/* $SRC_DIR/collections/Products/

echo "✅ 還原完成！"
echo "📝 請執行 'npm run dev' 重新啟動開發伺服器。"
