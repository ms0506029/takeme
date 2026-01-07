import type { Block } from 'payload'

/**
 * CollageBlock - 雜誌風格拼貼區塊
 * 
 * 用於創建雜誌風格的視覺拼貼，支援：
 * - 不規則圖片排列
 * - 旋轉角度設定
 * - 手寫文字貼紙
 * - 復古材質效果
 */
export const CollageBlock: Block = {
  slug: 'collage',
  labels: {
    singular: '雜誌拼貼',
    plural: '雜誌拼貼',
  },
  imageURL: '/api/placeholder/400/300',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: '區塊標題',
      defaultValue: 'LOOK BOOK',
    },
    {
      name: 'items',
      type: 'array',
      label: '拼貼項目',
      minRows: 1,
      maxRows: 6,
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: '圖片',
          required: true,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'rotation',
              type: 'number',
              label: '旋轉角度',
              defaultValue: 0,
              min: -15,
              max: 15,
              admin: {
                width: '50%',
                step: 1,
                description: '建議 -5 ~ 5 度',
              },
            },
            {
              name: 'size',
              type: 'select',
              label: '大小',
              defaultValue: 'medium',
              options: [
                { label: '小', value: 'small' },
                { label: '中', value: 'medium' },
                { label: '大', value: 'large' },
              ],
              admin: {
                width: '50%',
              },
            },
          ],
        },
        {
          name: 'link',
          type: 'text',
          label: '連結',
        },
        {
          name: 'caption',
          type: 'text',
          label: '說明文字 (選填)',
        },
      ],
    },
    // 貼紙/標籤
    {
      name: 'stickers',
      type: 'array',
      label: '手寫貼紙',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'text',
              type: 'text',
              label: '文字',
              required: true,
              admin: {
                width: '50%',
              },
            },
            {
              name: 'style',
              type: 'select',
              label: '樣式',
              defaultValue: 'handwritten',
              options: [
                { label: '手寫', value: 'handwritten' },
                { label: '膠帶', value: 'tape' },
                { label: '便條紙', value: 'postit' },
                { label: '圓形貼紙', value: 'circle' },
              ],
              admin: {
                width: '50%',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'color',
              type: 'select',
              label: '顏色',
              defaultValue: 'pink',
              options: [
                { label: '粉紅', value: 'pink' },
                { label: '薄荷綠', value: 'mint' },
                { label: '黃色', value: 'yellow' },
                { label: '淡紫', value: 'lavender' },
                { label: '牛皮紙', value: 'kraft' },
              ],
              admin: {
                width: '50%',
              },
            },
            {
              name: 'rotation',
              type: 'number',
              label: '旋轉角度',
              defaultValue: -3,
              min: -20,
              max: 20,
              admin: {
                width: '50%',
              },
            },
          ],
        },
      ],
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
          name: 'layout',
          type: 'select',
          label: '排版模式',
          defaultValue: 'scattered',
          options: [
            { label: '散落式 (隨機角度)', value: 'scattered' },
            { label: '整齊排列', value: 'grid' },
            { label: '疊加式', value: 'stacked' },
          ],
        },
        {
          name: 'backgroundColor',
          type: 'text',
          label: '背景色',
          defaultValue: '#FDF8F3',
        },
        {
          name: 'showTapeCorners',
          type: 'checkbox',
          label: '顯示膠帶角落效果',
          defaultValue: true,
        },
      ],
    },
  ],
}
