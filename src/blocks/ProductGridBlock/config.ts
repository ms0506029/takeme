import type { Block } from 'payload'

/**
 * ProductGridBlock - 商品網格區塊
 * 
 * 用於展示商品列表，支援多種篩選與排版模式：
 * - 依分類/標籤篩選
 * - 整齊/拼貼排版
 * - 可設定顯示數量
 */
export const ProductGridBlock: Block = {
  slug: 'productGrid',
  labels: {
    singular: '商品網格',
    plural: '商品網格',
  },
  imageURL: '/api/placeholder/400/300',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: '區塊標題',
      defaultValue: 'NEW ARRIVALS',
    },
    {
      name: 'subtitle',
      type: 'text',
      label: '副標題',
      defaultValue: '最新上架商品',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'filterMode',
          type: 'select',
          label: '篩選模式',
          defaultValue: 'category',
          options: [
            { label: '依分類', value: 'category' },
            { label: '手動選擇', value: 'manual' },
            { label: '最新上架', value: 'latest' },
            { label: '熱銷商品', value: 'bestselling' },
          ],
          admin: {
            width: '50%',
          },
        },
        {
          name: 'limit',
          type: 'number',
          label: '顯示數量',
          defaultValue: 8,
          min: 1,
          max: 24,
          admin: {
            width: '50%',
          },
        },
      ],
    },
    // 分類篩選
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      label: '篩選分類',
      admin: {
        condition: (data, siblingData) => siblingData?.filterMode === 'category',
      },
    },
    // 手動選擇商品
    {
      name: 'products',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      label: '選擇商品',
      admin: {
        condition: (data, siblingData) => siblingData?.filterMode === 'manual',
      },
    },
    // 排版設定
    {
      type: 'collapsible',
      label: '排版設定',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'layout',
              type: 'select',
              label: '排版模式',
              defaultValue: 'grid',
              options: [
                { label: '整齊網格', value: 'grid' },
                { label: '雜誌拼貼', value: 'masonry' },
                { label: '輪播滑動', value: 'carousel' },
              ],
              admin: {
                width: '50%',
              },
            },
            {
              name: 'columns',
              type: 'select',
              label: '每行欄數',
              defaultValue: '4',
              options: [
                { label: '2 欄', value: '2' },
                { label: '3 欄', value: '3' },
                { label: '4 欄', value: '4' },
                { label: '5 欄', value: '5' },
              ],
              admin: {
                width: '50%',
                condition: (data, siblingData) => siblingData?.layout !== 'carousel',
              },
            },
          ],
        },
        {
          name: 'showPrice',
          type: 'checkbox',
          label: '顯示價格',
          defaultValue: true,
        },
        {
          name: 'showQuickView',
          type: 'checkbox',
          label: '顯示快速預覽',
          defaultValue: true,
        },
        {
          name: 'cardStyle',
          type: 'select',
          label: '卡片風格',
          defaultValue: 'scrapbook',
          options: [
            { label: '剪貼簿風格', value: 'scrapbook' },
            { label: '簡約現代', value: 'minimal' },
            { label: '經典邊框', value: 'bordered' },
          ],
        },
      ],
    },
    // 連結設定
    {
      name: 'viewAllLink',
      type: 'text',
      label: 'View All 連結',
      defaultValue: '/shop',
    },
  ],
}
