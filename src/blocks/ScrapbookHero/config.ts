import type { Block } from 'payload'

/**
 * ScrapbookHero Block
 * 
 * 剪貼簿風格的首頁 Hero 區塊，可在後台自訂標題、副標題、CTA 按鈕等。
 */
export const ScrapbookHero: Block = {
  slug: 'scrapbookHero',
  interfaceName: 'ScrapbookHeroBlock',
  labels: {
    singular: 'Hero 橫幅',
    plural: 'Hero 橫幅',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: '標題',
      defaultValue: 'ONLINE STORE',
      required: true,
    },
    {
      name: 'subtitle',
      type: 'text',
      label: '副標題',
      defaultValue: '日本直送・獨家設計・限量發售',
    },
    {
      name: 'ctaText',
      type: 'text',
      label: 'CTA 按鈕文字',
      defaultValue: '立即選購',
    },
    {
      name: 'ctaLink',
      type: 'text',
      label: 'CTA 連結',
      defaultValue: '/products',
    },
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
      label: '背景圖片 (選填)',
    },
  ],
}
