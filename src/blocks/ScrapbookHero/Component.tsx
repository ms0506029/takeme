'use client'

import { HeroSection } from '@/components/scrapbook/HeroSection'
import React from 'react'

import type { Media, Page } from '@/payload-types'

type Props = Extract<Page['layout'][0], { blockType: 'scrapbookHero' }> & {
  id?: string
}

/**
 * ScrapbookHero Block Component
 * 
 * 從 Payload 後台接收資料並渲染 Hero 橫幅區塊
 */
export const ScrapbookHeroBlock: React.FC<Props> = ({
  title,
  subtitle,
  ctaText,
  ctaLink,
  backgroundImage,
}) => {
  // 處理背景圖片（可能是 ID 或完整物件）
  let bgImageUrl: string | undefined
  if (backgroundImage && typeof backgroundImage === 'object') {
    bgImageUrl = (backgroundImage as Media).url || undefined
  }

  return (
    <HeroSection
      title={title || 'ONLINE STORE'}
      subtitle={subtitle || '日本直送・獨家設計・限量發售'}
      ctaText={ctaText || '立即選購'}
      ctaLink={ctaLink || '/products'}
      backgroundImage={bgImageUrl}
    />
  )
}
