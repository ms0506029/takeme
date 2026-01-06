import type { Metadata } from 'next'

import { FindOrderForm } from '@/components/forms/FindOrderForm'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'

// 強制動態渲染，避免 Build 時嘗試連接資料庫
export const dynamic = 'force-dynamic'

export default async function FindOrderPage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  return (
    <div className="container py-16">
      <FindOrderForm initialEmail={user?.email} />
    </div>
  )
}

export const metadata: Metadata = {
  description: 'Find your order with us using your email.',
  openGraph: mergeOpenGraph({
    title: 'Find order',
    url: '/find-order',
  }),
  title: 'Find order',
}
