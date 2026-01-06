import type { Metadata } from 'next'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

import { ForgotPasswordForm } from '@/components/forms/ForgotPasswordForm'

// 強制動態渲染，避免 Build 時嘗試連接資料庫
export const dynamic = 'force-dynamic'

export default async function ForgotPasswordPage() {
  return (
    <div className="container py-16">
      <ForgotPasswordForm />
    </div>
  )
}

export const metadata: Metadata = {
  description: 'Enter your email address to recover your password.',
  openGraph: mergeOpenGraph({
    title: 'Forgot Password',
    url: '/forgot-password',
  }),
  title: 'Forgot Password',
}
