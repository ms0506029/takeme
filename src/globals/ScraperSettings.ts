import type { GlobalConfig } from 'payload'

/**
 * ScraperSettings Global
 * 爬蟲系統全局設定
 *
 * 包含：
 * - 全局定價設定（匯率、層級、進位規則）
 * - 翻譯設定（模板、對照表）
 * - 匯入設定（預設商家、自動發布等）
 * - Chrome Extension 連線設定
 */
export const ScraperSettings: GlobalConfig = {
  slug: 'scraper-settings',
  label: '爬蟲系統設定',
  admin: {
    group: '爬蟲系統',
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
    update: ({ req: { user } }) => {
      if (!user) return false
      return Boolean(user.roles?.includes('super-admin') || user.roles?.includes('admin'))
    },
  },
  fields: [
    // ====== 全局定價設定 ======
    {
      type: 'collapsible',
      label: '全局定價設定',
      admin: {
        initCollapsed: false,
        description: '設定價格計算的預設規則',
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
                  name: 'defaultExchangeRate',
                  type: 'number',
                  label: '預設匯率 (JPY → TWD)',
                  defaultValue: 0.21,
                  admin: {
                    width: '50%',
                    step: 0.0001,
                    description: '1 日圓 = ? 台幣',
                  },
                },
                {
                  name: 'roundingRule',
                  type: 'select',
                  label: '進位規則',
                  defaultValue: 'ceil10',
                  options: [
                    { label: '十位進位', value: 'ceil10' },
                    { label: '百位進位', value: 'ceil100' },
                    { label: '四捨五入到十位', value: 'round10' },
                    { label: '不進位', value: 'none' },
                  ],
                  admin: {
                    width: '50%',
                  },
                },
              ],
            },
            {
              name: 'tiers',
              type: 'array',
              label: '定價層級',
              admin: {
                description: '根據原價範圍套用不同的計算公式',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'name',
                      type: 'text',
                      label: '層級名稱',
                      required: true,
                      admin: { width: '20%', placeholder: 'Tier 1' },
                    },
                    {
                      name: 'minPrice',
                      type: 'number',
                      label: '最低價格 (JPY)',
                      required: true,
                      admin: { width: '20%' },
                    },
                    {
                      name: 'maxPrice',
                      type: 'number',
                      label: '最高價格 (JPY)',
                      admin: { width: '20%', description: '留空 = 無上限' },
                    },
                    {
                      name: 'taxMultiplier',
                      type: 'number',
                      label: '稅率乘數',
                      defaultValue: 1.07,
                      admin: { width: '20%', step: 0.01 },
                    },
                    {
                      name: 'handlingFee',
                      type: 'number',
                      label: '手續費 (TWD)',
                      defaultValue: 110,
                      admin: { width: '10%' },
                    },
                    {
                      name: 'shippingFee',
                      type: 'number',
                      label: '運費 (TWD)',
                      defaultValue: 380,
                      admin: { width: '10%' },
                    },
                  ],
                },
              ],
              defaultValue: [
                {
                  name: 'Tier 1',
                  minPrice: 0,
                  maxPrice: 11000,
                  taxMultiplier: 1.07,
                  handlingFee: 110,
                  shippingFee: 380,
                },
                {
                  name: 'Tier 2',
                  minPrice: 11000,
                  maxPrice: null,
                  taxMultiplier: 1.05,
                  handlingFee: 150,
                  shippingFee: 380,
                },
              ],
            },
            {
              name: 'pricingFormula',
              type: 'textarea',
              label: '定價公式說明',
              defaultValue:
                '售價 = (原價 × 匯率 × 稅率乘數) + 手續費 + 國際運費\n\n範例：\nTier 1 (< ¥11,000): price × 0.21 × 1.07 + 110 + 380\nTier 2 (≥ ¥11,000): price × 0.21 × 1.05 + 150 + 380',
              admin: {
                readOnly: true,
                description: '價格計算公式參考',
              },
            },
          ],
        },
      ],
    },

    // ====== 翻譯設定 ======
    {
      type: 'collapsible',
      label: '翻譯設定',
      admin: {
        initCollapsed: true,
        description: '設定日文→中文的翻譯規則',
      },
      fields: [
        {
          name: 'translation',
          type: 'group',
          label: '',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'enabled',
                  type: 'checkbox',
                  label: '啟用自動翻譯',
                  defaultValue: true,
                  admin: {
                    width: '33%',
                  },
                },
                {
                  name: 'fallbackMode',
                  type: 'select',
                  label: '無法翻譯時',
                  defaultValue: 'review',
                  options: [
                    { label: '保留原文', value: 'keep' },
                    { label: '標記需審核', value: 'review' },
                  ],
                  admin: {
                    width: '33%',
                  },
                },
                {
                  name: 'template',
                  type: 'text',
                  label: '命名模板',
                  defaultValue: '{brand} {feature} {category}',
                  admin: {
                    width: '34%',
                    description: '可用變數: {brand}, {feature}, {category}, {color}',
                  },
                },
              ],
            },

            // 分類對照表
            {
              name: 'categoryMappings',
              type: 'array',
              label: '分類對照表',
              admin: {
                description: '日文分類 → 中文分類',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'japanese',
                      type: 'text',
                      label: '日文',
                      required: true,
                      admin: { width: '50%' },
                    },
                    {
                      name: 'chinese',
                      type: 'text',
                      label: '中文',
                      required: true,
                      admin: { width: '50%' },
                    },
                  ],
                },
              ],
              defaultValue: [
                { japanese: 'ニット', chinese: '針織衫' },
                { japanese: 'カーディガン', chinese: '開襟衫' },
                { japanese: 'パーカー', chinese: '連帽衫' },
                { japanese: 'スウェット', chinese: '衛衣' },
                { japanese: 'シャツ', chinese: '襯衫' },
                { japanese: 'ブラウス', chinese: '上衣' },
                { japanese: 'Tシャツ', chinese: 'T恤' },
                { japanese: 'ジャケット', chinese: '夾克' },
                { japanese: 'コート', chinese: '大衣' },
                { japanese: 'ダウン', chinese: '羽絨外套' },
                { japanese: 'パンツ', chinese: '褲子' },
                { japanese: 'デニム', chinese: '牛仔褲' },
                { japanese: 'スカート', chinese: '裙子' },
                { japanese: 'ワンピース', chinese: '洋裝' },
                { japanese: 'バッグ', chinese: '包包' },
                { japanese: '帽子', chinese: '帽子' },
                { japanese: 'アクセサリー', chinese: '飾品' },
              ],
            },

            // 顏色對照表
            {
              name: 'colorMappings',
              type: 'array',
              label: '顏色對照表',
              admin: {
                description: '日文顏色 → 中文顏色',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'japanese',
                      type: 'text',
                      label: '日文',
                      required: true,
                      admin: { width: '50%' },
                    },
                    {
                      name: 'chinese',
                      type: 'text',
                      label: '中文',
                      required: true,
                      admin: { width: '50%' },
                    },
                  ],
                },
              ],
              defaultValue: [
                { japanese: 'ブラック', chinese: '黑色' },
                { japanese: 'ホワイト', chinese: '白色' },
                { japanese: 'グレー', chinese: '灰色' },
                { japanese: 'ネイビー', chinese: '深藍色' },
                { japanese: 'ブルー', chinese: '藍色' },
                { japanese: 'レッド', chinese: '紅色' },
                { japanese: 'ピンク', chinese: '粉色' },
                { japanese: 'ベージュ', chinese: '米色' },
                { japanese: 'ブラウン', chinese: '棕色' },
                { japanese: 'グリーン', chinese: '綠色' },
                { japanese: 'イエロー', chinese: '黃色' },
                { japanese: 'オレンジ', chinese: '橘色' },
                { japanese: 'パープル', chinese: '紫色' },
                { japanese: 'カーキ', chinese: '卡其色' },
                { japanese: 'キャメル', chinese: '駝色' },
              ],
            },

            // 尺寸對照表
            {
              name: 'sizeMappings',
              type: 'array',
              label: '尺寸測量項目對照表',
              admin: {
                description: '日文尺寸項目 → 中文',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'japanese',
                      type: 'text',
                      label: '日文',
                      required: true,
                      admin: { width: '50%' },
                    },
                    {
                      name: 'chinese',
                      type: 'text',
                      label: '中文',
                      required: true,
                      admin: { width: '50%' },
                    },
                  ],
                },
              ],
              defaultValue: [
                { japanese: '着丈', chinese: '衣長' },
                { japanese: '身幅', chinese: '胸寬' },
                { japanese: '肩幅', chinese: '肩寬' },
                { japanese: '袖丈', chinese: '袖長' },
                { japanese: 'ウエスト', chinese: '腰圍' },
                { japanese: 'ヒップ', chinese: '臀圍' },
                { japanese: '股上', chinese: '前檔' },
                { japanese: '股下', chinese: '褲管長' },
                { japanese: 'わたり', chinese: '大腿圍' },
                { japanese: '裾幅', chinese: '褲口寬' },
              ],
            },
          ],
        },
      ],
    },

    // ====== 匯入設定 ======
    {
      type: 'collapsible',
      label: '匯入設定',
      admin: {
        initCollapsed: true,
        description: '設定商品匯入到系統的預設值',
      },
      fields: [
        {
          name: 'import',
          type: 'group',
          label: '',
          fields: [
            {
              name: 'defaultVendor',
              type: 'relationship',
              relationTo: 'vendors',
              label: '預設商家',
              admin: {
                description: '匯入商品時的預設商家',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'downloadImages',
                  type: 'checkbox',
                  label: '下載圖片到 Media',
                  defaultValue: true,
                  admin: {
                    width: '33%',
                    description: '將圖片從來源網站下載到本地',
                  },
                },
                {
                  name: 'createVariants',
                  type: 'checkbox',
                  label: '自動建立變體',
                  defaultValue: true,
                  admin: {
                    width: '33%',
                    description: '根據爬取的顏色/尺寸建立變體',
                  },
                },
                {
                  name: 'autoPublish',
                  type: 'checkbox',
                  label: '自動發布',
                  defaultValue: false,
                  admin: {
                    width: '34%',
                    description: '匯入後自動設為已發布狀態',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'defaultCategory',
                  type: 'relationship',
                  relationTo: 'categories',
                  label: '預設分類',
                  admin: {
                    width: '50%',
                  },
                },
                {
                  name: 'externalSource',
                  type: 'select',
                  label: '來源標記',
                  defaultValue: 'freaks',
                  options: [
                    { label: "Freak's Store", value: 'freaks' },
                    { label: 'BEAMS', value: 'beams' },
                    { label: 'ZOZO', value: 'zozo' },
                    { label: '其他', value: 'other' },
                  ],
                  admin: {
                    width: '50%',
                    description: '標記商品來源平台',
                  },
                },
              ],
            },
            {
              name: 'maxConcurrentDownloads',
              type: 'number',
              label: '最大並行下載數',
              defaultValue: 3,
              min: 1,
              max: 10,
              admin: {
                description: '同時下載圖片的數量（過高可能被封鎖）',
              },
            },
          ],
        },
      ],
    },

    // ====== Chrome Extension 設定 ======
    {
      type: 'collapsible',
      label: 'Chrome Extension 設定',
      admin: {
        initCollapsed: true,
        description: '管理 Extension 連線和通訊',
      },
      fields: [
        {
          name: 'extension',
          type: 'group',
          label: '',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'enabled',
                  type: 'checkbox',
                  label: '啟用 Extension 連線',
                  defaultValue: true,
                  admin: {
                    width: '30%',
                  },
                },
                {
                  name: 'apiKey',
                  type: 'text',
                  label: 'API Key',
                  admin: {
                    width: '70%',
                    description: 'Extension 驗證用的 API Key',
                  },
                },
              ],
            },
            {
              name: 'wsEndpoint',
              type: 'text',
              label: 'WebSocket 端點',
              defaultValue: '/api/scraper/ws',
              admin: {
                readOnly: true,
                description: 'Extension 連線的 WebSocket URL',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'heartbeatInterval',
                  type: 'number',
                  label: '心跳間隔 (秒)',
                  defaultValue: 30,
                  min: 10,
                  max: 120,
                  admin: {
                    width: '50%',
                    description: 'Extension 回報存活狀態的間隔',
                  },
                },
                {
                  name: 'connectionTimeout',
                  type: 'number',
                  label: '連線逾時 (秒)',
                  defaultValue: 60,
                  min: 30,
                  max: 300,
                  admin: {
                    width: '50%',
                    description: '超過此時間無心跳視為斷線',
                  },
                },
              ],
            },
            {
              name: 'extensionVersion',
              type: 'text',
              label: '最新 Extension 版本',
              defaultValue: '1.0.0',
              admin: {
                description: '用於提示用戶更新',
              },
            },
            {
              name: 'extensionDownloadUrl',
              type: 'text',
              label: 'Extension 下載連結',
              admin: {
                description: '用戶下載 Extension 的連結',
              },
            },
          ],
        },
      ],
    },

    // ====== 系統狀態 ======
    {
      type: 'collapsible',
      label: '系統狀態',
      admin: {
        initCollapsed: true,
        description: '爬蟲系統的運行狀態資訊',
      },
      fields: [
        {
          name: 'status',
          type: 'group',
          label: '',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'totalJobsRun',
                  type: 'number',
                  label: '累計執行任務數',
                  defaultValue: 0,
                  admin: {
                    width: '33%',
                    readOnly: true,
                  },
                },
                {
                  name: 'totalProductsScraped',
                  type: 'number',
                  label: '累計爬取商品數',
                  defaultValue: 0,
                  admin: {
                    width: '33%',
                    readOnly: true,
                  },
                },
                {
                  name: 'totalProductsImported',
                  type: 'number',
                  label: '累計匯入商品數',
                  defaultValue: 0,
                  admin: {
                    width: '34%',
                    readOnly: true,
                  },
                },
              ],
            },
            {
              name: 'lastJobAt',
              type: 'date',
              label: '最後執行時間',
              admin: {
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

export default ScraperSettings
