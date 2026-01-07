import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'

/**
 * Header Global
 * 
 * 網站頂部導航選單，擴充功能：
 * - 選單項目樣式 (一般 / 重點強調 / 按鈕)
 * - 下拉子選單 (SubMenu)
 * - 廣告圖片插入區
 */
export const Header: GlobalConfig = {
  slug: 'header',
  label: '頁首選單',
  admin: {
    group: '設定',
  },
  access: {
    read: () => true,
  },
  fields: [
    // 主選單項目
    {
      name: 'navItems',
      type: 'array',
      label: '導航選單',
      maxRows: 8,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/components/RowLabel#NavItemRowLabel',
        },
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'label',
              type: 'text',
              label: '顯示文字',
              required: true,
              admin: {
                width: '50%',
              },
            },
            {
              name: 'style',
              type: 'select',
              label: '樣式',
              defaultValue: 'default',
              options: [
                { label: '一般', value: 'default' },
                { label: '重點強調 (波浪線)', value: 'highlight' },
                { label: '按鈕樣式', value: 'button' },
              ],
              admin: {
                width: '50%',
              },
            },
          ],
        },
        link({
          appearances: false,
          disableLabel: true,
        }),
        // 下拉子選單
        {
          name: 'hasSubMenu',
          type: 'checkbox',
          label: '啟用下拉選單',
          defaultValue: false,
        },
        {
          name: 'subMenu',
          type: 'array',
          label: '子選單項目',
          admin: {
            condition: (data, siblingData) => siblingData?.hasSubMenu,
            initCollapsed: true,
          },
          fields: [
            {
              name: 'type',
              type: 'select',
              label: '類型',
              defaultValue: 'link',
              options: [
                { label: '連結', value: 'link' },
                { label: '廣告圖片', value: 'promo' },
              ],
            },
            // 連結類型
            {
              name: 'linkLabel',
              type: 'text',
              label: '連結文字',
              admin: {
                condition: (data, siblingData) => siblingData?.type === 'link',
              },
            },
            link({
              appearances: false,
              disableLabel: true,
              overrides: {
                admin: {
                  condition: (data: Record<string, unknown>, siblingData: Record<string, unknown>) => 
                    siblingData?.type === 'link',
                },
              },
            }),
            // 廣告圖片類型
            {
              name: 'promoImage',
              type: 'upload',
              relationTo: 'media',
              label: '廣告圖片',
              admin: {
                condition: (data, siblingData) => siblingData?.type === 'promo',
              },
            },
            {
              name: 'promoLink',
              type: 'text',
              label: '廣告連結',
              admin: {
                condition: (data, siblingData) => siblingData?.type === 'promo',
              },
            },
          ],
        },
      ],
    },

    // 右側功能區設定
    {
      type: 'collapsible',
      label: '右側功能區',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'showSearch',
          type: 'checkbox',
          label: '顯示搜尋',
          defaultValue: true,
        },
        {
          name: 'showCart',
          type: 'checkbox',
          label: '顯示購物車',
          defaultValue: true,
        },
        {
          name: 'showAccount',
          type: 'checkbox',
          label: '顯示帳號',
          defaultValue: true,
        },
      ],
    },

    // 手機版選單設定
    {
      type: 'collapsible',
      label: '手機版選單',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'mobileMenuStyle',
          type: 'select',
          label: '手機選單樣式',
          defaultValue: 'slide',
          options: [
            { label: '側邊滑出', value: 'slide' },
            { label: '全螢幕覆蓋', value: 'fullscreen' },
          ],
        },
      ],
    },
  ],
}
