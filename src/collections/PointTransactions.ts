/**
 * Point Transactions Collection
 * Phase 7.3.3 - 點數交易紀錄
 * 
 * 記錄所有點數的增加與扣減，支援：
 * - 消費獲得點數
 * - 兌換商品
 * - 手動調整
 * - 點數過期
 */

import { adminOnly } from '@/access/adminOnly'
import { adminOrSelf } from '@/access/adminOrSelf'
import type { CollectionConfig } from 'payload'

export const PointTransactions: CollectionConfig = {
  slug: 'point-transactions',
  labels: {
    singular: '點數交易',
    plural: '點數交易紀錄',
  },
  admin: {
    group: '客戶管理',
    defaultColumns: ['customer', 'type', 'amount', 'description', 'createdAt'],
    description: '會員點數增減紀錄',
  },
  access: {
    read: adminOrSelf,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      label: '會員',
      required: true,
      admin: {
        description: '點數所屬的會員',
      },
    },
    {
      name: 'type',
      type: 'select',
      label: '類型',
      required: true,
      options: [
        { label: '消費獲得', value: 'earn' },
        { label: '兌換使用', value: 'redeem' },
        { label: '手動增加', value: 'manual-add' },
        { label: '手動扣減', value: 'manual-deduct' },
        { label: '過期失效', value: 'expired' },
        { label: '活動獎勵', value: 'bonus' },
        { label: '退貨扣回', value: 'refund' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'amount',
      type: 'number',
      label: '點數',
      required: true,
      admin: {
        description: '正數為增加，負數為扣減',
      },
    },
    {
      name: 'balanceAfter',
      type: 'number',
      label: '交易後餘額',
      admin: {
        readOnly: true,
        description: '系統自動計算',
      },
    },
    {
      name: 'description',
      type: 'text',
      label: '說明',
      admin: {
        placeholder: '例如：訂單 #1234 消費獲得點數',
      },
    },
    {
      name: 'relatedOrder',
      type: 'relationship',
      relationTo: 'orders',
      label: '關聯訂單',
      admin: {
        description: '如果是消費獲得或退貨扣回，關聯到對應訂單',
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      label: '過期時間',
      admin: {
        description: '此筆點數的有效期限',
        date: {
          displayFormat: 'yyyy-MM-dd',
        },
      },
    },
    {
      name: 'operator',
      type: 'relationship',
      relationTo: 'users',
      label: '操作者',
      admin: {
        position: 'sidebar',
        description: '手動調整時的操作人員',
      },
    },
  ],
  timestamps: true,
  // 建立後計算餘額
  hooks: {
    afterChange: [
      async ({ doc, req, operation }) => {
        if (operation === 'create') {
          // 更新用戶的點數餘額
          try {
            const payload = req.payload
            const customerId = typeof doc.customer === 'object' ? doc.customer.id : doc.customer
            
            // 計算總點數
            const transactions = await payload.find({
              collection: 'point-transactions',
              where: {
                customer: { equals: customerId },
              },
            })
            
            const totalPoints = transactions.docs.reduce(
              (sum, t) => sum + (t.amount as number || 0),
              0
            )
            
            // 更新用戶點數
            await payload.update({
              collection: 'users',
              id: customerId,
              data: {
                points: totalPoints,
              } as any,
            })
          } catch (err) {
            console.error('Failed to update user points:', err)
          }
        }
      },
    ],
  },
}

export default PointTransactions
