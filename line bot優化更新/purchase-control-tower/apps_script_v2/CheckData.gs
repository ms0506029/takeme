function checkMisplacedData() {
  const sheet = getSheet('Queue');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    console.log('No data to check.');
    return;
  }
  
  // Get columns W (23) and X (24)
  // getRange(row, col, numRows, numCols)
  const range = sheet.getRange(2, 23, lastRow - 1, 2);
  const values = range.getValues();
  
  let foundCount = 0;
  values.forEach((row, i) => {
    const valW = String(row[0] || '');
    const valX = String(row[1] || '');
    
    if (valW.match(/^\d{4}-\d{2}$/) || ['上', '中', '下'].includes(valX)) {
      console.log(`Found potential misplaced data at row ${i + 2}: W='${valW}', X='${valX}'`);
      foundCount++;
    }
  });
  
  console.log(`Total potential misplaced rows found: ${foundCount}`);
}
