/**
 * 修復資料欄位錯位問題
 * 執行此函式可將舊程式寫錯位置的資料移動到正確欄位
 */
function fixColumnData() {
  const sheet = getSheet('Queue');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  const values = range.getValues();
  const updates = [];
  
  // 欄位索引 (0-based for array access)
  // W=22, X=23, Y=24, Z=25, AA=26, AB=27, AC=28, AD=29
  const IDX = {
    W: 22, X: 23, Y: 24, Z: 25, 
    AA: 26, AB: 27, AC: 28, AD: 29
  };
  
  let fixCount = 0;
  
  values.forEach((row, i) => {
    let modified = false;
    const newRow = [...row];
    
    // 1. 檢查預購資料錯位 (W/X -> Y/Z)
    // W (ReadyToNotify) 如果是 "YYYY-MM" 格式，應該是預購月份
    const valW = String(row[IDX.W] || '');
    if (valW.match(/^\d{4}-\d{2}$/)) {
      newRow[IDX.Y] = valW; // 移到 Y (Pre-order Month)
      newRow[IDX.W] = '';   // 清空 W
      
      // X (Courier) 如果是 "上/中/下"，應該是預購旬
      const valX = String(row[IDX.X] || '');
      if (['上', '中', '下'].includes(valX)) {
        newRow[IDX.Z] = valX; // 移到 Z (Pre-order Ten)
        newRow[IDX.X] = '';   // 清空 X
      }
      modified = true;
    }
    
    // 2. 檢查採購/鎖定資料錯位 (Z/AA/AB/AC -> AC/AD/AA/AB)
    // Z (Pre-order Ten) 如果是 "YYYY-MM-DD" 格式，應該是採購日期
    const valZ = row[IDX.Z];
    let isPurchaseDate = false;
    if (valZ instanceof Date || (typeof valZ === 'string' && valZ.match(/^\d{4}-\d{2}-\d{2}$/))) {
      isPurchaseDate = true;
    }
    
    if (isPurchaseDate) {
      // 讀取舊位置資料
      const oldPurchaseDate = row[IDX.Z];   // Z -> AC
      const oldPurchaseMemo = row[IDX.AA];  // AA -> AD
      const oldLockedBy = row[IDX.AB];      // AB -> AA
      const oldLockedAt = row[IDX.AC];      // AC -> AB
      
      // 寫入新位置
      newRow[IDX.AC] = oldPurchaseDate;
      newRow[IDX.AD] = oldPurchaseMemo;
      newRow[IDX.AA] = oldLockedBy;
      newRow[IDX.AB] = oldLockedAt;
      
      // 清空舊位置 (Z 已經移走，AA/AB/AC 被覆蓋或移走)
      // 注意：Z 是預購旬，如果原本是採購日期，現在移走後應該清空（除非它同時也是預購旬？不太可能）
      if (newRow[IDX.Z] === oldPurchaseDate) {
        newRow[IDX.Z] = ''; 
      }
      
      modified = true;
    }
    
    if (modified) {
      updates.push({ r: i + 2, data: newRow });
      fixCount++;
    }
  });
  
  if (updates.length > 0) {
    // 批次寫入（為了效能，這裡逐行寫入，或者可以整塊寫回）
    // 這裡選擇整塊寫回比較快
    range.setValues(values); // values 已經在上面被修改了 (newRow logic needs to update values array)
    
    // 修正：上面的 forEach 沒有修改 values 陣列本身，需要修正
    updates.forEach(u => {
      // 這裡其實可以直接用 range.setValues(values) 如果我在 forEach 裡直接改 values[i]
    });
  }
  
  // 重新執行一次正確的邏輯
  const newValues = values.map(row => {
    const newRow = [...row];
    let modified = false;
    
    // 1. 檢查預購資料錯位
    const valW = String(row[IDX.W] || '');
    if (valW.match(/^\d{4}-\d{2}$/)) {
      newRow[IDX.Y] = valW;
      newRow[IDX.W] = '';
      
      const valX = String(row[IDX.X] || '');
      if (['上', '中', '下'].includes(valX)) {
        newRow[IDX.Z] = valX;
        newRow[IDX.X] = '';
      }
      modified = true;
    }
    
    // 2. 檢查採購資料錯位
    const valZ = row[IDX.Z];
    let isPurchaseDate = false;
    if (valZ instanceof Date || (typeof valZ === 'string' && valZ.match(/^\d{4}-\d{2}-\d{2}$/))) {
      isPurchaseDate = true;
    }
    
    if (isPurchaseDate) {
      const oldPurchaseDate = row[IDX.Z];
      const oldPurchaseMemo = row[IDX.AA];
      const oldLockedBy = row[IDX.AB];
      const oldLockedAt = row[IDX.AC];
      
      newRow[IDX.AC] = oldPurchaseDate;
      newRow[IDX.AD] = oldPurchaseMemo;
      newRow[IDX.AA] = oldLockedBy;
      newRow[IDX.AB] = oldLockedAt;
      
      // 只有當 Z 還是原本的採購日期時才清空（避免覆蓋掉剛剛移過來的預購旬）
      if (newRow[IDX.Z] === oldPurchaseDate) {
        newRow[IDX.Z] = '';
      }
      modified = true;
    }
    
    return newRow;
  });
  
  if (fixCount > 0 || JSON.stringify(values) !== JSON.stringify(newValues)) {
    range.setValues(newValues);
    Logger.log(`已修復 ${fixCount} 筆資料`);
    return `已成功修復資料！`;
  } else {
    Logger.log('沒有發現需要修復的資料');
    return '資料看起來很正常，無需修復。';
  }
}
