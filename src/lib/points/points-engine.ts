/**
 * Points Engine
 * 點數計算引擎
 * 
 * 負責：
 * 1. 讀取 SiteSettings 中的點數規則
 * 2. 計算訂單應獲得的點數
 * 3. 自動新增 PointTransactions
 * 4. 檢查並執行會員等級升級
 */

import configPromise from '@payload-config'
import { getPayload } from 'payload'

// ===== 類型定義 =====

export interface LoyaltySettings {
  enabled: boolean
  pointsPerAmount: number      // 每多少元
  pointsEarned: number         // 得幾點
  pointValue: number           // 1 點折多少
  minPointsToRedeem: number    // 最低折抵點數
  discountProductRule: {
    fixedPercentage: number    // 折扣商品固定回饋 %
    applyCampaignMultiplier: boolean
  }
  campaign: {
    enabled: boolean
    multiplier: number
    name?: string
    startDate?: string
    endDate?: string
  }
  advanced: {
    pointsExpireDays: number
    maxRedeemPercentage: number
    excludeShipping: boolean
  }
}

export interface OrderItem {
  productId: string
  quantity: number
  price: number           // 商品單價（已折扣後）
  originalPrice?: number  // 商品原價
  isDiscounted: boolean   // 是否為折扣商品
}

export interface PointsCalculationResult {
  totalPoints: number
  breakdown: {
    regularItems: number
    discountedItems: number
    memberMultiplier: number
    campaignMultiplier: number
  }
  expiresAt?: Date
}

// ===== 核心引擎 =====

/**
 * 取得點數系統設定
 */
export async function getLoyaltySettings(): Promise<LoyaltySettings | null> {
  try {
    const payload = await getPayload({ config: configPromise })
    const settings = await payload.findGlobal({ slug: 'siteSettings' })
    
    const loyaltyPoints = (settings as any)?.loyaltyPoints
    if (!loyaltyPoints?.enabled) return null
    
    return {
      enabled: loyaltyPoints.enabled ?? true,
      pointsPerAmount: loyaltyPoints.pointsPerAmount ?? 100,
      pointsEarned: loyaltyPoints.pointsEarned ?? 1,
      pointValue: loyaltyPoints.pointValue ?? 1,
      minPointsToRedeem: loyaltyPoints.minPointsToRedeem ?? 100,
      discountProductRule: {
        fixedPercentage: loyaltyPoints.discountProductRule?.fixedPercentage ?? 1,
        applyCampaignMultiplier: loyaltyPoints.discountProductRule?.applyCampaignMultiplier ?? true,
      },
      campaign: {
        enabled: loyaltyPoints.campaign?.enabled ?? false,
        multiplier: loyaltyPoints.campaign?.multiplier ?? 1,
        name: loyaltyPoints.campaign?.name,
        startDate: loyaltyPoints.campaign?.startDate,
        endDate: loyaltyPoints.campaign?.endDate,
      },
      advanced: {
        pointsExpireDays: loyaltyPoints.advanced?.pointsExpireDays ?? 365,
        maxRedeemPercentage: loyaltyPoints.advanced?.maxRedeemPercentage ?? 100,
        excludeShipping: loyaltyPoints.advanced?.excludeShipping ?? true,
      },
    }
  } catch (error) {
    console.error('[PointsEngine] Failed to get loyalty settings:', error)
    return null
  }
}

/**
 * 取得會員等級倍率
 */
export async function getMemberMultiplier(userId: string): Promise<number> {
  try {
    const payload = await getPayload({ config: configPromise })
    
    // 取得用戶資料
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    })
    
    const memberLevelCode = (user as any)?.memberLevel
    if (!memberLevelCode) return 1
    
    // 查詢會員等級設定
    const levels = await payload.find({
      collection: 'member-levels',
      where: { code: { equals: memberLevelCode } },
      limit: 1,
    })
    
    if (levels.docs.length === 0) return 1
    
    return (levels.docs[0] as any).pointsMultiplier ?? 1
  } catch (error) {
    console.error('[PointsEngine] Failed to get member multiplier:', error)
    return 1
  }
}

/**
 * 檢查活動倍率是否生效
 */
export function getCampaignMultiplier(settings: LoyaltySettings): number {
  if (!settings.campaign.enabled) return 1
  
  const now = new Date()
  
  // 檢查日期範圍
  if (settings.campaign.startDate) {
    const start = new Date(settings.campaign.startDate)
    if (now < start) return 1
  }
  
  if (settings.campaign.endDate) {
    const end = new Date(settings.campaign.endDate)
    end.setHours(23, 59, 59, 999) // 包含結束當天
    if (now > end) return 1
  }
  
  return settings.campaign.multiplier
}

