import type { Order } from '@/payload-types'
import type { Metadata } from 'next'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import configPromise from '@payload-config'
import { Calendar, ChevronRight, Package, ShoppingBag } from 'lucide-react'
import { headers as getHeaders } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

// 強制動態渲染
export const dynamic = 'force-dynamic'

// 訂單狀態對應
const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: '待處理', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  processing: { label: '處理中', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  shipped: { label: '已出貨', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  delivered: { label: '已送達', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  refunded: { label: '已退款', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
}

// 格式化日期
function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// 格式化金額
function formatCurrency(amount: number, currency: string = 'TWD') {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

export default async function OrdersPage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect(`/login?warning=${encodeURIComponent('請先登入以查看訂單履歷。')}`)
  }

  let orders: Order[] = []

  try {
    const ordersResult = await payload.find({
      collection: 'orders',
      limit: 50,
      pagination: false,
      user,
      overrideAccess: false,
      sort: '-createdAt',
      where: {
        customer: {
          equals: user?.id,
        },
      },
    })

    orders = ordersResult?.docs || []
  } catch (error) {
    console.error('Failed to fetch orders:', error)
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">訂單履歷</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">共 {orders.length} 筆訂單</p>
          </div>
        </div>
      </div>

      {/* 訂單列表 */}
      {orders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">還沒有任何訂單</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">快去逛逛商品吧！</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
          >
            開始購物
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = ORDER_STATUS[order.status as string] || ORDER_STATUS.pending
            const itemCount = order.items?.length || 0
            
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="group block bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md transition-all overflow-hidden"
              >
                <div className="p-5">
                  {/* 訂單頭部 */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                          訂單編號 #{typeof order.id === 'string' ? order.id.slice(-8).toUpperCase() : order.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(order.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          {itemCount} 件商品
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(order.total || 0, order.currency || 'TWD')}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-amber-500 transition-colors ml-auto" />
                    </div>
                  </div>

                  {/* 商品預覽 */}
                  {order.items && order.items.length > 0 && (
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                      <div className="flex -space-x-2">
                        {order.items.slice(0, 4).map((item, idx) => {
                          const product = typeof item.product === 'object' ? item.product : null
                          const imageUrl = product?.meta?.image && typeof product.meta.image === 'object' 
                            ? product.meta.image.url 
                            : null
                          
                          return (
                            <div
                              key={idx}
                              className="w-10 h-10 rounded-lg border-2 border-white dark:border-slate-900 bg-gray-100 dark:bg-slate-800 overflow-hidden"
                            >
                              {imageUrl ? (
                                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {order.items.length > 4 && (
                          <div className="w-10 h-10 rounded-lg border-2 border-white dark:border-slate-900 bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-xs font-medium text-gray-500">
                            +{order.items.length - 4}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                        {order.items.slice(0, 2).map((item, idx) => {
                          const product = typeof item.product === 'object' ? item.product : null
                          return product?.title || '商品'
                        }).join('、')}
                        {order.items.length > 2 && ` 等 ${order.items.length} 件`}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const metadata: Metadata = {
  description: '查看您的訂單記錄與狀態。',
  openGraph: mergeOpenGraph({
    title: '訂單履歷',
    url: '/account/orders',
  }),
  title: '訂單履歷 | TakeMeJapan',
}
