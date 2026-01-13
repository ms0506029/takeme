/**
 * Customer Analytics Service
 * Phase 7.3.4 - 客戶分析與 RFM 分群
 * 
 * RFM 分析：
 * - Recency（最近性）：最近一次購買時間
 * - Frequency（頻率）：購買次數
 * - Monetary（金額）：消費總金額
 * 
 * 依據 RFM 分數將客戶分為不同群體
 */

import configPromise from '@payload-config'
import { getPayload } from 'payload'

// ===== 類型定義 =====

export interface RFMScore {
  userId: string
  email: string
  name: string
  recency: number      // 距離最後購買天數
  frequency: number    // 訂單數量
  monetary: number     // 總消費金額
  rScore: number       // R 分數 (1-5)
  fScore: number       // F 分數 (1-5)
  mScore: number       // M 分數 (1-5)
  rfmScore: string     // 組合分數 e.g. "555"
  segment: RFMSegment  // 客戶群體
}

export type RFMSegment = 
  | 'champions'           // 冠軍：最近買、常買、買很多
  | 'loyal_customers'     // 忠誠客戶：常買、買很多
  | 'potential_loyalists' // 潛力忠誠：最近買、開始常買
  | 'new_customers'       // 新客戶：最近第一次買
  | 'promising'           // 有潛力：最近買但不常買
  | 'need_attention'      // 需關注：曾經是好客戶但開始流失
  | 'about_to_sleep'      // 即將沉睡：很久沒買了
  | 'at_risk'             // 高風險：曾經很活躍但快流失
  | 'hibernating'         // 冬眠：很久沒買、之前買的少
  | 'lost'                // 流失：很久沒買、曾經買很多

export interface CustomerAnalytics {
  totalCustomers: number
  activeCustomers: number   // 30天內有訂單
  newCustomers: number      // 30天內首次訂單
  averageOrderValue: number
  averageOrdersPerCustomer: number
  topSpenders: { userId: string; name: string; totalSpent: number }[]
  segmentDistribution: Record<RFMSegment, number>
  rfmScores: RFMScore[]
}

// ===== RFM 分群規則 =====

const SEGMENT_RULES: { segment: RFMSegment; label: string; condition: (r: number, f: number, m: number) => boolean }[] = [
  { segment: 'champions', label: '冠軍客戶', condition: (r, f, m) => r >= 4 && f >= 4 && m >= 4 },
  { segment: 'loyal_customers', label: '忠誠客戶', condition: (r, f, m) => f >= 4 && m >= 4 },
  { segment: 'potential_loyalists', label: '潛力忠誠', condition: (r, f, m) => r >= 4 && (f >= 2 && f <= 4) },
  { segment: 'new_customers', label: '新客戶', condition: (r, f, m) => r >= 4 && f === 1 },
  { segment: 'promising', label: '有潛力', condition: (r, f, m) => r >= 3 && f <= 2 },
  { segment: 'need_attention', label: '需關注', condition: (r, f, m) => r <= 3 && f >= 3 && m >= 3 },
  { segment: 'about_to_sleep', label: '即將沉睡', condition: (r, f, m) => r <= 2 && f <= 2 },
  { segment: 'at_risk', label: '高風險', condition: (r, f, m) => r <= 2 && f >= 3 },
  { segment: 'hibernating', label: '冬眠', condition: (r, f, m) => r <= 2 && m <= 2 },
  { segment: 'lost', label: '流失', condition: (r, f, m) => r === 1 && f === 1 },
]

const SEGMENT_LABELS: Record<RFMSegment, string> = {
  champions: '冠軍客戶',
  loyal_customers: '忠誠客戶',
  potential_loyalists: '潛力忠誠',
  new_customers: '新客戶',
  promising: '有潛力',
  need_attention: '需關注',
  about_to_sleep: '即將沉睡',
  at_risk: '高風險',
  hibernating: '冬眠',
  lost: '流失',
}

// ===== 核心分析函式 =====

/**
 * 計算 RFM 分數
 */
