import type { CollectionConfig } from 'payload'

/**
 * AdBanners Collection
 * 
 * 廣告橫幅管理系統：
 * - 支援多種廣告位置 (首頁、商品頁、購物車等)
 * - 時間排程 (開始/結束時間)
 * - 優先次序控制
 * - 點擊追蹤
 */
export const AdBanners: CollectionConfig = {
  slug: 'adBanners',
  labels: {
    singular: '廣告橫幅',
    plural: '廣告橫幅',
  },
  admin: {
    group: '行銷',
    useAsTitle: 'name',
    defaultColumns: ['name', 'placement', 'status', 'startDate', 'endDate'],
  },
  access: {
    read: () => true,
  },
  fields: [
    // 基本資訊
    {
      name: 'name',
      type: 'text',
      label: '廣告名稱',
      required: true,
      admin: {
        description: '內部識別用，不會顯示在前台',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: '狀態',
      defaultValue: 'draft',
      options: [
        { label: '草稿', value: 'draft' },
        { label: '已排程', value: 'scheduled' },
        { label: '進行中', value: 'active' },
        { label: '已結束', value: 'ended' },
      ],
      admin: {
        position: 'sidebar',
      },
    },

    // 廣告位置
    {
      name: 'placement',
      type: 'select',
      label: '廣告位置',
      required: true,
      options: [
        { label: '首頁 - 主橫幅', value: 'home-hero' },
        { label: '首頁 - 中間插入', value: 'home-middle' },
        { label: '首頁 - 底部', value: 'home-footer' },
        { label: '商品列表 - 頂部', value: 'shop-top' },
        { label: '商品列表 - 側邊', value: 'shop-sidebar' },
        { label: '商品詳情 - 下方', value: 'product-below' },
        { label: '購物車 - 側邊', value: 'cart-sidebar' },
        { label: '全站 - 浮動廣告', value: 'global-floating' },
      ],
      admin: {
        description: '選擇廣告顯示的位置',
      },
    },

    // 廣告內容
    {
      type: 'tabs',
      tabs: [
        {
          label: '內容',
          fields: [
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              label: '廣告圖片',
              required: true,
            },
            {
              name: 'mobileImage',
              type: 'upload',
              relationTo: 'media',
              label: '手機版圖片 (選填)',
              admin: {
                description: '如未上傳，將自動縮放桌面版圖片',
              },
            },
            {
              name: 'altText',
              type: 'text',
              label: '替代文字 (Alt)',
              required: true,
              admin: {
                description: '用於 SEO 與無障礙',
              },
            },
            {
              name: 'link',
              type: 'text',
              label: '點擊連結',
              admin: {
                placeholder: '/shop/sale 或 https://external.com',
              },
            },
            {
              name: 'linkTarget',
              type: 'select',
              label: '連結開啟方式',
              defaultValue: '_self',
              options: [
                { label: '同視窗', value: '_self' },
                { label: '新視窗', value: '_blank' },
              ],
            },
          ],
        },
        {
          label: '排程',
          fields: [
            {
              name: 'startDate',
              type: 'date',
              label: '開始時間',
              admin: {
                date: {
                  pickerAppearance: 'dayAndTime',
                },
                description: '留空表示立即開始',
              },
            },
            {
              name: 'endDate',
              type: 'date',
              label: '結束時間',
              admin: {
                date: {
                  pickerAppearance: 'dayAndTime',
                },
                description: '留空表示永久顯示',
              },
            },
            {
              name: 'priority',
              type: 'number',
              label: '優先順序',
              defaultValue: 0,
              admin: {
                description: '數字越大優先順序越高，相同位置的廣告會按此排序',
              },
            },
          ],
        },
        {
          label: '追蹤',
          fields: [
            {
              name: 'trackClicks',
              type: 'checkbox',
              label: '追蹤點擊次數',
              defaultValue: true,
            },
            {
              name: 'clickCount',
              type: 'number',
              label: '點擊次數',
              defaultValue: 0,
              admin: {
                readOnly: true,
                description: '系統自動統計',
              },
            },
            {
              name: 'impressionCount',
              type: 'number',
              label: '曝光次數',
              defaultValue: 0,
              admin: {
                readOnly: true,
                description: '系統自動統計',
              },
            },
            {
              name: 'utmSource',
              type: 'text',
              label: 'UTM Source',
              admin: {
                placeholder: 'homepage_banner',
              },
            },
            {
              name: 'utmMedium',
              type: 'text',
              label: 'UTM Medium',
              admin: {
                placeholder: 'banner',
              },
            },
            {
              name: 'utmCampaign',
              type: 'text',
              label: 'UTM Campaign',
              admin: {
                placeholder: 'spring_sale_2024',
              },
            },
          ],
        },
      ],
    },
  ],
}