/**
 * 計算訂單點數
 */
export async function calculateOrderPoints(
  orderId: string,
  userId: string,
  items: OrderItem[],
  orderAmount: number,
  shippingAmount: number = 0
): Promise<PointsCalculationResult | null> {
  // 取得設定
  const settings = await getLoyaltySettings()
  if (!settings) {
    console.log('[PointsEngine] Points system disabled')
    return null
  }
  
  // 計算基礎金額（是否排除運費）
  let baseAmount = orderAmount
  if (settings.advanced.excludeShipping) {
    baseAmount = orderAmount - shippingAmount
  }
  
  // 取得會員等級倍率
  const memberMultiplier = await getMemberMultiplier(userId)
  
  // 取得活動倍率
  const campaignMultiplier = getCampaignMultiplier(settings)
  
  // 分別計算正價商品與折扣商品
  let regularItemsTotal = 0
  let discountedItemsTotal = 0
  
  for (const item of items) {
    const itemTotal = item.price * item.quantity
    
    if (item.isDiscounted) {
      // 折扣商品：固定 % 回饋
      let discountPoints = Math.floor(itemTotal * (settings.discountProductRule.fixedPercentage / 100))
      
      // 活動期間是否加倍
      if (settings.discountProductRule.applyCampaignMultiplier) {
        discountPoints = Math.floor(discountPoints * campaignMultiplier)
      }
      
      discountedItemsTotal += discountPoints
    } else {
      // 正價商品：按匯率計算
      const basePoints = Math.floor(itemTotal / settings.pointsPerAmount) * settings.pointsEarned
      const finalPoints = Math.floor(basePoints * memberMultiplier * campaignMultiplier)
      regularItemsTotal += finalPoints
    }
  }
  
  const totalPoints = regularItemsTotal + discountedItemsTotal
  
  // 計算過期時間
  let expiresAt: Date | undefined
  if (settings.advanced.pointsExpireDays > 0) {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + settings.advanced.pointsExpireDays)
  }
  
  return {
    totalPoints,
    breakdown: {
      regularItems: regularItemsTotal,
      discountedItems: discountedItemsTotal,
      memberMultiplier,
      campaignMultiplier,
    },
    expiresAt,
  }
}

/**
 * 發放訂單點數（建立 PointTransaction）
 */
