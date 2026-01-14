import type { CollectionConfig } from 'payload'

/**
 * RestockRequests Collection
 * 補貨通知申請
 * 
 * 當商品缺貨時，顧客可申請補貨通知
 * 庫存恢復時自動或手動發送通知
 */
export const RestockRequests: CollectionConfig = {
  slug: 'restock-requests',
  labels: {
    singular: '補貨通知申請',
    plural: '補貨通知申請',
  },
  admin: {
    group: '客戶管理',
    defaultColumns: ['customer', 'product', 'variant', 'status', 'requestedAt', 'notifiedAt'],
    useAsTitle: 'id',
    description: '客戶希望補貨的商品清單',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.roles?.includes('admin')) return true
      return { customer: { equals: user.id } }
    },
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => {
      if (!user) return false
      return user.roles?.includes('admin') || false
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      return user.roles?.includes('admin') || false
    },
  },
  fields: [
    // ===== 基本關聯 =====
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: '顧客',
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      label: '商品',
    },
    // ===== 變體資訊 =====
    {
      name: 'variant',
      type: 'group',
      label: '變體資訊',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'color',
              type: 'text',
              label: '顏色',
              admin: { width: '33%' },
            },
            {
              name: 'size',
              type: 'text',
              label: '尺寸',
              admin: { width: '33%' },
            },
            {
              name: 'sku',
              type: 'text',
              label: 'SKU',
              index: true,
              admin: { width: '33%' },
            },
          ],
        },
      ],
    },
    // ===== 狀態管理 =====
    {
      name: 'status',
      type: 'select',
      label: '狀態',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: '⏳ 等待補貨', value: 'pending' },
        { label: '✅ 已通知', value: 'notified' },
        { label: '❌ 已取消', value: 'cancelled' },
      ],
      admin: {
        description: '通知狀態',
      },
    },
    {
      name: 'notificationChannel',
      type: 'select',
      label: '通知管道',
      options: [
        { label: 'LINE', value: 'line' },
        { label: 'Email', value: 'email' },
      ],
      admin: {
        description: '使用的通知管道（自動選擇或手動指定）',
        readOnly: true,
      },
    },
    // ===== 時間戳 =====
    {
      name: 'requestedAt',
      type: 'date',
      label: '申請時間',
      defaultValue: () => new Date().toISOString(),
      admin: {
        date: { displayFormat: 'yyyy-MM-dd HH:mm' },
      },
    },
    {
      name: 'notifiedAt',
      type: 'date',
      label: '通知時間',
      admin: {
        date: { displayFormat: 'yyyy-MM-dd HH:mm' },
        description: '發送通知的時間',
      },
    },
    // ===== 備註 =====
    {
      name: 'notes',
      type: 'textarea',
      label: '備註',
      admin: {
        description: '內部備註（顧客不可見）',
      },
    },
  ],
}

export default RestockRequests
