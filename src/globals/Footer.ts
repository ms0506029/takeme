import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'

/**
 * Footer Global
 * 
 * 網站頁尾設定，包含：
 * - 多欄連結區塊
 * - 社群媒體連結
 * - 版權聲明
 * - 付款方式圖示
 */
export const Footer: GlobalConfig = {
  slug: 'footer',
  label: '頁尾設定',
  admin: {
    group: '設定',
  },
  access: {
    read: () => true,
  },
  fields: [
    // ====== 連結欄位 ======
    {
      name: 'columns',
      type: 'array',
      label: '連結區塊',
      maxRows: 4,
      admin: {
        description: '最多 4 個欄位，每個欄位可包含多個連結',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          label: '區塊標題',
          required: true,
        },
        {
          name: 'links',
          type: 'array',
          label: '連結列表',
          fields: [
            link({
              appearances: false,
            }),
          ],
        },
      ],
    },

    // ====== 社群媒體 ======
    {
      type: 'collapsible',
      label: '社群媒體',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'socialLinks',
          type: 'array',
          label: '社群連結',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'platform',
                  type: 'select',
                  label: '平台',
                  options: [
                    { label: 'Facebook', value: 'facebook' },
                    { label: 'Instagram', value: 'instagram' },
                    { label: 'Twitter / X', value: 'twitter' },
                    { label: 'LINE', value: 'line' },
                    { label: 'YouTube', value: 'youtube' },
                    { label: 'TikTok', value: 'tiktok' },
                  ],
                  admin: {
                    width: '40%',
                  },
                },
                {
                  name: 'url',
                  type: 'text',
                  label: '連結網址',
                  required: true,
                  admin: {
                    width: '60%',
                  },
                },
              ],
            },
          ],
        },
      ],
    },

    // ====== 付款方式 ======
    {
      type: 'collapsible',
      label: '付款方式圖示',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'showPaymentIcons',
          type: 'checkbox',
          label: '顯示付款方式圖示',
          defaultValue: true,
        },
        {
          name: 'paymentMethods',
          type: 'select',
          label: '支援的付款方式',
          hasMany: true,
          options: [
            { label: 'Visa', value: 'visa' },
            { label: 'Mastercard', value: 'mastercard' },
            { label: 'JCB', value: 'jcb' },
            { label: 'Apple Pay', value: 'applepay' },
            { label: 'Google Pay', value: 'googlepay' },
            { label: 'LINE Pay', value: 'linepay' },
            { label: 'ATM 轉帳', value: 'atm' },
            { label: '貨到付款', value: 'cod' },
          ],
          admin: {
            condition: (data) => data?.showPaymentIcons,
          },
        },
      ],
    },

    // ====== 版權聲明 ======
    {
      type: 'collapsible',
      label: '版權聲明',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'copyrightText',
          type: 'text',
          label: '版權文字',
          defaultValue: '© {year} Daytona Park. All rights reserved.',
          admin: {
            description: '使用 {year} 會自動替換為當前年份',
          },
        },
        {
          name: 'legalLinks',
          type: 'array',
          label: '法律連結',
          fields: [
            link({
              appearances: false,
            }),
          ],
        },
      ],
    },

    // ====== 舊版相容 - 保留原本 navItems 欄位 ======
    {
      name: 'navItems',
      type: 'array',
      label: '舊版導航項目',
      admin: {
        description: '相容舊版資料使用，建議改用上方的「連結區塊」',
        initCollapsed: true,
      },
      fields: [
        link({
          appearances: false,
        }),
      ],
      maxRows: 6,
    },
  ],
}
