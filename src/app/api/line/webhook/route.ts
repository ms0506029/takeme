import { FlexTemplates, LineService, USER_STATES, UserStateService } from '@/lib/line'
import configPromise from '@payload-config'
import * as crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * LINE Webhook API
 * LINE Webhook 端點
 * 
 * 處理 LINE 平台發送的事件：
 * - message: 文字訊息（Email 綁定流程）
 * - postback: 按鈕回調（缺貨回應、互動按鈕）
 * - follow: 用戶加入好友
 * - unfollow: 用戶封鎖
 */

// ===== 驗證 LINE 簽章 =====

function verifySignature(body: string, signature: string): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET
  if (!channelSecret) {
    console.error('[LINE Webhook] LINE_CHANNEL_SECRET not configured')
    return false
  }
  
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64')
  
  return hash === signature
}

// ===== 解析 Postback data =====

function parsePostbackData(data: string): Record<string, string> {
  const result: Record<string, string> = {}
  data.split('&').forEach(pair => {
    const [key, value] = pair.split('=')
    if (key && value) {
      result[key] = decodeURIComponent(value)
    }
  })
  return result
}

// ===== 事件處理器 =====

/**
 * 處理 Follow 事件（用戶加入好友）
 */
async function handleFollowEvent(event: any) {
  const userId = event.source.userId
  console.log(`[LINE Webhook] User followed: ${userId}`)
  
  // 發送歡迎訊息
  const welcomeMessage = FlexTemplates.memberBindingSuccess({
    memberName: '新朋友',
    email: '',
    discountCode: 'LINE100',
    shopUrl: process.env.NEXT_PUBLIC_SERVER_URL || 'https://www.takemejapan.com',
  })
  
  // 改為發送綁定選項
  const bindingOptions = {
    type: 'flex',
    altText: '歡迎加入！請綁定會員帳號',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FFF8E1',
        paddingAll: '15px',
        contents: [
          {
            type: 'text',
            text: '👋 歡迎加入 Take Me Japan！',
            weight: 'bold',
            size: 'lg',
            color: '#C9915D',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '綁定會員帳號即可：',
            weight: 'bold',
            margin: 'md',
          },
          {
            type: 'text',
            text: '✅ 查詢訂單物流狀態',
            size: 'sm',
            margin: 'sm',
          },
          {
            type: 'text',
            text: '✅ 獲得降價通知',
            size: 'sm',
            margin: 'sm',
          },
          {
            type: 'text',
            text: '✅ 領取專屬折扣碼',
            size: 'sm',
            margin: 'sm',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'message',
              label: '✅ 我已經是會員（輸入信箱綁定）',
              text: '輸入信箱綁定',
            },
            style: 'primary',
            color: '#C9915D',
          },
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '🆕 我還不是會員（立即註冊）',
              uri: `${process.env.NEXT_PUBLIC_SERVER_URL || 'https://www.takemejapan.com'}/account/register`,
            },
            margin: 'sm',
            style: 'secondary',
          },
        ],
      },
    },
  }
  
  await LineService.sendPush(userId, bindingOptions)
}

/**
 * 處理 Message 事件（文字訊息）
 */
async function handleMessageEvent(event: any) {
  const userId = event.source.userId
  const messageType = event.message.type
  const text = event.message.text?.trim() || ''
  
  console.log(`[LINE Webhook] Message from ${userId}: ${text}`)
  
  // 檢查用戶狀態
  const userState = UserStateService.getState(userId)
  
  // 如果用戶正在等待輸入 Email
  if (userState.state === USER_STATES.WAITING_FOR_EMAIL) {
    await handleEmailInput(event, text)
    return
  }
  
  // Email 格式偵測
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (emailRegex.test(text)) {
    // 用戶直接輸入 Email，開始驗證
    await handleEmailInput(event, text)
    return
  }
  
  // 關鍵字處理
  const lowerText = text.toLowerCase()
  
  if (text === '輸入信箱綁定' || text === '重新綁定') {
    // 設定狀態為等待 Email
    UserStateService.setWaitingForEmail(userId)
    
    // 發送輸入指引
    await LineService.sendReply(event.replyToken, {
      type: 'text',
      text: '📧 請輸入您在官網註冊的 Email：\n\n範例：your-email@gmail.com',
    })
    return
  }
  
  if (text.includes('查詢') && text.includes('訂單')) {
    // 查詢訂單功能
    await handleOrderQuery(event, userId)
    return
  }
  
  // 其他訊息不回應（避免打擾）
  console.log(`[LINE Webhook] Ignoring message: ${text}`)
}

