import type { Block } from 'payload'

/**
 * ScrapbookIconsNav Block
 * 
 * 圖示導覽區塊，可在後台設定多個圖示導覽項目。
 */
export const ScrapbookIconsNav: Block = {
  slug: 'scrapbookIconsNav',
  interfaceName: 'ScrapbookIconsNavBlock',
  labels: {
    singular: '圖示導覽',
    plural: '圖示導覽',
  },
  fields: [
    {
      name: 'items',
      type: 'array',
      label: '導覽項目',
      minRows: 1,
      maxRows: 8,
      fields: [
        {
          name: 'label',
          type: 'text',
          label: '標籤',
          required: true,
        },
        {
          name: 'href',
          type: 'text',
          label: '連結',
          defaultValue: '#',
        },
        {
          name: 'iconType',
          type: 'select',
          label: '圖示類型',
          defaultValue: 'shop',
          options: [
            { label: '購物車 (Shop)', value: 'shop' },
            { label: '愛心 (Coordinate)', value: 'coordinate' },
            { label: '資訊 (Info)', value: 'info' },
            { label: '優惠券 (Coupon)', value: 'coupon' },
            { label: '搜尋 (Search)', value: 'search' },
            { label: '用戶 (User)', value: 'user' },
          ],
        },
      ],
    },
  ],
}
