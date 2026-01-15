import type { Metadata } from 'next'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import configPromise from '@payload-config'
import { AlertTriangle, Key, Lock, Settings, Shield, Trash2 } from 'lucide-react'
import { headers as getHeaders } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

// 強制動態渲染
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect(`/login?warning=${encodeURIComponent('請先登入以管理安全設定。')}`)
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-slate-900 dark:border-slate-600 shadow-retro-sm">
          <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">安全設定</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">管理密碼與帳戶安全</p>
        </div>
      </div>

      {/* 設定項目列表 */}
      <div className="space-y-4">
        {/* 變更密碼 */}
        <div className="relative bg-[#FDFBF7] dark:bg-slate-900 rounded-xl border-2 border-slate-900 dark:border-slate-700 shadow-retro overflow-hidden">
          {/* 紙張紋理 */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/grained-paper.png')]" />
          
          <div className="relative z-10 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border-2 border-slate-900 dark:border-blue-500/50 shadow-retro-sm flex-shrink-0">
                <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display mb-1">
                  變更密碼
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  定期更新密碼可以保護您的帳戶安全。建議使用至少 8 個字元，包含大小寫字母與數字。
                </p>
                
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl border-2 border-slate-900 shadow-retro-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  變更密碼
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 雙重認證 (即將推出) */}
        <div className="relative bg-[#FDFBF7] dark:bg-slate-900 rounded-xl border-2 border-slate-300 dark:border-slate-700 overflow-hidden opacity-60">
          <div className="relative z-10 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-slate-300 dark:border-slate-600 flex-shrink-0">
                <Shield className="w-6 h-6 text-slate-400" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 font-display">
                    雙重認證
                  </h3>
                  <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-500 text-xs font-medium rounded-full">
                    即將推出
                  </span>
                </div>
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  新增額外的安全層級，在登入時要求驗證碼確認。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 危險區域 - 刪除帳戶 */}
        <div className="relative bg-red-50 dark:bg-red-900/10 rounded-xl border-2 border-red-300 dark:border-red-800 overflow-hidden">
          <div className="relative z-10 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center border-2 border-red-500 flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-700 dark:text-red-400 font-display mb-1">
                  刪除帳戶
                </h3>
                <p className="text-sm text-red-600 dark:text-red-400/80 mb-4">
                  永久刪除您的帳戶與所有相關資料。此操作無法復原。
                </p>
                
                <div className="bg-red-100 dark:bg-red-900/20 rounded-lg p-4 mb-4 border border-red-200 dark:border-red-800">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <div className="text-sm text-red-700 dark:text-red-400">
                      <p className="font-bold mb-1">注意事項：</p>
                      <ul className="list-disc list-inside space-y-1 text-red-600 dark:text-red-400/80">
                        <li>所有訂單紀錄將被永久刪除</li>
                        <li>累積的點數與會員等級將無法恢復</li>
                        <li>收藏清單與補貨通知將被清除</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <button
                  disabled
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-400 text-sm font-medium rounded-lg border-2 border-red-300 dark:border-red-700 cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  請聯繫客服刪除帳戶
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 安全建議 */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 border-2 border-amber-300 dark:border-amber-700">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <p className="font-bold mb-1 font-display">安全建議</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-400">
              <li>使用獨特的密碼，避免在多個網站使用相同密碼</li>
              <li>定期更新密碼（建議每 3-6 個月更新一次）</li>
              <li>綁定 LINE 帳號以獲得登入通知</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  description: '管理您的帳戶安全設定。',
  openGraph: mergeOpenGraph({
    title: '安全設定',
    url: '/account/settings',
  }),
  title: '安全設定 | TakeMeJapan',
}
