/**
 * Product Price Utilities
 * 商品價格工具函式
 * 
 * 用於判斷商品是否為折扣商品、計算折扣率等
 */

/**
 * 判斷商品是否為折扣商品
 */
export function isDiscountedProduct(
  price: number,
  originalPrice?: number | null,
  salePrice?: number | null
): boolean {
  // 方法 1: 如果有 salePrice 且小於 originalPrice
  if (salePrice && originalPrice && salePrice < originalPrice) {
    return true
  }
  
  // 方法 2: 如果 price 小於 originalPrice
  if (originalPrice && price < originalPrice) {
    return true
  }
  
  return false
}

/**
 * 計算折扣率 (%)
 */
export function getDiscountPercentage(
  currentPrice: number,
  originalPrice: number
): number {
  if (!originalPrice || originalPrice <= 0) return 0
  if (currentPrice >= originalPrice) return 0
  
  const discount = ((originalPrice - currentPrice) / originalPrice) * 100
  return Math.round(discount)
}

/**
 * 取得商品的有效價格（優先使用 salePrice）
 */
export function getEffectivePrice(product: {
  price?: number
  salePrice?: number | null
  originalPrice?: number
}): number {
  return product.salePrice ?? product.price ?? product.originalPrice ?? 0
}

/**
 * 從購物車項目轉換為 OrderItem 格式
 */
export function cartItemToOrderItem(cartItem: {
  product: {
    id: string
    price?: number
    salePrice?: number | null
    originalPrice?: number
  }
  quantity: number
}): import('./points-engine').OrderItem {
  const price = getEffectivePrice(cartItem.product)
  const originalPrice = cartItem.product.originalPrice ?? cartItem.product.price ?? price
  
  return {
    productId: cartItem.product.id,
    quantity: cartItem.quantity,
    price,
    originalPrice,
    isDiscounted: isDiscountedProduct(price, originalPrice),
  }
}

/**
 * 從訂單明細轉換為 OrderItem 格式（用於從現有訂單計算點數）
 */
export function orderLineItemToOrderItem(lineItem: {
  product?: { id: string } | string
  quantity?: number
  price?: number
  originalPrice?: number
  salePrice?: number | null
}): import('./points-engine').OrderItem {
  const productId = typeof lineItem.product === 'object'
    ? lineItem.product?.id
    : lineItem.product
  
  const price = lineItem.salePrice ?? lineItem.price ?? 0
  const originalPrice = lineItem.originalPrice ?? lineItem.price ?? price
  
  return {
    productId: productId || '',
    quantity: lineItem.quantity ?? 1,
    price,
    originalPrice,
    isDiscounted: isDiscountedProduct(price, originalPrice),
  }
}
