import {
    importOrders,
    parseCSV,
    parseExcel,
    previewImport,
    type ImportSource,
    type ParsedFile
} from '@/lib/import/order-importer'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Order Import API
 * Phase 7.1.1 - 訂單匯入端點
 * 
 * POST /api/import-orders
 * - action: 'preview' | 'import'
 * - file: FormData (CSV or Excel)
 * - source: 'easystore' | 'shopify' | 'other'
 */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const action = formData.get('action') as string || 'preview'
    const source = (formData.get('source') as ImportSource) || 'easystore'

    if (!file) {
      return NextResponse.json(
        { success: false, error: '請上傳檔案' },
        { status: 400 }
      )
    }

    // 檢查檔案類型
    const fileName = file.name.toLowerCase()
    const isCSV = fileName.endsWith('.csv')
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')

    if (!isCSV && !isExcel) {
      return NextResponse.json(
        { success: false, error: '僅支援 CSV 或 Excel (.xlsx) 格式' },
        { status: 400 }
      )
    }

    // 解析檔案
    let parsed: ParsedFile

    if (isCSV) {
      const text = await file.text()
      parsed = await parseCSV(text)
    } else {
      const buffer = await file.arrayBuffer()
      parsed = await parseExcel(buffer)
    }

    if (parsed.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '檔案中沒有資料' },
        { status: 400 }
      )
    }

    // 根據 action 執行操作
    if (action === 'preview') {
      const { preview, columns } = await previewImport(parsed.rows, source, 5)
      return NextResponse.json({
        success: true,
        action: 'preview',
        columns,
        preview,
        totalRows: parsed.totalRows,
      })
    } else if (action === 'import') {
      const result = await importOrders(parsed.rows, source)
      return NextResponse.json({
        success: result.success,
        action: 'import',
        imported: result.imported,
        updated: result.updated,
        errors: result.errors.slice(0, 10), // 只返回前 10 筆錯誤
        totalRows: result.totalRows,
        totalErrors: result.errors.length,
      })
    } else {
      return NextResponse.json(
        { success: false, error: '無效的 action' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Import orders API error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '匯入失敗' },
      { status: 500 }
    )
  }
}
