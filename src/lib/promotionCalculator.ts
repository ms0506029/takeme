/**
 * 促銷疊加計算函數
 * 
 * 計算邏輯：
 * 1. 取得適用的促銷（依條件篩選）
 * 2. 按 priority 排序（高到低）
 * 3. 依序計算折扣
 * 4. 若 stackable = true 則繼續計算下一個
 * 5. 返回最終價格和適用的促銷列表
 */
import type { Promotion, User } from '@/payload-types'
import type { Payload } from 'payload'

// 購物車項目類型
export interface CartItem {
  productId: string
  variantId?: string
  quantity: number
  unitPrice: number
  categoryIds?: string[]
}

// 計算結果類型
export interface DiscountResult {
  originalTotal: number
  discountedTotal: number
  totalDiscount: number
  appliedPromotions: {
    promotionId: string
    promotionName: string
    discountAmount: number
  }[]
  freeShipping: boolean
}

/**
 * 檢查促銷是否適用於購物車項目
 */
function isPromotionApplicable(
  promotion: Promotion,
  items: CartItem[],
  user: User | null,
  vendorId?: string
): boolean {
  const now = new Date()
  
  // 檢查日期範圍
  if (promotion.startDate && new Date(promotion.startDate) > now) return false
  if (promotion.endDate && new Date(promotion.endDate) < now) return false
  
  // 檢查狀態
  if (promotion.status !== 'active') return false
  
  // 檢查使用次數
  if (promotion.usageLimit && promotion.usedCount && promotion.usedCount >= promotion.usageLimit) {
    return false
  }
  
  // 檢查商家限制
  if (promotion.vendor) {
    const promoVendorId = typeof promotion.vendor === 'object' 
      ? promotion.vendor.id 
      : promotion.vendor
    if (vendorId && promoVendorId !== vendorId) return false
  }
  
  // 檢查會員等級
  if (promotion.applicableUserLevels && promotion.applicableUserLevels.length > 0) {
    const userLevel = user?.memberLevel || 'bronze'
    if (!promotion.applicableUserLevels.includes(userLevel)) return false
  }
  
  // 檢查最低消費
  const cartTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  if (promotion.minPurchase && cartTotal < promotion.minPurchase) return false
  
  // 檢查指定商品
  if (promotion.applicableProducts && promotion.applicableProducts.length > 0) {
    const productIds = promotion.applicableProducts.map((p) => 
      typeof p === 'object' ? p.id : p
    )
    const hasApplicableProduct = items.some((item) => productIds.includes(item.productId))
    if (!hasApplicableProduct) return false
  }
  
  // 檢查指定分類
  if (promotion.applicableCategories && promotion.applicableCategories.length > 0) {
    const categoryIds = promotion.applicableCategories.map((c) => 
      typeof c === 'object' ? c.id : c
    )
    const hasApplicableCategory = items.some((item) => 
      item.categoryIds?.some((cid) => categoryIds.includes(cid))
    )
    if (!hasApplicableCategory) return false
  }
  
  return true
}

/**
 * 計算單個促銷的折扣金額
 */
function calculateDiscount(
  promotion: Promotion,
  currentTotal: number,
  items: CartItem[]
): { discountAmount: number; newTotal: number } {
  let discountAmount = 0
  
  switch (promotion.type) {
    case 'percentage':
      // 百分比折扣
      discountAmount = currentTotal * ((promotion.value || 0) / 100)
      break
      
    case 'fixed':
      // 固定金額折扣
      discountAmount = Math.min(promotion.value || 0, currentTotal)
      break
      
    case 'buyXgetY':
      // 買X送Y（需要更複雜的邏輯，這裡簡化處理）
      const buyQty = promotion.buyXgetY?.buyQuantity || 2
      const getQty = promotion.buyXgetY?.getQuantity || 1
      
      // 計算可獲得的免費商品數量
      const totalQty = items.reduce((sum, item) => sum + item.quantity, 0)
      const freeItems = Math.floor(totalQty / (buyQty + getQty)) * getQty
      
      // 使用最低價商品作為免費商品
      const sortedPrices = items
        .flatMap((item) => Array(item.quantity).fill(item.unitPrice))
        .sort((a, b) => a - b)
      
      discountAmount = sortedPrices.slice(0, freeItems).reduce((sum, p) => sum + p, 0)
      break
      
    case 'freeShipping':
      // 免運費由外部處理
      discountAmount = 0
      break
  }
  
  const newTotal = Math.max(0, currentTotal - discountAmount)
  
  return { discountAmount, newTotal }
}

/**
 * 計算購物車的最終價格
 */
export async function calculateCartDiscount(
  payload: Payload,
  items: CartItem[],
  user: User | null,
  vendorId?: string,
  promoCode?: string
): Promise<DiscountResult> {
  const originalTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  
  // 查詢所有可用的促銷
  const promotionsResult = await payload.find({
    collection: 'promotions',
    where: {
      status: { equals: 'active' },
    },
    sort: '-priority',
    limit: 100,
  })
  
  const promotions = promotionsResult.docs as Promotion[]
  
  // 篩選適用的促銷
  let applicablePromotions = promotions.filter((promo) => 
    isPromotionApplicable(promo, items, user, vendorId)
  )
  
  // 如果有促銷代碼，只使用該代碼的促銷
  if (promoCode) {
    const codePromo = applicablePromotions.find((p) => p.code === promoCode)
    if (codePromo) {
      // 代碼促銷可以與自動促銷疊加
      applicablePromotions = [
        codePromo,
        ...applicablePromotions.filter((p) => !p.code && p.stackable),
      ]
    }
  } else {
    // 過濾掉需要代碼的促銷
    applicablePromotions = applicablePromotions.filter((p) => !p.code)
  }
  
  // 計算折扣
  let currentTotal = originalTotal
  let freeShipping = false
  const appliedPromotions: DiscountResult['appliedPromotions'] = []
  
  for (const promo of applicablePromotions) {
    if (promo.type === 'freeShipping') {
      freeShipping = true
      appliedPromotions.push({
        promotionId: promo.id,
        promotionName: promo.name,
        discountAmount: 0,
      })
      continue
    }
    
    const { discountAmount, newTotal } = calculateDiscount(promo, currentTotal, items)
    
    if (discountAmount > 0) {
      appliedPromotions.push({
        promotionId: promo.id,
        promotionName: promo.name,
        discountAmount,
      })
      
      currentTotal = newTotal
    }
    
    // 如果不可疊加，停止計算
    if (!promo.stackable) break
  }
  
  return {
    originalTotal,
    discountedTotal: currentTotal,
    totalDiscount: originalTotal - currentTotal,
    appliedPromotions,
    freeShipping,
  }
}
