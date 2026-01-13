import { generateLINEAuthURL } from '@/lib/auth/line-auth'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * LINE Login Initiation
 * Phase 7.3.2 - 啟動 LINE Login 流程
 * 
 * GET /auth/line
 * 重導向用戶到 LINE 授權頁面
 */

export async function GET(request: NextRequest) {
  try {
    // 生成 state 用於防止 CSRF
    const state = generateState()
    
    // 取得來源頁面（用於登入後重導向）
    const { searchParams } = new URL(request.url)
    const returnTo = searchParams.get('returnTo') || '/'
    
    // 儲存 state 和 returnTo 到 cookie
    const cookieStore = await cookies()
    cookieStore.set('line_auth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 分鐘
    })
    cookieStore.set('line_auth_return', returnTo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
    })
    
    // 生成 LINE 授權 URL
    const authUrl = generateLINEAuthURL(state)
    
    // 重導向
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('LINE Login initiation error:', error)
    return NextResponse.redirect(new URL('/auth/error?message=line_init_failed', request.url))
  }
}

function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}
