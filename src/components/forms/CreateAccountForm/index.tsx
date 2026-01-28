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
  passwordConfirm: string
}

export const CreateAccountForm: React.FC = () => {
  const searchParams = useSearchParams()
  const allParams = searchParams.toString() ? `?${searchParams.toString()}` : ''
  const { login } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<null | string>(null)

  const {
    formState: { errors },
    handleSubmit,
    register,
    watch,
  } = useForm<FormData>()

  const password = useRef({})
  password.current = watch('password', '')

  const onSubmit = useCallback(
    async (data: FormData) => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users`, {
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        })

        if (!response.ok) {
          const result = await response.json()
          if (result.errors?.[0]?.message?.includes('already')) {
            setError('此電子郵件已被註冊，請使用其他郵件或直接登入。')
          } else {
            setError('建立帳號時發生錯誤，請稍後再試。')
          }
          setLoading(false)
          return
        }

        const redirect = searchParams.get('redirect')

        await login(data)
        if (redirect) {
          router.push(redirect)
        } else {
          router.push(`/account?success=${encodeURIComponent('帳號建立成功！歡迎加入會員。')}`)
        }
      } catch (err) {
        setError('建立帳號時發生錯誤，請稍後再試。')
        setLoading(false)
      }
    },
    [login, router, searchParams],
  )

  return (
    <div className="space-y-6">
      {/* LINE 快速註冊 */}
      <div className="space-y-4">
        <LineLoginButton text="使用 LINE 帳號快速註冊" />
        <p className="text-center text-xs text-gray-500">
          使用 LINE 註冊可快速完成，無需設定密碼
        </p>
      </div>

      {/* 分隔線 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-gray-500">或使用電子郵件註冊</span>
        </div>
      </div>

      {/* Email 註冊表單 */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Message error={error} />

        <div className="flex flex-col gap-5 mb-6">
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
              {...register('email', {
                required: '請輸入電子郵件。',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: '請輸入有效的電子郵件格式。',
                },
              })}
            />
            {errors.email && <FormError message={errors.email.message} />}
          </FormItem>

          <FormItem>
            <Label htmlFor="password" className="mb-2 text-sm font-medium">
              密碼
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="請設定密碼（至少 8 個字元）"
              className="h-12"
              {...register('password', {
                required: '請輸入密碼。',
                minLength: {
                  value: 8,
                  message: '密碼至少需要 8 個字元。',
                },
              })}
            />
            {errors.password && <FormError message={errors.password.message} />}
          </FormItem>

          <FormItem>
            <Label htmlFor="passwordConfirm" className="mb-2 text-sm font-medium">
              確認密碼
            </Label>
            <Input
              id="passwordConfirm"
              type="password"
              autoComplete="new-password"
              placeholder="請再次輸入密碼"
              className="h-12"
              {...register('passwordConfirm', {
                required: '請再次輸入密碼。',
                validate: (value) => value === password.current || '兩次輸入的密碼不相符',
              })}
            />
            {errors.passwordConfirm && <FormError message={errors.passwordConfirm.message} />}
          </FormItem>
        </div>

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
              建立中...
            </span>
          ) : (
            '建立帳號'
          )}
        </Button>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            已經有帳號了？{' '}
            <Link
              href={`/login${allParams}`}
              className="font-medium text-[#C9925E] hover:text-[#B8834D] transition-colors"
            >
              立即登入
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}
