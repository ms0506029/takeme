/***** Purchase Control Tower PRO（Safari 版 + CSV 匯出） *****
 * 你會得到：
 * - UI 控制台（統計 + 列表 + 一鍵匯出）
 * - Safari 書籤端點：?action=markPurchased
 * - 匯出兩份 CSV：so_memo_update_*.csv、so_status_update_*.csv（可關閉狀態檔）
 * - （可選）EasyStore 拉單：?action=pullPaidOrders
 ****************************************************************/

/***** 0) 環境參數（請先替換） *****/
const CFG = {
  SPREADSHEET_ID: '1YZqQBeujZ888XjlVxjGTAIKdbz4nzmXvxQ2j5kv1-jo',  // 試算表 ID（網址 /d/ 與 /edit 間那串）
  SHEET_QUEUE: 'Queue',
  SHEET_SO_MAP: 'SO_Map',
  SHEET_SKU_REF: 'SKU_Ref',                        // 可無此表
  EXPORT_FOLDER_NAME: 'ECOUNT_CSV_EXPORTS',        // 匯出 CSV 的雲端硬碟資料夾
  DATE_TZ: 'Asia/Tokyo',
  // 狀態值域（新增 PREORDER=預購）
  STATUS: { PENDING:'待購', LOCKED:'鎖定-購買中', DONE:'已購', OOS:'缺貨', PREORDER:'預購' },
  // 摘要統一字樣
  MEMO_OK_FORMAT: 'MM/DD ok',
  // 進行狀態要回寫的值（若你要關閉狀態 CSV，改下面開關即可）
  EC_STATUS_VALUE: '已購買',
  EXPORT_STATUS_CSV: false,                        // ← 預設關閉狀態檔（你只需摘要）
  // EasyStore（可選）
  EASYSTORE_TOKEN: '<<PUT_EASYSTORE_ACCESS_TOKEN>>'
};

// ECOUNT 採購單輸出參數（如需調整可修改此區）
const PO_CFG = {
  EMP_CD: 'TUV',
  WH_CD: '100',
  // ECOUNT 貨幣欄需填代碼，預設 JPY = 00001
  CURRENCY_CODE: '00001',
  EXCHANGE_RATE: '',
  MAX_LINES_PER_PO: 30,
  SUPPLIER_CODE_MAP: {
    'freak-j': 'Freaks store-傑',
    'zozo-h':  'ZOZOTOWN-胡'
  },
  SUPPLIER_NAME_MAP: {
    'freak-j': 'Freaks store-傑',
    'zozo-h':  'ZOZOTOWN-胡'
  }
};

/***** 1) 共用工具 *****/
function getSpreadsheetId_(){
  // 1) 若常數已設定，直接用
  if(!isPlaceholderId_()) return CFG.SPREADSHEET_ID;
  // 2) 否則讀取 Script Properties 綁定的 ID
  const props = PropertiesService.getScriptProperties();
  const saved = props.getProperty('SPREADSHEET_ID');
  if(saved) return saved;
  // 3) 尚未綁定，回傳 null 讓呼叫端有機會處理（或由 initSheets_ 綁定）
  return null;
}
function ss(){
  const id = getSpreadsheetId_();
  if(!id) throw new Error('尚未設定試算表 ID。請先執行 action=initSheets 產生並綁定，或在 CFG.SPREADSHEET_ID 設定。');
  return SpreadsheetApp.openById(id);
}
function sh(name){ return ss().getSheetByName(name); }
function fmt(date, pat){ return Utilities.formatDate(date, CFG.DATE_TZ, pat); }
function todayMMDD(){ return fmt(new Date(), 'MM/dd'); }
function headerIndexMap(header){ const m={}; header.forEach((h,i)=>m[h]=i); return m; }
function indexRow_(header, row){ const o={}; header.forEach((h,i)=>o[h]=row[i]); return o; }
// 將儲存格的日期值正規化為 yyyyMMdd 字串
function toYmd_(v){
  if(!v) return '';
  if(v instanceof Date) return Utilities.formatDate(v, CFG.DATE_TZ, 'yyyyMMdd');
  const s = String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.replace(/-/g,'');
  if(/^\d{8}$/.test(s)) return s;
  // 其餘情況（如已是自訂格式），直接回傳原值避免 toString() 變長字串
  return s;
}
function getAllRows_(sheetName){
  const sheet = sh(sheetName); const rng = sheet.getDataRange();
  const vals = rng.getValues(); return { sheet, vals, header: vals[0] };
}
function setRows_(sheet, rowIndexes, kv){
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const arr = sheet.getRange(2,1,Math.max(sheet.getLastRow()-1,0),sheet.getLastColumn()).getValues();
  rowIndexes.forEach(r=>{
    const i=r-2; if(!arr[i]) return;
    Object.entries(kv).forEach(([h,v])=>{ const ci=headers.indexOf(h); if(ci>=0) arr[i][ci]=v; });
  });
  if(arr.length) sheet.getRange(2,1,arr.length,arr[0].length).setValues(arr);
}
function ensureExportFolder_(){
  const it = DriveApp.getFoldersByName(CFG.EXPORT_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CFG.EXPORT_FOLDER_NAME);
}
function createCsvFile_(name, content){
  const file = ensureExportFolder_().createFile(name, content, MimeType.CSV);
  return { id:file.getId(), url:file.getUrl(), name:file.getName() };
}
function csvEscape_(s){ s=(s==null)?'':String(s); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }

