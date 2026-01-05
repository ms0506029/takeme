import type { Block } from 'payload'

/**
 * Scrapbook CheckList Block
 * 
 * CHECK LIST 區塊 - 精選商品展示
 */
export const ScrapbookCheckList: Block = {
  slug: 'scrapbookCheckList',
  labels: {
    singular: 'Check List Section',
    plural: 'Check List Sections',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: '標題',
      defaultValue: 'CHECK LIST',
      required: true,
    },
    {
      name: 'subtitle',
      type: 'text',
      label: '副標題',
      defaultValue: "Don't miss these items",
    },
    {
      name: 'products',
      type: 'relationship',
      label: '選擇商品',
      relationTo: 'products',
      hasMany: true,
      minRows: 1,
      maxRows: 12,
      admin: {
        description: '選擇要展示的商品（建議 4-6 個）',
      },
    },
    {
      name: 'viewAllLink',
      type: 'text',
      label: 'View All 連結',
      defaultValue: '/shop/checklist',
    },
  ],
}
