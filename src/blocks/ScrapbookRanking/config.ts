import type { Block } from 'payload'

/**
 * Scrapbook Ranking Block
 * 
 * 商品排行榜區塊 - 擴充版
 * 支援 Auto (自動計算) / Manual (手動指定) 兩種模式
 */
export const ScrapbookRanking: Block = {
  slug: 'scrapbookRanking',
  labels: {
    singular: '商品排行榜',
    plural: '商品排行榜',
  },
  imageURL: '/api/placeholder/400/300',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: '標題',
      defaultValue: 'RANKING',
      required: true,
    },
    {
      name: 'subtitle',
      type: 'text',
      label: '副標題',
      defaultValue: '毎日更新！いま売れているアイテム',
    },
    // ====== 模式選擇 ======
    {
      name: 'mode',
      type: 'select',
      label: '排名模式',
      defaultValue: 'auto',
      options: [
        { label: '自動計算 (依銷量)', value: 'auto' },
        { label: '手動指定', value: 'manual' },
      ],
      admin: {
        description: '自動模式會依據銷售數據計算排名',
      },
    },
    // ====== 自動模式設定 ======
    {
      type: 'collapsible',
      label: '自動排名設定',
      admin: {
        condition: (data, siblingData) => siblingData?.mode === 'auto',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'period',
              type: 'select',
              label: '統計天數',
              defaultValue: '7days',
              options: [
                { label: '過去 7 天', value: '7days' },
                { label: '過去 30 天', value: '30days' },
                { label: '過去 90 天', value: '90days' },
                { label: '全部時間', value: 'alltime' },
              ],
              admin: {
                width: '50%',
              },
            },
            {
              name: 'itemCount',
              type: 'number',
              label: '顯示數量',
              defaultValue: 10,
              min: 1,
              max: 20,
              admin: {
                width: '50%',
                step: 1,
                description: '建議 5 或 10',
              },
            },
          ],
        },
        {
          name: 'filterCategory',
          type: 'relationship',
          relationTo: 'categories',
          label: '限定分類 (選填)',
          admin: {
            description: '留空則顯示全站排名',
          },
        },
      ],
    },
    // ====== 手動模式 - 商品選擇 ======
    {
      name: 'products',
      type: 'relationship',
      label: '選擇商品',
      relationTo: 'products',
      hasMany: true,
      admin: {
        condition: (data, siblingData) => siblingData?.mode === 'manual',
        description: '依序選擇要顯示的商品',
      },
    },
    // ====== 置頂廣告位 ======
    {
      type: 'collapsible',
      label: '置頂廣告位',
      admin: {
        initCollapsed: true,
        description: '置頂商品會顯示在排名第一位 (不論實際銷量)',
      },
      fields: [
        {
          name: 'pinnedProduct',
          type: 'relationship',
          relationTo: 'products',
          label: '置頂商品',
        },
        {
          name: 'pinnedLabel',
          type: 'text',
          label: '置頂標籤',
          defaultValue: 'PICK UP',
          admin: {
            condition: (data, siblingData) => !!siblingData?.pinnedProduct,
          },
        },
      ],
    },
    // ====== 顯示設定 ======
    {
      type: 'collapsible',
      label: '顯示設定',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'showRankNumber',
          type: 'checkbox',
          label: '顯示排名數字',
          defaultValue: true,
        },
        {
          name: 'showPrice',
          type: 'checkbox',
          label: '顯示價格',
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
            { label: '雜誌風格', value: 'magazine' },
          ],
        },
      ],
    },
    {
      name: 'viewAllLink',
      type: 'text',
      label: 'View All 連結',
      defaultValue: '/shop/ranking',
    },
  ],
}