// 建立一個臨時 Spreadsheet，寫入 values，匯出為 Excel（.xlsx），並存到匯出資料夾；最後把臨時表丟到垃圾桶
function createExcelFromValues_(baseName, sheetName, values){
  const ss = SpreadsheetApp.create(baseName);
  try{
    const sh = ss.getSheets()[0];
    if(sheetName) sh.setName(sheetName);
    if(values && values.length){
      // 先確保列數、欄數足夠
      const rows = values.length; const cols = values[0].length;
      if(sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows());
      if(sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
      sh.getRange(1,1,rows,cols).setValues(values);
    }
    SpreadsheetApp.flush();
    Utilities.sleep(200); // 確保寫入已提交再匯出
    const url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
    const resp = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if(resp.getResponseCode() !== 200){
      throw new Error('HTTP ' + resp.getResponseCode() + ' ' + resp.getContentText());
    }
    const blob = resp.getBlob().setName(baseName + '.xlsx');
    const file = ensureExportFolder_().createFile(blob);
    try{ DriveApp.getFileById(ss.getId()).setTrashed(true); }catch(err){}
    return { id:file.getId(), url:file.getUrl(), name:file.getName() };
  }catch(err){
    // 若匯出失敗，紀錄錯誤並回傳 CSV 以不阻斷流程
    const csv = (values||[]).map(a=>a.map(csvEscape_).join(',')).join('\n');
    Logger.log('Excel 匯出失敗：' + err);
    return createCsvFile_(baseName + '.csv', csv);
  }
}

/***** 2) Web 入口 *****/
function doGet(e){
  // 預設直接回傳 UI；如需外層框架可用 ?action=frame
  const action = (e && e.parameter && e.parameter.action) || 'ui';
  try{
    if(action==='markPurchased')     return markPurchased_(e);   // 書籤一鍵標記
    if(action==='exportEcountCsv')   return exportEcountCsv_();  // 匯出 CSV（摘要 + 狀態）
    if(action==='pullPaidOrders')    return pullPaidOrders_();   // （可選）拉單
    if(action==='initSheets')        return initSheets_(e);      // 一鍵建立試算表與工作表
    if(action==='importEsXlsx')      return importEsXlsx_(e);    // 匯入 EasyStore 匯出 Excel（Drive 檔案 ID）
    if(action==='listCandidates')    return jsonOk_(listCandidates_()); // 供 UI 勾選
    if(action==='updateSelection')   return updateSelection_(e); // UI 勾選後批次標記
    if(action==='exportBatchItemsCsv') return exportBatchItemsCsv_(e); // 匯出批次的 items CSV（給 CLI 轉 Excel）
    if(action==='exportSelectedItemsCsv') return exportSelectedItemsCsv_(e); // 依目前選取列輸出 items CSV
    if(action==='exportSelectedEcountPoCsv') return exportSelectedEcountPoCsv_(e); // 依選取列輸出 ECOUNT 採購單 CSV
    if(action==='exportBatchEcountPo') return exportBatchEcountPo_(e); // 依批次輸出 ECOUNT 採購單 Excel
    if(action==='listBatches')       return jsonOk_(listRecentBatches_()); // 列出最近批次
    if(action==='listQueue')         return jsonOk_(listQueue_());
    if(action==='ui')                return htmlUi_();           // 內層 UI 頁面（預設）
    return htmlFrame_();                                         // 外層框架（含 iframe）
  }catch(err){ return jsonErr_(err); }
}
function jsonOk_(obj){ return ContentService.createTextOutput(JSON.stringify({ok:true,data:obj})).setMimeType(ContentService.MimeType.JSON); }
function jsonErr_(err){ return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err)})).setMimeType(ContentService.MimeType.JSON); }

/***** 3) 控制台 UI *****/
function htmlUi_(){
  try {
    return HtmlService
      .createTemplateFromFile('ui')
      .evaluate()
      .setTitle('採購控制塔 PRO（Safari 版）')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return HtmlService.createHtmlOutput('<b>UI 載入失敗</b><br/>' + String(err));
  }
}

// 外層框架：僅負責載入內層 UI（避免 srcdoc/escape 問題）
function htmlFrame_(){
  try{
    return HtmlService
      .createTemplateFromFile('frame')
      .evaluate()
      .setTitle('採購控制塔 PRO（Safari 版）')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }catch(err){
    return HtmlService.createHtmlOutput('<b>框架載入失敗</b><br/>' + String(err));
  }
}

/***** 4) 清單與統計 *****/
function listQueue_(){
  const {sheet, vals, header} = getAllRows_(CFG.SHEET_QUEUE);
  const out=[]; let cP=0,cL=0,cD=0,cTW=0;
  const todayStr = fmt(new Date(),'yyyyMMdd');
  for(let i=1;i<vals.length;i++){
    const r = indexRow_(header, vals[i]);
    const st = r['採購狀態']; const wrote=(r['已回寫ERP']||'').toString().trim().toLowerCase()==='是';
    if(st===CFG.STATUS.PENDING) cP++;
    if(st===CFG.STATUS.LOCKED)  cL++;
    if(st===CFG.STATUS.DONE){ cD++; if(!wrote) cTW++; }
    if(st===CFG.STATUS.DONE && !wrote) out.push(r);
  }
  return {counts:{pending:cP,locked:cL,done:cD,toWrite:cTW}, toWriteRows: out};
}

// 供 UI 勾選：列出待購/鎖定/預購（未完成）的列
function listCandidates_(){
  const {sheet, vals, header} = getAllRows_(CFG.SHEET_QUEUE);
  const rows=[];
  for(let i=1;i<vals.length;i++){
    const r = indexRow_(header, vals[i]);
    const st = (r['採購狀態']||'').toString().trim();
    if(!st || st===CFG.STATUS.PENDING || st===CFG.STATUS.LOCKED || st===CFG.STATUS.PREORDER){
      r.rowIndex = i+1; // 1-based（含表頭列）
      rows.push(r);
    }
  }
  return {rows};
}

/***** 5) Safari 書籤：在供應商頁完成購買 → 一鍵標記 *****/
function markPurchased_(e){
  const url = decodeURIComponent(e.parameter.url||'').split('?')[0];
  const note = decodeURIComponent(e.parameter.note||'').trim();   // 例: 奶茶/FREE/2（選填）
  if(!url) return jsonErr_('缺少 url');

  const operator = Session.getActiveUser().getEmail() || 'unknown';
  const {sheet, vals, header} = getAllRows_(CFG.SHEET_QUEUE);

  // 嘗試從 note 抽顏色/尺寸
  let color=null,size=null; if(note){
    const p = note.split(/[\/\,\s]+/).filter(Boolean);
    if(p.length>=1) color=p[0]; if(p.length>=2) size=p[1];
  }

  const targets=[];
  for(let i=1;i<vals.length;i++){
    const r=indexRow_(header, vals[i]);
    if((r['商品URL']||'').split('?')[0]===url && r['採購狀態']!==CFG.STATUS.DONE){
      if(color && r['顏色']){
        if(size){ if(r['顏色'].toString().includes(color) && r['尺寸'] && r['尺寸'].toString().includes(size)) targets.push(i+1); }
        else if(r['顏色'].toString().includes(color)) targets.push(i+1);
      } else targets.push(i+1);
    }
  }
  // 找不到 → 用 SKU_Ref 幫解（可選表）
  if(targets.length===0){
    const ref=tryResolveByRef_(url,color,size);
    if(ref){
      for(let i=1;i<vals.length;i++){
        const r=indexRow_(header, vals[i]);
        if(r['SKU']===ref.SKU && r['採購狀態']!==CFG.STATUS.DONE) targets.push(i+1);
      }
    }
  }

  if(!targets.length) return jsonOk_({message:'未找到匹配列，請檢查 Queue 或補 SKU_Ref', url, note});
  const now=new Date();
  const memo=CFG.MEMO_OK_FORMAT.replace('MM/DD', todayMMDD()) + (note?(' '+note):'');

  setRows_(sheet, targets, {
    '採購狀態': CFG.STATUS.DONE,
    '採購日期': fmt(now, 'yyyy-MM-dd'),
    '採購備註': memo,
    '鎖定人': operator,
    '鎖定時間': fmt(now, 'yyyy-MM-dd HH:mm:ss')
  });
  return jsonOk_({updated: targets.length});
}
function tryResolveByRef_(url,color,size){
  const sheet=sh(CFG.SHEET_SKU_REF); if(!sheet) return null;
  const vals=sheet.getDataRange().getValues(); const header=vals[0];
  for(let i=1;i<vals.length;i++){
    const r=indexRow_(header, vals[i]);
    if(r['商品URL'] && r['商品URL'].toString().split('?')[0]===url){
      if(color && r['顏色'] && !r['顏色'].toString().includes(color)) continue;
      if(size  && r['尺寸'] && !r['尺寸'].toString().includes(size)) continue;
      return {SKU:r['SKU']};
    }
  }
  return null;
}

