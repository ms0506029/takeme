import type { Metadata } from 'next'

import { RenderParams } from '@/components/RenderParams'

import { LoginForm } from '@/components/forms/LoginForm'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

// 強制動態渲染，避免 Build 時嘗試連接資料庫
export const dynamic = 'force-dynamic'

export default async function Login() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (user) {
    redirect(`/account?warning=${encodeURIComponent('您已經登入了。')}`)
  }

  return (
    <div className="container">
      <div className="max-w-md mx-auto my-12">
        <RenderParams />

        <h1 className="mb-2 text-2xl font-bold">登入帳號</h1>
        <p className="mb-8 text-gray-600">
          登入以查看訂單、管理會員資料與更多功能。
        </p>
        <LoginForm />
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  description: '登入您的帳號以管理訂單與會員資料。',
  openGraph: {
    title: '登入 | Daytona Park',
    url: '/login',
  },
  title: '登入 | Daytona Park',
}

