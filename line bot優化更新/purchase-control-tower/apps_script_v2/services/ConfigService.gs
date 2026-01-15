/**
 * ConfigService - 設定管理服務
 * 管理 Script Properties 的讀取與寫入
 */

const ConfigService = (function() {
  
  /**
   * 取得 Script Properties
   */
  function getProps() {
    return PropertiesService.getScriptProperties();
  }
  
  /**
   * 取得 LINE Channel Access Token
   */
  function getLineToken() {
    const token = getProps().getProperty(PROPS.LINE_CHANNEL_ACCESS_TOKEN);
    if (!token) {
      throw new Error('未設定 LINE_CHANNEL_ACCESS_TOKEN，請到專案設定中新增');
    }
    return token;
  }
  
  /**
   * 取得外部物流查詢頁 Base URL
   */
  function getTrackingUrlBase() {
    const url = getProps().getProperty(PROPS.TRACKING_URL_BASE);
    if (!url) {
      // 如果未設定，使用預設值
      return 'https://example.com/tracking';
    }
    return url;
  }
  
  /**
   * 取得 Spreadsheet ID
   */
  function getSpreadsheetId() {
    const ssId = getProps().getProperty(PROPS.SPREADSHEET_ID);
    if (!ssId) {
      throw new Error('未設定 SPREADSHEET_ID，請先執行 initializeAllSheets()');
    }
    return ssId;
  }
  
  /**
   * 設定 LINE Channel Access Token
   */
  function setLineToken(token) {
    getProps().setProperty(PROPS.LINE_CHANNEL_ACCESS_TOKEN, token);
    logInfo('已更新 LINE_CHANNEL_ACCESS_TOKEN');
  }
  
  /**
   * 設定外部物流查詢頁 URL
   */
  function setTrackingUrlBase(url) {
    getProps().setProperty(PROPS.TRACKING_URL_BASE, url);
    logInfo('已更新 TRACKING_URL_BASE');
  }
  
  /**
   * 組合完整的物流查詢連結（舊版，保留兼容性）
   */
  function buildTrackingUrl(trackingNumber, orderNo) {
    const baseUrl = getTrackingUrlBase();
    const params = [];
    
    if (trackingNumber) {
      params.push(`tracking=${encodeURIComponent(trackingNumber)}`);
    }
    if (orderNo) {
      params.push(`order=${encodeURIComponent(orderNo)}`);
    }
    
    return params.length > 0 
      ? `${baseUrl}?${params.join('&')}`
      : baseUrl;
  }
  
  /**
   * 根據物流公司生成追蹤連結
   * @param {string} courier - 物流公司代碼（SF 或 SCORE）
   * @param {string} trackingNumber - 追蹤號碼
   * @return {string} 完整的物流查詢 URL
   */
  function buildCourierTrackingUrl(courier, trackingNumber) {
    if (!courier || !trackingNumber) {
      return '';
    }
    
    // 取得對應的 URL 模板
    let urlTemplate = COURIER_TRACKING_URLS[courier];
    
    if (!urlTemplate) {
      // 如果沒有對應的模板，使用預設（順豐）
      urlTemplate = COURIER_TRACKING_URLS.SF;
    }
    
    // 替換追蹤號碼
    return urlTemplate.replace('{{tracking}}', encodeURIComponent(trackingNumber));
  }
  
  /**
   * 取得物流公司名稱
   */
  function getCourierName(courier) {
    return COURIER_NAMES[courier] || courier;
  }
  
  // 公開 API
  return {
    getLineToken: getLineToken,
    getTrackingUrlBase: getTrackingUrlBase,
    getSpreadsheetId: getSpreadsheetId,
    setLineToken: setLineToken,
    setTrackingUrlBase: setTrackingUrlBase,
    buildTrackingUrl: buildTrackingUrl,
    buildCourierTrackingUrl: buildCourierTrackingUrl,
    getCourierName: getCourierName
  };
  
})();
