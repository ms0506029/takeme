import type { Wishlist } from '@/payload-types'
import type { Metadata } from 'next'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import configPromise from '@payload-config'
import { Bell, BellOff, ChevronRight, Heart, Package } from 'lucide-react'
import { headers as getHeaders } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

// 強制動態渲染
export const dynamic = 'force-dynamic'

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

export default async function WishlistPage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect(`/login?warning=${encodeURIComponent('請先登入以查看收藏清單。')}`)
  }

  let wishlistItems: Wishlist[] = []

  try {
    const result = await payload.find({
      collection: 'wishlist',
      limit: 100,
      sort: '-addedAt',
      depth: 2, // 以取得 product 詳細資料
      where: {
        customer: {
          equals: user.id,
        },
      },
    })

    wishlistItems = result?.docs || []
  } catch (error) {
    console.error('Failed to fetch wishlist:', error)
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Heart className="w-5 h-5 text-red-500 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">收藏清單</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">共 {wishlistItems.length} 件商品</p>
          </div>
        </div>
      </div>

      {/* 收藏列表 */}
      {wishlistItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
          <Heart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">還沒有收藏商品</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">逛逛商品，將喜歡的加入收藏吧！</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
          >
            探索商品
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wishlistItems.map((item) => {
            const product = typeof item.product === 'object' ? item.product : null
            const imageUrl = product?.meta?.image && typeof product.meta.image === 'object' 
              ? product.meta.image.url 
              : null
            
            const currentPrice = product?.price || 0
            const priceAtAdd = item.variant?.priceAtAdd || currentPrice
            const hasDropped = currentPrice < priceAtAdd
            const dropPercent = priceAtAdd > 0 ? Math.round((1 - currentPrice / priceAtAdd) * 100) : 0

            return (
              <div
                key={item.id}
                className="group bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:border-red-300 dark:hover:border-red-500 hover:shadow-md transition-all"
              >
                <div className="flex">
                  {/* 商品圖片 */}
                  <div className="w-28 h-28 flex-shrink-0 bg-gray-100 dark:bg-slate-800 relative">
                    {imageUrl ? (
                      <img src={imageUrl} alt={product?.title || ''} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    
                    {/* 降價標籤 */}
                    {hasDropped && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
                        降價 {dropPercent}%
                      </div>
                    )}
                  </div>

                  {/* 商品資訊 */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <Link 
                        href={`/products/${product?.slug || product?.id}`}
                        className="font-medium text-gray-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 line-clamp-1"
                      >
                        {product?.title || '商品'}
                      </Link>
                      
                      {/* 變體資訊 */}
                      {(item.variant?.color || item.variant?.size) && (
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {item.variant?.color && <span>{item.variant.color}</span>}
                          {item.variant?.color && item.variant?.size && <span>·</span>}
                          {item.variant?.size && <span>{item.variant.size}</span>}
                        </div>
                      )}
                      
                      {/* 價格 */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`font-bold ${hasDropped ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {formatCurrency(currentPrice)}
                        </span>
                        {hasDropped && (
                          <span className="text-sm text-gray-400 line-through">
                            {formatCurrency(priceAtAdd)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 底部操作 */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        {item.notifyOnPriceDrop ? (
                          <>
                            <Bell className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-green-600 dark:text-green-400">降價通知已開啟</span>
                          </>
                        ) : (
                          <>
                            <BellOff className="w-3.5 h-3.5" />
                            <span>降價通知已關閉</span>
                          </>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        {item.addedAt && formatDate(item.addedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const metadata: Metadata = {
  description: '查看您收藏的商品。',
  openGraph: mergeOpenGraph({
    title: '收藏清單',
    url: '/account/wishlist',
  }),
  title: '收藏清單 | TakeMeJapan',
}
