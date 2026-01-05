/**
 * Upstash Redis 連接模組
 * 
 * 用途：
 * 1. API Rate Limiting
 * 2. 購物車暫存
 * 3. 庫存鎖定（下單時預扣庫存）
 * 4. Session 快取
 */
import { Redis } from '@upstash/redis'

// 檢查是否有配置 Redis 環境變數
const isRedisConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

/**
 * Redis 連接實例
 * 如果環境變數未配置，返回 null
 */
export const redis = isRedisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

/**
 * 檢查 Redis 是否可用
 */
export const isRedisAvailable = (): boolean => {
  return redis !== null
}

/**
 * 庫存鎖定 - 使用 Redis 原子操作預扣庫存
 * 
 * @param productId - 商品 ID
 * @param variantId - 變體 ID
 * @param quantity - 鎖定數量
 * @param ttlSeconds - 鎖定時間（預設 15 分鐘）
 * @returns 是否鎖定成功
 */
export const lockInventory = async (
  productId: string,
  variantId: string,
  quantity: number,
  ttlSeconds: number = 900 // 15 分鐘
): Promise<boolean> => {
  if (!redis) {
    // Redis 未配置，直接返回成功（降級處理）
    return true
  }

  const lockKey = `inventory:lock:${productId}:${variantId}`
  
  try {
    // 使用 SETNX 原子操作
    const result = await redis.set(lockKey, quantity, {
      nx: true, // 只有當 key 不存在時才設定
      ex: ttlSeconds, // 設定過期時間
    })
    
    return result === 'OK'
  } catch {
    // Redis 錯誤時降級處理
    return true
  }
}

/**
 * 釋放庫存鎖定
 */
export const releaseInventory = async (
  productId: string,
  variantId: string
): Promise<void> => {
  if (!redis) return

  const lockKey = `inventory:lock:${productId}:${variantId}`
  
  try {
    await redis.del(lockKey)
  } catch {
    // 忽略錯誤
  }
}
