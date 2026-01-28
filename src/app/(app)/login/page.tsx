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
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* 品牌區塊 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#C9925E]/10 mb-4">
            <svg
              className="w-8 h-8 text-[#C9925E]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">歡迎回來</h1>
          <p className="text-gray-600">登入以查看訂單、管理會員資料與更多功能</p>
        </div>

        <RenderParams />

        {/* 表單卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <LoginForm />
        </div>

        {/* 底部說明 */}
        <p className="mt-6 text-center text-xs text-gray-500">
          登入即表示您同意我們的服務條款與隱私權政策
        </p>
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

