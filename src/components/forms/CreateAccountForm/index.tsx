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
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users`, {
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      if (!response.ok) {
        const message = response.statusText || '建立帳號時發生錯誤，請稍後再試。'
        setError(message)
        return
      }

      const redirect = searchParams.get('redirect')

      const timer = setTimeout(() => {
        setLoading(true)
      }, 1000)

      try {
        await login(data)
        clearTimeout(timer)
        if (redirect) router.push(redirect)
        else router.push(`/account?success=${encodeURIComponent('帳號建立成功！')}`)
      } catch (_) {
        clearTimeout(timer)
        setError('登入資訊有誤，請重新確認。')
      }
    },
    [login, router, searchParams],
  )

  return (
    <div className="max-w-lg space-y-6">
      {/* LINE 快速註冊 */}
      <div className="space-y-4">
        <LineLoginButton text="使用 LINE 帳號快速註冊" />
      </div>

      {/* 分隔線 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-gray-500">或使用電子郵件註冊</span>
        </div>
      </div>

      {/* Email 註冊表單 */}
      <form className="py-4" onSubmit={handleSubmit(onSubmit)}>
        <Message error={error} />

        <div className="flex flex-col gap-6 mb-6">
          <FormItem>
            <Label htmlFor="email" className="mb-2">
              電子郵件
            </Label>
            <Input
              id="email"
              {...register('email', { required: '請輸入電子郵件。' })}
              type="email"
              placeholder="請輸入您的 Email"
            />
            {errors.email && <FormError message={errors.email.message} />}
          </FormItem>

          <FormItem>
            <Label htmlFor="password" className="mb-2">
              密碼
            </Label>
            <Input
              id="password"
              {...register('password', { required: '請輸入密碼。' })}
              type="password"
              placeholder="請設定密碼"
            />
            {errors.password && <FormError message={errors.password.message} />}
          </FormItem>

          <FormItem>
            <Label htmlFor="passwordConfirm" className="mb-2">
              確認密碼
            </Label>
            <Input
              id="passwordConfirm"
              {...register('passwordConfirm', {
                required: '請再次輸入密碼。',
                validate: (value) => value === password.current || '兩次輸入的密碼不相符',
              })}
              type="password"
              placeholder="請再次輸入密碼"
            />
            {errors.passwordConfirm && <FormError message={errors.passwordConfirm.message} />}
          </FormItem>
        </div>

        <Button disabled={loading} type="submit" variant="default" className="w-full" size="lg">
          {loading ? '處理中...' : '建立帳號'}
        </Button>

        <div className="prose dark:prose-invert mt-6 text-center">
          <p className="text-sm">
            已經有帳號了？{' '}
            <Link href={`/login${allParams}`}>立即登入</Link>
          </p>
        </div>
      </form>
    </div>
  )
}

