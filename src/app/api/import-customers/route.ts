import {
    batchImportCustomers,
    linkOrdersToCustomers,
    type CustomerImportData
} from '@/lib/import/customer-importer'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

/**
 * Customer Import API
 * Phase 7.3.1 - 客戶匯入端點
 * 
 * POST /api/import-customers
 * - action: 'preview' | 'import' | 'link-orders'
 * - file: FormData (CSV or Excel)
 */

interface ParsedFile {
  columns: string[]
  rows: Record<string, any>[]
  totalRows: number
}

async function parseCSV(content: string): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, any>[]
        const columns = results.meta.fields || []
        resolve({ columns, rows, totalRows: rows.length })
      },
      error: (error) => reject(new Error(`CSV 解析失敗: ${error.message}`)),
    })
  })
}

async function parseExcel(buffer: ArrayBuffer): Promise<ParsedFile> {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!firstSheet) throw new Error('Excel 檔案中沒有有效的工作表')
  
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet)
  const columns = Object.keys(rows[0] || {})
  
  return { columns, rows, totalRows: rows.length }
}

function mapCustomerRow(row: Record<string, any>): CustomerImportData {
  return {
    email: String(row['Email'] || row['email'] || row['電子郵件'] || ''),
    name: String(row['Name'] || row['name'] || row['姓名'] || row['First Name'] + ' ' + (row['Last Name'] || '') || '').trim(),
    phone: String(row['Phone'] || row['phone'] || row['電話'] || ''),
    lineUserId: String(row['LINE User ID'] || row['line_user_id'] || ''),
    memberLevel: mapMemberLevel(row['Member Level'] || row['會員等級']),
    totalSpent: parseFloat(String(row['Total Spent'] || row['累計消費'] || '0')) || 0,
  }
}

function mapMemberLevel(level: string): 'bronze' | 'silver' | 'gold' | 'vip' {
  const l = String(level || '').toLowerCase()
  if (l.includes('vip') || l.includes('platinum')) return 'vip'
  if (l.includes('gold') || l.includes('金')) return 'gold'
  if (l.includes('silver') || l.includes('銀')) return 'silver'
  return 'bronze'
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const action = formData.get('action') as string || 'preview'

    // 特殊 action: link-orders
    if (action === 'link-orders') {
      const result = await linkOrdersToCustomers()
      return NextResponse.json({
        success: true,
        message: `已連結 ${result.linked} 筆訂單到客戶`,
        linked: result.linked,
        errors: result.errors.slice(0, 10),
      })
    }

    // 檔案上傳處理
    if (!file) {
      return NextResponse.json(
        { success: false, error: '請上傳檔案' },
        { status: 400 }
      )
    }

    const fileName = file.name.toLowerCase()
    const isCSV = fileName.endsWith('.csv')
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')

    if (!isCSV && !isExcel) {
      return NextResponse.json(
        { success: false, error: '僅支援 CSV 或 Excel (.xlsx) 格式' },
        { status: 400 }
      )
    }

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

    if (action === 'preview') {
      const previewRows = parsed.rows.slice(0, 5).map(mapCustomerRow)
      return NextResponse.json({
        success: true,
        action: 'preview',
        columns: parsed.columns,
        preview: previewRows,
        totalRows: parsed.totalRows,
      })
    } else if (action === 'import') {
      const customers = parsed.rows.map(mapCustomerRow).filter(c => c.email)
      const result = await batchImportCustomers(customers)
      return NextResponse.json({
        success: result.success,
        action: 'import',
        created: result.created,
        updated: result.updated,
        failed: result.failed,
        totalRows: result.total,
        errors: result.results.filter(r => !r.success).slice(0, 10),
      })
    }

    return NextResponse.json(
      { success: false, error: '無效的 action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Customer import API error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '匯入失敗' },
      { status: 500 }
    )
  }
}
