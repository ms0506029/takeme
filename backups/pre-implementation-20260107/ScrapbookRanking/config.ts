import type { Block } from 'payload'

/**
 * Scrapbook Ranking Block
 * 
 * 商品排行榜區塊 - 可在後台自由配置標題、副標題、顯示數量
 */
export const ScrapbookRanking: Block = {
  slug: 'scrapbookRanking',
  labels: {
    singular: 'Ranking Section',
    plural: 'Ranking Sections',
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
    {
      name: 'itemCount',
      type: 'number',
      label: '顯示數量',
      defaultValue: 10,
      min: 1,
      max: 20,
      admin: {
        step: 1,
        description: '顯示的商品數量（建議 5 或 10）',
      },
    },
    {
      name: 'products',
      type: 'relationship',
      label: '手動選擇商品（可選）',
      relationTo: 'products',
      hasMany: true,
      admin: {
        description: '留空則自動抓取熱門商品',
      },
    },
    {
      name: 'viewAllLink',
      type: 'text',
      label: 'View All 連結',
      defaultValue: '/shop/ranking',
    },
  ],
}
