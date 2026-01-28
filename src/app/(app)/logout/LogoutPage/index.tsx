'use client'

import { useAuth } from '@/providers/Auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

export const LogoutPage: React.FC = () => {
  const { logout } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout()
        setStatus('success')
      } catch (_) {
        setStatus('error')
      }
    }

    void performLogout()
  }, [logout])

  if (status === 'loading') {
    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <svg
            className="w-8 h-8 text-gray-400 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">登出中...</h1>
        <p className="text-gray-600">請稍候</p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <svg
            className="w-8 h-8 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {status === 'success' ? '已成功登出' : '您已經登出'}
        </h1>
        <p className="text-gray-600 mb-6">
          感謝您的使用，期待您再次光臨！
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button asChild variant="default" size="lg" className="w-full h-12 text-base">
          <Link href="/shop">繼續購物</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full h-12 text-base">
          <Link href="/login">重新登入</Link>
        </Button>
      </div>

      <p className="mt-6 text-sm text-gray-500">
        或返回{' '}
        <Link href="/" className="text-[#C9925E] hover:text-[#B8834D] transition-colors">
          首頁
        </Link>
      </p>
    </div>
  )
}