/**
 * 處理 Email 輸入
 */
async function handleEmailInput(event: any, email: string) {
  const userId = event.source.userId
  
  console.log(`[LINE Webhook] Email input: ${email}`)
  
  // 清除等待狀態
  UserStateService.clearState(userId)
  
  // 驗證 Email 格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    await LineService.sendReply(event.replyToken, {
      type: 'text',
      text: '❌ Email 格式不正確，請重新輸入：\n\n範例：your-email@gmail.com',
    })
    UserStateService.setWaitingForEmail(userId)
    return
  }
  
  // 發送處理中訊息
  await LineService.sendReply(event.replyToken, {
    type: 'text',
    text: '🔍 正在驗證您的會員資料...',
  })
  
  try {
    const payload = await getPayload({ config: configPromise })
    
    // 查詢用戶
    const users = await payload.find({
      collection: 'users',
      where: {
        email: { equals: email.toLowerCase() },
      },
      limit: 1,
    })
    
    if (users.docs.length === 0) {
      // 找不到會員
      const failedMessage = FlexTemplates.memberBindingFailed({
        reason: '找不到此 Email 的會員資料',
        registerUrl: `${process.env.NEXT_PUBLIC_SERVER_URL || 'https://www.takemejapan.com'}/account/register`,
      })
      await LineService.sendPush(userId, failedMessage)
      return
    }
    
    const user = users.docs[0]
    
    // 更新用戶的 LINE User ID
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        lineUserId: userId,
      } as any,
    })
    
    // 發送綁定成功訊息
    const successMessage = FlexTemplates.memberBindingSuccess({
      memberName: (user as any).name || email,
      email: email,
      discountCode: 'LINE100',
      shopUrl: process.env.NEXT_PUBLIC_SERVER_URL || 'https://www.takemejapan.com',
    })
    
    await LineService.sendPush(userId, successMessage)
    
    console.log(`[LINE Webhook] Member bound: ${email} -> ${userId}`)
    
  } catch (error) {
    console.error('[LINE Webhook] Email verification error:', error)
    await LineService.sendPush(userId, {
      type: 'text',
      text: '❌ 驗證過程發生錯誤，請稍後再試。',
    })
  }
}

/**
 * 處理訂單查詢
 */
async function handleOrderQuery(event: any, userId: string) {
  try {
    const payload = await getPayload({ config: configPromise })
    
    // 查詢綁定的用戶
    const users = await payload.find({
      collection: 'users',
      where: {
        lineUserId: { equals: userId },
      },
      limit: 1,
    })
    
    if (users.docs.length === 0) {
      await LineService.sendReply(event.replyToken, {
        type: 'text',
        text: '🔗 您還沒有綁定會員帳號\n\n請先輸入您的註冊信箱進行綁定，才能查詢訂單喔！',
      })
      UserStateService.setWaitingForEmail(userId)
      return
    }
    
    // TODO: 查詢訂單並顯示
    await LineService.sendReply(event.replyToken, {
      type: 'text',
      text: '📦 訂單查詢功能開發中...\n\n請至官網查看您的訂單狀態。',
    })
    
  } catch (error) {
    console.error('[LINE Webhook] Order query error:', error)
  }
}

/**
 * 處理 Postback 事件（按鈕回調）
 */
async function handlePostbackEvent(event: any) {
  const userId = event.source.userId
  const postbackData = parsePostbackData(event.postback.data)
  const action = postbackData.action
  
  console.log(`[LINE Webhook] Postback from ${userId}:`, postbackData)
  
  try {
    const payload = await getPayload({ config: configPromise })
    
    switch (action) {
      case 'oos_wait':
        // 用戶願意等待
        await handleOOSWait(event, postbackData, payload)
        break
        
      case 'oos_refund':
        // 用戶申請退款
        await handleOOSRefund(event, postbackData, payload)
        break
        
      case 'restock_request':
        // 用戶申請補貨通知
        await handleRestockRequest(event, postbackData, payload)
        break
        
      default:
        console.log(`[LINE Webhook] Unknown postback action: ${action}`)
    }
    
  } catch (error) {
    console.error('[LINE Webhook] Postback error:', error)
  }
}

