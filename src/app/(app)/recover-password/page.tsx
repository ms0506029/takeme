import type { Metadata } from 'next'

import { RecoverPasswordForm } from '@/components/forms/RecoverPasswordForm'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

// 強制動態渲染，避免 Build 時嘗試連接資料庫
export const dynamic = 'force-dynamic'

export default async function RecoverPasswordPage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  // 已登入用戶重導向至帳戶頁面
  if (user) {
    redirect(`/account?warning=${encodeURIComponent('您已經登入了。如需修改密碼，請至帳戶設定。')}`)
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* 品牌區塊 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
        </div>

        {/* 表單卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <RecoverPasswordForm />
        </div>
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  description: '重設您的帳號密碼。',
  openGraph: mergeOpenGraph({
    title: '重設密碼 | Daytona Park',
    url: '/recover-password',
  }),
  title: '重設密碼 | Daytona Park',
}
