import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * Vendor Dashboard Stats API
 * 
 * 取得商家專屬的統計數據：
 * - 訂單統計 (待處理、已完成)
 * - 商品統計 (上架中、待審核)
 * - 營收統計 (總營收、本月營收)
 * - 錢包餘額
 */

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })
    
    // 從 cookie 或 header 取得認證資訊
    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get('vendorId')
    
    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // 取得商家資訊
    const vendor = await payload.findByID({
      collection: 'vendors',
      id: vendorId,
    })
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // 並行查詢所有統計數據
    const [
      productsActive,
      productsPending,
      ordersProcessing,
      ordersCompleted,
      ordersThisMonth,
    ] = await Promise.all([
      // 上架中的商品
      payload.find({
        collection: 'products',
        where: {
          vendor: { equals: vendorId },
          _status: { equals: 'published' },
        },
        limit: 0,
        pagination: false,
      }),
      // 待審核的商品
      payload.find({
        collection: 'products',
        where: {
          vendor: { equals: vendorId },
          _status: { equals: 'draft' },
        },
        limit: 0,
        pagination: false,
      }),
      // 處理中的訂單
      payload.find({
        collection: 'orders',
        where: {
          vendor: { equals: vendorId },
          status: { equals: 'processing' },
        },
        limit: 0,
        pagination: false,
      }),
      // 已完成的訂單
      payload.find({
        collection: 'orders',
        where: {
          vendor: { equals: vendorId },
          status: { equals: 'completed' },
        },
        limit: 0,
        pagination: false,
      }),
      // 本月訂單
      payload.find({
        collection: 'orders',
        where: {
          vendor: { equals: vendorId },
          status: { equals: 'completed' },
          createdAt: { greater_than: startOfMonth.toISOString() },
        },
        limit: 0,
        pagination: false,
      }),
    ])

    // 計算營收
    const calculateRevenue = (orders: { docs: Array<{ amount?: number | null }> }) => {
      return orders.docs.reduce((sum, order) => sum + (order.amount || 0), 0)
    }

    const totalRevenue = calculateRevenue(ordersCompleted)
    const monthlyRevenue = calculateRevenue(ordersThisMonth)

    return NextResponse.json({
      vendor: {
        id: vendor.id,
        name: vendor.name,
        status: vendor.status,
        walletBalance: vendor.walletBalance || 0,
        commissionRate: vendor.commissionRate || 10,
      },
      products: {
        active: productsActive.totalDocs,
        pending: productsPending.totalDocs,
        total: productsActive.totalDocs + productsPending.totalDocs,
      },
      orders: {
        processing: ordersProcessing.totalDocs,
        completed: ordersCompleted.totalDocs,
        total: ordersProcessing.totalDocs + ordersCompleted.totalDocs,
      },
      revenue: {
        total: totalRevenue,
        monthly: monthlyRevenue,
        pendingPayout: (vendor.walletBalance as number) || 0,
      },
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('[Vendor Stats] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor stats' },
      { status: 500 }
    )
  }
}
