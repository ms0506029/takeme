import type { RestockRequest } from '@/payload-types'
import type { Metadata } from 'next'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import configPromise from '@payload-config'
import { Bell, CheckCircle, ChevronRight, Clock, Mail, MessageCircle, Package, XCircle } from 'lucide-react'
import { headers as getHeaders } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

// 強制動態渲染
export const dynamic = 'force-dynamic'

// 狀態對應
const STATUS_MAP: Record<string, { label: string; icon: any; color: string }> = {
  pending: { 
    label: '等待補貨', 
    icon: Clock, 
    color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30' 
  },
  notified: { 
    label: '已通知', 
    icon: CheckCircle, 
    color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30' 
  },
  cancelled: { 
    label: '已取消', 
    icon: XCircle, 
    color: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30' 
  },
}

// 通知管道對應
const CHANNEL_MAP: Record<string, { label: string; icon: any }> = {
  line: { label: 'LINE', icon: MessageCircle },
  email: { label: 'Email', icon: Mail },
}

// 格式化日期
function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function RestockRequestsPage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect(`/login?warning=${encodeURIComponent('請先登入以查看補貨通知。')}`)
  }

  let requests: RestockRequest[] = []

  try {
    const result = await payload.find({
      collection: 'restock-requests',
      limit: 100,
      sort: '-requestedAt',
      depth: 2, // 以取得 product 詳細資料
      where: {
        customer: {
          equals: user.id,
        },
      },
    })

    requests = result?.docs || []
  } catch (error) {
    console.error('Failed to fetch restock requests:', error)
  }

  // 分類統計
  const pendingCount = requests.filter(r => r.status === 'pending').length
  const notifiedCount = requests.filter(r => r.status === 'notified').length

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">補貨通知</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">共 {requests.length} 筆申請</p>
          </div>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">等待補貨</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{notifiedCount}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">已通知</div>
            </div>
          </div>
        </div>
      </div>

      {/* 通知列表 */}
      {requests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
          <Bell className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">還沒有補貨通知申請</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">當商品缺貨時，可申請到貨通知！</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
          >
            探索商品
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {requests.map((request) => {
              const product = typeof request.product === 'object' ? request.product : null
              const imageUrl = product?.meta?.image && typeof product.meta.image === 'object' 
                ? product.meta.image.url 
                : null
              const status = STATUS_MAP[request.status as string] || STATUS_MAP.pending
              const StatusIcon = status.icon
              const channel = request.notificationChannel 
                ? CHANNEL_MAP[request.notificationChannel] 
                : null

              return (
                <div
                  key={request.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex gap-4">
                    {/* 商品圖片 */}
                    <div className="w-16 h-16 flex-shrink-0 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                      {imageUrl ? (
                        <img src={imageUrl} alt={product?.title || ''} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* 商品資訊 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link 
                            href={`/products/${product?.slug || product?.id}`}
                            className="font-medium text-gray-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 line-clamp-1"
                          >
                            {product?.title || '商品'}
                          </Link>
                          
                          {/* 變體資訊 */}
                          {(request.variant?.color || request.variant?.size) && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                              {request.variant?.color && <span>{request.variant.color}</span>}
                              {request.variant?.color && request.variant?.size && <span> · </span>}
                              {request.variant?.size && <span>{request.variant.size}</span>}
                            </div>
                          )}
                        </div>
                        
                        {/* 狀態標籤 */}
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {status.label}
                        </div>
                      </div>

                      {/* 底部資訊 */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>申請時間：{request.requestedAt && formatDate(request.requestedAt)}</span>
                        
                        {request.status === 'notified' && request.notifiedAt && (
                          <span className="text-green-600 dark:text-green-400">
                            通知時間：{formatDate(request.notifiedAt)}
                          </span>
                        )}
                        
                        {channel && (
                          <span className="flex items-center gap-1">
                            <channel.icon className="w-3.5 h-3.5" />
                            {channel.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export const metadata: Metadata = {
  description: '查看您的補貨通知申請。',
  openGraph: mergeOpenGraph({
    title: '補貨通知',
    url: '/account/restock-requests',
  }),
  title: '補貨通知 | TakeMeJapan',
}
