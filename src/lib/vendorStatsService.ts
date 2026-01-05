/**
 * 商家儀表板統計服務
 * 
 * 提供商家後台所需的統計數據
 */
import type { Payload } from 'payload'

// 統計數據類型
export interface VendorStats {
  totalProducts: number
  activeProducts: number
  totalOrders: number
  pendingOrders: number
  totalRevenue: number
  monthlyRevenue: number
  totalCustomers: number
  averageOrderValue: number
}

/**
 * 取得商家統計數據
 */
export async function getVendorStats(
  payload: Payload,
  vendorId: string
): Promise<VendorStats> {
  // 商品統計
  const productsResult = await payload.find({
    collection: 'products',
    where: {
      vendor: { equals: vendorId },
    },
    limit: 0, // 只要 totalDocs
  })
  
  const activeProductsResult = await payload.find({
    collection: 'products',
    where: {
      and: [
        { vendor: { equals: vendorId } },
        { _status: { equals: 'published' } },
      ],
    },
    limit: 0,
  })
  
  // 訂單統計
  const ordersResult = await payload.find({
    collection: 'orders',
    where: {
      vendor: { equals: vendorId },
    },
    limit: 0,
  })
  
  const pendingOrdersResult = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { vendor: { equals: vendorId } },
        { status: { in: ['pending', 'paid', 'processing'] } },
      ],
    },
    limit: 0,
  })
  
  // 本月訂單
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  
  const monthlyOrdersResult = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { vendor: { equals: vendorId } },
        { createdAt: { greater_than: startOfMonth.toISOString() } },
        { status: { in: ['paid', 'processing', 'shipped', 'delivered', 'completed'] } },
      ],
    },
    limit: 100,
  })
  
  // 計算營收
  const monthlyOrders = monthlyOrdersResult.docs as Array<{ total?: number }>
  const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + (order.total || 0), 0)
  
  // 計算總營收和平均訂單金額
  const allPaidOrdersResult = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { vendor: { equals: vendorId } },
        { status: { in: ['paid', 'processing', 'shipped', 'delivered', 'completed'] } },
      ],
    },
    limit: 1000,
  })
  
  const allPaidOrders = allPaidOrdersResult.docs as Array<{ total?: number; customer?: string }>
  const totalRevenue = allPaidOrders.reduce((sum, order) => sum + (order.total || 0), 0)
  const averageOrderValue = allPaidOrders.length > 0 
    ? totalRevenue / allPaidOrders.length 
    : 0
  
  // 統計不重複客戶
  const uniqueCustomers = new Set(
    allPaidOrders.map((order) => order.customer).filter(Boolean)
  )
  
  return {
    totalProducts: productsResult.totalDocs,
    activeProducts: activeProductsResult.totalDocs,
    totalOrders: ordersResult.totalDocs,
    pendingOrders: pendingOrdersResult.totalDocs,
    totalRevenue,
    monthlyRevenue,
    totalCustomers: uniqueCustomers.size,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
  }
}

/**
 * 取得最近訂單
 */
export async function getRecentOrders(
  payload: Payload,
  vendorId: string,
  limit = 5
) {
  const result = await payload.find({
    collection: 'orders',
    where: {
      vendor: { equals: vendorId },
    },
    sort: '-createdAt',
    limit,
  })
  
  return result.docs
}

/**
 * 取得暢銷商品
 */
export async function getTopProducts(
  payload: Payload,
  vendorId: string,
  limit = 5
) {
  // 注意：實際實作需要根據訂單統計銷量
  // 這裡簡化為取得最新的商品
  const result = await payload.find({
    collection: 'products',
    where: {
      and: [
        { vendor: { equals: vendorId } },
        { _status: { equals: 'published' } },
      ],
    },
    sort: '-createdAt',
    limit,
  })
  
  return result.docs
}
