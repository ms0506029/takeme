'use client'

import { SketchButton } from '@/components/scrapbook'
import { cn } from '@/utilities/cn'
import Link from 'next/link'

/**
 * Scrapbook Design System - HeroSection
 * 
 * 剪貼簿風格的首頁 Hero 區塊。
 * 具有長尾夾裝飾、微旋轉標題、拼貼陰影效果。
 */

export interface HeroSectionProps {
  /** 標題文字 */
  title?: string
  /** 副標題/描述 */
  subtitle?: string
  /** CTA 按鈕文字 */
  ctaText?: string
  /** CTA 連結 */
  ctaLink?: string
  /** 背景圖片 URL */
  backgroundImage?: string
  /** 額外 className */
  className?: string
}

export function HeroSection({
  title = 'ONLINE STORE',
  subtitle = '日本直送・獨家設計・限量發售',
  ctaText = '立即選購',
  ctaLink = '/products',
  backgroundImage,
  className,
}: HeroSectionProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden',
        'py-16 md:py-24 lg:py-32',
        'bg-scrapbook-muted-light dark:bg-scrapbook-muted-dark',
        className,
      )}
    >
      {/* 背景圖片（如有） */}
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-blend-multiply opacity-30"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}

      {/* 主要內容容器 */}
      <div className="container relative z-10">
        {/* 拼貼卡片 */}
        <div
          className={cn(
            'relative inline-block',
            'bg-white dark:bg-scrapbook-bg-dark',
            'p-8 md:p-12 lg:p-16',
            'border-[3px] border-black dark:border-scrapbook-fg-dark',
            'rounded-bubble-lg',
            'shadow-collage-lg',
            // 長尾夾裝飾
            'clip-top-left',
          )}
        >
          {/* ONLINE STORE 呼吸燈標籤 */}
          <div className="mb-4">
            <span
              className={cn(
                'inline-block px-4 py-1',
                'bg-scrapbook-primary text-white',
                'font-body text-sm tracking-wider',
                'rounded-full',
                'animate-pulse',
              )}
            >
              ✨ ONLINE STORE
            </span>
          </div>

          {/* 微旋轉標題 */}
          <h1
            className={cn(
              'font-display font-bold',
              'text-4xl md:text-5xl lg:text-6xl',
              'text-scrapbook-fg-light dark:text-scrapbook-fg-dark',
              'transform -rotate-2',
              'text-shadow-md',
              'mb-4',
            )}
          >
            {title}
          </h1>

          {/* 副標題 */}
          <p
            className={cn(
              'font-body text-xl md:text-2xl',
              'text-scrapbook-secondary',
              'mb-8',
            )}
          >
            {subtitle}
          </p>

          {/* CTA 按鈕 */}
          <Link href={ctaLink}>
            <SketchButton variant="primary" size="lg">
              {ctaText} →
            </SketchButton>
          </Link>
        </div>
      </div>

      {/* 裝飾性膠帶（右下角） */}
      <div className="absolute bottom-8 right-8 hidden md:block">
        <div
          className={cn(
            'w-32 h-16',
            'bg-scrapbook-accent/80',
            'rounded-bubble',
            'border-2 border-black',
            'shadow-retro',
            'transform rotate-12',
            'flex items-center justify-center',
          )}
        >
          <span className="font-display font-bold text-white text-sm">NEW!</span>
        </div>
      </div>

      {/* 裝飾性圓形（左下角） */}
      <div className="absolute bottom-12 left-12 hidden lg:block">
        <div
          className={cn(
            'w-20 h-20',
            'bg-scrapbook-secondary',
            'rounded-full',
            'border-2 border-black',
            'shadow-retro-sm',
            'transform -rotate-6',
          )}
        />
      </div>
    </section>
  )
}

export default HeroSection
