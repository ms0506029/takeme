/**
 * Promotions Collection
 * 
 * 促銷引擎核心：
 * - 多種折扣類型（百分比、固定金額、買X送Y、免運）
 * - 條件篩選（最低消費、指定商品/分類、會員等級）
 * - 疊加規則（priority 排序、stackable 判斷）
 * - 商家專屬促銷
 */
import type { CollectionConfig } from 'payload'

export const Promotions: CollectionConfig = {
  slug: 'promotions',
  admin: {
    group: '促銷優惠',
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'status', 'startDate', 'endDate'],
  },
  access: {
    read: () => true,
    create: ({ req }) => {
      const user = req.user
      if (!user) return false
      return Boolean(
        user.roles?.includes('super-admin') || 
        user.roles?.includes('admin') || 
        user.roles?.includes('vendor')
      )
    },
    update: ({ req }) => {
      const user = req.user
      if (!user) return false
      
      if (user.roles?.includes('super-admin') || user.roles?.includes('admin')) {
        return true
      }
      
      // Vendor 只能更新自己的促銷
      if (user.roles?.includes('vendor') && user.vendor) {
        return {
          vendor: {
            equals: typeof user.vendor === 'object' ? user.vendor.id : user.vendor,
          },
        }
      }
      
      return false
    },
    delete: ({ req }) => {
      const user = req.user
      if (!user) return false
      return Boolean(user.roles?.includes('super-admin') || user.roles?.includes('admin'))
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: '促銷名稱',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      label: '促銷說明',
    },
    // 促銷類型
    {
      name: 'type',
      type: 'select',
      label: '折扣類型',
      required: true,
      options: [
        { label: '百分比折扣', value: 'percentage' },
        { label: '固定金額折扣', value: 'fixed' },
        { label: '買X送Y', value: 'buyXgetY' },
        { label: '免運費', value: 'freeShipping' },
      ],
      defaultValue: 'percentage',
    },
    // 折扣值
    {
      name: 'value',
      type: 'number',
      label: '折扣值',
      required: true,
      admin: {
        description: '百分比折扣填 10 代表 10% off；固定金額填實際金額',
        condition: (data) => data?.type !== 'freeShipping',
      },
    },
    // 買X送Y 設定
    {
      name: 'buyXgetY',
      type: 'group',
      label: '買X送Y設定',
      admin: {
        condition: (data) => data?.type === 'buyXgetY',
      },
      fields: [
        {
          name: 'buyQuantity',
          type: 'number',
          label: '購買數量 (X)',
          defaultValue: 2,
        },
        {
          name: 'getQuantity',
          type: 'number',
          label: '贈送數量 (Y)',
          defaultValue: 1,
        },
      ],
    },
    // 適用條件
    {
      type: 'collapsible',
      label: '適用條件',
      fields: [
        {
          name: 'minPurchase',
          type: 'number',
          label: '最低消費金額',
          admin: {
            description: '留空表示無最低消費限制',
          },
        },
        {
          name: 'applicableProducts',
          type: 'relationship',
          relationTo: 'products',
          label: '指定商品',
          hasMany: true,
          admin: {
            description: '留空表示適用全部商品',
          },
        },
        {
          name: 'applicableCategories',
          type: 'relationship',
          relationTo: 'categories',
          label: '指定分類',
          hasMany: true,
          admin: {
            description: '留空表示適用全部分類',
          },
        },
        {
          name: 'applicableUserLevels',
          type: 'select',
          label: '會員等級限制',
          hasMany: true,
          options: [
            { label: '銅級', value: 'bronze' },
            { label: '銀級', value: 'silver' },
            { label: '金級', value: 'gold' },
            { label: 'VIP', value: 'vip' },
          ],
          admin: {
            description: '留空表示不限會員等級',
          },
        },
      ],
    },
    // 疊加規則
    {
      name: 'stackable',
      type: 'checkbox',
      label: '可與其他優惠疊加',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'priority',
      type: 'number',
      label: '計算優先順序',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: '數字越大越優先計算',
      },
    },
    // 時間設定
    {
      name: 'startDate',
      type: 'date',
      label: '開始日期',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'endDate',
      type: 'date',
      label: '結束日期',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    // 狀態
    {
      name: 'status',
      type: 'select',
      label: '狀態',
      defaultValue: 'draft',
      options: [
        { label: '草稿', value: 'draft' },
        { label: '啟用', value: 'active' },
        { label: '已結束', value: 'expired' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    // 使用次數限制
    {
      name: 'usageLimit',
      type: 'number',
      label: '總使用次數限制',
      admin: {
        description: '留空表示不限次數',
      },
    },
    {
      name: 'usedCount',
      type: 'number',
      label: '已使用次數',
      defaultValue: 0,
      admin: {
        readOnly: true,
      },
    },
    // 商家關聯
    {
      name: 'vendor',
      type: 'relationship',
      relationTo: 'vendors',
      label: '適用商家',
      admin: {
        position: 'sidebar',
        description: '留空表示全站促銷',
      },
    },
    // 促銷代碼
    {
      name: 'code',
      type: 'text',
      label: '促銷代碼',
      unique: true,
      admin: {
        description: '留空表示自動適用，填入則需輸入代碼',
      },
    },
  ],
}
