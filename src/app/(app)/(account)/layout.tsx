import type { ReactNode } from 'react'

import { AccountNav } from '@/components/AccountNav'
import { RenderParams } from '@/components/RenderParams'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'

// 強制動態渲染，避免 Build 時嘗試連接資料庫
export const dynamic = 'force-dynamic'

export default async function RootLayout({ children }: { children: ReactNode }) {
  let user = null
  
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const authResult = await payload.auth({ headers })
    user = authResult.user
  } catch (error) {
    // Build 階段可能無法連接資料庫，忽略錯誤
    console.warn('[AccountLayout] Failed to authenticate - Database may not be available during build')
  }

  return (
    <div>
      <div className="container">
        <RenderParams className="" />
      </div>

      <div className="container mt-16 pb-8 flex gap-8">
        {user && (
          <AccountNav className="max-w-[15.5rem] grow flex-col items-start gap-4 hidden md:flex" />
        )}

        <div className="flex flex-col gap-12 grow">{children}</div>
      </div>
    </div>
  )
}
