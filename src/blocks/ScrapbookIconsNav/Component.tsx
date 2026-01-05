'use client'

import { IconsNav } from '@/components/scrapbook/IconsNav'
import { Heart, Info, Search, ShoppingCart, Ticket, User } from 'lucide-react'
import React from 'react'

import type { Page } from '@/payload-types'

type Props = Extract<Page['layout'][0], { blockType: 'scrapbookIconsNav' }> & {
  id?: string
}

// 圖示映射
const iconMap: Record<string, React.ReactNode> = {
  shop: <ShoppingCart className="w-full h-full" />,
  coordinate: <Heart className="w-full h-full" />,
  info: <Info className="w-full h-full" />,
  coupon: <Ticket className="w-full h-full" />,
  search: <Search className="w-full h-full" />,
  user: <User className="w-full h-full" />,
}

/**
 * ScrapbookIconsNav Block Component
 * 
 * 從 Payload 後台接收資料並渲染圖示導覽區塊
 */
export const ScrapbookIconsNavBlock: React.FC<Props> = ({ items }) => {
  // 轉換為 IconsNav 需要的格式
  const formattedItems = items && Array.isArray(items)
    ? items.map((item, index) => ({
        id: item.id || String(index),
        label: item.label || '',
        href: item.href || '#',
        icon: iconMap[item.iconType || 'shop'] || iconMap.shop,
      }))
    : []

  if (formattedItems.length === 0) return null

  return <IconsNav items={formattedItems} />
}
