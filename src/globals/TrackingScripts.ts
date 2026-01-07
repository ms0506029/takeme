import type { GlobalConfig } from 'payload'

/**
 * TrackingScripts Global
 * 
 * 第三方追蹤碼集中管理，讓行銷人員可自行修改：
 * - Google Tag Manager
 * - Meta Pixel
 * - Hotjar
 * - 自訂 Script (Head / Body)
 */
export const TrackingScripts: GlobalConfig = {
  slug: 'trackingScripts',
  label: '追蹤碼管理',
  admin: {
    group: '設定',
    description: '管理第三方追蹤碼，修改後前台會自動套用',
  },
  access: {
    read: () => true,
  },
  fields: [
    // ====== Google Tag Manager ======
    {
      type: 'collapsible',
      label: 'Google Tag Manager',
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          name: 'gtmEnabled',
          type: 'checkbox',
          label: '啟用 GTM',
          defaultValue: false,
        },
        {
          name: 'gtmId',
          type: 'text',
          label: 'GTM Container ID',
          admin: {
            placeholder: 'GTM-XXXXXXX',
            description: '格式: GTM-XXXXXXX',
            condition: (data) => data?.gtmEnabled,
          },
        },
      ],
    },

    // ====== Meta Pixel ======
    {
      type: 'collapsible',
      label: 'Meta Pixel (Facebook)',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'metaPixelEnabled',
          type: 'checkbox',
          label: '啟用 Meta Pixel',
          defaultValue: false,
        },
        {
          name: 'metaPixelId',
          type: 'text',
          label: 'Pixel ID',
          admin: {
            placeholder: '1234567890',
            description: '15-16 位數字 ID',
            condition: (data) => data?.metaPixelEnabled,
          },
        },
        {
          name: 'metaAccessToken',
          type: 'text',
          label: 'Conversions API Access Token',
          admin: {
            description: '用於伺服器端事件傳送 (CAPI)',
            condition: (data) => data?.metaPixelEnabled,
          },
        },
      ],
    },

    // ====== Google Analytics 4 ======
    {
      type: 'collapsible',
      label: 'Google Analytics 4',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'ga4Enabled',
          type: 'checkbox',
          label: '啟用 GA4',
          defaultValue: false,
        },
        {
          name: 'ga4MeasurementId',
          type: 'text',
          label: 'Measurement ID',
          admin: {
            placeholder: 'G-XXXXXXXXXX',
            description: '格式: G-XXXXXXXXXX',
            condition: (data) => data?.ga4Enabled,
          },
        },
      ],
    },

    // ====== Hotjar ======
    {
      type: 'collapsible',
      label: 'Hotjar',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'hotjarEnabled',
          type: 'checkbox',
          label: '啟用 Hotjar',
          defaultValue: false,
        },
        {
          name: 'hotjarId',
          type: 'text',
          label: 'Hotjar Site ID',
          admin: {
            placeholder: '1234567',
            condition: (data) => data?.hotjarEnabled,
          },
        },
      ],
    },

    // ====== 自訂 Script ======
    {
      type: 'collapsible',
      label: '自訂 Script',
      admin: {
        initCollapsed: true,
        description: '進階：直接注入自訂 HTML/Script',
      },
      fields: [
        {
          name: 'customHeadScript',
          type: 'code',
          label: 'Head 區塊 Script',
          admin: {
            language: 'html',
            description: '注入至 <head> 標籤內',
          },
        },
        {
          name: 'customBodyScript',
          type: 'code',
          label: 'Body 區塊 Script',
          admin: {
            language: 'html',
            description: '注入至 </body> 前',
          },
        },
      ],
    },
  ],
}
