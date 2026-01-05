'use client'

import { NewsSection } from '@/components/scrapbook/NewsSection'
import React from 'react'

import type { Page } from '@/payload-types'

type Props = Extract<Page['layout'][0], { blockType: 'scrapbookNews' }> & {
  id?: string
}

/**
 * ScrapbookNews Block Component
 * 
 * 從 Payload 後台接收資料並渲染新聞區塊
 */
export const ScrapbookNewsBlock: React.FC<Props> = ({
  items,
  viewAllLink,
}) => {
  // 轉換為 NewsSection 需要的格式
  const newsItems = items && Array.isArray(items)
    ? items.map((item, index) => ({
        id: item.id || String(index),
        title: item.title || '',
        description: item.description || '',
        code: item.code || undefined,
        link: item.link || undefined,
        color: (item.color as 'pink' | 'mint' | 'yellow' | 'lavender') || 'pink',
      }))
    : []

  return (
    <NewsSection
      items={newsItems}
      viewAllHref={viewAllLink || '/news'}
    />
  )
}