/***** 5.5) 初始化：建立 Google 試算表 + 三張工作表 *****/
function isPlaceholderId_(){
  return !CFG.SPREADSHEET_ID || CFG.SPREADSHEET_ID.indexOf('<<')===0;
}
function ensureSheetWithHeader_(ssObj, name, headers){
  let sheet = ssObj.getSheetByName(name);
  const created = !sheet;
  if(!sheet){ sheet = ssObj.insertSheet(name); }
  if(headers && headers.length){
    const lastCol = sheet.getLastColumn();
    const existing = lastCol>0 ? sheet.getRange(1,1,1,lastCol).getValues()[0] : [];
    if(created || existing.length===0){
      const rng = sheet.getRange(1,1,1,headers.length);
      rng.setValues([headers]);
    }else{
      const set = new Set(existing.filter(Boolean));
      let colIndex = existing.length; // 0-based count of existing headers
      headers.forEach(h=>{
        if(!set.has(h)){
          colIndex+=1;
          sheet.getRange(1, colIndex, 1, 1).setValue(h);
        }
      });
    }
    // 樣式
    const headerLen = Math.max(headers.length, sheet.getLastColumn());
    const rngAll = sheet.getRange(1,1,1,headerLen);
    rngAll.setFontWeight('bold').setBackground('#f6f8fa');
    sheet.setFrozenRows(1);
    try{ sheet.autoResizeColumns(1, headerLen); }catch(err){}
  }
  return {sheet, created};
}
// 確保已綁定試算表與基本工作表/表頭存在；回傳 Spreadsheet 物件
function ensureBoundSpreadsheetAndHeaders_(){
  let ssObj=null; let created=false;
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('SPREADSHEET_ID');
  if(!isPlaceholderId_() || savedId){
    const id = !isPlaceholderId_() ? CFG.SPREADSHEET_ID : savedId;
    try{ ssObj = SpreadsheetApp.openById(id); }catch(err){}
  }
  if(!ssObj){ ssObj = SpreadsheetApp.create('Purchase Control Tower'); created=true; props.setProperty('SPREADSHEET_ID', ssObj.getId()); }

  const QUEUE_HEADERS = ['ES訂單號','ERP銷貨單號','SKU','品名','顏色','尺寸','數量','來源站','商品URL','採購狀態','預購月份','預購旬','採購單價JPY','批次匯率','採購日期','採購批次ID','採購備註','鎖定人','鎖定時間','已回寫ERP'];
  const SOMAP_HEADERS = ['ES訂單號','ERP銷貨單號'];
  const SKUREF_HEADERS = ['SKU','來源站','商品URL','顏色','尺寸'];
  const BATCHMETA_HEADERS = ['批次ID','供應商','匯率','運費JPY','建立時間'];
  ensureSheetWithHeader_(ssObj, CFG.SHEET_QUEUE, QUEUE_HEADERS);
  ensureSheetWithHeader_(ssObj, CFG.SHEET_SO_MAP, SOMAP_HEADERS);
  ensureSheetWithHeader_(ssObj, CFG.SHEET_SKU_REF, SKUREF_HEADERS);
  ensureSheetWithHeader_(ssObj, 'Batch_Meta', BATCHMETA_HEADERS);
  // 若為新建，刪掉預設空白工作表
  if(created){
    const keep = new Set([CFG.SHEET_QUEUE, CFG.SHEET_SO_MAP, CFG.SHEET_SKU_REF, 'Batch_Meta']);
    ssObj.getSheets().forEach(s=>{ if(!keep.has(s.getName())) ssObj.deleteSheet(s); });
  }
  return ssObj;
}
function initSheets_(e){
  const title = (e && e.parameter && e.parameter.title) || 'Purchase Control Tower';
  let ssObj=null, created=false, opened=false;
  if(!isPlaceholderId_()){
    try{ ssObj = SpreadsheetApp.openById(CFG.SPREADSHEET_ID); opened=true; }catch(err){}
  }
  if(!ssObj){ ssObj = SpreadsheetApp.create(title); created=true; }

  const QUEUE_HEADERS = ['ES訂單號','ERP銷貨單號','SKU','品名','顏色','尺寸','數量','來源站','商品URL','採購狀態','預購月份','預購旬','採購單價JPY','批次匯率','採購日期','採購批次ID','採購備註','鎖定人','鎖定時間','已回寫ERP'];
  const SOMAP_HEADERS = ['ES訂單號','ERP銷貨單號'];
  const SKUREF_HEADERS = ['SKU','來源站','商品URL','顏色','尺寸'];
  const BATCHMETA_HEADERS = ['批次ID','供應商','匯率','運費JPY','建立時間'];

  const ensured = [];
  ensured.push(Object.assign({name: CFG.SHEET_QUEUE}, ensureSheetWithHeader_(ssObj, CFG.SHEET_QUEUE, QUEUE_HEADERS)));
  ensured.push(Object.assign({name: CFG.SHEET_SO_MAP}, ensureSheetWithHeader_(ssObj, CFG.SHEET_SO_MAP, SOMAP_HEADERS)));
  ensured.push(Object.assign({name: CFG.SHEET_SKU_REF}, ensureSheetWithHeader_(ssObj, CFG.SHEET_SKU_REF, SKUREF_HEADERS)));
  ensured.push(Object.assign({name: 'Batch_Meta'}, ensureSheetWithHeader_(ssObj, 'Batch_Meta', BATCHMETA_HEADERS)));

  // 若為新建，刪掉預設空白工作表
  if(created){
    const keep = new Set([CFG.SHEET_QUEUE, CFG.SHEET_SO_MAP, CFG.SHEET_SKU_REF]);
    ssObj.getSheets().forEach(s=>{ if(!keep.has(s.getName())) ssObj.deleteSheet(s); });
  }
  // 綁定試算表 ID 到 Script Properties（若常數未設定）
  try{
    const props = PropertiesService.getScriptProperties();
    const saved = props.getProperty('SPREADSHEET_ID');
    if(isPlaceholderId_() || !saved){ props.setProperty('SPREADSHEET_ID', ssObj.getId()); }
  }catch(err){}

  // 對 Queue 的『採購狀態』欄位加資料驗證（選填）
  try{
    const q = ssObj.getSheetByName(CFG.SHEET_QUEUE);
    const header = q.getRange(1,1,1,q.getLastColumn()).getValues()[0];
    const col = header.indexOf('採購狀態');
    if(col>=0){
      const list = Object.keys(CFG.STATUS).map(k=>CFG.STATUS[k]);
      const rule = SpreadsheetApp.newDataValidation().requireValueInList(list).setAllowInvalid(true).build();
      q.getRange(2,col+1,Math.max(q.getMaxRows()-1,1),1).setDataValidation(rule);
    }
  }catch(err){}

  return jsonOk_({
    createdNewSpreadsheet: created,
    openedExisting: opened,
    spreadsheetId: ssObj.getId(),
    spreadsheetUrl: ssObj.getUrl(),
    ensured: ensured.map(x=>({name:x.name, created:x.created}))
  });
}