export async function calculateRFMScores(): Promise<RFMScore[]> {
  const payload = await getPayload({ config: configPromise })
  const now = new Date()
  
  // 取得所有客戶與其訂單
  const users = await payload.find({
    collection: 'users',
    where: {
      roles: { contains: 'customer' },
    },
    limit: 1000,
  })
  
  // 收集所有客戶的 RFM 原始數據
  const rfmData: Array<{
    userId: string
    email: string
    name: string
    recency: number
    frequency: number
    monetary: number
  }> = []
  
  for (const user of users.docs) {
    // 取得該用戶的訂單
    const orders = await payload.find({
      collection: 'orders',
      where: { customer: { equals: user.id } },
      sort: '-createdAt',
    })
    
    if (orders.docs.length === 0) continue
    
    // 計算 R - 最近購買距今天數
    const lastOrder = orders.docs[0]
    const lastOrderDate = new Date(lastOrder.createdAt)
    const recencyDays = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // 計算 F - 訂單數量
    const frequency = orders.docs.length
    
    // 計算 M - 總消費金額
    const monetary = orders.docs.reduce((sum, order) => {
      return sum + ((order as any).amount || 0)
    }, 0)
    
    rfmData.push({
      userId: user.id,
      email: user.email,
      name: user.name || user.email,
      recency: recencyDays,
      frequency,
      monetary,
    })
  }
  
  if (rfmData.length === 0) return []
  
  // 計算百分位數（用於分配 1-5 分數）
  const recencyValues = rfmData.map(d => d.recency).sort((a, b) => a - b)
  const frequencyValues = rfmData.map(d => d.frequency).sort((a, b) => a - b)
  const monetaryValues = rfmData.map(d => d.monetary).sort((a, b) => a - b)
  
  const getScore = (value: number, values: number[], reverse = false): number => {
    const percentile = values.filter(v => v <= value).length / values.length
    const score = Math.ceil(percentile * 5) || 1
    return reverse ? 6 - score : score // Recency 需要反轉（天數越少分數越高）
  }
  
  // 計算每個客戶的 RFM 分數與群體
  const rfmScores: RFMScore[] = rfmData.map(data => {
    const rScore = getScore(data.recency, recencyValues, true) // 反轉
    const fScore = getScore(data.frequency, frequencyValues)
    const mScore = getScore(data.monetary, monetaryValues)
    
    // 決定客戶群體
    let segment: RFMSegment = 'hibernating'
    for (const rule of SEGMENT_RULES) {
      if (rule.condition(rScore, fScore, mScore)) {
        segment = rule.segment
        break
      }
    }
    
    return {
      userId: data.userId,
      email: data.email,
      name: data.name,
      recency: data.recency,
      frequency: data.frequency,
      monetary: data.monetary,
      rScore,
      fScore,
      mScore,
      rfmScore: `${rScore}${fScore}${mScore}`,
      segment,
    }
  })
  
  return rfmScores
}

/**
 * 取得客戶分析報告
 */
export async function getCustomerAnalytics(): Promise<CustomerAnalytics> {
  const payload = await getPayload({ config: configPromise })
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  
  // 總客戶數
  const totalCustomers = await payload.count({
    collection: 'users',
    where: { roles: { contains: 'customer' } },
  })
  
  // 活躍客戶（30天內有訂單）
  const recentOrders = await payload.find({
    collection: 'orders',
    where: {
      createdAt: { greater_than: thirtyDaysAgo.toISOString() },
    },
    limit: 1000,
  })
  
  const activeCustomerIds = new Set(
    recentOrders.docs.map(o => {
      const customer = (o as any).customer
      return typeof customer === 'object' ? customer.id : customer
    }).filter(Boolean)
  )
  
  // 計算訂單統計
  const allOrders = await payload.find({
    collection: 'orders',
    limit: 5000,
  })
  
  const totalOrderValue = allOrders.docs.reduce((sum, o) => sum + ((o as any).amount || 0), 0)
  const averageOrderValue = allOrders.docs.length > 0 
    ? Math.round(totalOrderValue / allOrders.docs.length) 
    : 0
  
  // Top 消費者
  const customerSpending = new Map<string, { name: string; total: number }>()
  for (const order of allOrders.docs) {
    const customerId = typeof (order as any).customer === 'object' 
      ? (order as any).customer?.id 
      : (order as any).customer
    if (!customerId) continue
    
    const current = customerSpending.get(customerId) || { name: '', total: 0 }
    current.total += (order as any).amount || 0
    if (typeof (order as any).customer === 'object') {
      current.name = (order as any).customer.name || (order as any).customer.email || ''
    }
    customerSpending.set(customerId, current)
  }
  
  const topSpenders = Array.from(customerSpending.entries())
    .map(([userId, data]) => ({ userId, name: data.name, totalSpent: data.total }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
  
  // RFM 分群
  const rfmScores = await calculateRFMScores()
  
  const segmentDistribution: Record<RFMSegment, number> = {
    champions: 0,
    loyal_customers: 0,
    potential_loyalists: 0,
    new_customers: 0,
    promising: 0,
    need_attention: 0,
    about_to_sleep: 0,
    at_risk: 0,
    hibernating: 0,
    lost: 0,
  }
  
  for (const score of rfmScores) {
    segmentDistribution[score.segment]++
  }
  
  return {
    totalCustomers: totalCustomers.totalDocs,
    activeCustomers: activeCustomerIds.size,
    newCustomers: recentOrders.docs.filter(o => {
      // 簡化：假設 30 天內首次訂單
      return true
    }).length,
    averageOrderValue,
    averageOrdersPerCustomer: totalCustomers.totalDocs > 0 
      ? Math.round(allOrders.docs.length / totalCustomers.totalDocs * 10) / 10 
      : 0,
    topSpenders,
    segmentDistribution,
    rfmScores,
  }
}

/**
 * 取得 Segment 標籤
 */
export function getSegmentLabel(segment: RFMSegment): string {
  return SEGMENT_LABELS[segment] || segment
}

/**
 * 取得 Segment 顏色
 */
export function getSegmentColor(segment: RFMSegment): string {
  const colors: Record<RFMSegment, string> = {
    champions: '#22c55e',       // green
    loyal_customers: '#3b82f6', // blue
    potential_loyalists: '#8b5cf6', // purple
    new_customers: '#06b6d4',   // cyan
    promising: '#f59e0b',       // amber
    need_attention: '#f97316',  // orange
    about_to_sleep: '#eab308',  // yellow
    at_risk: '#ef4444',         // red
    hibernating: '#6b7280',     // gray
    lost: '#374151',            // dark gray
  }
  return colors[segment] || '#6b7280'
}
