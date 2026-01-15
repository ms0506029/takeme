import type { Metadata } from 'next'

import { MemberCard } from '@/components/account/MemberCard'
import { OrderItem } from '@/components/OrderItem'
import { Button } from '@/components/ui/button'
import { Order } from '@/payload-types'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import configPromise from '@payload-config'
import { Bell, ChevronRight, Gift, Heart, ShoppingBag } from 'lucide-react'
import { headers as getHeaders } from 'next/headers.js'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

// 強制動態渲染，避免 Build 時嘗試連接資料庫
export const dynamic = 'force-dynamic'

// 快捷入口定義
const QUICK_LINKS = [
  { href: '/account/orders', label: '訂單履歷', icon: ShoppingBag, description: '查看所有訂單' },
  { href: '/account/wishlist', label: '收藏清單', icon: Heart, description: '我的收藏商品' },
  { href: '/account/restock-requests', label: '補貨通知', icon: Bell, description: '申請到貨通知' },
  { href: '/account/points', label: '點數履歷', icon: Gift, description: '點數紀錄查詢' },
]

export default async function AccountPage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  let orders: Order[] | null = null

  if (!user) {
    redirect(
      `/login?warning=${encodeURIComponent('請先登入以存取您的會員中心。')}`,
    )
  }

  try {
    const ordersResult = await payload.find({
      collection: 'orders',
      limit: 3,
      user,
      overrideAccess: false,
      pagination: false,
      sort: '-createdAt',
      where: {
        customer: {
          equals: user?.id,
        },
      },
    })

    orders = ordersResult?.docs || []
  } catch (error) {
    // 部署時資料庫可能尚未就緒，忽略錯誤
  }

  return (
    <div className="space-y-8">
      {/* 會員卡片區塊 */}
      <MemberCard 
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          memberNumber: user.memberNumber,
          memberLevel: user.memberLevel,
          points: user.points,
          totalSpent: user.totalSpent,
        }} 
      />

      {/* 快捷入口 Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group relative bg-[#FDFBF7] dark:bg-slate-900 rounded-xl p-5 border-2 border-slate-900 dark:border-slate-700 hover:shadow-collage-md transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden"
            >
              {/* 微光紙張效果 */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/grained-paper.png')]" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 border-2 border-slate-900 dark:border-amber-500/30 flex items-center justify-center shadow-retro-sm group-hover:rotate-6 transition-transform">
                    <Icon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-amber-600 transition-colors" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1 font-display">{link.label}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{link.description}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* 最近訂單 */}
      <div className="bg-[#FDFBF7] dark:bg-slate-900 rounded-xl border-2 border-slate-900 dark:border-slate-700 shadow-retro overflow-hidden transform hover:shadow-collage-md transition-all duration-300 relative">
        {/* 紙張膠帶裝飾 */}
        <div className="absolute top-0 right-10 w-8 h-4 bg-red-200/40 rotate-12 -translate-y-2 border border-slate-900/10 z-20 pointer-events-none" />
        
        <div className="p-6 border-b-2 border-slate-900 dark:border-slate-700 flex items-center justify-between bg-white/50 relative z-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-600" />
            最近訂單
          </h2>
          <Link 
            href="/account/orders" 
            className="text-sm text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
          >
            查看全部
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="p-6">
          {(!orders || !Array.isArray(orders) || orders?.length === 0) ? (
            <div className="text-center py-8">
              <ShoppingBag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">您目前還沒有任何訂單</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/products">開始購物</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders?.map((order) => (
                <OrderItem key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  description: '管理您的會員帳戶、查看訂單與點數。',
  openGraph: mergeOpenGraph({
    title: '會員中心',
    url: '/account',
  }),
  title: '會員中心 | TakeMeJapan',
}
