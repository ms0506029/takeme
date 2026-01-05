'use client'

import { RankingSection } from '@/components/scrapbook/RankingSection'
import React from 'react'

import type { Page } from '@/payload-types'

type Props = Extract<Page['layout'][0], { blockType: 'scrapbookRanking' }> & {
  id?: string
}

/**
 * ScrapbookRanking Block Component
 * 
 * 從 Payload 後台接收資料並渲染排行榜區塊
 */
export const ScrapbookRankingBlock: React.FC<Props> = ({
  title,
  subtitle,
  itemCount,
  products,
  viewAllLink,
}) => {
  // 將 Payload 的 products 資料轉換為 RankingSection 需要的格式
  // 如果沒有手動選擇商品，使用預設 placeholder 資料
  const rankingItems = products && Array.isArray(products) && products.length > 0
    ? products.slice(0, itemCount || 10).map((product, index) => {
        // 處理 relationship 可能是 ID 或完整物件的情況
        if (typeof product === 'string') {
          return {
            id: product,
            rank: index + 1,
            title: `Product ${index + 1}`,
            price: 0,
            image: '/api/placeholder/400/400',
            href: `/products/${product}`,
          }
        }
        return {
          id: product.id,
          rank: index + 1,
          title: product.title || `Product ${index + 1}`,
          brand: product.vendor && typeof product.vendor !== 'string' ? product.vendor.name : undefined,
          price: product.price || 0,
          originalPrice: product.compareAtPrice || undefined,
          image: product.images?.[0] && typeof product.images[0] !== 'string' 
            ? product.images[0].url || '/api/placeholder/400/400'
            : '/api/placeholder/400/400',
          href: `/products/${product.slug || product.id}`,
        }
      })
    : generatePlaceholderItems(itemCount || 10)

  return (
    <RankingSection
      title={title || 'RANKING'}
      subtitle={subtitle || '毎日更新！いま売れているアイテム'}
      items={rankingItems}
      viewAllHref={viewAllLink || '/shop/ranking'}
    />
  )
}

// 產生預設的 placeholder 資料
function generatePlaceholderItems(count: number) {
  const brands = ['FREAK\'S STORE', 'BEAMS', 'UNITED ARROWS', 'JOURNAL STANDARD', 'SHIPS']
  const titles = [
    'Military padding jacket',
    'Oversize Down Jacket',
    'Short Length Down',
    'Halis Coat Line Set',
    'Premium Wool Vest',
    'Cashmere Blend Coat',
    'Quilted Liner Jacket',
    'Fleece Zip-up Hoodie',
    'Corduroy Wide Pants',
    'Knit Cardigan Set',
  ]

  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    rank: i + 1,
    title: titles[i % titles.length],
    brand: brands[i % brands.length],
    price: Math.floor(Math.random() * 15000) + 5000,
    originalPrice: Math.random() > 0.5 ? Math.floor(Math.random() * 5000) + 15000 : undefined,
    image: '/api/placeholder/400/400',
    href: `/products/${i + 1}`,
  }))
}
