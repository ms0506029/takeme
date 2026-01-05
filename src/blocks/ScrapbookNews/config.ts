import type { Block } from 'payload'

/**
 * Scrapbook News Block
 * 
 * 新聞/公告區塊 - 可在後台自由配置新聞項目
 */
export const ScrapbookNews: Block = {
  slug: 'scrapbookNews',
  labels: {
    singular: 'News Section',
    plural: 'News Sections',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: '區塊標題',
      defaultValue: '📰 NEWS',
    },
    {
      name: 'items',
      type: 'array',
      label: '新聞項目',
      minRows: 1,
      maxRows: 8,
      labels: {
        singular: '新聞',
        plural: '新聞項目',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          label: '標題',
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
          label: '描述',
          required: true,
        },
        {
          name: 'code',
          type: 'text',
          label: '優惠碼（可選）',
          admin: {
            description: '如有優惠碼可在此填寫',
          },
        },
        {
          name: 'link',
          type: 'text',
          label: '連結（可選）',
        },
        {
          name: 'color',
          type: 'select',
          label: '背景顏色',
          defaultValue: 'pink',
          options: [
            { label: '粉紅', value: 'pink' },
            { label: '薄荷綠', value: 'mint' },
            { label: '黃色', value: 'yellow' },
            { label: '薰衣草', value: 'lavender' },
          ],
        },
      ],
    },
    {
      name: 'viewAllLink',
      type: 'text',
      label: 'View All 連結',
      defaultValue: '/news',
    },
  ],
}
