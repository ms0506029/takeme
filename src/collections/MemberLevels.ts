/**
 * Member Levels Collection
 * Phase 7.3.3 - 會員等級定義
 * 
 * 可自定義的會員等級系統，支援：
 * - 等級名稱與標識
 * - 升級條件（消費金額、訂單數）
 * - 會員福利（折扣比例、點數倍率）
 */

import { adminOnly } from '@/access/adminOnly'
import type { CollectionConfig } from 'payload'

export const MemberLevels: CollectionConfig = {
  slug: 'member-levels',
  labels: {
    singular: '會員等級',
    plural: '會員等級',
  },
  admin: {
    group: '客戶管理',
    useAsTitle: 'name',
    defaultColumns: ['name', 'code', 'minSpent', 'discountPercent', 'pointsMultiplier'],
    description: '定義會員等級規則與福利',
  },
  access: {
    read: () => true, // 公開讀取等級資訊
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: '等級名稱',
      required: true,
      admin: {
        placeholder: '例如：金卡會員',
      },
    },
    {
      name: 'code',
      type: 'text',
      label: '等級代碼',
      required: true,
      unique: true,
      admin: {
        placeholder: '例如：gold',
        description: '用於系統識別，不可重複',
      },
    },
    {
      name: 'order',
      type: 'number',
      label: '排序',
      defaultValue: 0,
      admin: {
        description: '數字越大等級越高',
      },
    },
    {
      name: 'icon',
      type: 'upload',
      label: '等級圖示',
      relationTo: 'media',
      admin: {
        description: '建議使用透明背景的 PNG 或 SVG',
      },
    },
    {
      name: 'color',
      type: 'text',
      label: '主題顏色',
      admin: {
        placeholder: '#C9915D',
        description: '用於 UI 顯示的主題色（Hex 格式）',
      },
    },
    // ===== 升級條件 =====
    {
      type: 'collapsible',
      label: '升級條件',
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          name: 'minSpent',
          type: 'number',
          label: '最低累計消費（TWD）',
          defaultValue: 0,
          admin: {
            description: '達到此金額即可升級',
          },
        },
        {
          name: 'minOrders',
          type: 'number',
          label: '最低訂單數',
          defaultValue: 0,
          admin: {
            description: '達到此訂單數即可升級（與消費金額取其一）',
          },
        },
        {
          name: 'upgradeLogic',
          type: 'select',
          label: '升級邏輯',
          options: [
            { label: '消費金額 OR 訂單數', value: 'or' },
            { label: '消費金額 AND 訂單數', value: 'and' },
            { label: '僅看消費金額', value: 'spent-only' },
            { label: '僅看訂單數', value: 'orders-only' },
          ],
          defaultValue: 'spent-only',
          admin: {
            description: '判斷升級的邏輯',
          },
        },
      ],
    },
    // ===== 會員福利 =====
    {
      type: 'collapsible',
      label: '會員福利',
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          name: 'discountPercent',
          type: 'number',
          label: '會員折扣 %',
          defaultValue: 0,
          min: 0,
          max: 100,
          admin: {
            description: '例如：5 表示打 95 折',
          },
        },
        {
          name: 'pointsMultiplier',
          type: 'number',
          label: '點數倍率',
          defaultValue: 1,
          min: 1,
          admin: {
            description: '例如：2 表示消費可獲得雙倍點數',
          },
        },
        {
          name: 'freeShippingThreshold',
          type: 'number',
          label: '免運門檻（TWD）',
          admin: {
            description: '消費滿此金額免運費',
          },
        },
        {
          name: 'birthdayBonus',
          type: 'number',
          label: '生日禮金（TWD）',
          defaultValue: 0,
          admin: {
            description: '生日月份自動發放的購物金',
          },
        },
      ],
    },
    // ===== 其他設定 =====
    {
      name: 'description',
      type: 'textarea',
      label: '等級說明',
      admin: {
        description: '顯示給用戶看的等級介紹',
      },
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      label: '預設等級',
      defaultValue: false,
      admin: {
        description: '新用戶自動設為此等級（應只有一個等級勾選）',
      },
    },
  ],
  // 預設資料（種子資料）
  timestamps: true,
}

export default MemberLevels
