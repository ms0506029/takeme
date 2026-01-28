'use client'

import { FormError } from '@/components/forms/FormError'
import { FormItem } from '@/components/forms/FormItem'
import { Message } from '@/components/Message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import React, { Fragment, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'

type FormData = {
  email: string
}

export const ForgotPasswordForm: React.FC = () => {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<FormData>()

  const onSubmit = useCallback(async (data: FormData) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/forgot-password`,
        {
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        },
      )

      if (response.ok) {
        setSuccess(true)
      } else {
        setError('發送重設密碼郵件時發生錯誤，請稍後再試。')
      }
    } catch (err) {
      setError('發送重設密碼郵件時發生錯誤，請稍後再試。')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <Fragment>
      {!success && (
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-2">忘記密碼</h1>
          <p className="text-gray-600 mb-8">
            請輸入您註冊時使用的電子郵件地址，我們將發送重設密碼的連結給您。
          </p>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Message className="mb-6" error={error} />

            <FormItem className="mb-6">
              <Label htmlFor="email" className="mb-2">
                電子郵件
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="請輸入您的 Email"
                {...register('email', { required: '請輸入電子郵件。' })}
              />
              {errors.email && <FormError message={errors.email.message} />}
            </FormItem>

            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? '發送中...' : '發送重設連結'}
            </Button>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">
                返回登入頁面
              </Link>
            </div>
          </form>
        </div>
      )}

      {success && (
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">郵件已發送</h1>
            <p className="text-gray-600">
              如果該電子郵件已註冊帳號，您將收到一封包含重設密碼連結的郵件。
              請檢查您的收件匣（或垃圾郵件資料夾）。
            </p>
          </div>

          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/login">返回登入頁面</Link>
          </Button>
        </div>
      )}
    </Fragment>
  )
}
