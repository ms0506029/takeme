/**
 * Users Collection
 * 
 * 多角色用戶系統：
 * - super-admin: 平台管理員（全域權限）
 * - vendor: 商家（僅限自己的商品/訂單）
 * - customer: 消費者（僅限自己的資料）
 */
import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { adminOrSelf } from '@/access/adminOrSelf'
import { publicAccess } from '@/access/publicAccess'
import { checkRole } from '@/access/utilities'

import { ensureFirstUserIsAdmin } from './hooks/ensureFirstUserIsAdmin'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: '用戶',
    plural: '用戶',
  },
  access: {
    // 允許 super-admin 和 vendor 進入後台
    admin: ({ req: { user } }) => checkRole(['admin', 'super-admin', 'vendor'], user),
    create: publicAccess,
    delete: adminOnly,
    read: adminOrSelf,
    update: adminOrSelf,
  },
  admin: {
    group: '客戶管理',
    defaultColumns: ['name', 'email', 'roles', 'vendor'],
    useAsTitle: 'name',
  },
  auth: {
    tokenExpiration: 1209600, // 14 天
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: '姓名',
    },
    {
      name: 'roles',
      type: 'select',
      label: '角色',
      access: {
        create: adminOnlyFieldAccess,
        read: () => true, // 所有人都可以讀取自己的角色
        update: adminOnlyFieldAccess,
      },
      defaultValue: ['customer'],
      hasMany: true,
      hooks: {
        beforeChange: [ensureFirstUserIsAdmin],
      },
      options: [
        {
          label: '平台管理員',
          value: 'super-admin',
        },
        {
          label: '管理員 (舊版)',
          value: 'admin',
        },
        {
          label: '商家',
          value: 'vendor',
        },
        {
          label: '消費者',
          value: 'customer',
        },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    // 當用戶為 vendor 角色時，關聯到對應的商家
    {
      name: 'vendor',
      type: 'relationship',
      relationTo: 'vendors',
      label: '所屬商家',
      admin: {
        position: 'sidebar',
        // 只有當角色包含 vendor 時才顯示
        condition: (data) => data?.roles?.includes('vendor'),
        description: '此用戶所屬的商家帳號',
      },
      // 只有 super-admin 可以修改商家關聯
      access: {
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
    },
    // 電話號碼（用於 LINE 綁定等）
    {
      name: 'phone',
      type: 'text',
      label: '電話號碼',
    },
    // LINE User ID（用於推播通知）
    {
      name: 'lineUserId',
      type: 'text',
      label: 'LINE User ID',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: '自動由 LINE 綁定流程填入',
      },
    },
    // 會員等級
    {
      name: 'memberLevel',
      type: 'select',
      label: '會員等級',
      defaultValue: 'bronze',
      options: [
        { label: '銅級會員', value: 'bronze' },
        { label: '銀級會員', value: 'silver' },
        { label: '金級會員', value: 'gold' },
        { label: 'VIP 會員', value: 'vip' },
      ],
      admin: {
        position: 'sidebar',
      },
      // 只有系統可以修改會員等級（透過自動計算）
      access: {
        update: adminOnlyFieldAccess,
      },
    },
    // 累計消費金額（用於會員升級計算）
    {
      name: 'totalSpent',
      type: 'number',
      label: '累計消費金額',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    // 訂單關聯
    {
      name: 'orders',
      type: 'join',
      collection: 'orders',
      on: 'customer',
      admin: {
        allowCreate: false,
        defaultColumns: ['id', 'createdAt', 'total', 'currency', 'items'],
      },
    },
    // 購物車關聯
    {
      name: 'cart',
      type: 'join',
      collection: 'carts',
      on: 'customer',
      admin: {
        allowCreate: false,
        defaultColumns: ['id', 'createdAt', 'total', 'currency', 'items'],
      },
    },
    // 地址關聯
    {
      name: 'addresses',
      type: 'join',
      collection: 'addresses',
      on: 'customer',
      admin: {
        allowCreate: false,
        defaultColumns: ['id'],
      },
    },
  ],
}

