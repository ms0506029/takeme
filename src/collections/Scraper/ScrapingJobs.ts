import type { CollectionConfig } from 'payload'

/**
 * ScrapingJobs Collection
 * 爬取任務
 *
 * 管理爬蟲任務的執行狀態，包含：
 * - 任務類型（深層/淺層）
 * - 來源 URL 和平台
 * - 執行狀態和進度
 * - 執行日誌
 */
export const ScrapingJobs: CollectionConfig = {
  slug: 'scraping-jobs',
  labels: {
    singular: '爬取任務',
    plural: '爬取任務',
  },
  admin: {
    group: '爬蟲系統',
    defaultColumns: ['platform', 'type', 'status', 'progress.productsFound', 'createdAt'],
    description: '管理爬蟲任務的執行',
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
          name: 'platform',
          type: 'relationship',
          relationTo: 'scraper-platforms',
          required: true,
          label: '目標平台',
          admin: {
            width: '50%',
          },
        },
        {
          name: 'type',
          type: 'select',
          label: '任務類型',
          required: true,
          defaultValue: 'deep',
          options: [
            { label: '深層爬取 (完整匯入)', value: 'deep' },
            { label: '淺層同步 (價格/庫存)', value: 'shallow' },
          ],
          admin: {
            width: '50%',
            description: '深層：完整資料；淺層：僅價格庫存',
          },
        },
      ],
    },
    {
      name: 'sourceUrl',
      type: 'text',
      label: '起始 URL',
      required: true,
      admin: {
        placeholder: 'https://www.daytona-park.com/itemlist?stock=1&sort=new',
        description: '列表頁或單一商品頁的 URL',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'urlType',
          type: 'select',
          label: 'URL 類型',
          options: [
            { label: '列表頁', value: 'listing' },
            { label: '單一商品', value: 'product' },
          ],
          admin: {
            width: '50%',
            readOnly: true,
            description: '自動偵測',
          },
        },
        {
          name: 'status',
          type: 'select',
          label: '狀態',
          defaultValue: 'pending',
          options: [
            { label: '等待中', value: 'pending' },
            { label: '執行中', value: 'running' },
            { label: '已暫停', value: 'paused' },
            { label: '已完成', value: 'completed' },
            { label: '失敗', value: 'failed' },
            { label: '已取消', value: 'cancelled' },
          ],
          admin: {
            width: '50%',
          },
        },
      ],
    },

    // ===== 進度追蹤 =====
    {
      type: 'collapsible',
      label: '執行進度',
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          name: 'progress',
          type: 'group',
          label: '',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'currentPage',
                  type: 'number',
                  label: '當前頁碼',
                  defaultValue: 0,
                  admin: { width: '25%', readOnly: true },
                },
                {
                  name: 'totalPages',
                  type: 'number',
                  label: '總頁數',
                  admin: { width: '25%', readOnly: true },
                },
                {
                  name: 'productsFound',
                  type: 'number',
                  label: '已發現商品',
                  defaultValue: 0,
                  admin: { width: '25%', readOnly: true },
                },
                {
                  name: 'productsProcessed',
                  type: 'number',
                  label: '已處理商品',
                  defaultValue: 0,
                  admin: { width: '25%', readOnly: true },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'productsImported',
                  type: 'number',
                  label: '已匯入商品',
                  defaultValue: 0,
                  admin: { width: '33%', readOnly: true },
                },
                {
                  name: 'productsSkipped',
                  type: 'number',
                  label: '已跳過商品',
                  defaultValue: 0,
                  admin: { width: '33%', readOnly: true },
                },
                {
                  name: 'errors',
                  type: 'number',
                  label: '錯誤數',
                  defaultValue: 0,
                  admin: { width: '34%', readOnly: true },
                },
              ],
            },
            {
              name: 'currentUrl',
              type: 'text',
              label: '當前處理 URL',
              admin: {
                readOnly: true,
                description: '正在處理的頁面 URL',
              },
            },
          ],
        },
      ],
    },

    // ===== 任務設定 =====
    {
      type: 'collapsible',
      label: '任務設定',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'config',
          type: 'group',
          label: '',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'maxPages',
                  type: 'number',
                  label: '最大頁數',
                  defaultValue: 0,
                  min: 0,
                  admin: {
                    width: '33%',
                    description: '0 = 無限制',
                  },
                },
                {
                  name: 'maxProducts',
                  type: 'number',
                  label: '最大商品數',
                  defaultValue: 0,
                  min: 0,
                  admin: {
                    width: '33%',
                    description: '0 = 無限制',
                  },
                },
                {
                  name: 'startPage',
                  type: 'number',
                  label: '起始頁碼',
                  defaultValue: 1,
                  min: 1,
                  admin: {
                    width: '34%',
                    description: '從第幾頁開始',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'excludeExisting',
                  type: 'checkbox',
                  label: '排除已存在商品',
                  defaultValue: true,
                  admin: {
                    width: '33%',
                    description: '跳過已匯入的商品',
                  },
                },
                {
                  name: 'autoImport',
                  type: 'checkbox',
                  label: '完成後自動匯入',
                  defaultValue: false,
                  admin: {
                    width: '33%',
                    description: '爬取完成後自動執行匯入',
                  },
                },
                {
                  name: 'downloadImages',
                  type: 'checkbox',
                  label: '下載圖片',
                  defaultValue: true,
                  admin: {
                    width: '34%',
                    description: '將圖片下載到 Media',
                  },
                },
              ],
            },
          ],
        },
      ],
    },

    // ===== 時間戳 =====
    {
      type: 'collapsible',
      label: '執行時間',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'startedAt',
              type: 'date',
              label: '開始時間',
              admin: {
                width: '50%',
                readOnly: true,
                date: { displayFormat: 'yyyy-MM-dd HH:mm:ss' },
              },
            },
            {
              name: 'completedAt',
              type: 'date',
              label: '完成時間',
              admin: {
                width: '50%',
                readOnly: true,
                date: { displayFormat: 'yyyy-MM-dd HH:mm:ss' },
              },
            },
          ],
        },
        {
          name: 'duration',
          type: 'number',
          label: '執行時長 (秒)',
          admin: {
            readOnly: true,
            description: '任務執行的總時長',
          },
        },
      ],
    },

    // ===== 執行日誌 =====
    {
      type: 'collapsible',
      label: '執行日誌',
      admin: {
        initCollapsed: true,
        description: '任務執行過程的詳細日誌',
      },
      fields: [
        {
          name: 'logs',
          type: 'array',
          label: '',
          admin: {
            readOnly: true,
          },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'timestamp',
                  type: 'date',
                  label: '時間',
                  admin: {
                    width: '25%',
                    date: { displayFormat: 'HH:mm:ss' },
                  },
                },
                {
                  name: 'level',
                  type: 'select',
                  label: '等級',
                  options: [
                    { label: 'Info', value: 'info' },
                    { label: 'Warn', value: 'warn' },
                    { label: 'Error', value: 'error' },
                    { label: 'Debug', value: 'debug' },
                  ],
                  admin: { width: '15%' },
                },
                {
                  name: 'message',
                  type: 'text',
                  label: '訊息',
                  admin: { width: '60%' },
                },
              ],
            },
            {
              name: 'data',
              type: 'json',
              label: '額外資料',
              admin: {
                condition: (siblingData) => !!siblingData?.data,
              },
            },
          ],
        },
      ],
    },

    // ===== 錯誤資訊 =====
    {
      name: 'errorMessage',
      type: 'textarea',
      label: '錯誤訊息',
      admin: {
        readOnly: true,
        condition: (data) => data?.status === 'failed',
        description: '任務失敗時的錯誤詳情',
      },
    },

    // ===== 建立者 =====
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: '建立者',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ req, value }) => {
            if (!value && req.user) {
              return req.user.id
            }
            return value
          },
        ],
      },
    },
  ],
}

export default ScrapingJobs
