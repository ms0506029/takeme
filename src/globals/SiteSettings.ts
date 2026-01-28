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

    // ====== 字型設定 ======
    {
      type: 'collapsible',
      label: '字型設定',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'typography',
          type: 'group',
          label: '',
          fields: [
            {
              name: 'headingFont',
              type: 'select',
              label: '標題字型',
              defaultValue: 'Noto Sans TC',
              options: [
                { label: 'Noto Sans TC 思源黑體', value: 'Noto Sans TC' },
                { label: 'Noto Serif TC 思源宋體', value: 'Noto Serif TC' },
                { label: 'Inter', value: 'Inter' },
                { label: 'Playfair Display', value: 'Playfair Display' },
                { label: 'Montserrat', value: 'Montserrat' },
                { label: 'Poppins', value: 'Poppins' },
                { label: '系統預設', value: 'system-ui' },
              ],
              admin: {
                description: '用於標題和重要文字',
              },
            },
            {
              name: 'bodyFont',
              type: 'select',
              label: '內文字型',
              defaultValue: 'Noto Sans TC',
              options: [
                { label: 'Noto Sans TC 思源黑體', value: 'Noto Sans TC' },
                { label: 'Noto Serif TC 思源宋體', value: 'Noto Serif TC' },
                { label: 'Inter', value: 'Inter' },
                { label: 'Open Sans', value: 'Open Sans' },
                { label: 'Roboto', value: 'Roboto' },
                { label: 'Lato', value: 'Lato' },
                { label: '系統預設', value: 'system-ui' },
              ],
              admin: {
                description: '用於段落和一般文字',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'baseFontSize',
                  type: 'number',
                  label: '基礎字級 (px)',
                  defaultValue: 16,
                  min: 12,
                  max: 20,
                  admin: {
                    width: '50%',
                  },
                },
                {
                  name: 'lineHeight',
                  type: 'number',
                  label: '行高',
                  defaultValue: 1.6,
                  min: 1.2,
                  max: 2.0,
                  admin: {
                    width: '50%',
                    step: 0.1,
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

    // ====== 幣別與匯率設定 ======
    {
      type: 'collapsible',
      label: '幣別與匯率設定',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'currency',
          type: 'group',
          label: '',
          fields: [
            // 主要幣別設定
            {
              type: 'row',
              fields: [
                {
                  name: 'defaultCurrency',
                  type: 'select',
                  label: '網站預設幣別',
                  defaultValue: 'TWD',
                  required: true,
                  options: [
                    { label: 'TWD 新台幣', value: 'TWD' },
                    { label: 'USD 美元', value: 'USD' },
                    { label: 'JPY 日圓', value: 'JPY' },
                    { label: 'CNY 人民幣', value: 'CNY' },
                    { label: 'HKD 港幣', value: 'HKD' },
                  ],
                  admin: {
                    width: '50%',
                    description: '商品價格顯示的幣別',
                  },
                },
                {
                  name: 'currencySymbol',
                  type: 'text',
                  label: '幣別符號',
                  defaultValue: 'NT$',
                  admin: {
                    width: '50%',
                    description: '顯示在價格前的符號',
                  },
                },
              ],
            },
            // EasyStore 匯入設定
            {
              type: 'collapsible',
              label: 'EasyStore 匯入設定',
              admin: {
                initCollapsed: false,
                description: '設定從 EasyStore 匯入商品時的幣別轉換規則',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'easyStoreCurrency',
                      type: 'select',
                      label: 'EasyStore 商品幣別',
                      defaultValue: 'TWD',
                      options: [
                        { label: 'TWD 新台幣', value: 'TWD' },
                        { label: 'USD 美元', value: 'USD' },
                        { label: 'JPY 日圓', value: 'JPY' },
                        { label: 'CNY 人民幣', value: 'CNY' },
                        { label: 'HKD 港幣', value: 'HKD' },
                      ],
                      admin: {
                        width: '50%',
                        description: 'EasyStore 商品的原始幣別',
                      },
                    },
                    {
                      name: 'enableCurrencyConversion',
                      type: 'checkbox',
                      label: '啟用匯率轉換',
                      defaultValue: false,
                      admin: {
                        width: '50%',
                        description: '匯入時是否自動轉換幣別',
                      },
                    },
                  ],
                },
              ],
            },
            // 自定義匯率
            {
              type: 'collapsible',
              label: '自定義匯率設定',
              admin: {
                initCollapsed: true,
                description: '設定各幣別對網站預設幣別的匯率（用於匯入轉換）',
              },
              fields: [
                {
                  name: 'exchangeRates',
                  type: 'array',
                  label: '匯率列表',
                  labels: {
                    singular: '匯率',
                    plural: '匯率',
                  },
                  admin: {
                    description: '設定其他幣別轉換為預設幣別的匯率',
                  },
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        {
                          name: 'fromCurrency',
                          type: 'select',
                          label: '來源幣別',
                          required: true,
                          options: [
                            { label: 'USD 美元', value: 'USD' },
                            { label: 'JPY 日圓', value: 'JPY' },
                            { label: 'CNY 人民幣', value: 'CNY' },
                            { label: 'HKD 港幣', value: 'HKD' },
                            { label: 'TWD 新台幣', value: 'TWD' },
                          ],
                          admin: {
                            width: '40%',
                          },
                        },
                        {
                          name: 'rate',
                          type: 'number',
                          label: '匯率',
                          required: true,
                          min: 0,
                          admin: {
                            width: '30%',
                            step: 0.0001,
                            description: '1 單位 = ? 預設幣別',
                          },
                        },
                        {
                          name: 'lastUpdated',
                          type: 'date',
                          label: '更新日期',
                          admin: {
                            width: '30%',
                            date: {
                              displayFormat: 'yyyy-MM-dd',
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  name: 'exchangeRateNote',
                  type: 'textarea',
                  label: '匯率備註',
                  admin: {
                    description: '記錄匯率來源或注意事項',
                    placeholder: '例：匯率參考台灣銀行牌告匯率',
                  },
                },
              ],
            },
          ],
        },
      ],
    },

    // ====== 購物車與運費設定 ======
    {
      type: 'collapsible',
      label: '購物車與運費設定',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'cartSettings',
          type: 'group',
          label: '',
          fields: [
            // 免運門檻
            {
              type: 'row',
              fields: [
                {
                  name: 'freeShippingEnabled',
                  type: 'checkbox',
                  label: '啟用免運門檻',
                  defaultValue: true,
                  admin: {
                    width: '30%',
                  },
                },
                {
                  name: 'freeShippingThreshold',
                  type: 'number',
                  label: '免運門檻 (TWD)',
                  defaultValue: 3000,
                  min: 0,
                  admin: {
                    width: '35%',
                    condition: (data) => data?.cartSettings?.freeShippingEnabled,
                    description: '消費滿此金額享免運',
                  },
                },
                {
                  name: 'defaultShippingFee',
                  type: 'number',
                  label: '基本運費 (TWD)',
                  defaultValue: 60,
                  min: 0,
                  admin: {
                    width: '35%',
                    description: '未達免運門檻時的運費',
                  },
                },
              ],
            },
            // 免運提示文字
            {
              name: 'freeShippingMessage',
              type: 'text',
              label: '即將免運提示',
              defaultValue: '再買 {amount} 即可免運！',
              admin: {
                condition: (data) => data?.cartSettings?.freeShippingEnabled,
                description: '使用 {amount} 代表剩餘金額',
              },
            },
            {
              name: 'freeShippingAchievedMessage',
              type: 'text',
              label: '已達免運提示',
              defaultValue: '🎉 恭喜！您已符合免運資格',
              admin: {
                condition: (data) => data?.cartSettings?.freeShippingEnabled,
              },
            },
            // 購物車空狀態
            {
              type: 'collapsible',
              label: '購物車空狀態設定',
              admin: {
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'emptyCartTitle',
                  type: 'text',
                  label: '空購物車標題',
                  defaultValue: '購物車內沒有商品',
                },
                {
                  name: 'emptyCartButtonText',
                  type: 'text',
                  label: '繼續購物按鈕文字',
                  defaultValue: '繼續購物',
                },
                {
                  name: 'showRecentlyViewed',
                  type: 'checkbox',
                  label: '顯示最近瀏覽商品',
                  defaultValue: true,
                },
                {
                  name: 'recentlyViewedTitle',
                  type: 'text',
                  label: '最近瀏覽區塊標題',
                  defaultValue: '您最近瀏覽的商品',
                  admin: {
                    condition: (data) => data?.cartSettings?.showRecentlyViewed,
                  },
                },
              ],
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

    // ====== 點數系統設定 ======
    {
      type: 'collapsible',
      label: '點數系統設定',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'loyaltyPoints',
          type: 'group',
          label: '',
          fields: [
            // === 基本設定 ===
            {
              type: 'row',
              fields: [
                {
                  name: 'enabled',
                  type: 'checkbox',
                  label: '啟用點數系統',
                  defaultValue: true,
                  admin: {
                    width: '100%',
                    description: '關閉後，系統將不再累積或折抵點數',
                  },
                },
              ],
            },
            // === 點數匯率 ===
            {
              type: 'row',
              admin: {
                condition: (data) => data?.loyaltyPoints?.enabled,
              },
              fields: [
                {
                  name: 'pointsPerAmount',
                  type: 'number',
                  label: '消費金額 (TWD)',
                  defaultValue: 100,
                  min: 1,
                  admin: {
                    width: '50%',
                    description: '每消費多少元',
                  },
                },
                {
                  name: 'pointsEarned',
                  type: 'number',
                  label: '獲得點數',
                  defaultValue: 1,
                  min: 1,
                  admin: {
                    width: '50%',
                    description: '可獲得幾點（正價商品）',
                  },
                },
              ],
            },
            // === 點數折抵 ===
            {
              type: 'row',
              admin: {
                condition: (data) => data?.loyaltyPoints?.enabled,
              },
              fields: [
                {
                  name: 'pointValue',
                  type: 'number',
                  label: '1 點可折抵 (TWD)',
                  defaultValue: 1,
                  min: 0.1,
                  admin: {
                    width: '50%',
                    step: 0.1,
                    description: '例如：1 點 = 1 元',
                  },
                },
                {
                  name: 'minPointsToRedeem',
                  type: 'number',
                  label: '最低折抵點數',
                  defaultValue: 100,
                  min: 1,
                  admin: {
                    width: '50%',
                    description: '累積滿多少點才能開始折抵',
                  },
                },
              ],
            },
            // === 折扣商品規則 ===
            {
              name: 'discountProductRule',
              type: 'group',
              label: '折扣商品規則',
              admin: {
                condition: (data) => data?.loyaltyPoints?.enabled,
                description: '已打折商品的點數回饋規則（不受會員等級倍率加成）',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'fixedPercentage',
                      type: 'number',
                      label: '固定回饋 %',
                      defaultValue: 1,
                      min: 0,
                      max: 100,
                      admin: {
                        width: '50%',
                        description: '折扣商品的固定點數回饋比例',
                      },
                    },
                    {
                      name: 'applyCampaignMultiplier',
                      type: 'checkbox',
                      label: '活動期間加倍',
                      defaultValue: true,
                      admin: {
                        width: '50%',
                        description: '例如：3 倍活動期間，折扣商品為 3%',
                      },
                    },
                  ],
                },
              ],
            },
            // === 點數活動 ===
            {
              name: 'campaign',
              type: 'group',
              label: '點數加倍活動',
              admin: {
                condition: (data) => data?.loyaltyPoints?.enabled,
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'enabled',
                      type: 'checkbox',
                      label: '啟用加倍活動',
                      defaultValue: false,
                      admin: {
                        width: '33%',
                      },
                    },
                    {
                      name: 'multiplier',
                      type: 'number',
                      label: '倍率',
                      defaultValue: 2,
                      min: 1,
                      max: 10,
                      admin: {
                        width: '33%',
                        condition: (data) => data?.loyaltyPoints?.campaign?.enabled,
                        description: '例如：2 = 雙倍點數',
                      },
                    },
                    {
                      name: 'name',
                      type: 'text',
                      label: '活動名稱',
                      admin: {
                        width: '33%',
                        condition: (data) => data?.loyaltyPoints?.campaign?.enabled,
                        placeholder: '週年慶三倍點數',
                      },
                    },
                  ],
                },
                {
                  type: 'row',
                  admin: {
                    condition: (data) => data?.loyaltyPoints?.campaign?.enabled,
                  },
                  fields: [
                    {
                      name: 'startDate',
                      type: 'date',
                      label: '開始日期',
                      admin: {
                        width: '50%',
                        date: {
                          displayFormat: 'yyyy-MM-dd',
                        },
                      },
                    },
                    {
                      name: 'endDate',
                      type: 'date',
                      label: '結束日期',
                      admin: {
                        width: '50%',
                        date: {
                          displayFormat: 'yyyy-MM-dd',
                        },
                      },
                    },
                  ],
                },
              ],
            },
            // === 進階設定 ===
            {
              name: 'advanced',
              type: 'group',
              label: '進階設定',
              admin: {
                condition: (data) => data?.loyaltyPoints?.enabled,
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'pointsExpireDays',
                      type: 'number',
                      label: '點數有效期 (天)',
                      defaultValue: 365,
                      min: 0,
                      admin: {
                        width: '50%',
                        description: '0 = 永不過期',
                      },
                    },
                    {
                      name: 'maxRedeemPercentage',
                      type: 'number',
                      label: '最高折抵 %',
                      defaultValue: 100,
                      min: 1,
                      max: 100,
                      admin: {
                        width: '50%',
                        description: '單筆訂單最多可折抵多少 % 金額',
                      },
                    },
                  ],
                },
                {
                  name: 'excludeShipping',
                  type: 'checkbox',
                  label: '運費不納入點數計算',
                  defaultValue: true,
                  admin: {
                    description: '勾選後，運費不會累積點數',
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
