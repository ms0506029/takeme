'use client'

/**
 * MemberCard 組件
 * Phase 8.1 - 會員卡片區塊，包含：
 * - 會員姓名與條碼
 * - 會員編號
 * - 點數餘額
 * - 會員等級（含顏色標識）
 * - 點數回饋率
 * - 升級進度條
 */

import JsBarcode from 'jsbarcode'
import { Clock, Gift, Star, TrendingUp } from 'lucide-react'
import { useEffect, useRef } from 'react'

// 會員等級配色對應
const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  bronze: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  silver: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  gold: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400' },
  vip: { bg: 'bg-gradient-to-r from-purple-500 to-pink-500', text: 'text-white', border: 'border-purple-500' },
  platinum: { bg: 'bg-gradient-to-r from-slate-700 to-slate-900', text: 'text-white', border: 'border-slate-500' },
}

// 等級中文名稱對應
const LEVEL_NAMES: Record<string, string> = {
  bronze: '銅級會員',
  silver: '銀級會員',
  gold: '金級會員',
  vip: 'VIP 會員',
  platinum: '白金會員',
}

// 等級升級門檻（TWD）
const LEVEL_THRESHOLDS: Record<string, number> = {
  bronze: 0,
  silver: 10000,
  gold: 30000,
  vip: 100000,
  platinum: 300000,
}

// 等級回饋率
const LEVEL_REWARD_RATES: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  vip: 5,
  platinum: 7,
}

interface MemberCardProps {
  user: {
    id: string
    name?: string | null
    email: string
    memberNumber?: string | null
    memberLevel?: string | null
    points?: number | null
    totalSpent?: number | null
  }
}

