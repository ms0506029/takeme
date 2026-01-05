'use client'

import { cn } from '@/utilities/cn'
import Image from 'next/image'
import Link from 'next/link'

/**
 * Scrapbook Design System - ProductCard
 * 
 * 剪貼簿風格的商品卡片。
 * 具有雙層陰影、Sale 標籤旋轉、圖片 hover 放大效果。
 */

export interface ProductCardProps {
  id: string
  title: string
  price: number
  originalPrice?: number
  image: string
  href: string
  /** 標籤類型 */
  badge?: 'sale' | 'new' | 'hot' | null
  /** 是否缺貨 */
  outOfStock?: boolean
  className?: string
}

const badgeStyles = {
  sale: 'bg-scrapbook-accent text-white',
  new: 'bg-scrapbook-secondary text-white',
  hot: 'bg-scrapbook-primary text-white',
}

const badgeLabels = {
  sale: 'SALE',
  new: 'NEW',
  hot: 'HOT',
}

export function ProductCard({
  title,
  price,
  originalPrice,
  image,
  href,
  badge,
  outOfStock = false,
  className,
}: ProductCardProps) {
  const hasDiscount = originalPrice && originalPrice > price

  return (
    <Link href={href} className={cn('group block', className)}>
      <div
        className={cn(
          'relative overflow-hidden',
          'bg-white dark:bg-scrapbook-bg-dark',
          'border-2 border-black dark:border-scrapbook-fg-dark',
          'rounded-bubble',
          'shadow-collage-sm',
          'transition-all duration-300',
          'hover:shadow-collage-md hover:-translate-y-2',
        )}
      >
        {/* 商品圖片 */}
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={image}
            alt={title}
            fill
            className={cn(
              'object-cover',
              'transition-transform duration-500',
              'group-hover:scale-110',
              outOfStock && 'opacity-50 grayscale',
            )}
          />

          {/* 標籤 (旋轉 -12deg) */}
          {badge && (
            <div
              className={cn(
                'absolute top-3 left-3',
                'px-3 py-1',
                badgeStyles[badge],
                'font-display font-bold text-xs',
                'rounded',
                'border border-black',
                'shadow-retro-sm',
                'transform -rotate-12',
              )}
            >
              {badgeLabels[badge]}
            </div>
          )}

          {/* 缺貨標籤 */}
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="font-display font-bold text-white text-lg px-4 py-2 bg-black/60 rounded-bubble">
                已售完
              </span>
            </div>
          )}
        </div>

        {/* 商品資訊 */}
        <div className="p-4">
          <h3
            className={cn(
              'font-display font-medium text-sm',
              'text-scrapbook-fg-light dark:text-scrapbook-fg-dark',
              'line-clamp-2 mb-2',
              'group-hover:text-scrapbook-primary',
              'transition-colors',
            )}
          >
            {title}
          </h3>

          {/* 價格 */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'font-display font-bold text-lg',
                hasDiscount ? 'text-scrapbook-accent' : 'text-scrapbook-fg-light dark:text-scrapbook-fg-dark',
              )}
            >
              NT${price.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="font-body text-sm text-scrapbook-fg-light/50 line-through">
                NT${originalPrice?.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default ProductCard
