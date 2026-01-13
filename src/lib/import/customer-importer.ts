/**
 * Customer Importer Service
 * Phase 7.3.1 - 客戶轉移核心服務
 * 
 * 功能：
 * 1. 從外部平台匯入客戶資料
 * 2. 更新現有客戶（以 email 識別）
 * 3. 支援會員等級遷移
 */

import configPromise from '@payload-config'
import { getPayload } from 'payload'

// ===== 類型定義 =====

export type CustomerSource = 'easystore' | 'shopify' | 'other'

export interface CustomerImportData {
  email: string
  name?: string
  phone?: string
  
  // 外部來源
  externalCustomerId?: string
  importedFrom?: CustomerSource
  
  // LINE 資訊
  lineUserId?: string
  
  // 會員資訊
  memberLevel?: 'bronze' | 'silver' | 'gold' | 'vip'
  totalSpent?: number
  
  // 地址
  defaultAddress?: {
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
}

export interface CustomerImportResult {
  success: boolean
  action: 'created' | 'updated' | 'skipped'
  userId?: string
  message?: string
  error?: string
}

export interface BatchCustomerImportResult {
  success: boolean
  total: number
  created: number
  updated: number
  failed: number
  results: CustomerImportResult[]
}

// ===== 單一客戶匯入 =====

/**
 * 匯入單一客戶
 * - 以 email 為 key 進行重複檢測
 * - 重複時更新現有客戶
 */
export async function importCustomer(data: CustomerImportData): Promise<CustomerImportResult> {
  try {
    const payload = await getPayload({ config: configPromise })
    
    // 驗證必要欄位
    if (!data.email) {
      return {
        success: false,
        action: 'skipped',
        error: '缺少 email',
      }
    }
    
    // 檢查是否已存在
    const existing = await payload.find({
      collection: 'users',
      where: {
        email: { equals: data.email },
      },
      limit: 1,
    })
    
    // 準備用戶資料
    const userData = {
      name: data.name || data.email.split('@')[0],
      phone: data.phone,
      lineUserId: data.lineUserId,
      memberLevel: data.memberLevel || 'bronze',
      totalSpent: data.totalSpent || 0,
    }
    
    if (existing.docs.length > 0) {
      // 更新現有客戶
      const updated = await payload.update({
        collection: 'users',
        id: existing.docs[0].id,
        data: userData as any,
      })
      
      return {
        success: true,
        action: 'updated',
        userId: updated.id as string,
        message: `客戶已更新：${data.email}`,
      }
    } else {
      // 建立新客戶
      // 生成隨機密碼（用戶需要重設）
      const tempPassword = generateTempPassword()
      
      const created = await payload.create({
        collection: 'users',
        data: {
          email: data.email,
          password: tempPassword,
          roles: ['customer'],
          ...userData,
        } as any,
      })
      
      return {
        success: true,
        action: 'created',
        userId: created.id as string,
        message: `客戶已建立：${data.email}`,
      }
    }
  } catch (err) {
    console.error('Customer import error:', err)
    return {
      success: false,
      action: 'skipped',
      error: err instanceof Error ? err.message : '匯入失敗',
    }
  }
}

// ===== 批量匯入 =====

/**
 * 批量匯入客戶
 */
export async function batchImportCustomers(
  customers: CustomerImportData[]
): Promise<BatchCustomerImportResult> {
  const results: CustomerImportResult[] = []
  let created = 0
  let updated = 0
  let failed = 0
  
  for (const customer of customers) {
    const result = await importCustomer(customer)
    results.push(result)
    
    if (result.success) {
      if (result.action === 'created') created++
      else if (result.action === 'updated') updated++
    } else {
      failed++
    }
  }
  
  return {
    success: failed === 0,
    total: customers.length,
    created,
    updated,
    failed,
    results,
  }
}

// ===== 工具函式 =====

/**
 * 生成臨時密碼
 */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  let password = ''
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * 連結訂單到客戶
 * 將匯入的訂單與對應客戶連結（依 externalCustomerEmail）
 */
export async function linkOrdersToCustomers(): Promise<{
  linked: number
  errors: string[]
}> {
  const payload = await getPayload({ config: configPromise })
  const errors: string[] = []
  let linked = 0
  
  // 找到所有沒有 customer 但有 externalCustomerEmail 的訂單
  const unlinkedOrders = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { customer: { exists: false } },
        { externalCustomerEmail: { exists: true } },
      ],
    },
    limit: 500,
  })
  
  for (const order of unlinkedOrders.docs) {
    const email = (order as any).externalCustomerEmail
    if (!email) continue
    
    // 找到對應的用戶
    const user = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
    })
    
    if (user.docs.length > 0) {
      try {
        await payload.update({
          collection: 'orders',
          id: order.id,
          data: {
            customer: user.docs[0].id,
          } as any,
        })
        linked++
      } catch (err) {
        errors.push(`Order ${order.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
  }
  
  return { linked, errors }
}
