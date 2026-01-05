/**
 * 會員 CRM 服務
 * 
 * 功能：
 * - 會員分級自動計算
 * - LINE 推播通知
 */
import type { User } from '@/payload-types'
import type { Payload } from 'payload'

// 會員等級
export type MemberLevel = 'bronze' | 'silver' | 'gold' | 'vip'

// 會員分級門檻
const LEVEL_THRESHOLDS: Record<MemberLevel, number> = {
  bronze: 0,
  silver: 500,    // $500 以上
  gold: 2000,     // $2000 以上
  vip: 5000,      // $5000 以上
}

/**
 * 計算會員應有的等級
 */
export function calculateMemberLevel(totalSpent: number): MemberLevel {
  if (totalSpent >= LEVEL_THRESHOLDS.vip) return 'vip'
  if (totalSpent >= LEVEL_THRESHOLDS.gold) return 'gold'
  if (totalSpent >= LEVEL_THRESHOLDS.silver) return 'silver'
  return 'bronze'
}

/**
 * 更新會員等級（根據累計消費）
 */
export async function updateMemberLevel(
  payload: Payload,
  userId: string
): Promise<{ 
  success: boolean
  oldLevel?: MemberLevel
  newLevel?: MemberLevel
  upgraded?: boolean 
}> {
  try {
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    }) as User
    
    if (!user) {
      return { success: false }
    }
    
    const currentLevel = (user.memberLevel || 'bronze') as MemberLevel
    const totalSpent = user.totalSpent || 0
    const newLevel = calculateMemberLevel(totalSpent)
    
    // 如果等級沒變，不需要更新
    if (currentLevel === newLevel) {
      return { success: true, oldLevel: currentLevel, newLevel, upgraded: false }
    }
    
    // 更新會員等級
    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        memberLevel: newLevel,
      },
    })
    
    return {
      success: true,
      oldLevel: currentLevel,
      newLevel,
      upgraded: LEVEL_THRESHOLDS[newLevel] > LEVEL_THRESHOLDS[currentLevel],
    }
  } catch {
    return { success: false }
  }
}

/**
 * 訂單完成後更新累計消費和會員等級
 */
export async function processOrderCompletion(
  payload: Payload,
  userId: string,
  orderTotal: number
): Promise<void> {
  try {
    // 更新累計消費
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    }) as User
    
    if (!user) return
    
    const newTotalSpent = (user.totalSpent || 0) + orderTotal
    
    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        totalSpent: newTotalSpent,
      },
    })
    
    // 檢查並更新會員等級
    await updateMemberLevel(payload, userId)
  } catch {
    // 靜默處理錯誤
  }
}
