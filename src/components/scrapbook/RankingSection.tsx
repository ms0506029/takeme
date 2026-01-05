'use client'

import { cn } from '@/utilities/cn'
import Image from 'next/image'
import Link from 'next/link'

export interface RankingItem {
  id: string
  rank: number
  title: string
  brand?: string
  price: number
  originalPrice?: number
  image: string
  href: string
}

export interface RankingSectionProps {
  /** 區塊標題 */
  title?: string
  /** 副標題 */
  subtitle?: string
  /** 排名商品（顯示 10 項 = 5 × 2 列） */
  items: RankingItem[]
  /** 查看全部連結 */
  viewAllHref?: string
  /** 查看全部文字 */
  viewAllText?: string
}

/**
 * Ranking Section
 * 
 * 商品排名區塊
 * - 使用標準 container 寬度（與其他區塊一致）
 * - 5 卡片/列 × 2 列 = 10 個卡片
 * - 卡片比例適中（aspect-[3/4]）
 */
export function RankingSection({
  title = 'RANKING',
  subtitle = '毎日更新！いま売れているアイテム',
  items,
  viewAllHref = '/shop/ranking',
  viewAllText = 'VIEW ALL >',
}: RankingSectionProps) {
  return (
    <section className="py-12 md:py-16 border-t border-scrapbook-muted-light">
      {/* 使用標準 container（與其他區塊寬度一致） */}
      <div className="container">
        {/* 標題 */}
        <div className="text-center mb-8">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-scrapbook-fg-light tracking-wider">
            {title}
          </h2>
          <p className="font-body text-sm text-scrapbook-fg-light/60 mt-1">
            {subtitle}
          </p>
        </div>

        {/* 排名網格 - 5 列 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.slice(0, 10).map((item, index) => (
            <Link
              key={item.id}
              href={item.href}
              className="group block"
            >
              {/* 卡片容器 - 使用 3:4 比例讓卡片不會太高 */}
              <div
                className={cn(
                  'relative overflow-hidden',
                  'bg-white dark:bg-scrapbook-bg-dark',
                  'border-2 border-black dark:border-scrapbook-fg-dark',
                  'rounded-lg',
                  'shadow-sm',
                  'transition-all duration-300',
                  'hover:shadow-md hover:-translate-y-1',
                )}
              >
                {/* 商品圖片 - 3:4 比例 */}
                <div className="relative aspect-[3/4] overflow-hidden bg-scrapbook-muted-light">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* 排名徽章 */}
                  <div 
                    className={cn(
                      'absolute top-2 left-2 z-10',
                      'w-6 h-6 rounded-sm',
                      'flex items-center justify-center',
                      'font-display font-bold text-xs',
                      'text-white',
                      index === 0 ? 'bg-scrapbook-primary' : 
                      index < 3 ? 'bg-scrapbook-secondary' : 'bg-gray-500',
                    )}
                  >
                    {index + 1}
                  </div>

                  {/* 愛心按鈕 */}
                  <button 
                    className="absolute top-2 right-2 z-10 text-scrapbook-accent hover:scale-110 transition-transform"
                    onClick={(e) => e.preventDefault()}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>

                  {/* 特價標籤 */}
                  {item.originalPrice && (
                    <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 bg-scrapbook-accent text-white text-xs font-display rounded">
                      タイムセール
                    </div>
                  )}
                </div>

                {/* 商品資訊 */}
                <div className="p-3">
                  {item.brand && (
                    <p className="font-body text-xs text-scrapbook-fg-light/60 truncate">
                      {item.brand}
                    </p>
                  )}
                  <h3 className="font-display text-xs font-medium text-scrapbook-fg-light line-clamp-2 mt-0.5 min-h-[2.5rem]">
                    {item.title}
                  </h3>

                  {/* 價格 */}
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-display font-bold text-sm text-scrapbook-accent">
                      ¥{item.price.toLocaleString()}
                    </span>
                    {item.originalPrice && (
                      <>
                        <span className="font-body text-xs text-scrapbook-fg-light/50 line-through">
                          ¥{item.originalPrice.toLocaleString()}
                        </span>
                        <span className="font-body text-xs text-scrapbook-accent">
                          {Math.round((1 - item.price / item.originalPrice) * 100)}%OFF
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* 查看全部 */}
        <div className="text-center mt-8">
          <Link
            href={viewAllHref}
            className="inline-block font-display text-sm font-medium text-scrapbook-fg-light border-2 border-black rounded-full px-6 py-2 hover:bg-scrapbook-primary hover:text-white hover:border-scrapbook-primary transition-all"
          >
            {viewAllText}
          </Link>
        </div>
      </div>
    </section>
  )
}
