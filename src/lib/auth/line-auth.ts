/**
 * LINE Login Authentication Service
 * Phase 7.3.2 - LINE Login 整合
 * 
 * 使用 LINE Login v2.1 API 進行 OAuth 認證
 * 
 * 環境變數：
 * - LINE_LOGIN_CHANNEL_ID
 * - LINE_LOGIN_CHANNEL_SECRET
 * - NEXT_PUBLIC_SERVER_URL
 */

import configPromise from '@payload-config'
import { getPayload } from 'payload'

// LINE API URLs
const LINE_AUTH_URL = 'https://access.line.me/oauth2/v2.1/authorize'
const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token'
const LINE_PROFILE_URL = 'https://api.line.me/v2/profile'
const LINE_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify'

// ===== 類型定義 =====

export interface LINETokenResponse {
  access_token: string
  expires_in: number
  id_token?: string
  refresh_token?: string
  scope: string
  token_type: string
}

export interface LINEProfile {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

export interface LINEIDToken {
  iss: string
  sub: string  // LINE User ID
  aud: string
  exp: number
  iat: number
  nonce?: string
  amr?: string[]
  name?: string
  picture?: string
  email?: string
}

export interface LINELoginResult {
  success: boolean
  user?: {
    id: string
    email: string
    name: string
    lineUserId: string
  }
  isNewUser?: boolean
  token?: string
  error?: string
}

// ===== 認證 URL 生成 =====

/**
 * 生成 LINE Login 授權 URL
 */
export function generateLINEAuthURL(state: string, nonce?: string): string {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_SERVER_URL}/auth/line/callback`
  
  if (!channelId) {
    throw new Error('Missing LINE_LOGIN_CHANNEL_ID')
  }
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: 'profile openid email',
    ...(nonce && { nonce }),
  })
  
  return `${LINE_AUTH_URL}?${params.toString()}`
}

// ===== Token 交換 =====

/**
 * 用授權碼換取 Access Token
 */
export async function exchangeLINEToken(code: string): Promise<LINETokenResponse> {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_SERVER_URL}/auth/line/callback`
  
  if (!channelId || !channelSecret) {
    throw new Error('Missing LINE Login credentials')
  }
  
  const response = await fetch(LINE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(`LINE token exchange failed: ${error.error_description || error.error}`)
  }
  
  return response.json()
}

// ===== 取得使用者資料 =====

/**
 * 使用 Access Token 取得 LINE Profile
 */
export async function getLINEProfile(accessToken: string): Promise<LINEProfile> {
  const response = await fetch(LINE_PROFILE_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  
  if (!response.ok) {
    throw new Error('Failed to get LINE profile')
  }
  
  return response.json()
}

/**
 * 解析 ID Token 取得用戶資訊（含 email）
 */
export function parseIDToken(idToken: string): LINEIDToken {
  const parts = idToken.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid ID token format')
  }
  
  const payload = Buffer.from(parts[1], 'base64').toString('utf-8')
  return JSON.parse(payload)
}

// ===== 使用者登入/註冊 =====

/**
 * 處理 LINE Login 回調
 * - 如果用戶已存在（by lineUserId 或 email），則登入
 * - 如果用戶不存在，則創建新用戶
 */
export async function handleLINECallback(code: string): Promise<LINELoginResult> {
  try {
    // 1. 換取 token
    const tokenData = await exchangeLINEToken(code)
    
    // 2. 取得用戶資料
    const profile = await getLINEProfile(tokenData.access_token)
    
    // 3. 嘗試從 ID Token 取得 email
    let email: string | undefined
    let name = profile.displayName
    
    if (tokenData.id_token) {
      try {
        const idTokenData = parseIDToken(tokenData.id_token)
        email = idTokenData.email
        if (idTokenData.name) name = idTokenData.name
      } catch (e) {
        console.warn('Failed to parse ID token:', e)
      }
    }
    
    // 4. 查找或建立用戶
    const payload = await getPayload({ config: configPromise })
    
    // 先用 lineUserId 查找
    let existingUser = await payload.find({
      collection: 'users',
      where: { lineUserId: { equals: profile.userId } },
      limit: 1,
    })
    
    // 如果沒找到，用 email 查找（如果有 email）
    if (existingUser.docs.length === 0 && email) {
      existingUser = await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
      })
    }
    
    let user: any
    let isNewUser = false
    
    if (existingUser.docs.length > 0) {
      // 更新現有用戶的 LINE 資訊
      user = await payload.update({
        collection: 'users',
        id: existingUser.docs[0].id,
        data: {
          lineUserId: profile.userId,
          // 如果沒有名字，用 LINE 的名字
          ...(existingUser.docs[0].name ? {} : { name }),
        },
      })
    } else {
      // 創建新用戶
      if (!email) {
        // LINE 沒有提供 email，需要生成一個臨時的
        email = `line_${profile.userId}@placeholder.local`
      }
      
      user = await payload.create({
        collection: 'users',
        data: {
          email,
          password: generateRandomPassword(),
          name,
          lineUserId: profile.userId,
          roles: ['customer'],
          memberLevel: 'bronze',
        },
      })
      isNewUser = true
    }
    
    // 5. 生成 Payload 登入 token
    const loginResult = await payload.login({
      collection: 'users',
      data: {
        email: user.email,
      },
    })
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || profile.displayName,
        lineUserId: profile.userId,
      },
      isNewUser,
      token: loginResult.token,
    }
  } catch (error) {
    console.error('LINE Login error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'LINE Login failed',
    }
  }
}

// ===== 工具函式 =====

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 24; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
