/**
 * Vendors Collection
 * 
 * 商家資料管理：
 * - 店鋪名稱與簡介
 * - 錢包餘額
 * - 店鋪設定
 * - 關聯的商家用戶
 */
import type { CollectionConfig } from 'payload'

import { isSuperAdminAccess } from '@/access/isSuperAdmin'

export const Vendors: CollectionConfig = {
  slug: 'vendors',
  labels: {
    singular: '商家',
    plural: '商家',
  },
  admin: {
    group: '廠商管理',
    useAsTitle: 'name',
    defaultColumns: ['name', 'status', 'walletBalance', 'createdAt'],
  },
  access: {
    // 只有 Super Admin 可以建立商家
    create: isSuperAdminAccess,
    // Super Admin 可讀取全部，Vendor 只能讀取自己的
    read: ({ req }) => {
      const user = req.user
      if (!user) return false
      
      // Super Admin 可讀取全部
      if (user.roles?.includes('super-admin')) {
        return true
      }
      
      // Vendor 只能讀取自己關聯的商家
      if (user.roles?.includes('vendor') && user.vendor) {
        return {
          id: {
            equals: typeof user.vendor === 'object' ? user.vendor.id : user.vendor,
          },
        }
      }
      
      return false
    },
    // Super Admin 可更新全部，Vendor 只能更新自己的
    update: ({ req }) => {
      const user = req.user
      if (!user) return false
      
      if (user.roles?.includes('super-admin')) {
        return true
      }
      
      if (user.roles?.includes('vendor') && user.vendor) {
        return {
          id: {
            equals: typeof user.vendor === 'object' ? user.vendor.id : user.vendor,
          },
        }
      }
      
      return false
    },
    // 只有 Super Admin 可以刪除商家
    delete: isSuperAdminAccess,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: '店鋪名稱',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      label: '店鋪網址代碼',
      required: true,
      unique: true,
      admin: {
        description: '用於 URL 路徑，例如: /vendor/your-slug',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: '店鋪簡介',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: '店鋪 Logo',
    },
    {
      name: 'status',
      type: 'select',
      label: '商家狀態',
      defaultValue: 'pending',
      options: [
        { label: '待審核', value: 'pending' },
        { label: '已啟用', value: 'active' },
        { label: '已停用', value: 'suspended' },
      ],
      admin: {
        position: 'sidebar',
      },
      // 只有 Super Admin 可以修改狀態
      access: {
        update: ({ req }) => Boolean(req.user?.roles?.includes('super-admin')),
      },
    },
    {
      name: 'walletBalance',
      type: 'number',
      label: '錢包餘額',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: '商家的錢包餘額（訂單結算後自動增加）',
      },
      // 只有 Super Admin 可以修改餘額
      access: {
        update: ({ req }) => Boolean(req.user?.roles?.includes('super-admin')),
      },
    },
    {
      name: 'commissionRate',
      type: 'number',
      label: '平台抽成比例 (%)',
      defaultValue: 10,
      min: 0,
      max: 100,
      admin: {
        position: 'sidebar',
        description: '平台從每筆訂單抽取的比例',
      },
      // 只有 Super Admin 可以設定抽成
      access: {
        update: ({ req }) => Boolean(req.user?.roles?.includes('super-admin')),
      },
    },
    {
      name: 'settings',
      type: 'group',
      label: '店鋪設定',
      fields: [
        {
          name: 'autoAcceptOrders',
          type: 'checkbox',
          label: '自動接單',
          defaultValue: true,
        },
        {
          name: 'notificationEmail',
          type: 'email',
          label: '通知信箱',
        },
      ],
    },
  ],
}
