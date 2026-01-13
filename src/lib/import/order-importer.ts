/**
 * Order Importer Service
 * Phase 7.1.1 - 訂單轉移系統核心服務
 * 
 * 功能：
 * 1. 解析 CSV/Excel 檔案
 * 2. 透過 Adapter 轉換欄位
 * 3. 批量匯入/更新訂單
 * 4. 生成匯入報告
 */

import configPromise from '@payload-config'
import Papa from 'papaparse'
import { getPayload } from 'payload'
import * as XLSX from 'xlsx'

// ===== 類型定義 =====

export type ImportSource = 'easystore' | 'shopify' | 'other'

export interface ImportRow {
  [key: string]: string | number | undefined
}

export interface ImportResult {
  success: boolean
  imported: number    // 新增數量
  updated: number     // 更新數量
  errors: ImportError[]
  totalRows: number
}

export interface ImportError {
  row: number
  field?: string
  message: string
  data?: any
}

export interface ParsedFile {
  columns: string[]
  rows: ImportRow[]
  totalRows: number
}

export interface MappedOrder {
  externalOrderId: string
  orderNumber?: string
  externalCustomerEmail?: string
  amount: number          // 金額（分為單位）
  currency: string
  status: 'processing' | 'completed' | 'cancelled' | 'refunded'
  shippingAddress?: {
    firstName?: string
    lastName?: string
    line1?: string
    line2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    phone?: string
  }
  externalItems: any[]    // 原始商品資料快照
  createdAt?: string      // 原始訂單時間
  importedFrom: ImportSource
}

// ===== 檔案解析 =====

/**
 * 解析 CSV 檔案
 */
export async function parseCSV(content: string): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as ImportRow[]
        const columns = results.meta.fields || []
        resolve({
          columns,
          rows,
          totalRows: rows.length,
        })
      },
      error: (error) => {
        reject(new Error(`CSV 解析失敗: ${error.message}`))
      },
    })
  })
}

/**
 * 解析 Excel 檔案 (.xlsx)
 */
export async function parseExcel(buffer: ArrayBuffer): Promise<ParsedFile> {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  
  if (!firstSheet) {
    throw new Error('Excel 檔案中沒有有效的工作表')
  }
  
  const rows = XLSX.utils.sheet_to_json<ImportRow>(firstSheet)
  const columns = Object.keys(rows[0] || {})
  
  return {
    columns,
    rows,
    totalRows: rows.length,
  }
}

// ===== 欄位映射（EasyStore 預設映射）=====

/**
 * EasyStore 欄位映射
 * 根據 EasyStore 訂單匯出格式轉換
 */
export function mapEasyStoreOrder(row: ImportRow): MappedOrder {
  // EasyStore 常見欄位名稱（可能有變體）
  const orderId = String(row['Order ID'] || row['訂單編號'] || row['id'] || '')
  const orderNumber = String(row['Order Number'] || row['訂單號'] || row['order_number'] || orderId)
  const email = String(row['Email'] || row['email'] || row['客戶信箱'] || '')
  
  // 金額處理（假設是 TWD，轉為「分」）
  const totalPrice = parseFloat(String(row['Total'] || row['總金額'] || row['total_price'] || '0'))
  const amountInCents = Math.round(totalPrice * 100)
  
  // 狀態映射
  const rawStatus = String(row['Financial Status'] || row['付款狀態'] || row['Status'] || '').toLowerCase()
  let status: MappedOrder['status'] = 'processing'
  if (rawStatus.includes('paid') || rawStatus.includes('已付款') || rawStatus.includes('completed')) {
    status = 'completed'
  } else if (rawStatus.includes('refund') || rawStatus.includes('退款')) {
    status = 'refunded'
  } else if (rawStatus.includes('cancel') || rawStatus.includes('取消')) {
    status = 'cancelled'
  }
  
  // 收件地址
  const shippingAddress = {
    firstName: String(row['Shipping First Name'] || row['收件人名'] || row['First Name'] || ''),
    lastName: String(row['Shipping Last Name'] || row['收件人姓'] || row['Last Name'] || ''),
    line1: String(row['Shipping Address1'] || row['收件地址1'] || row['Address'] || ''),
    line2: String(row['Shipping Address2'] || row['收件地址2'] || ''),
    city: String(row['Shipping City'] || row['城市'] || ''),
    state: String(row['Shipping State'] || row['縣市'] || row['Province'] || ''),
    postalCode: String(row['Shipping Zip'] || row['郵遞區號'] || row['Postal Code'] || ''),
    country: String(row['Shipping Country'] || row['國家'] || 'TW'),
    phone: String(row['Shipping Phone'] || row['電話'] || row['Phone'] || ''),
  }
  
  // 商品資料（保留原始 JSON 以便後續對接）
  let externalItems: any[] = []
  if (row['Items'] || row['Line Items']) {
    try {
      const itemsStr = String(row['Items'] || row['Line Items'])
      externalItems = JSON.parse(itemsStr)
    } catch {
      // 如果不是 JSON，保存為單筆
      externalItems = [{
        name: row['Product'] || row['商品名稱'] || '',
        sku: row['SKU'] || row['商品編號'] || '',
        quantity: row['Quantity'] || row['數量'] || 1,
        price: row['Price'] || row['單價'] || 0,
      }]
    }
  }
  
  // 原始訂單時間
  const createdAt = String(row['Created At'] || row['建立時間'] || row['Order Date'] || '')
  
  return {
    externalOrderId: orderId,
    orderNumber,
    externalCustomerEmail: email || undefined,
    amount: amountInCents,
    currency: String(row['Currency'] || row['幣別'] || 'TWD'),
    status,
    shippingAddress: shippingAddress.line1 ? shippingAddress : undefined,
    externalItems,
    createdAt: createdAt || undefined,
    importedFrom: 'easystore',
  }
}

