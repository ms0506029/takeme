import type { GlobalConfig } from 'payload'

/**
 * SiteSettings Global
 * 
 * 全站品牌識別與基礎設定，包含：
 * - Logo / Favicon 上傳
 * - 品牌色系 (覆寫 CSS Variables)
 * - SEO 預設值
 * - 頂部公告跑馬燈
 */
export const SiteSettings: GlobalConfig = {
  slug: 'siteSettings',
  label: '網站設定',
  admin: {
    group: '設定',
  },
  access: {
    read: () => true,
  },
  fields: [
    // ====== 品牌識別 ======
    {
      type: 'collapsible',
      label: '品牌識別',
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'mainLogo',
              type: 'upload',
              relationTo: 'media',
              label: '主要 Logo',
              admin: {
                width: '50%',
                description: '建議使用 SVG 或透明背景 PNG',
              },
            },
            {
              name: 'favicon',
              type: 'upload',
              relationTo: 'media',
              label: 'Favicon',
              admin: {
                width: '50%',
                description: '建議尺寸 32x32 或 64x64',
              },
            },
          ],
        },
        {
          name: 'siteName',
          type: 'text',
          label: '網站名稱',
          defaultValue: 'Daytona Park',
          required: true,
        },
      ],
    },

    // ====== 品牌色系 ======
    {
      type: 'collapsible',
      label: '品牌色系',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'brandColors',
          type: 'group',
          label: '',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'primary',
                  type: 'text',
                  label: '主色調',
                  defaultValue: '#C9915D',
                  admin: {
                    width: '33%',
                    description: '品牌主色 (如 EasyStore 風格)',
                  },
                },
                {
                  name: 'accent',
                  type: 'text',
                  label: '強調色',
                  defaultValue: '#6B5844',
                  admin: {
                    width: '33%',
                  },
                },
                {
                  name: 'background',
                  type: 'text',
                  label: '背景色',
                  defaultValue: '#FDF8F3',
                  admin: {
                    width: '33%',
                    description: '復古牛皮紙風格',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'text',
                  type: 'text',
                  label: '文字色',
                  defaultValue: '#2D2A26',
                  admin: {
                    width: '33%',
                  },
                },
                {
                  name: 'textMuted',
                  type: 'text',
                  label: '次要文字色',
                  defaultValue: '#6B6560',
                  admin: {
                    width: '33%',
                  },
                },
                {
                  name: 'border',
                  type: 'text',
                  label: '邊框色',
                  defaultValue: '#E5DED5',
                  admin: {
                    width: '33%',
                  },
                },
              ],
            },
          ],
        },
      ],
    },

    // ====== SEO 預設 ======
    {
      type: 'collapsible',
      label: 'SEO 預設值',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'seo',
          type: 'group',
          label: '',
          fields: [
            {
              name: 'defaultTitle',
              type: 'text',
              label: '預設標題',
              defaultValue: 'Daytona Park - 復古時尚電商',
            },
            {
              name: 'defaultDescription',
              type: 'textarea',
              label: '預設描述',
              defaultValue: '日本直送・獨家設計・限量發售',
            },
            {
              name: 'ogImage',
              type: 'upload',
              relationTo: 'media',
              label: 'OG 圖片',
              admin: {
                description: '社群分享預覽圖 (建議 1200x630)',
              },
            },
          ],
        },
      ],
    },

    // ====== 公告跑馬燈 ======
    {
      type: 'collapsible',
      label: '頂部公告',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'announcementBar',
          type: 'group',
          label: '',
          fields: [
            {
              name: 'enabled',
              type: 'checkbox',
              label: '啟用公告',
              defaultValue: false,
            },
            {
              name: 'text',
              type: 'text',
              label: '公告文字',
              defaultValue: '🎉 滿 $3,000 免運費！',
              admin: {
                condition: (data) => data?.announcementBar?.enabled,
              },
            },
            {
              name: 'link',
              type: 'text',
              label: '連結 (選填)',
              admin: {
                condition: (data) => data?.announcementBar?.enabled,
              },
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
                    condition: (data) => data?.announcementBar?.enabled,
                  },
                },
                {
                  name: 'textColor',
                  type: 'text',
                  label: '文字色',
                  defaultValue: '#FFFFFF',
                  admin: {
                    width: '50%',
                    condition: (data) => data?.announcementBar?.enabled,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
