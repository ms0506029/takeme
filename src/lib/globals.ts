import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

/**
 * SiteSettings 類型定義
 */
export interface SiteSettingsData {
  siteName: string
  mainLogo?: {
    url?: string
    alt?: string
  } | null
  favicon?: {
    url?: string
  } | null
  brandColors?: {
    primary?: string
    accent?: string
    background?: string
    text?: string
    textMuted?: string
    border?: string
  }
  seo?: {
    defaultTitle?: string
    defaultDescription?: string
    ogImage?: {
      url?: string
    } | null
  }
  announcementBar?: {
    enabled?: boolean
    text?: string
    link?: string
    backgroundColor?: string
    textColor?: string
  }
}

/**
 * TrackingScripts 類型定義
 */
export interface TrackingScriptsData {
  gtmEnabled?: boolean
  gtmId?: string
  metaPixelEnabled?: boolean
  metaPixelId?: string
  metaAccessToken?: string
  ga4Enabled?: boolean
  ga4MeasurementId?: string
  hotjarEnabled?: boolean
  hotjarId?: string
  customHeadScript?: string
  customBodyScript?: string
}

/**
 * 取得網站設定 (with cache)
 * 使用 unstable_cache 進行快取，避免每次 request 都查詢資料庫
 */
export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettingsData> => {
    try {
      const payload = await getPayload({ config })
      const settings = await payload.findGlobal({
        slug: 'siteSettings',
        depth: 1,
      })
      
      return {
        siteName: settings.siteName || 'Daytona Park',
        mainLogo: settings.mainLogo as SiteSettingsData['mainLogo'],
        favicon: settings.favicon as SiteSettingsData['favicon'],
        brandColors: settings.brandColors as SiteSettingsData['brandColors'],
        seo: {
          defaultTitle: settings.seo?.defaultTitle,
          defaultDescription: settings.seo?.defaultDescription,
          ogImage: settings.seo?.ogImage as SiteSettingsData['seo'],
        },
        announcementBar: settings.announcementBar as SiteSettingsData['announcementBar'],
      }
    } catch (error) {
      console.error('Failed to fetch SiteSettings:', error)
      // 返回預設值
      return {
        siteName: 'Daytona Park',
        brandColors: {
          primary: '#C9915D',
          accent: '#6B5844',
          background: '#FDF8F3',
          text: '#2D2A26',
          textMuted: '#6B6560',
          border: '#E5DED5',
        },
      }
    }
  },
  ['site-settings'],
  { revalidate: 60 } // 每 60 秒重新驗證
)

/**
 * 取得追蹤碼設定 (with cache)
 */
export const getTrackingScripts = unstable_cache(
  async (): Promise<TrackingScriptsData> => {
    try {
      const payload = await getPayload({ config })
      const scripts = await payload.findGlobal({
        slug: 'trackingScripts',
        depth: 0,
      })
      
      return {
        gtmEnabled: scripts.gtmEnabled ?? false,
        gtmId: scripts.gtmId ?? undefined,
        metaPixelEnabled: scripts.metaPixelEnabled ?? false,
        metaPixelId: scripts.metaPixelId ?? undefined,
        metaAccessToken: scripts.metaAccessToken ?? undefined,
        ga4Enabled: scripts.ga4Enabled ?? false,
        ga4MeasurementId: scripts.ga4MeasurementId ?? undefined,
        hotjarEnabled: scripts.hotjarEnabled ?? false,
        hotjarId: scripts.hotjarId ?? undefined,
        customHeadScript: scripts.customHeadScript ?? undefined,
        customBodyScript: scripts.customBodyScript ?? undefined,
      }
    } catch (error) {
      console.error('Failed to fetch TrackingScripts:', error)
      return {}
    }
  },
  ['tracking-scripts'],
  { revalidate: 60 }
)

/**
 * 生成 CSS Variables 字串
 */
export function generateCSSVariables(colors: SiteSettingsData['brandColors']): string {
  if (!colors) return ''
  
  return `
    :root {
      --brand-primary: ${colors.primary || '#C9915D'};
      --brand-accent: ${colors.accent || '#6B5844'};
      --brand-background: ${colors.background || '#FDF8F3'};
      --brand-text: ${colors.text || '#2D2A26'};
      --brand-text-muted: ${colors.textMuted || '#6B6560'};
      --brand-border: ${colors.border || '#E5DED5'};
    }
  `.trim()
}
