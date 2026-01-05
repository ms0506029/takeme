import type { Block } from 'payload'

/**
 * ScrapbookPromoBadge Block
 * 
 * 促銷標籤列，可在後台新增多個促銷標籤。
 */
export const ScrapbookPromoBadge: Block = {
  slug: 'scrapbookPromoBadge',
  interfaceName: 'ScrapbookPromoBadgeBlock',
  labels: {
    singular: '促銷標籤列',
    plural: '促銷標籤列',
  },
  fields: [
    {
      name: 'badges',
      type: 'array',
      label: '標籤列表',
      minRows: 1,
      maxRows: 6,
      fields: [
        {
          name: 'label',
          type: 'text',
          label: '標籤文字',
          required: true,
        },
        {
          name: 'href',
          type: 'text',
          label: '連結',
          defaultValue: '#',
        },
        {
          name: 'color',
          type: 'select',
          label: '顏色',
          defaultValue: 'orange',
          options: [
            { label: '橘色', value: 'orange' },
            { label: '綠色', value: 'green' },
            { label: '紅色', value: 'red' },
            { label: '粉紅色', value: 'pink' },
          ],
        },
      ],
    },
  ],
}