export function MemberCard({ user }: MemberCardProps) {
  const barcodeRef = useRef<SVGSVGElement>(null)
  
  const memberLevel = user.memberLevel || 'bronze'
  const levelColor = LEVEL_COLORS[memberLevel] || LEVEL_COLORS.bronze
  const levelName = LEVEL_NAMES[memberLevel] || '銅級會員'
  const rewardRate = LEVEL_REWARD_RATES[memberLevel] || 1
  const points = user.points || 0
  const totalSpent = user.totalSpent || 0
  
  // 計算升級進度
  const levelKeys = Object.keys(LEVEL_THRESHOLDS)
  const currentLevelIndex = levelKeys.indexOf(memberLevel)
  const nextLevelKey = levelKeys[currentLevelIndex + 1]
  const nextLevelThreshold = nextLevelKey ? LEVEL_THRESHOLDS[nextLevelKey] : null
  const currentLevelThreshold = LEVEL_THRESHOLDS[memberLevel]
  
  let progressPercent = 100
  let remainingAmount = 0
  let nextLevelName = ''
  
  if (nextLevelThreshold) {
    const range = nextLevelThreshold - currentLevelThreshold
    const progress = totalSpent - currentLevelThreshold
    progressPercent = Math.min(Math.round((progress / range) * 100), 100)
    remainingAmount = nextLevelThreshold - totalSpent
    nextLevelName = LEVEL_NAMES[nextLevelKey] || ''
  }
  
  // 生成條碼
  useEffect(() => {
    if (barcodeRef.current && user.memberNumber) {
      JsBarcode(barcodeRef.current, user.memberNumber, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: false,
        margin: 0,
      })
    }
  }, [user.memberNumber])
  
  // 計算點數有效期限（假設為一年後）
  const pointsExpiry = new Date()
  pointsExpiry.setFullYear(pointsExpiry.getFullYear() + 1)
  const expiryDateStr = pointsExpiry.toISOString().slice(0, 10).replace(/-/g, '.')
  
  return (
    <div className="relative bg-[#FDFBF7] dark:bg-slate-900 rounded-xl shadow-retro border-2 border-slate-900 dark:border-slate-700 overflow-hidden transform transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-collage-lg">
      {/* 裝飾性膠帶 (Scrapbook 元素) */}
      <div className="absolute top-0 left-0 w-12 h-6 bg-amber-200/60 -rotate-12 -translate-x-4 -translate-y-2 border border-slate-900/10 z-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-12 h-6 bg-slate-300/40 rotate-12 translate-x-4 -translate-y-2 border border-slate-900/10 z-20 pointer-events-none" />
      
      {/* 頂部漸層條 */}
      <div className={`h-2 ${levelColor.bg}`} />
      
      <div className="p-6 md:p-8 relative">
        {/* 背景紋理 (紙張感) */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/grained-paper.png')]" />
        
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 relative z-10">
          
          {/* 左側：會員卡片 (姓名 + 條碼) */}
          <div className="flex-shrink-0 lg:w-64">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border-2 border-slate-900 dark:border-slate-600 shadow-retro-sm">
              {/* 會員姓名 */}
              <div className="mb-4">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {user.name || user.email.split('@')[0]}
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">様</span>
              </div>
              
              {/* 條碼 */}
              <div className="mb-3">
                {user.memberNumber ? (
                  <svg ref={barcodeRef} className="w-full" />
                ) : (
                  <div className="h-16 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
                )}
              </div>
              
              {/* 會員編號 */}
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                會員番號：<span className="font-mono">{user.memberNumber || '生成中...'}</span>
              </div>
            </div>
          </div>
          
          {/* 右側：點數與等級資訊 */}
          <div className="flex-1">
            {/* 統計資訊 Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {/* 保有點數 */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border-2 border-slate-900 dark:border-slate-700 shadow-retro-sm cursor-pointer hover:bg-amber-50 transition-colors">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1 font-display">
                  <Gift className="w-4 h-4" />
                  保有點數
                </div>
                <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white font-display">
                  {points.toLocaleString()}
                  <span className="text-sm font-normal text-gray-500 ml-1">PT</span>
                </div>
              </div>
              
              {/* 會員等級 */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border-2 border-slate-900 dark:border-slate-700 shadow-retro-sm cursor-pointer hover:bg-indigo-50 transition-colors">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1 font-display">
                  <Star className="w-4 h-4" />
                  會員等級
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border-2 border-slate-900 ${levelColor.bg} ${levelColor.text}`}>
                  <Star className="w-4 h-4" />
                  {levelName}
                </div>
              </div>
              
              {/* 回饋率 */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border-2 border-slate-900 dark:border-slate-700 shadow-retro-sm col-span-2 md:col-span-1 cursor-pointer hover:bg-red-50 transition-colors">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1 font-display">
                  <TrendingUp className="w-4 h-4" />
                  點數回饋率
                </div>
                <div className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-500 font-display">
                  {rewardRate}
                  <span className="text-sm font-normal text-gray-500 ml-1">%</span>
                </div>
              </div>
            </div>
            
            {/* 附加資訊：有效期限 + 升級狀態 */}
            <div className="flex flex-wrap items-center gap-3 mb-6 text-sm">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700">
                <Clock className="w-4 h-4" />
                點數有效期限：{expiryDateStr}
              </span>
              
              {nextLevelName && progressPercent >= 80 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 font-medium">
                  ✨ 即將升級至 {nextLevelName}
                </span>
              )}
            </div>
            
            {/* 升級進度條 */}
            {nextLevelThreshold && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border-2 border-slate-900 dark:border-slate-700 shadow-retro-sm">
                <div className="flex justify-between items-center mb-2 text-sm font-display">
                  <span className="text-gray-600 dark:text-gray-400">升級進度</span>
                  <span className="font-bold text-gray-900 dark:text-white">{progressPercent}%</span>
                </div>
                <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded-full border border-slate-900 overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 rounded-full transition-all duration-1000 ease-out shadow-inner"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <div className="w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-display italic">
                  {remainingAmount > 0 ? (
                    <>還差 <span className="font-bold text-gray-900 dark:text-white">¥{remainingAmount.toLocaleString()}</span> 即可升級至 {nextLevelName}</>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✅ 已達成升級條件！</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MemberCard
