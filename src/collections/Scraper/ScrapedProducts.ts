import type { CollectionConfig } from 'payload'

/**
 * ScrapedProducts Collection
 * 爬取商品（暫存）
 *
 * 儲存爬取的原始商品資料，包含：
 * - 原始資料（標題、價格、圖片）
 * - 翻譯後標題
 * - 計算後售價
 * - 匯入狀態
 */
export const ScrapedProducts: CollectionConfig = {
  slug: 'scraped-products',
  labels: {
    singular: '爬取商品',
    plural: '爬取商品',
  },
  admin: {
    group: '爬蟲系統',
    defaultColumns: ['originalTitle', 'platform', 'importStatus', 'calculatedPrice', 'scrapedAt'],
    description: '爬取後的商品暫存區，可編輯後再匯入',
    useAsTitle: 'originalTitle',
    components: {
      beforeListTable: ['@/components/Admin/Scraper/BatchImportButton#BatchImportButton'],
    },
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      return Boolean(
        user.roles?.includes('super-admin') ||
          user.roles?.includes('admin') ||
          user.roles?.includes('vendor'),
      )
    },
    create: ({ req: { user } }) => {
      if (!user) return false
      return Boolean(user.roles?.includes('super-admin') || user.roles?.includes('admin'))
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      return Boolean(user.roles?.includes('super-admin') || user.roles?.includes('admin'))
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      return Boolean(user.roles?.includes('super-admin') || user.roles?.includes('admin'))
    },
  },
  fields: [
    // ===== 關聯資訊 =====
    {
      type: 'row',
      fields: [
        {
          name: 'job',
          type: 'relationship',
          relationTo: 'scraping-jobs',
          label: '來源任務',
          required: true,
          admin: {
            width: '50%',
            readOnly: true,
          },
        },
        {
          name: 'platform',
          type: 'relationship',
          relationTo: 'scraper-platforms',
          label: '來源平台',
          required: true,
          admin: {
            width: '50%',
            readOnly: true,
          },
        },
      ],
    },

    // ===== 外部識別 =====
    {
      type: 'row',
      fields: [
        {
          name: 'externalId',
          type: 'text',
          label: '外部商品 ID',
          required: true,
          index: true,
          admin: {
            width: '50%',
            readOnly: true,
            description: '來源平台的商品 ID',
          },
        },
        {
          name: 'externalUrl',
          type: 'text',
          label: '來源 URL',
          required: true,
          admin: {
            width: '50%',
            readOnly: true,
          },
        },
      ],
    },

    // ===== 基本資訊 =====
    {
      type: 'collapsible',
      label: '商品資訊',
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'originalTitle',
              type: 'text',
              label: '原始標題',
              admin: {
                width: '50%',
                readOnly: true,
              },
            },
            {
              name: 'translatedTitle',
              type: 'text',
              label: '翻譯標題',
              admin: {
                width: '50%',
                description: '可手動編輯',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'brand',
              type: 'text',
              label: '品牌',
              admin: {
                width: '50%',
              },
            },
            {
              name: 'category',
              type: 'text',
              label: '分類',
              admin: {
                width: '50%',
              },
            },
          ],
        },
        {
          name: 'description',
          type: 'textarea',
          label: '描述',
          admin: {
            description: '原始描述（日文）',
          },
        },
        {
          name: 'translatedDescription',
          type: 'textarea',
          label: '翻譯描述',
          admin: {
            description: '翻譯後的描述（可編輯）',
          },
        },
      ],
    },

    // ===== 價格資訊 =====
    {
      type: 'collapsible',
      label: '價格資訊',
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'originalPrice',
              type: 'number',
              label: '原價 (來源幣別)',
              admin: {
                width: '33%',
                readOnly: true,
              },
            },
            {
              name: 'salePrice',
              type: 'number',
              label: '特價 (來源幣別)',
              admin: {
                width: '33%',
                readOnly: true,
                description: '如有折扣',
              },
            },
            {
              name: 'calculatedPrice',
              type: 'number',
              label: '計算售價 (TWD)',
              admin: {
                width: '34%',
                description: '根據定價規則計算',
              },
            },
          ],
        },
        {
          name: 'pricingDetails',
          type: 'json',
          label: '定價詳情',
          admin: {
            readOnly: true,
            description: '價格計算的詳細步驟',
          },
        },
      ],
    },

    // ===== 圖片 =====
    {
      type: 'collapsible',
      label: '圖片',
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          name: 'thumbnailUrl',
          type: 'text',
          label: '縮圖 URL',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'imageUrls',
          type: 'array',
          label: '圖片列表',
          admin: {
            readOnly: true,
          },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'url',
                  type: 'text',
                  label: 'URL',
                  admin: { width: '50%' },
                },
                {
                  name: 'colorName',
                  type: 'text',
                  label: '關聯顏色',
                  admin: {
                    width: '25%',
                    description: '此圖片對應的顏色',
                  },
                },
                {
                  name: 'base64',
                  type: 'textarea',
                  label: 'Base64',
                  admin: {
                    width: '25%',
                    description: 'Base64 編碼圖片（由 Extension 下載）',
                    // 隱藏在列表視圖中（太長）
                    condition: () => false,
                  },
                },
              ],
            },
          ],
        },
      ],
    },

    // ===== 變體資訊 (深層爬取) =====
    {
      type: 'collapsible',
      label: '變體資訊',
      admin: {
        initCollapsed: true,
        description: '深層爬取時提取的變體資料',
      },
      fields: [
        {
          name: 'variants',
          type: 'json',
          label: '變體資料',
          admin: {
            description: '包含顏色、尺寸、庫存等資訊',
          },
        },
        {
          name: 'sizeChart',
          type: 'json',
          label: '尺寸表',
          admin: {
            description: '尺寸對照表資料',
          },
        },
        {
          name: 'materials',
          type: 'text',
          label: '材質成分',
        },
      ],
    },

    // ===== 翻譯狀態 =====
    {
      type: 'collapsible',
      label: '翻譯狀態',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'translationStatus',
              type: 'select',
              label: '翻譯狀態',
              defaultValue: 'pending',
              options: [
                { label: '待翻譯', value: 'pending' },
                { label: '已翻譯', value: 'translated' },
                { label: '需審核', value: 'review' },
                { label: '手動編輯', value: 'manual' },
              ],
              admin: {
                width: '50%',
              },
            },
            {
              name: 'translationNotes',
              type: 'text',
              label: '翻譯備註',
              admin: {
                width: '50%',
                description: '無法翻譯的原因或注意事項',
              },
            },
          ],
        },
      ],
    },

    // ===== 匯入狀態 =====
    {
      type: 'row',
      fields: [
        {
          name: 'importStatus',
          type: 'select',
          label: '匯入狀態',
          defaultValue: 'pending',
          options: [
            { label: '待處理', value: 'pending' },
            { label: '需審核', value: 'review' },
            { label: '已匯入', value: 'imported' },
            { label: '已跳過', value: 'skipped' },
            { label: '匯入失敗', value: 'failed' },
          ],
          admin: {
            width: '50%',
            position: 'sidebar',
          },
        },
        {
          name: 'importedProduct',
          type: 'relationship',
          relationTo: 'products',
          label: '已匯入商品',
          admin: {
            width: '50%',
            position: 'sidebar',
            condition: (data) => data?.importStatus === 'imported',
          },
        },
      ],
    },

    // ===== 時間戳 =====
    {
      type: 'row',
      fields: [
        {
          name: 'scrapedAt',
          type: 'date',
          label: '爬取時間',
          admin: {
            width: '50%',
            readOnly: true,
            date: { displayFormat: 'yyyy-MM-dd HH:mm' },
            position: 'sidebar',
          },
        },
        {
          name: 'importedAt',
          type: 'date',
          label: '匯入時間',
          admin: {
            width: '50%',
            readOnly: true,
            date: { displayFormat: 'yyyy-MM-dd HH:mm' },
            position: 'sidebar',
            condition: (data) => data?.importStatus === 'imported',
          },
        },
      ],
    },

    // ===== 匯入錯誤 =====
    {
      name: 'importError',
      type: 'text',
      label: '匯入錯誤',
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: (data) => data?.importStatus === 'failed',
      },
    },

    // ===== 原始資料備份 =====
    {
      name: 'rawData',
      type: 'json',
      label: '原始爬取資料',
      admin: {
        readOnly: true,
        description: '完整的原始 JSON 資料，用於除錯',
      },
    },
  ],
}

export default ScrapedProducts