/**
 * 處理缺貨願意等待
 */
async function handleOOSWait(event: any, data: Record<string, string>, payload: any) {
  const userId = event.source.userId
  
  // 更新 RestockRequest 狀態
  if (data.productId && data.sku) {
    const requests = await payload.find({
      collection: 'restock-requests',
      where: {
        'variant.sku': { equals: data.sku },
        status: { equals: 'pending' },
      },
      limit: 1,
    })
    
    if (requests.docs.length > 0) {
      await payload.update({
        collection: 'restock-requests',
        id: requests.docs[0].id,
        data: {
          adminNote: `${new Date().toLocaleString('zh-TW')} 顧客選擇願意等待`,
        },
      })
    }
  }
  
  await LineService.sendReply(event.replyToken, {
    type: 'text',
    text: `✅ 感謝您的耐心等候！\n\n訂單 #${data.orderNo} 的缺貨商品，我們會盡快為您補貨。\n\n預計 2-4 天內會有進一步消息，請留意通知。`,
  })
  
  UserStateService.clearState(userId)
}

/**
 * 處理缺貨申請退款
 */
async function handleOOSRefund(event: any, data: Record<string, string>, payload: any) {
  const userId = event.source.userId
  
  // 更新狀態
  if (data.productId && data.sku) {
    const requests = await payload.find({
      collection: 'restock-requests',
      where: {
        'variant.sku': { equals: data.sku },
        status: { equals: 'pending' },
      },
      limit: 1,
    })
    
    if (requests.docs.length > 0) {
      await payload.update({
        collection: 'restock-requests',
        id: requests.docs[0].id,
        data: {
          status: 'cancelled',
          adminNote: `${new Date().toLocaleString('zh-TW')} 顧客選擇退款`,
        },
      })
    }
  }
  
  await LineService.sendReply(event.replyToken, {
    type: 'text',
    text: `📋 已收到您的退款申請\n\n訂單 #${data.orderNo} 的缺貨商品，我們會盡快為您處理退款。\n\n如有任何問題，歡迎隨時聯繫客服。`,
  })
  
  UserStateService.clearState(userId)
}

/**
 * 處理補貨通知申請
 */
async function handleRestockRequest(event: any, data: Record<string, string>, payload: any) {
  const userId = event.source.userId
  
  // 查詢用戶
  const users = await payload.find({
    collection: 'users',
    where: {
      lineUserId: { equals: userId },
    },
    limit: 1,
  })
  
  if (users.docs.length === 0) {
    await LineService.sendReply(event.replyToken, {
      type: 'text',
      text: '🔗 請先綁定會員帳號才能申請補貨通知',
    })
    return
  }
  
  const user = users.docs[0]
  
  // 建立補貨申請
  await payload.create({
    collection: 'restock-requests',
    data: {
      customer: user.id,
      product: data.productId,
      variant: {
        sku: data.sku,
        color: data.color || '',
        size: data.size || '',
      },
      status: 'pending',
      requestedAt: new Date().toISOString(),
    },
  })
  
  await LineService.sendReply(event.replyToken, {
    type: 'text',
    text: '✅ 已申請補貨通知！\n\n商品到貨時我們會立即通知您。',
  })
}

// ===== API Handlers =====

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-line-signature') || ''
    
    // 驗證簽章
    if (!verifySignature(body, signature)) {
      console.error('[LINE Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    const data = JSON.parse(body)
    const events = data.events || []
    
    console.log(`[LINE Webhook] Received ${events.length} events`)
    
    // 處理每個事件
    for (const event of events) {
      switch (event.type) {
        case 'follow':
          await handleFollowEvent(event)
          break
        case 'message':
          await handleMessageEvent(event)
          break
        case 'postback':
          await handlePostbackEvent(event)
          break
        case 'unfollow':
          console.log(`[LINE Webhook] User unfollowed: ${event.source.userId}`)
          break
        default:
          console.log(`[LINE Webhook] Unknown event type: ${event.type}`)
      }
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('[LINE Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET 用於 LINE 驗證
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
