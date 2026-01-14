/**
 * Points Engine - Index Export
 */

export {
    awardOrderPoints,
    // 計算與發放
    calculateOrderPoints,
    // 會員等級
    checkAndUpgradeMemberLevel, deductRefundPoints, getCampaignMultiplier,
    // 設定相關
    getLoyaltySettings,
    getMemberMultiplier,
    // 完整流程
    processOrderCompletion, updateUserTotalSpent,
    // 類型
    type LoyaltySettings,
    type OrderItem,
    type PointsCalculationResult
} from './points-engine'

// 價格工具
export {
    cartItemToOrderItem, getDiscountPercentage,
    getEffectivePrice, isDiscountedProduct, orderLineItemToOrderItem
} from './price-utils'

