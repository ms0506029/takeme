'use client'

import { LineLoginButton } from '@/components/auth/LineLoginButton'
import { FormError } from '@/components/forms/FormError'
import { FormItem } from '@/components/forms/FormItem'
import { Message } from '@/components/Message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/Auth'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

type FormData = {
  email: string
  password: string
}

export const LoginForm: React.FC = () => {
  const searchParams = useSearchParams()
  const allParams = searchParams.toString() ? `?${searchParams.toString()}` : ''
  const redirect = useRef(searchParams.get('redirect'))
  const { login } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<null | string>(null)
  const [loading, setLoading] = useState(false)

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<FormData>()

  const onSubmit = useCallback(
    async (data: FormData) => {
      setLoading(true)
      setError(null)

      try {
        await login(data)
        if (redirect?.current) {
          router.push(redirect.current)
        } else {
          router.push('/account')
        }
      } catch (_) {
        setError('登入資訊有誤，請確認您的電子郵件和密碼是否正確。')
        setLoading(false)
      }
    },
    [login, router],
  )

  return (
    <div className="space-y-6">
      {/* LINE Login 區塊 */}
      <div className="space-y-4">
        <LineLoginButton text="使用 LINE 帳號登入" />
        <p className="text-center text-xs text-gray-500">
          快速登入，無需輸入密碼
        </p>
      </div>

      {/* 分隔線 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-gray-500">或使用電子郵件登入</span>
        </div>
      </div>

      {/* Email 登入表單 */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Message error={error} />

        <div className="flex flex-col gap-5 mb-4">
          <FormItem>
            <Label htmlFor="email" className="mb-2 text-sm font-medium">
              電子郵件
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="請輸入您的 Email"
              className="h-12"
              {...register('email', { required: '請輸入電子郵件。' })}
            />
            {errors.email && <FormError message={errors.email.message} />}
          </FormItem>

          <FormItem>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="password" className="text-sm font-medium">
                密碼
              </Label>
              <Link
                href={`/forgot-password${allParams}`}
                className="text-xs text-gray-500 hover:text-[#C9925E] transition-colors"
              >
                忘記密碼？
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="請輸入密碼"
              className="h-12"
              {...register('password', { required: '請輸入密碼。' })}
            />
            {errors.password && <FormError message={errors.password.message} />}
          </FormItem>
        </div>

        <div className="flex flex-col gap-3 mt-6">
          <Button
            type="submit"
            variant="default"
            size="lg"
            className="w-full h-12 text-base font-medium"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                登入中...
              </span>
            ) : (
              '登入'
            )}
          </Button>

          <Button asChild variant="outline" size="lg" className="w-full h-12 text-base">
            <Link href={`/create-account${allParams}`}>建立新帳號</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
