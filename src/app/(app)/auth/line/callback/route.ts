import { handleLINECallback } from '@/lib/auth/line-auth'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * LINE Login Callback
 * Phase 7.3.2 - 處理 LINE OAuth 回調
 * 
 * GET /auth/line/callback
 * LINE 授權後會重導向到此頁面
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
    // 處理 LINE 錯誤回應
    if (error) {
      console.error('LINE Login error:', error, errorDescription)
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent(errorDescription || error)}`, request.url)
      )
    }
    
    // 驗證必要參數
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/auth/error?message=missing_params', request.url)
      )
    }
    
    // 驗證 state（防止 CSRF）
    const cookieStore = await cookies()
    const savedState = cookieStore.get('line_auth_state')?.value
    const returnTo = cookieStore.get('line_auth_return')?.value || '/'
    
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        new URL('/auth/error?message=invalid_state', request.url)
      )
    }
    
    // 清除使用過的 cookies
    cookieStore.delete('line_auth_state')
    cookieStore.delete('line_auth_return')
    
    // 處理 LINE 回調
    const result = await handleLINECallback(code)
    
    if (!result.success) {
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent(result.error || 'login_failed')}`, request.url)
      )
    }
    
    // 設定 Payload 認證 token
    if (result.token) {
      cookieStore.set('payload-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 14, // 14 天
      })
    }
    
    // 重導向到原始頁面
    const redirectUrl = new URL(returnTo, request.url)
    
    // 如果是新用戶，可能需要完成註冊資料
    if (result.isNewUser) {
      redirectUrl.searchParams.set('welcome', 'true')
    }
    
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('LINE callback error:', error)
    return NextResponse.redirect(
      new URL('/auth/error?message=callback_failed', request.url)
    )
  }
}