/**
 * Shopify CSV 欄位映射
 */
export function mapShopifyOrder(row: ImportRow): MappedOrder {
  // Shopify 標準匯出格式
  const orderId = String(row['Name'] || row['Order ID'] || '')
  const email = String(row['Email'] || '')
  
  const totalPrice = parseFloat(String(row['Total'] || '0'))
  const amountInCents = Math.round(totalPrice * 100)
  
  const rawStatus = String(row['Financial Status'] || '').toLowerCase()
  let status: MappedOrder['status'] = 'processing'
  if (rawStatus === 'paid') status = 'completed'
  else if (rawStatus === 'refunded') status = 'refunded'
  else if (rawStatus === 'voided') status = 'cancelled'
  
  const shippingAddress = {
    firstName: String(row['Shipping Name'] || '').split(' ')[0] || '',
    lastName: String(row['Shipping Name'] || '').split(' ').slice(1).join(' ') || '',
    line1: String(row['Shipping Street'] || row['Shipping Address1'] || ''),
    line2: String(row['Shipping Address2'] || ''),
    city: String(row['Shipping City'] || ''),
    state: String(row['Shipping Province'] || ''),
    postalCode: String(row['Shipping Zip'] || ''),
    country: String(row['Shipping Country'] || ''),
    phone: String(row['Shipping Phone'] || ''),
  }
  
  const externalItems = [{
    name: row['Lineitem name'] || '',
    sku: row['Lineitem sku'] || '',
    quantity: parseInt(String(row['Lineitem quantity'] || '1'), 10),
    price: parseFloat(String(row['Lineitem price'] || '0')),
  }]
  
  return {
    externalOrderId: orderId,
    orderNumber: orderId,
    externalCustomerEmail: email || undefined,
    amount: amountInCents,
    currency: String(row['Currency'] || 'TWD'),
    status,
    shippingAddress: shippingAddress.line1 ? shippingAddress : undefined,
    externalItems,
    createdAt: String(row['Created at'] || ''),
    importedFrom: 'shopify',
  }
}

/**
 * 通用映射器（根據來源選擇）
 */
export function mapOrder(row: ImportRow, source: ImportSource): MappedOrder {
  switch (source) {
    case 'easystore':
      return mapEasyStoreOrder(row)
    case 'shopify':
      return mapShopifyOrder(row)
    default:
      return mapEasyStoreOrder(row) // 預設使用 EasyStore 格式
  }
}

// ===== 匯入邏輯 =====

/**
 * 匯入訂單到 Payload
 * - 以 externalOrderId 為 key 進行重複檢測
 * - 重複時「更新」現有訂單
 */
export async function importOrders(
  rows: ImportRow[],
  source: ImportSource = 'easystore'
): Promise<ImportResult> {
  const payload = await getPayload({ config: configPromise })
  const errors: ImportError[] = []
  let imported = 0
  let updated = 0
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNumber = i + 2 // Excel/CSV 從第 2 行開始（含標題）
    
    try {
      // 欄位映射
      const mapped = mapOrder(row, source)
      
      // 驗證必要欄位
      if (!mapped.externalOrderId) {
        errors.push({
          row: rowNumber,
          field: 'externalOrderId',
          message: '缺少外部訂單編號',
          data: row,
        })
        continue
      }
      
      // 檢查是否已存在（by externalOrderId）
      const existing = await payload.find({
        collection: 'orders',
        where: {
          externalOrderId: { equals: mapped.externalOrderId },
        },
        limit: 1,
      })
      
      const orderData = {
        externalOrderId: mapped.externalOrderId,
        externalCustomerEmail: mapped.externalCustomerEmail,
        amount: mapped.amount,
        currency: mapped.currency,
        status: mapped.status,
        shippingAddress: mapped.shippingAddress,
        externalItems: mapped.externalItems,
        importedFrom: mapped.importedFrom,
        importedAt: new Date().toISOString(),
        // 注意：createdAt 通常由 Payload 自動管理
        // 如需保留原始時間，可改為自訂欄位
      }
      
      if (existing.docs.length > 0) {
        // 更新現有訂單
        await payload.update({
          collection: 'orders',
          id: existing.docs[0].id,
          data: orderData as any,
        })
        updated++
      } else {
        // 新增訂單
        await payload.create({
          collection: 'orders',
          data: orderData as any,
        })
        imported++
      }
    } catch (err) {
      errors.push({
        row: rowNumber,
        message: `匯入失敗: ${err instanceof Error ? err.message : String(err)}`,
        data: row,
      })
    }
  }
  
  return {
    success: errors.length === 0,
    imported,
    updated,
    errors,
    totalRows: rows.length,
  }
}

/**
 * 預覽匯入資料（不實際寫入）
 */
export async function previewImport(
  rows: ImportRow[],
  source: ImportSource = 'easystore',
  limit: number = 5
): Promise<{ preview: MappedOrder[]; columns: string[] }> {
  const previewRows = rows.slice(0, limit)
  const preview = previewRows.map(row => mapOrder(row, source))
  const columns = Object.keys(rows[0] || {})
  
  return { preview, columns }
}
