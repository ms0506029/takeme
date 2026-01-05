'use client'

import { cn } from '@/utilities/cn'
import Link from 'next/link'

/**
 * Scrapbook Design System - CouponGrid
 * 
 * 剪貼簿風格的促銷優惠券網格。
 * 具有粉彩背景、膠帶裝飾、不規則旋轉效果。
 */

export interface CouponItem {
  id: string
  title: string
  description: string
  code?: string
  link?: string
  /** 粉彩背景色 */
  color?: 'pink' | 'mint' | 'yellow' | 'lavender'
  /** 膠帶位置 */
  tape?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export interface CouponGridProps {
  coupons: CouponItem[]
  className?: string
}

const colorMap = {
  pink: 'bg-[#F8E1E1]',
  mint: 'bg-[#E1F8F4]',
  yellow: 'bg-[#F8F4E1]',
  lavender: 'bg-[#E8E1F8]',
}

const rotations = [
  'hover:rotate-1',
  'hover:-rotate-1',
  'hover:rotate-2',
  'hover:-rotate-2',
]

export function CouponGrid({ coupons, className }: CouponGridProps) {
  return (
    <section className={cn('py-12 md:py-16', className)}>
      <div className="container">
        {/* 區塊標題 */}
        <div className="mb-8 text-center">
          <h2
            className={cn(
              'inline-block',
              'font-display font-bold text-2xl md:text-3xl',
              'text-scrapbook-fg-light dark:text-scrapbook-fg-dark',
              'px-6 py-2',
              'bg-scrapbook-primary text-white',
              'rounded-bubble',
              'shadow-retro',
              'transform -rotate-1',
            )}
          >
            🎫 限時優惠
          </h2>
        </div>

        {/* 優惠券網格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {coupons.map((coupon, index) => {
            const bgColor = colorMap[coupon.color || 'pink']
            const tapeClass = coupon.tape ? `tape-${coupon.tape}` : 'tape-top-right'
            const rotation = rotations[index % rotations.length]

            const content = (
              <div
                className={cn(
                  'relative p-6',
                  bgColor,
                  'border-2 border-black dark:border-scrapbook-fg-dark',
                  'rounded-bubble',
                  'shadow-collage-sm',
                  tapeClass,
                  'transition-all duration-300',
                  rotation,
                  'cursor-pointer',
                  'hover:shadow-collage-md hover:-translate-y-1',
                )}
              >
                <h3 className="font-display font-bold text-lg mb-2 text-scrapbook-fg-light">
                  {coupon.title}
                </h3>
                <p className="font-body text-sm text-scrapbook-fg-light/80 mb-3">
                  {coupon.description}
                </p>
                {coupon.code && (
                  <div
                    className={cn(
                      'inline-block px-3 py-1',
                      'bg-white',
                      'border border-dashed border-scrapbook-fg-light',
                      'rounded font-mono text-xs',
                    )}
                  >
                    {coupon.code}
                  </div>
                )}
              </div>
            )

            return coupon.link ? (
              <Link key={coupon.id} href={coupon.link}>
                {content}
              </Link>
            ) : (
              <div key={coupon.id}>{content}</div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default CouponGrid