/***** 6) 匯出 ECOUNT CSV（摘要 + 進行狀態；進行狀態可關閉） *****/
function exportEcountCsv_(){
  const {sheet, vals, header} = getAllRows_(CFG.SHEET_QUEUE);
  const soMap = getSoMap_();
  const outMemo = [['ERP銷貨單號','摘要']];
  const outStatus = [['ERP銷貨單號','進行狀態']];
  const toWriteRows = [];

  for(let i=1;i<vals.length;i++){
    const r=indexRow_(header, vals[i]);
    const wrote=(r['已回寫ERP']||'').toString().trim().toLowerCase()==='是';
    if(r['採購狀態']===CFG.STATUS.DONE && !wrote){
      const esNo=r['ES訂單號']; const erpNo=r['ERP銷貨單號'] || soMap[esNo] || '';
      if(!erpNo) continue;
      const memo=r['採購備註'] || CFG.MEMO_OK_FORMAT.replace('MM/DD', todayMMDD());
      outMemo.push([erpNo, memo]);
      if(CFG.EXPORT_STATUS_CSV) outStatus.push([erpNo, CFG.EC_STATUS_VALUE]);
      toWriteRows.push(i+1);
    }
  }

  const fileMemo = createCsvFile_(`so_memo_update_${Date.now()}.csv`,
    outMemo.map(a=>a.map(csvEscape_).join(',')).join('\n'));
  let fileStatus=null;
  if(CFG.EXPORT_STATUS_CSV){
    fileStatus = createCsvFile_(`so_status_update_${Date.now()}.csv`,
      outStatus.map(a=>a.map(csvEscape_).join(',')).join('\n'));
  }

  if(toWriteRows.length) setRows_(sheet, toWriteRows, {'已回寫ERP':'是'});
  return jsonOk_({ memo:fileMemo, status:fileStatus, updatedRows: toWriteRows.length });
}
function getSoMap_(){
  const sheet=sh(CFG.SHEET_SO_MAP); if(!sheet) return {};
  const vals=sheet.getDataRange().getValues(); const header=vals[0]; const m={};
  for(let i=1;i<vals.length;i++){ const r=indexRow_(header, vals[i]); if(r['ES訂單號'] && r['ERP銷貨單號']) m[r['ES訂單號']]=r['ERP銷貨單號']; }
  return m;
}

/***** 7) （可選）EasyStore 拉單 → 填 Queue *****/
function pullPaidOrders_(){
  if(!CFG.EASYSTORE_TOKEN || CFG.EASYSTORE_TOKEN.startsWith('<<')) return jsonErr_('未設定 EasyStore Token');
  const url='https://api.easystore.co/2022-01/orders.json?financial_status=paid&fulfillment_status=unfulfilled&limit=50';
  const res=UrlFetchApp.fetch(url,{method:'get', headers:{'X-Access-Token':CFG.EASYSTORE_TOKEN}});
  const data=JSON.parse(res.getContentText()); const items=[];
  (data.orders||[]).forEach(o=>{
    const esNo=o.name || o.id;
    (o.line_items||[]).forEach(li=>{
      items.push({
        'ES訂單號': esNo,
        'ERP銷貨單號':'',
        'SKU': li.sku || '',
        '品名': li.title || '',
        '顏色': li.variant_title || '',
        '尺寸': '',
        '數量': li.quantity || 1,
        '來源站':'',
        '商品URL':'',
        '採購狀態': CFG.STATUS.PENDING,
        '採購日期':'',
        '採購批次ID':'',
        '採購備註':'',
        '鎖定人':'',
        '鎖定時間':'',
        '已回寫ERP':''
      });
    });
  });
  const sheet=sh(CFG.SHEET_QUEUE);
  if(items.length){
    const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const rows=items.map(it=> headers.map(h=> it[h] ?? ''));
    sheet.getRange(sheet.getLastRow()+1,1,rows.length,headers.length).setValues(rows);
  }
  return jsonOk_({inserted: items.length});
}

