/**
 * EasyStore Import API Route
 * 
 * GET  - 預覽可匯入商品數量 / 測試連線
 * POST - 執行匯入
 */

import { testConnection } from '@/lib/import/easystore-api'
import { importFromEasyStore, previewEasyStoreImport } from '@/lib/import/easystore-importer'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * GET /api/import/easystore
 * 預覽可匯入商品或測試連線
 */
export async function GET(request: NextRequest) {
  try {
    // 驗證用戶權限
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授權' },
        { status: 401 }
      )
    }
    
    // 檢查權限（只有 admin 或 vendor 可以匯入）
    const hasPermission = user.roles?.some(role => 
      ['super-admin', 'admin', 'vendor'].includes(role)
    )
    
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: '權限不足' },
        { status: 403 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    // 測試連線
    if (action === 'test') {
      const result = await testConnection()
      return NextResponse.json(result)
    }
    
    // 預覽匯入
    const preview = await previewEasyStoreImport()
    return NextResponse.json(preview)
    
  } catch (error) {
    console.error('EasyStore import preview error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '預覽失敗' 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/import/easystore
 * 執行商品匯入
 */
export async function POST(request: NextRequest) {
  try {
    // 驗證用戶權限
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授權' },
        { status: 401 }
      )
    }
    
    // 檢查權限
    const hasPermission = user.roles?.some(role => 
      ['super-admin', 'admin', 'vendor'].includes(role)
    )
    
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: '權限不足' },
        { status: 403 }
      )
    }
    
    // 取得請求參數
    const body = await request.json().catch(() => ({}))
    const {
      vendorId,
      skipExisting = true,
      downloadImages = true,
    } = body
    
    // 確定 vendorId
    let targetVendorId = vendorId
    
    if (!targetVendorId) {
      // 如果沒有指定 vendorId，使用當前用戶的 vendor
      if (user.vendor) {
        targetVendorId = typeof user.vendor === 'object' 
          ? user.vendor.id 
          : user.vendor
      } else {
        // 如果用戶沒有 vendor，嘗試取得第一個 vendor
        const vendors = await payload.find({
          collection: 'vendors',
          limit: 1,
        })
        
        if (vendors.docs.length === 0) {
          return NextResponse.json(
            { success: false, error: '找不到可用的商家，請先建立商家' },
            { status: 400 }
          )
        }
        
        targetVendorId = vendors.docs[0].id
      }
    }
    
    console.log(`[EasyStore Import] 開始匯入，目標商家: ${targetVendorId}`)
    
    // 執行匯入
    const result = await importFromEasyStore({
      vendorId: targetVendorId as string,
      skipExisting,
      downloadImages,
    })
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('EasyStore import error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '匯入失敗' 
      },
      { status: 500 }
    )
  }
}
