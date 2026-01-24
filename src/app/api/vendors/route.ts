/**
 * Vendors API Route
 * 
 * GET - 取得商家列表
 */

import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * GET /api/vendors
 * 取得商家列表（供前端 ProductImporter 使用）
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })
    
    // 驗證用戶權限
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json(
        { docs: [], error: '未授權' },
        { status: 401 }
      )
    }
    
    // 檢查權限
    const isAdmin = user.roles?.some(role => 
      ['super-admin', 'admin'].includes(role)
    )
    
    // Admin 可以看所有商家，Vendor 只能看自己的
    let where = {}
    if (!isAdmin && user.vendor) {
      const vendorId = typeof user.vendor === 'object' 
        ? user.vendor.id 
        : user.vendor
      where = { id: { equals: vendorId } }
    }
    
    const vendors = await payload.find({
      collection: 'vendors',
      where,
      limit: 100,
      sort: 'name',
    })
    
    return NextResponse.json({
      docs: vendors.docs.map(v => ({
        id: v.id,
        name: v.name || v.id,
      })),
      totalDocs: vendors.totalDocs,
    })
    
  } catch (error) {
    console.error('Vendors API error:', error)
    return NextResponse.json(
      { docs: [], error: error instanceof Error ? error.message : '取得商家失敗' },
      { status: 500 }
    )
  }
}