/***** 8) 匯入 EasyStore 匯出 Excel（Drive 檔案ID） *****/
function importEsXlsx_(e){
  const fid = e && e.parameter && e.parameter.fileId; if(!fid) return jsonErr_('缺少 fileId');
  // 確保有綁定並準備好工作表
  try{ ensureBoundSpreadsheetAndHeaders_(); }catch(err){ return jsonErr_(String(err)); }
  // 需要啟用 進階服務：Drive API（在「服務」面板啟用），用來把 xlsx 轉成 Google Sheet
  let convertedId=null;
  try{
    const meta = {mimeType: 'application/vnd.google-apps.spreadsheet', title: 'ES_IMPORT_'+Date.now()};
    const copied = Drive.Files.copy(meta, fid); // Advanced Drive Service
    convertedId = copied.id;
  }catch(err){
    return jsonErr_('請在「服務」啟用 Drive API（進階服務），錯誤：'+err);
  }
  try{
    const ssImp = SpreadsheetApp.openById(convertedId);
    const ws = ssImp.getSheetByName('Products') || ssImp.getSheets()[0];
    const rng = ws.getDataRange(); const vals = rng.getValues(); const header = vals[0];
    const H = headerIndexMap(header);
    function col(nameA, nameB){ return H[nameA]!=null?nameA:(H[nameB]!=null?nameB:null); }
    const cES = col('Order Name','Order Number');
    const cName = col('Item Name');
    const cVariant = col('Item Variant');
    const cSku = col('Item SKU');
    const cQty = col('Quantity');
    const cLoc = col('Fulfillment Location','Vendor');
    if([cES,cName,cSku,cQty].some(x=>!x)) return jsonErr_('Excel 缺必要欄：Order Name/Item Name/Item SKU/Quantity');

    const q = sh(CFG.SHEET_QUEUE);
    const headers=q.getRange(1,1,1,q.getLastColumn()).getValues()[0];
    const rows=[];
    for(let i=1;i<vals.length;i++){
      const r = indexRow_(header, vals[i]);
      if(!r[cSku]) continue;
      let color='', size='';
      if(cVariant && r[cVariant]){
        const parts = r[cVariant].toString().split(',');
        color = (parts[0]||'').trim(); size = (parts[1]||'').trim();
      }
      const item = {
        'ES訂單號': r[cES] || '',
        'ERP銷貨單號':'',
        'SKU': r[cSku] || '',
        '品名': r[cName] || '',
        '顏色': color,
        '尺寸': size,
        '數量': r[cQty] || 1,
        '來源站': cLoc? (r[cLoc]||'') : '',
        '商品URL':'',
        '採購狀態': CFG.STATUS.PENDING,
        '預購月份':'',
        '預購旬':'',
        '採購日期':'',
        '採購批次ID':'',
        '採購備註':'',
        '鎖定人':'',
        '鎖定時間':'',
        '已回寫ERP':''
      };
      rows.push(headers.map(h=> item[h] ?? ''));
    }
    if(rows.length){
      q.getRange(q.getLastRow()+1,1,rows.length,headers.length).setValues(rows);
    }
    return jsonOk_({inserted: rows.length, sheetId: ssImp.getId(), sheetUrl: ssImp.getUrl()});
  } finally {
    try{ if(convertedId) Drive.Files.remove(convertedId); }catch(err){}
  }
}

/***** 8.1) 本機上傳的 xlsx（透過 HtmlService + google.script.run 傳入 base64） *****/
function importEsXlsxUploaded(filename, b64){
  try{
    // 確保有綁定並準備好工作表
    try{ ensureBoundSpreadsheetAndHeaders_(); }catch(err){ return {ok:false, error:String(err)}; }
    // 容錯：若誤傳入 dataURL，截掉逗號前綴
    if(b64.indexOf(',')>=0) b64 = b64.split(',')[1];
    // Safari 有時插入換行或空白，先清理
    b64 = b64.replace(/\s/g,'');
    const bytes = Utilities.base64Decode(b64);
    const blob = Utilities.newBlob(bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename||'upload.xlsx');
    const uploaded = DriveApp.createFile(blob);
    let convertedId=null;
    try{
      const meta = {mimeType:'application/vnd.google-apps.spreadsheet', title:'ES_UPLOAD_'+Date.now()};
      if(typeof Drive==='undefined' || !Drive.Files){
        return {ok:false, error:'尚未在「服務」啟用 Drive API（進階服務）'};
      }
      const copied = Drive.Files.copy(meta, uploaded.getId());
      convertedId = copied.id;
      // 解析與寫入（與 importEsXlsx_ 相同）
      const ssImp = SpreadsheetApp.openById(convertedId);
      const ws = ssImp.getSheetByName('Products') || ssImp.getSheets()[0];
      const rng = ws.getDataRange(); const vals = rng.getValues(); const header = vals[0];
      const H = headerIndexMap(header);
      function col(nameA, nameB){ return H[nameA]!=null?nameA:(H[nameB]!=null?nameB:null); }
      const cES = col('Order Name','Order Number');
      const cName = col('Item Name');
      const cVariant = col('Item Variant');
      const cSku = col('Item SKU');
      const cQty = col('Quantity');
      const cLoc = col('Fulfillment Location','Vendor');
      if([cES,cName,cSku,cQty].some(x=>!x)) return {ok:false, error:'Excel 缺必要欄：Order Name/Item Name/Item SKU/Quantity'};
      const q = sh(CFG.SHEET_QUEUE);
      const headers=q.getRange(1,1,1,q.getLastColumn()).getValues()[0];
      const rows=[];
      for(let i=1;i<vals.length;i++){
        const r = indexRow_(header, vals[i]);
        if(!r[cSku]) continue;
        let color='', size='';
        if(cVariant && r[cVariant]){
          const parts = r[cVariant].toString().split(',');
          color = (parts[0]||'').trim(); size = (parts[1]||'').trim();
        }
        const item = {
          'ES訂單號': r[cES] || '',
          'ERP銷貨單號':'',
          'SKU': r[cSku] || '',
          '品名': r[cName] || '',
          '顏色': color,
          '尺寸': size,
          '數量': r[cQty] || 1,
          '來源站': cLoc? (r[cLoc]||'') : '',
          '商品URL':'',
          '採購狀態': CFG.STATUS.PENDING,
          '預購月份':'',
          '預購旬':'',
          '採購日期':'',
          '採購批次ID':'',
          '採購備註':'',
          '鎖定人':'',
          '鎖定時間':'',
          '已回寫ERP':''
        };
        rows.push(headers.map(h=> item[h] ?? ''));
      }
      if(rows.length){ q.getRange(q.getLastRow()+1,1,rows.length,headers.length).setValues(rows); }
      return {ok:true, data:{inserted: rows.length}};
    } finally {
      try{ uploaded.setTrashed(true); }catch(err){}
      try{ if(convertedId) Drive.Files.remove(convertedId); }catch(err){}
    }
  }catch(err){
    return {ok:false, error:String(err)};
  }
}

