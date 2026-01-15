import type { Metadata } from 'next'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import configPromise from '@payload-config'
import { CheckCircle, ExternalLink, Link as LinkIcon, Shield, XCircle } from 'lucide-react'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

// 強制動態渲染
export const dynamic = 'force-dynamic'

// 社群平台資料
const SOCIAL_PLATFORMS = [
  {
    id: 'line',
    name: 'LINE',
    description: '接收訂單通知與優惠訊息',
    color: 'bg-[#00B900]',
    icon: (
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
      </svg>
    ),
    benefits: ['即時訂單狀態通知', '專屬優惠碼推播', '到貨通知提醒'],
  },
  {
    id: 'google',
    name: 'Google',
    description: '使用 Google 帳號快速登入',
    color: 'bg-white border-2 border-slate-200',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    benefits: ['一鍵快速登入', '自動填充個人資料', '更安全的帳戶保護'],
  },
]

export default async function SocialPage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect(`/login?warning=${encodeURIComponent('請先登入以管理社群綁定。')}`)
  }

  // 綁定狀態
  const bindings = {
    line: !!user.lineUserId,
    google: false, // 目前尚未實作 Google 綁定
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center border-2 border-slate-900 dark:border-cyan-500/50 shadow-retro-sm">
          <LinkIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">社群綁定</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">連結社群帳號，享受更便利的服務</p>
        </div>
      </div>

      {/* 社群平台列表 */}
      <div className="space-y-4">
        {SOCIAL_PLATFORMS.map((platform) => {
          const isBound = bindings[platform.id as keyof typeof bindings]
          
          return (
            <div
              key={platform.id}
              className="relative bg-[#FDFBF7] dark:bg-slate-900 rounded-xl border-2 border-slate-900 dark:border-slate-700 shadow-retro overflow-hidden"
            >
              {/* 紙張紋理 */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/grained-paper.png')]" />
              
              <div className="relative z-10 p-6">
                <div className="flex items-start gap-4">
                  {/* 平台 Icon */}
                  <div className={`w-14 h-14 rounded-xl ${platform.color} flex items-center justify-center shadow-retro-sm flex-shrink-0`}>
                    {platform.icon}
                  </div>
                  
                  {/* 平台資訊 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                        {platform.name}
                      </h3>
                      {isBound ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-500">
                          <CheckCircle className="w-3 h-3" />
                          已綁定
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-medium rounded-full">
                          <XCircle className="w-3 h-3" />
                          未綁定
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {platform.description}
                    </p>
                    
                    {/* 功能優勢 */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {platform.benefits.map((benefit, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          <Shield className="w-3 h-3 text-amber-500" />
                          {benefit}
                        </span>
                      ))}
                    </div>
                    
                    {/* 操作按鈕 */}
                    {isBound ? (
                      <button
                        disabled
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 text-sm font-medium rounded-lg border-2 border-slate-300 dark:border-slate-600 cursor-not-allowed"
                      >
                        已連結帳戶
                      </button>
                    ) : platform.id === 'line' ? (
                      <a
                        href="/api/line/auth"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00B900] hover:bg-[#00A000] text-white text-sm font-bold rounded-xl border-2 border-slate-900 shadow-retro-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                        </svg>
                        綁定 LINE 帳號
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        disabled
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 text-sm font-medium rounded-lg border-2 border-slate-300 dark:border-slate-600 cursor-not-allowed"
                      >
                        即將推出
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 安全提示 */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 border-2 border-amber-300 dark:border-amber-700">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <p className="font-bold mb-1 font-display">安全提示</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-400">
              <li>綁定社群帳號後，您可以使用該帳號快速登入</li>
              <li>我們不會在您的社群帳號上發布任何內容</li>
              <li>您可以隨時在此頁面解除綁定</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  description: '管理您的社群帳號綁定狀態。',
  openGraph: mergeOpenGraph({
    title: '社群綁定',
    url: '/account/social',
  }),
  title: '社群綁定 | TakeMeJapan',
}
