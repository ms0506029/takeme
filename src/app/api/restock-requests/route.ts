import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * Restock Requests API
 * 補貨通知申請 API
 * 
 * GET /api/restock-requests - 取得當前用戶的補貨申請
 * POST /api/restock-requests - 申請補貨通知
 * DELETE /api/restock-requests?id=xxx - 取消申請
 */

// 取得當前用戶
async function getCurrentUser() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await headers()
  
  const authHeader = headersList.get('authorization')
  
  if (!authHeader) return null
  
  try {
    const { user } = await payload.auth({ headers: headersList })
    return user
  } catch {
    return null
  }
}

// GET: 取得補貨申請列表
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
    
    const requests = await payload.find({
      collection: 'restock-requests',
      where: {
        customer: { equals: user.id },
      },
      depth: 2,
      sort: '-requestedAt',
    })
    
    return NextResponse.json({
      success: true,
      items: requests.docs,
      total: requests.totalDocs,
    })
  } catch (error) {
    console.error('RestockRequests GET error:', error)
    return NextResponse.json(
      { success: false, error: '取得申請列表失敗' },
      { status: 500 }
    )
  }
}

// POST: 申請補貨通知
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
    const { productId, variant } = body
    
    if (!productId) {
      return NextResponse.json(
        { success: false, error: '缺少 productId' },
        { status: 400 }
      )
    }
    
    const payload = await getPayload({ config: configPromise })
    
    // 檢查是否已存在待處理的申請
    const existing = await payload.find({
      collection: 'restock-requests',
      where: {
        customer: { equals: user.id },
        product: { equals: productId },
        status: { equals: 'pending' },
        ...(variant?.sku ? { 'variant.sku': { equals: variant.sku } } : {}),
      },
      limit: 1,
    })
    
    if (existing.docs.length > 0) {
      return NextResponse.json({
        success: true,
        message: '您已申請過此商品的補貨通知',
        item: existing.docs[0],
      })
    }
    
    // 建立新的補貨申請
    const newRequest = await payload.create({
      collection: 'restock-requests',
      data: {
        customer: user.id,
        product: productId,
        variant: {
          color: variant?.color || '',
          size: variant?.size || '',
          sku: variant?.sku || '',
        },
        status: 'pending',
        requestedAt: new Date().toISOString(),
      },
    })
    
    return NextResponse.json({
      success: true,
      message: '已申請補貨通知，商品到貨時會通知您',
      item: newRequest,
    })
  } catch (error) {
    console.error('RestockRequests POST error:', error)
    return NextResponse.json(
      { success: false, error: '申請失敗' },
      { status: 500 }
    )
  }
}

// DELETE: 取消申請
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
    
    // 確認是用戶自己的申請
    const item = await payload.findByID({
      collection: 'restock-requests',
      id,
    })
    
    const itemCustomerId = typeof (item as any).customer === 'object'
      ? (item as any).customer.id
      : (item as any).customer
    
    if (itemCustomerId !== user.id) {
      return NextResponse.json(
        { success: false, error: '無權限取消此申請' },
        { status: 403 }
      )
    }
    
    // 更新狀態為已取消
    await payload.update({
      collection: 'restock-requests',
      id,
      data: {
        status: 'cancelled',
      },
    })
    
    return NextResponse.json({
      success: true,
      message: '已取消補貨通知申請',
    })
  } catch (error) {
    console.error('RestockRequests DELETE error:', error)
    return NextResponse.json(
      { success: false, error: '取消失敗' },
      { status: 500 }
    )
  }
}
