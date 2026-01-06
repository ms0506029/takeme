import type { ReactNode } from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/components/Footer'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { ScrapbookHeader } from '@/components/scrapbook'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
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

export default async function RootLayout({ children }: { children: ReactNode }) {
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
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        <Providers>
          <AdminBar />
          <LivePreviewListener />

          <ScrapbookHeader />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