/***** 9) UI 勾選更新 *****/
function updateSelection_(e){
  const op=(e.parameter && e.parameter.op)||'';
  const rowsStr=(e.parameter && e.parameter.rows)||''; if(!rowsStr) return jsonErr_('缺少 rows');
  const rowIndexes = rowsStr.split(',').map(s=>parseInt(s,10)).filter(Boolean);
  const sheet = sh(CFG.SHEET_QUEUE);
  const now=new Date();
  if(op==='markOOS'){
    setRows_(sheet, rowIndexes, {'採購狀態': CFG.STATUS.OOS});
    return jsonOk_({updated: rowIndexes.length});
  }
  if(op==='markPreorder'){
    const ym=(e.parameter && e.parameter.preYm)||''; const xu=(e.parameter && e.parameter.preXun)||'';
    if(!/^[0-9]{4}-[0-9]{2}$/.test(ym)) return jsonErr_('preYm 格式需為 YYYY-MM');
    setRows_(sheet, rowIndexes, {'採購狀態': CFG.STATUS.PREORDER, '預購月份': ym, '預購旬': xu});
    return jsonOk_({updated: rowIndexes.length});
  }
  if(op==='purchaseNewBatch'){
    const sup=(e.parameter && e.parameter.supplier)||'';
    const jp=(e.parameter && e.parameter.jpOrder)||'';
    const batchId = (sup? (sup+'-'):'') + Utilities.formatDate(now, CFG.DATE_TZ, 'yyyyMMdd-HHmmss');
    const rate = parseFloat((e.parameter && e.parameter.rate)||'');
    const shipping = parseFloat((e.parameter && e.parameter.shipping)||'');
    const pricesStr = (e.parameter && e.parameter.prices)||''; // 對應 rows 順序
    const prices = pricesStr ? pricesStr.split(',').map(s=>parseFloat(s||'0')) : [];
    const memo=CFG.MEMO_OK_FORMAT.replace('MM/DD', todayMMDD());
    // 先批量寫共同欄位
    setRows_(sheet, rowIndexes, {
      '採購狀態': CFG.STATUS.DONE,
      '採購日期': fmt(now,'yyyy-MM-dd'),
      '採購備註': memo,
      '採購批次ID': batchId,
      '批次匯率': isNaN(rate)?'':rate,
      '鎖定人': Session.getActiveUser().getEmail() || 'unknown',
      '鎖定時間': fmt(now,'yyyy-MM-dd HH:mm:ss')
    });
    // 寫入單價（逐列）
    if(prices.length){
      const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
      const col = headers.indexOf('採購單價JPY');
      if(col>=0){
        const arr = sheet.getRange(2,1,Math.max(sheet.getLastRow()-1,0),sheet.getLastColumn()).getValues();
        rowIndexes.forEach((r,idx)=>{ const i=r-2; if(arr[i]) arr[i][col] = isNaN(prices[idx])? '': prices[idx]; });
        if(arr.length) sheet.getRange(2,1,arr.length,arr[0].length).setValues(arr);
      }
    }
    // 記錄批次匯率與運費到 Batch_Meta
    try{
      const bm = sh('Batch_Meta');
      const headers=bm.getRange(1,1,1,bm.getLastColumn()).getValues()[0];
      const row=[batchId, sup, isNaN(rate)?'':rate, isNaN(shipping)?'':shipping, fmt(now,'yyyy-MM-dd HH:mm:ss')];
      bm.getRange(bm.getLastRow()+1,1,1,headers.length).setValues([row]);
    }catch(err){}
    return jsonOk_({updated: rowIndexes.length, batchId});
  }
  if(op==='markPurchasedOnly'){
    const pricesStr = (e.parameter && e.parameter.prices)||''; // 對應 rows 順序
    const prices = pricesStr ? pricesStr.split(',').map(s=>parseFloat(s||'0')) : [];
    const memo=CFG.MEMO_OK_FORMAT.replace('MM/DD', todayMMDD());
    setRows_(sheet, rowIndexes, {
      '採購狀態': CFG.STATUS.DONE,
      '採購日期': fmt(now,'yyyy-MM-dd'),
      '採購備註': memo,
      '鎖定人': Session.getActiveUser().getEmail() || 'unknown',
      '鎖定時間': fmt(now,'yyyy-MM-dd HH:mm:ss')
    });
    if(prices.length){
      const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
      const col = headers.indexOf('採購單價JPY');
      if(col>=0){
        const arr = sheet.getRange(2,1,Math.max(sheet.getLastRow()-1,0),sheet.getLastColumn()).getValues();
        rowIndexes.forEach((r,idx)=>{ const i=r-2; if(arr[i]) arr[i][col] = isNaN(prices[idx])? '': prices[idx]; });
        if(arr.length) sheet.getRange(2,1,arr.length,arr[0].length).setValues(arr);
      }
    }
    return jsonOk_({updated: rowIndexes.length});
  }
  return jsonErr_('未知的 op');
}

/***** 10) 匯出某批次的 items CSV（供 Python CLI 轉 Excel 採購單） *****/
function exportBatchItemsCsv_(e){
  const batchId = e && e.parameter && e.parameter.batchId; if(!batchId) return jsonErr_('缺少 batchId');
  const {sheet, vals, header} = getAllRows_(CFG.SHEET_QUEUE);
  const out=[['supplier_key','date','sku','name','spec','qty','unit_price','es_order_no','jp_order_no','jp_waybill']];
  // 嘗試從 batchId 取 supplier_key（若是 sup-YYYYMMDD-HHmmss 格式）
  let sup = '';
  const m = batchId.match(/^([a-z0-9\-]+)-\d{8}-\d{6}$/i); if(m) sup=m[1];
  // 從 Batch_Meta 取運費/匯率/供應商（優先）
  let shipping=0; let metaSup='';
  try{
    const bm = sh('Batch_Meta');
    const bmVals=bm.getDataRange().getValues(); const h=bmVals[0];
    const hi = headerIndexMap(h);
    for(let i=1;i<bmVals.length;i++){
      const r=indexRow_(h, bmVals[i]);
      if(r['批次ID']===batchId){
        shipping = parseFloat(r['運費JPY']||'0')||0;
        metaSup = r['供應商']||''; break;
      }
    }
  }catch(err){}
  if(metaSup) sup=metaSup;
  for(let i=1;i<vals.length;i++){
    const r=indexRow_(header, vals[i]);
    if(r['採購批次ID']===batchId){
      const spec=[r['顏色']||'', r['尺寸']||''].filter(Boolean).join('/');
      out.push([
        sup||'',
        toYmd_(r['採購日期']),
        r['SKU']||'',
        r['品名']||'',
        spec,
        r['數量']||1,
        r['採購單價JPY']||'',
        r['ES訂單號']||'',
        '',
        ''
      ]);
    }
  }
  // 加一行運費（若有）
  if(shipping>0){
    out.push([sup||'', '', 'SHIPPING', '運費', '', 1, shipping, '', '', '']);
  }
  const fmtParam = e && e.parameter && (e.parameter.format||'csv');
  let file;
  if(String(fmtParam).toLowerCase()==='xlsx'){
    file = createExcelFromValues_(`batch_items_${batchId}`, 'items', out);
  }else{
    file = createCsvFile_(`batch_items_${batchId}.csv`, out.map(a=>a.map(csvEscape_).join(',')).join('\n'));
  }
  return jsonOk_({file});
}

