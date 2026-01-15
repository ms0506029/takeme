import type { ReactNode } from 'react'

import { AdminBar } from '@/components/AdminBar'
import { AnnouncementBar } from '@/components/AnnouncementBar'
import { Footer } from '@/components/Footer'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { TrackingScriptsComponent } from '@/components/TrackingScripts'
import { ScrapbookHeader } from '@/components/scrapbook'
import { generateCSSVariables, getSiteSettings, getTrackingScripts } from '@/lib/globals'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
// Scrapbook Design System: Google Fonts
import { Lexend, Patrick_Hand } from 'next/font/google'
import './globals.css'

// Scrapbook: 標題字體
const lexend = Lexend({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-lexend',
  display: 'swap',
})

// Scrapbook: 手寫內文字體
const patrickHand = Patrick_Hand({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-patrick-hand',
  display: 'swap',
})

// 強制動態渲染，避免 Build 時嘗試連接資料庫
export const dynamic = 'force-dynamic'

/**
 * 動態生成 Metadata
 * 根據後台 SiteSettings 設定生成 SEO 資訊
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  
  return {
    title: {
      default: settings.seo?.defaultTitle || settings.siteName || 'Daytona Park',
      template: `%s | ${settings.siteName || 'Daytona Park'}`,
    },
    description: settings.seo?.defaultDescription || '日本直送・獨家設計・限量發售',
    openGraph: {
      title: settings.seo?.defaultTitle || settings.siteName,
      description: settings.seo?.defaultDescription,
      images: settings.seo?.ogImage?.url ? [settings.seo.ogImage.url] : [],
      siteName: settings.siteName,
    },
    icons: {
      icon: settings.favicon?.url || '/favicon.ico',
    },
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // 從 Payload 取得設定
  const [siteSettings, trackingScripts] = await Promise.all([
    getSiteSettings(),
    getTrackingScripts(),
  ])
  
  // 生成 CSS Variables
  const cssVariables = generateCSSVariables(siteSettings.brandColors)
  
  return (
    <html
      className={[
        GeistSans.variable,
        GeistMono.variable,
        lexend.variable,
        patrickHand.variable,
      ]
        .filter(Boolean)
        .join(' ')}
      lang="zh-TW"
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        {/* 動態 CSS Variables */}
        {cssVariables && (
          <style dangerouslySetInnerHTML={{ __html: cssVariables }} />
        )}
        {/* Favicon from SiteSettings */}
        <link 
          href={siteSettings.favicon?.url || '/favicon.ico'} 
          rel="icon" 
          sizes="32x32" 
        />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
        {/* 第三方追蹤碼 (置於 head 以利 Search Console 驗證) */}
        <TrackingScriptsComponent scripts={trackingScripts} />
      </head>
      <body>
        <Providers>
          <AdminBar />
          <LivePreviewListener />
          
          {/* 頂部公告列 */}
          <AnnouncementBar settings={siteSettings.announcementBar} />

          <ScrapbookHeader siteName={siteSettings.siteName} />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
