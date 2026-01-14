import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * Wishlist API
 * 願望清單 API
 * 
 * GET /api/wishlist - 取得當前用戶的願望清單
 * POST /api/wishlist - 新增商品到願望清單
 * DELETE /api/wishlist?id=xxx - 從願望清單移除
 */

// 取得當前用戶
async function getCurrentUser() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await headers()
  
  // 嘗試從 cookie 或 authorization header 取得用戶
  const authHeader = headersList.get('authorization')
  
  if (!authHeader) return null
  
  try {
    const token = authHeader.replace('Bearer ', '')
    const { user } = await payload.auth({ headers: headersList })
    return user
  } catch {
    return null
  }
}

// GET: 取得願望清單
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '請先登入' },
        { status: 401 }
      )
    }
    
    const payload = await getPayload({ config: configPromise })
    
    const wishlist = await payload.find({
      collection: 'wishlist',
      where: {
        customer: { equals: user.id },
      },
      depth: 2, // 展開 product 資訊
      sort: '-addedAt',
    })
    
    return NextResponse.json({
      success: true,
      items: wishlist.docs,
      total: wishlist.totalDocs,
    })
  } catch (error) {
    console.error('Wishlist GET error:', error)
    return NextResponse.json(
      { success: false, error: '取得願望清單失敗' },
      { status: 500 }
    )
  }
}

// POST: 新增到願望清單
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '請先登入' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { productId, variant, notifyOnPriceDrop = true } = body
    
    if (!productId) {
      return NextResponse.json(
        { success: false, error: '缺少 productId' },
        { status: 400 }
      )
    }
    
    const payload = await getPayload({ config: configPromise })
    
    // 檢查是否已存在
    const existing = await payload.find({
      collection: 'wishlist',
      where: {
        customer: { equals: user.id },
        product: { equals: productId },
        ...(variant?.sku ? { 'variant.sku': { equals: variant.sku } } : {}),
      },
      limit: 1,
    })
    
    if (existing.docs.length > 0) {
      return NextResponse.json({
        success: true,
        message: '商品已在願望清單中',
        item: existing.docs[0],
      })
    }
    
    // 取得商品當前價格
    const product = await payload.findByID({
      collection: 'products',
      id: productId,
    })
    
    const currentPrice = (product as any)?.salePrice ?? (product as any)?.price ?? 0
    
    // 新增到願望清單
    const newItem = await payload.create({
      collection: 'wishlist',
      data: {
        customer: user.id,
        product: productId,
        variant: {
          color: variant?.color || '',
          size: variant?.size || '',
          sku: variant?.sku || '',
          priceAtAdd: currentPrice,
        },
        notifyOnPriceDrop,
        addedAt: new Date().toISOString(),
      },
    })
    
    return NextResponse.json({
      success: true,
      message: '已加入願望清單',
      item: newItem,
    })
  } catch (error) {
    console.error('Wishlist POST error:', error)
    return NextResponse.json(
      { success: false, error: '加入願望清單失敗' },
      { status: 500 }
    )
  }
}

// DELETE: 從願望清單移除
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '請先登入' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少 id 參數' },
        { status: 400 }
      )
    }
    
    const payload = await getPayload({ config: configPromise })
    
    // 確認是用戶自己的願望清單項目
    const item = await payload.findByID({
      collection: 'wishlist',
      id,
    })
    
    const itemCustomerId = typeof (item as any).customer === 'object' 
      ? (item as any).customer.id 
      : (item as any).customer
    
    if (itemCustomerId !== user.id) {
      return NextResponse.json(
        { success: false, error: '無權限刪除此項目' },
        { status: 403 }
      )
    }
    
    await payload.delete({
      collection: 'wishlist',
      id,
    })
    
    return NextResponse.json({
      success: true,
      message: '已從願望清單移除',
    })
  } catch (error) {
    console.error('Wishlist DELETE error:', error)
    return NextResponse.json(
      { success: false, error: '移除失敗' },
      { status: 500 }
    )
  }
}
