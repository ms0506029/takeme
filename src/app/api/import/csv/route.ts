/**
 * CSV 商品匯入 API
 * 
 * POST /api/import/csv - 執行匯入
 * POST /api/import/csv?preview=true - 預覽
 */

import { importFromCsv, previewCsvImport } from '@/lib/import/csv-importer'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

export async function POST(request: NextRequest) {
  try {
    // 驗證登入
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    // 檢查權限
    const isAdmin = user.roles?.includes('super-admin') || user.roles?.includes('admin')
    if (!isAdmin) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    // 取得 vendor ID（Admin 使用預設 vendor）
    let vendorId = typeof user.vendor === 'object' ? user.vendor?.id : user.vendor

    // 如果是 admin 沒有 vendor，嘗試取得第一個 vendor
    if (!vendorId && isAdmin) {
      const vendors = await payload.find({
        collection: 'vendors',
        limit: 1,
      })
      if (vendors.docs.length > 0) {
        vendorId = vendors.docs[0].id as string
      }
    }

    if (!vendorId) {
      return NextResponse.json({ error: '無法確定商家 ID' }, { status: 400 })
    }

    // 解析 Form Data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'
    const downloadImages = formData.get('downloadImages') !== 'false'
    const imageQuality = (formData.get('imageQuality') as 'thumbnail' | 'detail') || 'detail'

    if (!file) {
      return NextResponse.json({ error: '請上傳 CSV 檔案' }, { status: 400 })
    }

    // 讀取檔案內容
    const csvContent = await file.text()

    if (isPreview) {
      // 預覽模式
      const result = previewCsvImport(csvContent)
      return NextResponse.json(result)
    }

    // 執行匯入
    const result = await importFromCsv(csvContent, {
      vendorId,
      downloadImages,
      imageQuality,
      skipExisting: true,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[CSV Import API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '匯入過程發生錯誤' },
      { status: 500 }
    )
  }
}
