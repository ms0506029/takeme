import type { Metadata } from 'next'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

import { ForgotPasswordForm } from '@/components/forms/ForgotPasswordForm'

// 強制動態渲染，避免 Build 時嘗試連接資料庫
export const dynamic = 'force-dynamic'

export default async function ForgotPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* 品牌區塊 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
        </div>

        {/* 表單卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  description: '輸入您的電子郵件地址以重設密碼。',
  openGraph: mergeOpenGraph({
    title: '忘記密碼 | Daytona Park',
    url: '/forgot-password',
  }),
  title: '忘記密碼 | Daytona Park',
}
