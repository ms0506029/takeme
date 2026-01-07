import type { Block } from 'payload'

/**
 * MarqueeBlock - 復古跑馬燈區塊
 * 
 * 用於顯示滾動文字條，支援多種復古材質風格：
 * - 牛皮紙材質
 * - 膠帶材質
 * - 純色背景
 */
export const MarqueeBlock: Block = {
  slug: 'marquee',
  labels: {
    singular: '跑馬燈',
    plural: '跑馬燈',
  },
  imageURL: '/api/placeholder/400/100',
  fields: [
    {
      name: 'text',
      type: 'text',
      label: '跑馬燈文字',
      required: true,
      defaultValue: '🎉 新品上市 ✨ 限時優惠中 🛒 滿額免運',
      admin: {
        description: '可使用 emoji 增加視覺效果',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'speed',
          type: 'select',
          label: '滾動速度',
          defaultValue: 'normal',
          options: [
            { label: '慢速', value: 'slow' },
            { label: '正常', value: 'normal' },
            { label: '快速', value: 'fast' },
          ],
          admin: {
            width: '50%',
          },
        },
        {
          name: 'direction',
          type: 'select',
          label: '滾動方向',
          defaultValue: 'left',
          options: [
            { label: '向左', value: 'left' },
            { label: '向右', value: 'right' },
          ],
          admin: {
            width: '50%',
          },
        },
      ],
    },
    {
      name: 'texture',
      type: 'select',
      label: '材質風格',
      defaultValue: 'kraft',
      options: [
        { label: '牛皮紙', value: 'kraft' },
        { label: '膠帶', value: 'tape' },
        { label: '純色', value: 'solid' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'backgroundColor',
          type: 'text',
          label: '背景色',
          defaultValue: '#C9915D',
          admin: {
            width: '50%',
            condition: (data, siblingData) => siblingData?.texture === 'solid',
          },
        },
        {
          name: 'textColor',
          type: 'text',
          label: '文字色',
          defaultValue: '#FFFFFF',
          admin: {
            width: '50%',
          },
        },
      ],
    },
    {
      name: 'fontSize',
      type: 'select',
      label: '文字大小',
      defaultValue: 'md',
      options: [
        { label: '小', value: 'sm' },
        { label: '中', value: 'md' },
        { label: '大', value: 'lg' },
        { label: '特大', value: 'xl' },
      ],
    },
    {
      name: 'repeatCount',
      type: 'number',
      label: '文字重複次數',
      defaultValue: 3,
      min: 1,
      max: 10,
      admin: {
        description: '增加重複次數可讓跑馬燈更連續',
      },
    },
  ],
}
