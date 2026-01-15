// ==========================================
// StateService.gs - 用戶狀態管理服務
// 版本：v4.0 模組化架構
// 說明：使用 CacheService 管理用戶輸入狀態，避免關鍵字誤觸
// ==========================================

/**
 * 狀態服務模組
 * 使用 GAS CacheService 管理用戶狀態
 * 解決「關鍵字誤觸」問題
 */
const StateService = {
  
  // 狀態常數
  STATES: {
    NONE: 'NONE',                       // 無狀態
    WAITING_FOR_EMAIL: 'WAITING_FOR_EMAIL',  // 等待輸入 Email
    WAITING_FOR_OOS_RESPONSE: 'WAITING_FOR_OOS_RESPONSE',  // 等待缺貨回應
    // BEAMS 促銷活動相關狀態
    WAITING_FOR_BEAMS_URL: 'WAITING_FOR_BEAMS_URL',     // 等待 BEAMS 商品 URL
    WAITING_FOR_BEAMS_SPEC: 'WAITING_FOR_BEAMS_SPEC',   // 等待顏色尺寸
    WAITING_FOR_BEAMS_PRICE: 'WAITING_FOR_BEAMS_PRICE'  // 等待用戶輸入日幣價格
  },
  
  // 快取鍵前綴
  CACHE_PREFIX: 'USER_STATE_',
  
  // 狀態過期時間（秒）- 5 分鐘
  EXPIRATION_SECONDS: 300,
  
  /**
   * 取得用戶當前狀態
   * @param {string} userId - LINE User ID
   * @returns {Object} - { state, data }
   */
  getState: function(userId) {
    try {
      const cache = CacheService.getScriptCache();
      const cacheKey = this.CACHE_PREFIX + userId;
      const cachedValue = cache.get(cacheKey);
      
      if (cachedValue) {
        return JSON.parse(cachedValue);
      }
      
      return { state: this.STATES.NONE, data: null };
      
    } catch (error) {
      console.error('❌ 取得用戶狀態失敗:', error);
      return { state: this.STATES.NONE, data: null };
    }
  },
  
  /**
   * 設定用戶狀態
   * @param {string} userId - LINE User ID
   * @param {string} state - 狀態碼
   * @param {Object} data - 附加資料（可選）
   */
  setState: function(userId, state, data = null) {
    try {
      const cache = CacheService.getScriptCache();
      const cacheKey = this.CACHE_PREFIX + userId;
      
      const stateData = {
        state: state,
        data: data,
        timestamp: new Date().toISOString()
      };
      
      cache.put(cacheKey, JSON.stringify(stateData), this.EXPIRATION_SECONDS);
      
      console.log(`📝 設定用戶狀態: ${userId} -> ${state}`);
      
    } catch (error) {
      console.error('❌ 設定用戶狀態失敗:', error);
    }
  },
  
  /**
   * 清除用戶狀態
   * @param {string} userId - LINE User ID
   */
  clearState: function(userId) {
    try {
      const cache = CacheService.getScriptCache();
      const cacheKey = this.CACHE_PREFIX + userId;
      cache.remove(cacheKey);
      
      console.log(`🗑️ 清除用戶狀態: ${userId}`);
      
    } catch (error) {
      console.error('❌ 清除用戶狀態失敗:', error);
    }
  },
  
  /**
   * 檢查用戶是否在等待 Email 輸入狀態
   * @param {string} userId - LINE User ID
   * @returns {boolean}
   */
  isWaitingForEmail: function(userId) {
    const userState = this.getState(userId);
    return userState.state === this.STATES.WAITING_FOR_EMAIL;
  },
  
  /**
   * 設定用戶為等待 Email 輸入狀態
   * @param {string} userId - LINE User ID
   */
  setWaitingForEmail: function(userId) {
    this.setState(userId, this.STATES.WAITING_FOR_EMAIL);
  },
  
  /**
   * 檢查用戶是否在等待缺貨回應狀態
   * @param {string} userId - LINE User ID
   * @returns {boolean}
   */
  isWaitingForOOSResponse: function(userId) {
    const userState = this.getState(userId);
    return userState.state === this.STATES.WAITING_FOR_OOS_RESPONSE;
  },
  
  /**
   * 設定用戶為等待缺貨回應狀態
   * @param {string} userId - LINE User ID
   * @param {Object} oosData - 缺貨商品資料
   */
  setWaitingForOOSResponse: function(userId, oosData) {
    this.setState(userId, this.STATES.WAITING_FOR_OOS_RESPONSE, oosData);
  }
};

// ==========================================
// 向下相容：保留舊函數名稱
// ==========================================

/**
 * 取得用戶狀態（舊版，向下相容）
 */
function getUserState(userId) {
  return StateService.getState(userId);
}

/**
 * 設定用戶狀態（舊版，向下相容）
 */
function setUserState(userId, state, data) {
  StateService.setState(userId, state, data);
}

/**
 * 清除用戶狀態（舊版，向下相容）
 */
function clearUserState(userId) {
  StateService.clearState(userId);
}
