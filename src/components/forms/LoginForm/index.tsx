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
import React, { useCallback, useRef } from 'react'
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
  const [error, setError] = React.useState<null | string>(null)

  const {
    formState: { errors, isLoading },
    handleSubmit,
    register,
  } = useForm<FormData>()

  const onSubmit = useCallback(
    async (data: FormData) => {
      try {
        await login(data)
        if (redirect?.current) router.push(redirect.current)
        else router.push('/account')
      } catch (_) {
        setError('登入資訊有誤，請重新確認您的帳號密碼。')
      }
    },
    [login, router],
  )

  return (
    <div className="space-y-6">
      {/* LINE Login 區塊 */}
      <div className="space-y-4">
        <LineLoginButton text="使用 LINE 帳號登入" />
      </div>

      {/* 分隔線 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-gray-500">或使用電子郵件登入</span>
        </div>
      </div>

      {/* Email 登入表單 */}
      <form className="" onSubmit={handleSubmit(onSubmit)}>
        <Message className="classes.message" error={error} />
        <div className="flex flex-col gap-6">
          <FormItem>
            <Label htmlFor="email">電子郵件</Label>
            <Input
              id="email"
              type="email"
              placeholder="請輸入您的 Email"
              {...register('email', { required: '請輸入電子郵件。' })}
            />
            {errors.email && <FormError message={errors.email.message} />}
          </FormItem>

          <FormItem>
            <Label htmlFor="password">密碼</Label>
            <Input
              id="password"
              type="password"
              placeholder="請輸入密碼"
              {...register('password', { required: '請輸入密碼。' })}
            />
            {errors.password && <FormError message={errors.password.message} />}
          </FormItem>

          <div className="text-primary/70 prose prose-a:hover:text-primary dark:prose-invert">
            <p className="text-sm">
              忘記密碼？{' '}
              <Link href={`/recover-password${allParams}`}>點此重設</Link>
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-between mt-6">
          <Button asChild variant="outline" size="lg">
            <Link href={`/create-account${allParams}`} className="grow max-w-[50%]">
              建立帳號
            </Link>
          </Button>
          <Button className="grow" disabled={isLoading} size="lg" type="submit" variant="default">
            {isLoading ? '處理中...' : '登入'}
          </Button>
        </div>
      </form>
    </div>
  )
}

