import type { Metadata } from 'next'

import { ProfileForm } from '@/components/account/ProfileForm'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import configPromise from '@payload-config'
import { Clock, Shield, Star, User } from 'lucide-react'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

// 強制動態渲染
export const dynamic = 'force-dynamic'

// 格式化日期
function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function ProfilePage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect(`/login?warning=${encodeURIComponent('請先登入以編輯基本資料。')}`)
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border-2 border-slate-900 dark:border-indigo-500/50 shadow-retro-sm">
          <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">基本資料</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">管理您的個人資訊</p>
        </div>
      </div>

      {/* 主要內容區塊 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：編輯表單 */}
        <div className="lg:col-span-2">
          <div className="relative bg-[#FDFBF7] dark:bg-slate-900 rounded-xl p-6 border-2 border-slate-900 dark:border-slate-700 shadow-retro overflow-hidden">
            {/* 紙張紋理 */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/grained-paper.png')]" />
            
            {/* 膠帶裝飾 */}
            <div className="absolute top-0 left-6 w-10 h-5 bg-amber-200/60 -rotate-6 -translate-y-2 border border-slate-900/10 z-10 pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 font-display flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                編輯資料
              </h2>
              
              <ProfileForm
                user={{
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  phone: user.phone,
                }}
              />
            </div>
          </div>
        </div>

        {/* 右側：帳戶摘要 */}
        <div className="space-y-4">
          {/* 帳戶狀態卡片 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 border-slate-900 dark:border-slate-700 shadow-retro-sm">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 font-display">
              帳戶狀態
            </h3>
            
            <div className="space-y-4">
              {/* 會員等級 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  會員等級
                </span>
                <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full border border-slate-900">
                  {user.memberLevel === 'vip' ? 'VIP' : 
                   user.memberLevel === 'gold' ? '金級' : 
                   user.memberLevel === 'silver' ? '銀級' : '銅級'}
                </span>
              </div>
              
              {/* 累計消費 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">累計消費</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ¥{(user.totalSpent || 0).toLocaleString()}
                </span>
              </div>
              
              {/* 點數餘額 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">點數餘額</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {(user.points || 0).toLocaleString()} PT
                </span>
              </div>
              
              {/* 註冊時間 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  註冊時間
                </span>
                <span className="text-sm text-slate-900 dark:text-white">
                  {formatDate(user.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* LINE 綁定狀態 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 border-slate-900 dark:border-slate-700 shadow-retro-sm">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 font-display">
              社群綁定
            </h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  user.lineUserId 
                    ? 'bg-green-500' 
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}>
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white text-sm">LINE</p>
                  <p className="text-xs text-slate-500">
                    {user.lineUserId ? '已綁定' : '尚未綁定'}
                  </p>
                </div>
              </div>
              
              {user.lineUserId ? (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ 已連結</span>
              ) : (
                <a 
                  href="/account/social"
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium cursor-pointer"
                >
                  前往綁定 →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  description: '管理您的基本資料與帳戶設定。',
  openGraph: mergeOpenGraph({
    title: '基本資料',
    url: '/account/profile',
  }),
  title: '基本資料 | TakeMeJapan',
}
