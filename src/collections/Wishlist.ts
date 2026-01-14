import type { CollectionConfig } from 'payload'

/**
 * Wishlist Collection
 * 願望清單
 * 
 * 紀錄用戶收藏的商品變體，支援降價通知
 */
export const Wishlist: CollectionConfig = {
  slug: 'wishlist',
  labels: {
    singular: '願望清單',
    plural: '願望清單',
  },
  admin: {
    group: '客戶管理',
    defaultColumns: ['customer', 'product', 'variant', 'notifyOnPriceDrop', 'addedAt'],
    useAsTitle: 'id',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      // Admin 可看全部，一般用戶只能看自己的
      if (user.roles?.includes('admin')) return true
      return { customer: { equals: user.id } }
    },
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.roles?.includes('admin')) return true
      return { customer: { equals: user.id } }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.roles?.includes('admin')) return true
      return { customer: { equals: user.id } }
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
      admin: {
        description: '收藏此商品的顧客',
      },
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      label: '商品',
      admin: {
        description: '收藏的商品',
      },
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
              admin: { width: '33%' },
            },
          ],
        },
        {
          name: 'priceAtAdd',
          type: 'number',
          label: '加入時價格',
          admin: {
            description: '加入願望清單時的價格，用於判斷降價',
          },
        },
      ],
    },
    // ===== 通知設定 =====
    {
      name: 'notifyOnPriceDrop',
      type: 'checkbox',
      label: '降價通知',
      defaultValue: true,
      admin: {
        description: '當此商品降價時發送通知',
      },
    },
    {
      name: 'lastNotifiedPrice',
      type: 'number',
      label: '上次通知價格',
      admin: {
        description: '避免重複通知相同價格',
        readOnly: true,
      },
    },
    {
      name: 'lastNotifiedAt',
      type: 'date',
      label: '上次通知時間',
      admin: {
        readOnly: true,
      },
    },
    // ===== 時間戳 =====
    {
      name: 'addedAt',
      type: 'date',
      label: '加入時間',
      defaultValue: () => new Date().toISOString(),
      admin: {
        date: { displayFormat: 'yyyy-MM-dd HH:mm' },
      },
    },
  ],
}

export default Wishlist