// 依目前選取列輸出 items CSV（不依賴批次ID，不變動資料）
function exportSelectedItemsCsv_(e){
  const rowsStr = e && e.parameter && e.parameter.rows; if(!rowsStr) return jsonErr_('缺少 rows');
  const rowIndexes = rowsStr.split(',').map(s=>parseInt(s,10)).filter(Boolean);
  if(!rowIndexes.length) return jsonErr_('rows 解析為空');
  const sup = (e.parameter && e.parameter.supplier)||'';
  const shipping = parseFloat((e.parameter && e.parameter.shipping)||'')||0;
  const {sheet, vals, header} = getAllRows_(CFG.SHEET_QUEUE);
  const out=[['supplier_key','date','sku','name','spec','qty','unit_price','es_order_no','jp_order_no','jp_waybill']];
  const used = new Set(rowIndexes);
  const todayStr = fmt(new Date(),'yyyyMMdd');
  for(let i=1;i<vals.length;i++){
    const rowIndex=i+1; if(!used.has(rowIndex)) continue;
    const r=indexRow_(header, vals[i]);
    const spec=[r['顏色']||'', r['尺寸']||''].filter(Boolean).join('/');
    out.push([
      sup||'',
      (toYmd_(r['採購日期']) || todayStr),
      r['SKU']||'',
      r['品名']||'',
      spec,
      r['數量']||1,
      r['採購單價JPY']||'',
      r['ES訂單號']||'',
      '',
      ''
    ]);
  }
  if(shipping>0){ out.push([sup||'', '', 'SHIPPING', '運費', '', 1, shipping, '', '', '']); }
  const content = out.map(a=>a.map(csvEscape_).join(',')).join('\n');
  const file = createCsvFile_(`selected_items_${fmt(new Date(),'yyyyMMdd-HHmmss')}.csv`, content);
  return jsonOk_({file});
}

// 依目前選取列輸出「ECOUNT 採購單 CSV」欄位（單檔可含多張單，透過序號分組；不變動資料）
function exportSelectedEcountPoCsv_(e){
  const rowsStr = e && e.parameter && e.parameter.rows; if(!rowsStr) return jsonErr_('缺少 rows');
  const supKey = e && e.parameter && e.parameter.supplier; if(!supKey) return jsonErr_('缺少 supplier');
  const leadDaysStr = e && e.parameter && e.parameter.leadDays; const leadDays = leadDaysStr? parseInt(leadDaysStr,10) : null;
  const rateStr = (e && e.parameter && e.parameter.rate) || '';
  const shippingVal = parseFloat((e && e.parameter && e.parameter.shipping)||'')||0;
  const pricesStr = (e && e.parameter && e.parameter.prices)||''; // 對應 rows 順序
  const rowIndexes = rowsStr.split(',').map(s=>parseInt(s,10)).filter(Boolean);
  if(!rowIndexes.length) return jsonErr_('rows 解析為空');

  const custCd = PO_CFG.SUPPLIER_CODE_MAP[supKey];
  const custName = PO_CFG.SUPPLIER_NAME_MAP[supKey];
  if(!custCd || !custName) return jsonErr_('未知的 supplier_key：'+supKey+'（請在 PO_CFG.SUPPLIER_CODE_MAP/NAME_MAP 設定）');

  const {vals, header} = getAllRows_(CFG.SHEET_QUEUE);
  const used = new Set(rowIndexes);
  const today = new Date();
  const todayStr = fmt(today, 'yyyyMMdd');

  // 把傳入的價格對應到行號
  const priceArr = pricesStr ? pricesStr.split(',').map(s=>parseFloat(s||'0')) : [];
  const rowToPrice = {};
  rowIndexes.forEach((r,idx)=>{ if(!isNaN(priceArr[idx])) rowToPrice[r]=priceArr[idx]; });

  // Header 依 CLI 的 Template-7 規格
  const headerCols = ['日期','序號','客戶/供應商編碼','客戶/供應商名稱','承辦人','收貨倉庫','交易類型','貨幣','匯率','交付日期','日本訂單號','日本貨運單號','品項編碼','品項名稱','規格','日文(摘要3)','數量','單價','外幣金額','稅前價格','營業稅','訂單號','摘要'];
  const currencyCodeText = "'" + PO_CFG.CURRENCY_CODE; // 保持文字型態顯示 00001
  const out=[headerCols];

  function addDays(ymd, days){
    if(days==null) return '';
    try{
      const y=parseInt(ymd.substring(0,4),10), m=parseInt(ymd.substring(4,6),10)-1, d=parseInt(ymd.substring(6,8),10);
      const dt=new Date(y,m,d); dt.setDate(dt.getDate()+days); return fmt(dt,'yyyyMMdd');
    }catch(err){ return ''; }
  }

  // 分塊：每張採購單最多 N 行，序號 1、2、3…（每一塊同一序號）
  const lines = [];
  for(let i=1;i<vals.length;i++){
    const rowIndex=i+1; if(!used.has(rowIndex)) continue;
    const r = indexRow_(header, vals[i]);
    const ymd = toYmd_(r['採購日期']) || todayStr;
    const spec=[r['顏色']||'', r['尺寸']||''].filter(Boolean).join('/');
    const qty = parseFloat(r['數量']||'1') || 1;
    const unit = (rowToPrice[rowIndex]!=null? rowToPrice[rowIndex] : (r['採購單價JPY']||''));
    const sku = r['SKU']||''; const name=r['品名']||'';
    lines.push({ymd, spec, qty, unit, sku, name});
  }
  // 運費作為一行（若有）
  if(shippingVal>0){
    lines.push({ymd:todayStr, spec:'', qty:1, unit:shippingVal, sku:'SHIPPING', name:'運費'});
  }
  if(!lines.length) return jsonErr_('指定列沒有可輸出的資料');

  const chunkSize = PO_CFG.MAX_LINES_PER_PO || 30;
  let serial=1; let idx=0;
  const exRate = rateStr || PO_CFG.EXCHANGE_RATE || '';
  while(idx < lines.length){
    const chunk = lines.slice(idx, idx+chunkSize);
    chunk.forEach(it=>{
      const deliver = addDays(it.ymd, leadDays);
      const rateNum = parseFloat(exRate||'');
      const baseUnitNum = parseFloat(it.unit);
      const hasBase = !isNaN(baseUnitNum);
      const hasRate = !isNaN(rateNum);
      let unitCell = '';
      let foreignAmt = '';
      let taxPrice = '';
      if(hasBase){
        unitCell = baseUnitNum;           // R 欄：你輸入的 JPY 單價
        foreignAmt = baseUnitNum;         // S 欄 = 單價（外幣金額 = JPY 金額）
        if(hasRate) taxPrice = Math.floor(baseUnitNum * rateNum); // T 欄 = 匯率 × 單價
      }
      const row=[
        it.ymd,
        String(serial),
        custCd,
        custName,
        PO_CFG.EMP_CD,
        PO_CFG.WH_CD,
        '',
        currencyCodeText,
        exRate,
        deliver,
        '',
        '',
        it.sku,
        it.name,
        it.spec,
        '',
        it.qty,
        unitCell,
        foreignAmt,
        taxPrice,
        '',
        '',
        ''
      ];
      out.push(row);
    });
    serial = serial + 1; idx += chunk.length;
  }

  const fmtParam = e && e.parameter && (e.parameter.format||'csv');
  let file;
  if(String(fmtParam).toLowerCase()==='xlsx'){
    file = createExcelFromValues_(`po_upload_${supKey}_${fmt(new Date(),'yyyyMMdd-HHmmss')}`, '採購單', out);
  }else{
    const content = out.map(a=>a.map(csvEscape_).join(',')).join('\n');
    file = createCsvFile_(`po_upload_${supKey}_${fmt(new Date(),'yyyyMMdd-HHmmss')}.csv`, content);
  }
  return jsonOk_({file});
}

