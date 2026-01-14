/**
 * User State Service
 * 用戶狀態管理服務
 * 
 * 使用快取管理用戶輸入狀態，避免關鍵字誤觸
 * 參考 refactored/StateService.gs 的成功模式
 */

// ===== 狀態常數 =====

export const USER_STATES = {
  NONE: 'NONE',
  WAITING_FOR_EMAIL: 'WAITING_FOR_EMAIL',
  WAITING_FOR_OOS_RESPONSE: 'WAITING_FOR_OOS_RESPONSE',
  WAITING_FOR_RESTOCK_CONFIRM: 'WAITING_FOR_RESTOCK_CONFIRM',
} as const

export type UserState = typeof USER_STATES[keyof typeof USER_STATES]

export interface UserStateData {
  state: UserState
  data?: Record<string, any>
  timestamp: string
}

// ===== 快取存儲（使用 Map 作為 In-Memory Cache） =====

// 注意：在生產環境建議使用 Redis 或其他持久化 Cache
const stateCache = new Map<string, UserStateData>()

// 狀態過期時間（毫秒）- 5 分鐘
const EXPIRATION_MS = 5 * 60 * 1000

/**
 * 用戶狀態服務模組
 */
export const UserStateService = {
  
  /**
   * 產生快取鍵
   */
  _getCacheKey(userId: string): string {
    return `USER_STATE_${userId}`
  },
  
  /**
   * 檢查狀態是否過期
   */
  _isExpired(stateData: UserStateData): boolean {
    const stateTime = new Date(stateData.timestamp).getTime()
    const now = Date.now()
    return (now - stateTime) > EXPIRATION_MS
  },
  
  /**
   * 取得用戶當前狀態
   */
  getState(userId: string): UserStateData {
    try {
      const cacheKey = this._getCacheKey(userId)
      const cached = stateCache.get(cacheKey)
      
      if (cached) {
        // 檢查是否過期
        if (this._isExpired(cached)) {
          stateCache.delete(cacheKey)
          return { state: USER_STATES.NONE, timestamp: new Date().toISOString() }
        }
        return cached
      }
      
      return { state: USER_STATES.NONE, timestamp: new Date().toISOString() }
      
    } catch (error) {
      console.error('[UserStateService] Get state error:', error)
      return { state: USER_STATES.NONE, timestamp: new Date().toISOString() }
    }
  },
  
  /**
   * 設定用戶狀態
   */
  setState(userId: string, state: UserState, data?: Record<string, any>): void {
    try {
      const cacheKey = this._getCacheKey(userId)
      
      const stateData: UserStateData = {
        state,
        data,
        timestamp: new Date().toISOString(),
      }
      
      stateCache.set(cacheKey, stateData)
      console.log(`[UserStateService] Set state: ${userId} -> ${state}`)
      
    } catch (error) {
      console.error('[UserStateService] Set state error:', error)
    }
  },
  
  /**
   * 清除用戶狀態
   */
  clearState(userId: string): void {
    try {
      const cacheKey = this._getCacheKey(userId)
      stateCache.delete(cacheKey)
      console.log(`[UserStateService] Cleared state: ${userId}`)
      
    } catch (error) {
      console.error('[UserStateService] Clear state error:', error)
    }
  },
  
  // ===== 便捷方法 =====
  
  /**
   * 檢查用戶是否在等待 Email 輸入狀態
   */
  isWaitingForEmail(userId: string): boolean {
    const state = this.getState(userId)
    return state.state === USER_STATES.WAITING_FOR_EMAIL
  },
  
  /**
   * 設定用戶為等待 Email 輸入狀態
   */
  setWaitingForEmail(userId: string): void {
    this.setState(userId, USER_STATES.WAITING_FOR_EMAIL)
  },
  
  /**
   * 檢查用戶是否在等待缺貨回應狀態
   */
  isWaitingForOOSResponse(userId: string): boolean {
    const state = this.getState(userId)
    return state.state === USER_STATES.WAITING_FOR_OOS_RESPONSE
  },
  
  /**
   * 設定用戶為等待缺貨回應狀態
   */
  setWaitingForOOSResponse(userId: string, oosData: Record<string, any>): void {
    this.setState(userId, USER_STATES.WAITING_FOR_OOS_RESPONSE, oosData)
  },
}

export default UserStateService
