import type { CollectionConfig } from 'payload'

/**
 * ScraperPlatforms Collection
 * 爬蟲平台配置
 *
 * 儲存各網站的爬蟲配置，包含：
 * - 基本資訊（名稱、URL、圖示）
 * - URL 模式（列表頁、商品頁識別）
 * - CSS 選擇器配置（列表頁、商品頁）
 * - 定價規則
 * - 進階設定
 */
export const ScraperPlatforms: CollectionConfig = {
  slug: 'scraper-platforms',
  labels: {
    singular: '爬蟲平台',
    plural: '爬蟲平台',
  },
  admin: {
    group: '爬蟲系統',
    useAsTitle: 'name',
    defaultColumns: ['name', 'baseUrl', 'isActive', 'totalProductsScraped', 'lastUsedAt'],
    description: '管理各網站的爬蟲配置',
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
    // ===== 基本資訊 =====
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: '平台名稱',
          required: true,
          admin: {
            width: '50%',
            placeholder: '例: Daytona Park',
          },
        },
        {
          name: 'slug',
          type: 'text',
          label: '平台代碼',
          required: true,
          unique: true,
          admin: {
            width: '50%',
            placeholder: '例: daytona-park',
            description: '用於 API 識別，請使用小寫英文和連字號',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'baseUrl',
          type: 'text',
          label: '網站 URL',
          required: true,
          admin: {
            width: '70%',
            placeholder: 'https://www.daytona-park.com',
          },
        },
        {
          name: 'isActive',
          type: 'checkbox',
          label: '啟用',
          defaultValue: true,
          admin: {
            width: '30%',
          },
        },
      ],
    },
    {
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
      label: '平台圖示',
      admin: {
        description: '顯示在平台列表中的小圖示',
      },
    },

    // ===== URL 模式 =====
    {
      type: 'collapsible',
      label: 'URL 模式設定',
      admin: {
        initCollapsed: false,
        description: '用於自動偵測 URL 類型（列表頁/商品頁）',
      },
      fields: [
        {
          name: 'urlPatterns',
          type: 'group',
          label: '',
          fields: [
            {
              name: 'listing',
              type: 'text',
              label: '列表頁模式',
              required: true,
              admin: {
                placeholder: '/itemlist|/categories/',
                description: '正則表達式，匹配列表頁 URL',
              },
            },
            {
              name: 'product',
              type: 'text',
              label: '商品頁模式',
              required: true,
              admin: {
                placeholder: '/item/(\\d+)',
                description: '正則表達式，匹配商品頁 URL，可用括號捕獲商品 ID',
              },
            },
          ],
        },
      ],
    },

    // ===== 列表頁選擇器 =====
    {
      type: 'collapsible',
      label: '列表頁選擇器',
      admin: {
        initCollapsed: false,
        description: '用於從列表頁提取商品連結和基本資訊',
      },
      fields: [
        {
          name: 'listingSelectors',
          type: 'group',
          label: '',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'productCard',
                  type: 'text',
                  label: '商品卡片',
                  required: true,
                  admin: {
                    width: '50%',
                    placeholder: '.goods-list-item',
                    description: '包含單一商品的容器元素',
                  },
                },
                {
                  name: 'productLink',
                  type: 'text',
                  label: '商品連結',
                  required: true,
                  admin: {
                    width: '50%',
                    placeholder: "a[href*='/item/']",
                    description: '指向商品詳情頁的連結',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'productId',
                  type: 'text',
                  label: '商品 ID',
                  admin: {
                    width: '50%',
                    placeholder: 'data-goods-id',
                    description: '屬性名稱或選擇器，用於提取商品 ID',
                  },
                },
                {
                  name: 'thumbnail',
                  type: 'text',
                  label: '縮圖',
                  admin: {
                    width: '50%',
                    placeholder: 'img.goods-image',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  label: '標題',
                  admin: {
                    width: '50%',
                    placeholder: '.goods-name',
                  },
                },
                {
                  name: 'brand',
                  type: 'text',
                  label: '品牌',
                  admin: {
                    width: '50%',
                    placeholder: '.goods-brand',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'price',
                  type: 'text',
                  label: '價格',
                  admin: {
                    width: '50%',
                    placeholder: '.goods-price',
                  },
                },
                {
                  name: 'originalPrice',
                  type: 'text',
                  label: '原價 (折扣時)',
                  admin: {
                    width: '50%',
                    placeholder: '.goods-original-price',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'nextPage',
                  type: 'text',
                  label: '下一頁按鈕',
                  admin: {
                    width: '50%',
                    placeholder: '.pagination .next a',
                  },
                },
                {
                  name: 'pageParam',
                  type: 'text',
                  label: '頁碼參數名',
                  defaultValue: 'p',
                  admin: {
                    width: '25%',
                    description: 'URL 中的頁碼參數',
                  },
                },
                {
                  name: 'totalCount',
                  type: 'text',
                  label: '總數量選擇器',
                  admin: {
                    width: '25%',
                    placeholder: '.total-count',
                  },
                },
              ],
            },
          ],
        },
      ],
    },

    // ===== 商品頁選擇器 (深層爬取) =====
    {
      type: 'collapsible',
      label: '商品頁選擇器 (深層爬取)',
      admin: {
        initCollapsed: true,
        description: '用於從商品詳情頁提取完整資訊',
      },
      fields: [
        {
          name: 'supportDeepScrape',
          type: 'checkbox',
          label: '支援深層爬取',
          defaultValue: true,
          admin: {
            description: '啟用後可提取商品詳情、變體、尺寸表等完整資訊',
          },
        },
        {
          name: 'productSelectors',
          type: 'group',
          label: '',
          admin: {
            condition: (data) => data?.supportDeepScrape,
          },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  label: '商品標題',
                  admin: {
                    width: '50%',
                    placeholder: '.goods-detail-name',
                  },
                },
                {
                  name: 'brand',
                  type: 'text',
                  label: '品牌',
                  admin: {
                    width: '50%',
                    placeholder: '.goods-detail-brand',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'price',
                  type: 'text',
                  label: '價格',
                  admin: {
                    width: '50%',
                    placeholder: '.goods-detail-price',
                  },
                },
                {
                  name: 'description',
                  type: 'text',
                  label: '描述',
                  admin: {
                    width: '50%',
                    placeholder: '.goods-detail-description',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'images',
                  type: 'text',
                  label: '圖片列表',
                  admin: {
                    width: '50%',
                    placeholder: '.swiper-slide img',
                  },
                },
                {
                  name: 'variants',
                  type: 'text',
                  label: '變體容器',
                  admin: {
                    width: '50%',
                    placeholder: '.goods-variation',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'variantColor',
                  type: 'text',
                  label: '顏色選項',
                  admin: {
                    width: '50%',
                    placeholder: '.color-item[data-color]',
                  },
                },
                {
                  name: 'variantSize',
                  type: 'text',
                  label: '尺寸選項',
                  admin: {
                    width: '50%',
                    placeholder: '.size-item[data-size]',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'stockStatus',
                  type: 'text',
                  label: '庫存狀態',
                  admin: {
                    width: '50%',
                    placeholder: '.stock-status, .soldout',
                  },
                },
                {
                  name: 'sizeChart',
                  type: 'text',
                  label: '尺寸表',
                  admin: {
                    width: '50%',
                    placeholder: '.size-chart table',
                  },
                },
              ],
            },
            {
              name: 'materials',
              type: 'text',
              label: '材質成分',
              admin: {
                placeholder: '.materials, .composition',
              },
            },
          ],
        },
      ],
    },

    // ===== 進階設定 =====
    {
      type: 'collapsible',
      label: '進階設定',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'settings',
          type: 'group',
          label: '',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'pageDelay',
                  type: 'number',
                  label: '翻頁延遲 (ms)',
                  defaultValue: 2500,
                  min: 1000,
                  max: 10000,
                  admin: {
                    width: '33%',
                    description: '翻頁之間的等待時間',
                  },
                },
                {
                  name: 'requestDelay',
                  type: 'number',
                  label: '請求延遲 (ms)',
                  defaultValue: 500,
                  min: 100,
                  max: 5000,
                  admin: {
                    width: '33%',
                    description: '每個請求之間的等待時間',
                  },
                },
                {
                  name: 'maxRetries',
                  type: 'number',
                  label: '最大重試次數',
                  defaultValue: 3,
                  min: 1,
                  max: 10,
                  admin: {
                    width: '34%',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'requiresLogin',
                  type: 'checkbox',
                  label: '需要登入',
                  defaultValue: false,
                  admin: {
                    width: '50%',
                    description: '此平台需要登入才能爬取',
                  },
                },
                {
                  name: 'userAgent',
                  type: 'text',
                  label: '自訂 User-Agent',
                  admin: {
                    width: '50%',
                    placeholder: '留空使用預設值',
                  },
                },
              ],
            },
          ],
        },
      ],
    },

    // ===== 定價規則 =====
    {
      type: 'collapsible',
      label: '定價規則',
      admin: {
        initCollapsed: true,
        description: '設定此平台的價格計算方式',
      },
      fields: [
        {
          name: 'pricing',
          type: 'group',
          label: '',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'useGlobalPricing',
                  type: 'checkbox',
                  label: '使用全局定價設定',
                  defaultValue: true,
                  admin: {
                    width: '50%',
                  },
                },
                {
                  name: 'currency',
                  type: 'select',
                  label: '來源幣別',
                  defaultValue: 'JPY',
                  options: [
                    { label: '日幣 (JPY)', value: 'JPY' },
                    { label: '美元 (USD)', value: 'USD' },
                    { label: '台幣 (TWD)', value: 'TWD' },
                  ],
                  admin: {
                    width: '50%',
                  },
                },
              ],
            },
            {
              name: 'customPricingTiers',
              type: 'array',
              label: '自定義定價層級',
              admin: {
                condition: (data) => !data?.pricing?.useGlobalPricing,
                description: '不使用全局設定時，可自訂此平台的定價層級',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'name',
                      type: 'text',
                      label: '層級名稱',
                      admin: { width: '25%' },
                    },
                    {
                      name: 'minPrice',
                      type: 'number',
                      label: '最低價格',
                      admin: { width: '25%' },
                    },
                    {
                      name: 'maxPrice',
                      type: 'number',
                      label: '最高價格',
                      admin: { width: '25%' },
                    },
                    {
                      name: 'exchangeRate',
                      type: 'number',
                      label: '匯率',
                      admin: { width: '25%', step: 0.0001 },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'taxMultiplier',
                      type: 'number',
                      label: '稅率乘數',
                      defaultValue: 1.07,
                      admin: { width: '33%', step: 0.01 },
                    },
                    {
                      name: 'handlingFee',
                      type: 'number',
                      label: '手續費',
                      defaultValue: 110,
                      admin: { width: '33%' },
                    },
                    {
                      name: 'shippingFee',
                      type: 'number',
                      label: '運費',
                      defaultValue: 380,
                      admin: { width: '34%' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    // ===== 自定義提取函數 =====
    {
      type: 'collapsible',
      label: '自定義提取函數 (進階)',
      admin: {
        initCollapsed: true,
        description: '特殊情況的自定義 JavaScript 處理邏輯',
      },
      fields: [
        {
          name: 'customExtractors',
          type: 'code',
          label: '自定義提取函數',
          admin: {
            language: 'json',
            description:
              'JSON 格式的自定義函數配置，用於特殊情況的資料提取。請謹慎使用。',
          },
        },
      ],
    },

    // ===== 統計欄位 =====
    {
      type: 'collapsible',
      label: '統計資訊',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'totalProductsScraped',
              type: 'number',
              label: '累計爬取商品數',
              defaultValue: 0,
              admin: {
                width: '50%',
                readOnly: true,
              },
            },
            {
              name: 'lastUsedAt',
              type: 'date',
              label: '最後使用時間',
              admin: {
                width: '50%',
                readOnly: true,
                date: { displayFormat: 'yyyy-MM-dd HH:mm' },
              },
            },
          ],
        },
      ],
    },
  ],
}

export default ScraperPlatforms