// 依批次輸出 ECOUNT 採購單（Excel），欄位與 exportSelectedEcountPoCsv_ 一致
function exportBatchEcountPo_(e){
  const batchId = e && e.parameter && e.parameter.batchId; if(!batchId) return jsonErr_('缺少 batchId');
  // 讀取 Batch_Meta 取 supplier/rate/shipping
  let supKey=''; let rate=''; let shipping=0;
  try{
    const bm = sh('Batch_Meta');
    const vals=bm.getDataRange().getValues(); const h=vals[0];
    for(let i=1;i<vals.length;i++){
      const r=indexRow_(h, vals[i]);
      if(r['批次ID']===batchId){
        supKey = r['供應商'] || '';
        rate = (r['匯率']||'').toString();
        shipping = parseFloat(r['運費JPY']||'0')||0; break;
      }
    }
  }catch(err){}
  if(!supKey){ const m=batchId.match(/^([a-z0-9\-]+)-\d{8}-\d{6}$/i); if(m) supKey=m[1]; }
  const custCd = PO_CFG.SUPPLIER_CODE_MAP[supKey];
  const custName = PO_CFG.SUPPLIER_NAME_MAP[supKey];
  if(!custCd || !custName) return jsonErr_('未知的 supplier_key：'+supKey+'（請在 PO_CFG 中設定）');

  const headerCols = ['日期','序號','客戶/供應商編碼','客戶/供應商名稱','承辦人','收貨倉庫','交易類型','貨幣','匯率','交付日期','日本訂單號','日本貨運單號','品項編碼','品項名稱','規格','日文(摘要3)','數量','單價','外幣金額','稅前價格','營業稅','訂單號','摘要'];
  const currencyCodeText = "'" + PO_CFG.CURRENCY_CODE;
  const out=[headerCols];

  const {vals, header} = getAllRows_(CFG.SHEET_QUEUE);
  const todayStr=fmt(new Date(),'yyyyMMdd');
  const lines=[];
  for(let i=1;i<vals.length;i++){
    const r=indexRow_(header, vals[i]);
    if(r['採購批次ID']!==batchId) continue;
    const ymd=toYmd_(r['採購日期'])||todayStr;
    const spec=[r['顏色']||'', r['尺寸']||''].filter(Boolean).join('/');
    const qty=parseFloat(r['數量']||'1')||1;
    const unit=r['採購單價JPY']||'';
    lines.push({ymd, spec, qty, unit, sku:r['SKU']||'', name:r['品名']||''});
  }
  if(shipping>0){ lines.push({ymd:todayStr, spec:'', qty:1, unit:shipping, sku:'SHIPPING', name:'運費'}); }
  if(!lines.length) return jsonErr_('此批次沒有資料');

  const chunkSize=PO_CFG.MAX_LINES_PER_PO||30; let serial=1; let idx=0;
  while(idx<lines.length){
    const chunk=lines.slice(idx, idx+chunkSize);
    chunk.forEach(it=>{
      const rateNum = parseFloat(rate||'');
      const baseUnitNum = parseFloat(it.unit);
      const hasBase = !isNaN(baseUnitNum);
      const hasRate = !isNaN(rateNum);
      let unitCell='';
      let foreignAmt='';
      let taxPrice='';
      if(hasBase){
        unitCell = baseUnitNum;      // R：輸入的 JPY 單價
        foreignAmt = baseUnitNum;    // S：外幣金額 = 單價
        if(hasRate) taxPrice = Math.floor(baseUnitNum * rateNum); // T：稅前價格 = 匯率×單價
      }
      const row=[
        it.ymd,
        String(serial),
        custCd,
        custName,
        PO_CFG.EMP_CD,
        PO_CFG.WH_CD,
        '',
        currencyCodeText,
        rate||PO_CFG.EXCHANGE_RATE||'',
        '',
        '',
        '',
        it.sku,
        it.name,
        it.spec,
        '',
        it.qty,
        unitCell,
        foreignAmt,
        taxPrice,
        '',
        '',
        ''
      ];
      out.push(row);
    });
    serial+=1; idx+=chunk.length;
  }
  const file = createExcelFromValues_(`po_upload_${supKey}_${batchId}`, '採購單', out);
  return jsonOk_({file});
}

// 列出最近批次（從 Batch_Meta 彙整，附每批筆數）
function listRecentBatches_(){
  const out={rows:[]};
  const bm = sh('Batch_Meta'); if(!bm) return out;
  const bmVals=bm.getDataRange().getValues(); const bh=bmVals[0];
  const list=[]; const idx=headerIndexMap(bh);
  for(let i=1;i<bmVals.length;i++){
    const r=indexRow_(bh, bmVals[i]);
    if(!r['批次ID']) continue;
    list.push({id:r['批次ID'], supplier:r['供應商']||'', rate:r['匯率']||'', shipping:r['運費JPY']||'', created:r['建立時間']||''});
  }
  // 計算每批次筆數
  const {vals, header} = getAllRows_(CFG.SHEET_QUEUE);
  const hi=headerIndexMap(header); const cMap={};
  for(let i=1;i<vals.length;i++){
    const r=indexRow_(header, vals[i]); const b=r['採購批次ID']; if(b) cMap[b]=(cMap[b]||0)+1;
  }
  list.forEach(x=> x.count = cMap[x.id]||0);
  // 依建立時間倒序
  out.rows = list.sort((a,b)=> (a.created<b.created?1:-1)).slice(0,50);
  return out;
}
