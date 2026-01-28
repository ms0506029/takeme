'use client'

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
  password: string
  passwordConfirm: string
}

export const RecoverPasswordForm: React.FC = () => {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const { resetPassword } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

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
      if (!token) {
        setError('重設密碼連結無效或已過期，請重新申請。')
        return
      }

      setLoading(true)
      setError(null)

      try {
        await resetPassword({
          password: data.password,
          passwordConfirm: data.passwordConfirm,
          token,
        })
        setSuccess(true)
        // 3 秒後自動跳轉到登入頁面
        setTimeout(() => {
          router.push('/login?success=' + encodeURIComponent('密碼重設成功，請使用新密碼登入。'))
        }, 3000)
      } catch (err) {
        setError('密碼重設失敗，連結可能已過期。請重新申請重設密碼。')
      } finally {
        setLoading(false)
      }
    },
    [resetPassword, token, router],
  )

  // 如果沒有 token，顯示錯誤訊息
  if (!token) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">連結無效</h1>
          <p className="text-gray-600 mb-6">
            重設密碼連結無效或已過期。請重新申請重設密碼。
          </p>
        </div>
        <Button asChild variant="default" size="lg" className="w-full">
          <Link href="/forgot-password">重新申請重設密碼</Link>
        </Button>
        <div className="mt-4">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">
            返回登入頁面
          </Link>
        </div>
      </div>
    )
  }

  // 成功畫面
  if (success) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
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
          <h1 className="text-2xl font-bold mb-2">密碼重設成功</h1>
          <p className="text-gray-600 mb-6">
            您的密碼已成功重設。即將自動跳轉至登入頁面...
          </p>
        </div>
        <Button asChild variant="default" size="lg" className="w-full">
          <Link href="/login">立即登入</Link>
        </Button>
      </div>
    )
  }

  // 重設密碼表單
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-2">重設密碼</h1>
      <p className="text-gray-600 mb-8">請輸入您的新密碼。</p>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Message error={error} />

        <div className="flex flex-col gap-6 mb-6">
          <FormItem>
            <Label htmlFor="password" className="mb-2">
              新密碼
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="請輸入新密碼"
              {...register('password', {
                required: '請輸入新密碼。',
                minLength: {
                  value: 8,
                  message: '密碼至少需要 8 個字元。',
                },
              })}
            />
            {errors.password && <FormError message={errors.password.message} />}
          </FormItem>

          <FormItem>
            <Label htmlFor="passwordConfirm" className="mb-2">
              確認新密碼
            </Label>
            <Input
              id="passwordConfirm"
              type="password"
              placeholder="請再次輸入新密碼"
              {...register('passwordConfirm', {
                required: '請再次輸入新密碼。',
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
          className="w-full"
          disabled={loading}
        >
          {loading ? '處理中...' : '重設密碼'}
        </Button>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">
            返回登入頁面
          </Link>
        </div>
      </form>
    </div>
  )
}
