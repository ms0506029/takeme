'use client'

import { PromoBadgeRow } from '@/components/scrapbook/PromoBadgeRow'
import React from 'react'

import type { Page } from '@/payload-types'

type Props = Extract<Page['layout'][0], { blockType: 'scrapbookPromoBadge' }> & {
  id?: string
}

/**
 * ScrapbookPromoBadge Block Component
 * 
 * 從 Payload 後台接收資料並渲染促銷標籤列
 */
export const ScrapbookPromoBadgeBlock: React.FC<Props> = ({ badges }) => {
  // 轉換為 PromoBadgeRow 需要的格式
  const formattedBadges = badges && Array.isArray(badges)
    ? badges.map((badge, index) => ({
        id: badge.id || String(index),
        label: badge.label || '',
        href: badge.href || '#',
        color: (badge.color as 'orange' | 'green' | 'red' | 'pink') || 'orange',
      }))
    : []

  if (formattedBadges.length === 0) return null

  return <PromoBadgeRow badges={formattedBadges} />
}