export async function awardOrderPoints(
  orderId: string,
  userId: string,
  items: OrderItem[],
  orderAmount: number,
  shippingAmount: number = 0
): Promise<{ success: boolean; points?: number; error?: string }> {
  try {
    const calculation = await calculateOrderPoints(orderId, userId, items, orderAmount, shippingAmount)
    
    if (!calculation || calculation.totalPoints <= 0) {
      return { success: true, points: 0 }
    }
    
    const payload = await getPayload({ config: configPromise })
    
    // 建立點數交易紀錄
    const description = calculation.breakdown.campaignMultiplier > 1
      ? `訂單 #${orderId} 消費獲得點數 (${calculation.breakdown.campaignMultiplier}倍活動)`
      : `訂單 #${orderId} 消費獲得點數`
    
    // 檢查 orderId 是否為有效的 MongoDB ObjectId (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(orderId)
    
    const transactionData: any = {
      customer: userId,
      type: 'earn',
      amount: calculation.totalPoints,
      description,
      expiresAt: calculation.expiresAt?.toISOString(),
    }
    
    // 只有當 orderId 是有效的 ObjectId 時才設定 relatedOrder
    if (isValidObjectId) {
      transactionData.relatedOrder = orderId
    }
    
    await payload.create({
      collection: 'point-transactions',
      data: transactionData,
    })
    
    console.log(`[PointsEngine] Awarded ${calculation.totalPoints} points to user ${userId} for order ${orderId}`)
    
    return { success: true, points: calculation.totalPoints }
  } catch (error) {
    console.error('[PointsEngine] Failed to award points:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * 扣回退貨點數
 */
export async function deductRefundPoints(
  orderId: string,
  userId: string,
  refundAmount: number
): Promise<{ success: boolean; points?: number; error?: string }> {
  try {
    const payload = await getPayload({ config: configPromise })
    
    // 查詢該訂單原本獲得的點數
    const originalTransaction = await payload.find({
      collection: 'point-transactions',
      where: {
        relatedOrder: { equals: orderId },
        type: { equals: 'earn' },
      },
      limit: 1,
    })
    
    if (originalTransaction.docs.length === 0) {
      return { success: true, points: 0 }
    }
    
    const originalPoints = (originalTransaction.docs[0] as any).amount || 0
    
    // 建立扣回紀錄（負數）
    await payload.create({
      collection: 'point-transactions',
      data: {
        customer: userId,
        type: 'refund',
        amount: -originalPoints,
        description: `訂單 #${orderId} 退貨扣回點數`,
        relatedOrder: orderId,
      },
    })
    
    console.log(`[PointsEngine] Deducted ${originalPoints} points from user ${userId} for refund on order ${orderId}`)
    
    return { success: true, points: originalPoints }
  } catch (error) {
    console.error('[PointsEngine] Failed to deduct refund points:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * 檢查並執行會員等級升級
 */
export async function checkAndUpgradeMemberLevel(userId: string): Promise<{
  upgraded: boolean
  oldLevel?: string
  newLevel?: string
}> {
  try {
    const payload = await getPayload({ config: configPromise })
    
    // 取得用戶資料
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    })
    
    const currentLevel = (user as any).memberLevel
    const totalSpent = (user as any).totalSpent || 0
    
    // 取得所有會員等級（按 minSpent 排序）
    const allLevels = await payload.find({
      collection: 'member-levels',
      sort: '-minSpent', // 從高到低
      limit: 100,
    })
    
    if (allLevels.docs.length === 0) {
      return { upgraded: false }
    }
    
    // 找到符合的最高等級
    let targetLevel: any = null
    for (const level of allLevels.docs) {
      const minSpent = (level as any).minSpent || 0
      if (totalSpent >= minSpent) {
        targetLevel = level
        break
      }
    }
    
    // 如果找不到，使用預設等級
    if (!targetLevel) {
      const defaultLevel = allLevels.docs.find((l: any) => l.isDefault)
      if (defaultLevel) {
        targetLevel = defaultLevel
      } else {
        // 使用 minSpent 最低的等級
        targetLevel = allLevels.docs[allLevels.docs.length - 1]
      }
    }
    
    const newLevelCode = (targetLevel as any).code
    
    // 檢查是否需要升級
    if (currentLevel === newLevelCode) {
      return { upgraded: false }
    }
    
    // 執行升級
    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        memberLevel: newLevelCode,
      } as any,
    })
    
    console.log(`[PointsEngine] Upgraded user ${userId} from ${currentLevel} to ${newLevelCode}`)
    
    return {
      upgraded: true,
      oldLevel: currentLevel,
      newLevel: newLevelCode,
    }
  } catch (error) {
    console.error('[PointsEngine] Failed to check/upgrade member level:', error)
    return { upgraded: false }
  }
}

/**
 * 更新用戶累計消費金額
 */
export async function updateUserTotalSpent(
  userId: string,
  orderAmount: number
): Promise<void> {
  try {
    const payload = await getPayload({ config: configPromise })
    
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    })
    
    const currentTotal = (user as any).totalSpent || 0
    const newTotal = currentTotal + orderAmount
    
    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        totalSpent: newTotal,
      } as any,
    })
    
    console.log(`[PointsEngine] Updated user ${userId} totalSpent: ${currentTotal} -> ${newTotal}`)
  } catch (error) {
    console.error('[PointsEngine] Failed to update totalSpent:', error)
  }
}

/**
 * 完整的訂單完成處理流程
 * 用於 Order 的 afterChange hook
 */
export async function processOrderCompletion(
  orderId: string,
  userId: string,
  items: OrderItem[],
  orderAmount: number,
  shippingAmount: number = 0
): Promise<{
  pointsAwarded: number
  levelUpgraded: boolean
  newLevel?: string
}> {
  // 1. 更新累計消費
  await updateUserTotalSpent(userId, orderAmount)
  
  // 2. 發放點數
  const pointsResult = await awardOrderPoints(orderId, userId, items, orderAmount, shippingAmount)
  
  // 3. 檢查等級升級
  const upgradeResult = await checkAndUpgradeMemberLevel(userId)
  
  return {
    pointsAwarded: pointsResult.points || 0,
    levelUpgraded: upgradeResult.upgraded,
    newLevel: upgradeResult.newLevel,
  }
}
