import type { Metadata } from 'next'

import { RenderParams } from '@/components/RenderParams'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import { CreateAccountForm } from '@/components/forms/CreateAccountForm'
import { redirect } from 'next/navigation'

// 強制動態渲染，避免 Build 時嘗試連接資料庫
export const dynamic = 'force-dynamic'

export default async function CreateAccount() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (user) {
    redirect(`/account?warning=${encodeURIComponent('您已經登入了。')}`)
  }

  return (
    <div className="container py-16">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2">建立帳號</h1>
        <p className="text-gray-600 mb-8">
          建立帳號以追蹤訂單、收藏商品與享受會員專屬優惠。
        </p>
        <RenderParams />
        <CreateAccountForm />
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  description: '建立帳號以開始購物與管理您的訂單。',
  openGraph: mergeOpenGraph({
    title: '建立帳號 | Daytona Park',
    url: '/create-account',
  }),
  title: '建立帳號 | Daytona Park',
}

