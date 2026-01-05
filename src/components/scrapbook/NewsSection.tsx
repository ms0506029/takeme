'use client'

import { cn } from '@/utilities/cn'
import Link from 'next/link'

/**
 * Scrapbook Design System - NewsSection
 * 
 * NEWS 公告區塊（原限時優惠區塊重構）
 * 粉彩背景卡片，帶 VIEW ALL 按鈕
 */

export interface NewsItem {
  id: string
  title: string
  description: string
  code?: string
  link?: string
  /** 粉彩背景色 */
  color?: 'pink' | 'mint' | 'yellow' | 'lavender'
}

export interface NewsSectionProps {
  items: NewsItem[]
  viewAllHref?: string
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

export function NewsSection({ items, viewAllHref = '/news', className }: NewsSectionProps) {
  return (
    <section className={cn('py-12 md:py-16', className)}>
      <div className="container">
        {/* 區塊標題 */}
        <div className="mb-8 text-center">
          <h2
            className={cn(
              'inline-block',
              'font-display font-bold text-2xl md:text-3xl',
              'text-white',
              'px-6 py-2',
              'bg-scrapbook-primary',
              'rounded-bubble',
              'shadow-retro',
              'transform -rotate-1',
            )}
          >
            📰 NEWS
          </h2>
        </div>

        {/* 卡片網格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, index) => {
            const bgColor = colorMap[item.color || 'pink']
            const rotation = rotations[index % rotations.length]

            const content = (
              <div
                className={cn(
                  'relative p-6',
                  bgColor,
                  'border-2 border-black',
                  'rounded-bubble',
                  'shadow-collage-sm',
                  'transition-all duration-300',
                  rotation,
                  'cursor-pointer',
                  'hover:shadow-collage-md hover:-translate-y-1',
                )}
              >
                <h3 className="font-display font-bold text-lg mb-2 text-scrapbook-fg-light">
                  {item.title}
                </h3>
                <p className="font-body text-sm text-scrapbook-fg-light/80 mb-3">
                  {item.description}
                </p>
                {item.code && (
                  <div
                    className={cn(
                      'inline-block px-3 py-1',
                      'bg-white',
                      'border border-dashed border-scrapbook-fg-light',
                      'rounded font-mono text-xs',
                    )}
                  >
                    {item.code}
                  </div>
                )}
              </div>
            )

            return item.link ? (
              <Link key={item.id} href={item.link}>
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            )
          })}
        </div>

        {/* VIEW ALL 按鈕 */}
        <div className="text-center mt-8">
          <Link
            href={viewAllHref}
            className="inline-block font-display text-sm font-medium text-scrapbook-fg-light border-2 border-black rounded-full px-6 py-2 hover:bg-scrapbook-primary hover:text-white hover:border-scrapbook-primary transition-all shadow-retro-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            VIEW ALL &gt;
          </Link>
        </div>
      </div>
    </section>
  )
}

export default NewsSection
