import type { Metadata } from 'next'

import type { PointTransaction } from '@/payload-types'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import configPromise from '@payload-config'
import { AlertCircle, Award, Clock, Gift, Minus, Plus, RefreshCw, ShoppingBag, Star } from 'lucide-react'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

// 強制動態渲染
export const dynamic = 'force-dynamic'

// 交易類型對應
const TRANSACTION_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  earn: { label: '消費獲得', icon: ShoppingBag, color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30' },
  redeem: { label: '兌換使用', icon: Gift, color: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30' },
  'manual-add': { label: '手動增加', icon: Plus, color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' },
  'manual-deduct': { label: '手動扣減', icon: Minus, color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30' },
  expired: { label: '過期失效', icon: Clock, color: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30' },
  bonus: { label: '活動獎勵', icon: Award, color: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30' },
  refund: { label: '退貨扣回', icon: RefreshCw, color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30' },
}

// 格式化日期時間
function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function PointsPage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect(`/login?warning=${encodeURIComponent('請先登入以查看點數履歷。')}`)
  }

  let transactions: PointTransaction[] = []
  let currentPoints = user.points || 0

  try {
    const result = await payload.find({
      collection: 'point-transactions',
      limit: 100,
      sort: '-createdAt',
      where: {
        customer: {
          equals: user.id,
        },
      },
    })

    transactions = result?.docs || []
  } catch (error) {
    console.error('Failed to fetch point transactions:', error)
  }

  // 計算統計數據
  const totalEarned = transactions
    .filter(t => (t.amount as number) > 0)
    .reduce((sum, t) => sum + (t.amount as number), 0)
  
  const totalUsed = Math.abs(
    transactions
      .filter(t => (t.amount as number) < 0)
      .reduce((sum, t) => sum + (t.amount as number), 0)
  )

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Gift className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">點數履歷</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">查看您的點數交易紀錄</p>
        </div>
      </div>

      {/* 點數統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 當前點數 */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 text-white/80 mb-2">
            <Star className="w-4 h-4" />
            目前點數
          </div>
          <div className="text-3xl font-bold">
            {currentPoints.toLocaleString()}
            <span className="text-lg font-normal ml-1">PT</span>
          </div>
        </div>

        {/* 累計獲得 */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
            <Plus className="w-4 h-4" />
            累計獲得
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            +{totalEarned.toLocaleString()}
            <span className="text-sm font-normal text-gray-500 ml-1">PT</span>
          </div>
        </div>

        {/* 累計使用 */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
            <Minus className="w-4 h-4" />
            累計使用
          </div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            -{totalUsed.toLocaleString()}
            <span className="text-sm font-normal text-gray-500 ml-1">PT</span>
          </div>
        </div>
      </div>

      {/* 交易紀錄列表 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">交易紀錄</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <Gift className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">還沒有點數紀錄</h3>
            <p className="text-gray-500 dark:text-gray-400">消費後即可累積點數！</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {transactions.map((transaction) => {
              const type = TRANSACTION_TYPES[transaction.type as string] || TRANSACTION_TYPES.earn
              const Icon = type.icon
              const isPositive = (transaction.amount as number) > 0

              return (
                <div
                  key={transaction.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* 類型 Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* 詳情 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {type.label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {transaction.description || '無說明'}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatDateTime(transaction.createdAt)}
                      </div>
                    </div>

                    {/* 點數變化 */}
                    <div className={`text-right font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isPositive ? '+' : ''}{(transaction.amount as number).toLocaleString()} PT
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 點數說明 */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 border border-amber-200 dark:border-amber-800">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <p className="font-medium mb-1">關於點數</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-400">
              <li>每消費 NT$100 可獲得 1 點（依據會員等級加成）</li>
              <li>點數可於結帳時折抵消費，1 點 = NT$1</li>
              <li>點數有效期限為一年，請注意使用期限</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  description: '查看您的點數餘額與交易紀錄。',
  openGraph: mergeOpenGraph({
    title: '點數履歷',
    url: '/account/points',
  }),
  title: '點數履歷 | TakeMeJapan',
}
