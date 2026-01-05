'use client'

import { ProductCard } from '@/components/scrapbook/ProductCard'
import Link from 'next/link'
import React from 'react'

import type { Page } from '@/payload-types'

type Props = Extract<Page['layout'][0], { blockType: 'scrapbookCheckList' }> & {
  id?: string
}

/**
 * ScrapbookCheckList Block Component
 * 
 * 從 Payload 後台接收資料並渲染 CHECK LIST 區塊
 */
export const ScrapbookCheckListBlock: React.FC<Props> = ({
  title,
  subtitle,
  products,
  viewAllLink,
}) => {
  return (
    <section className="py-12 md:py-16">
      <div className="container">
        <div className="text-center mb-8">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-scrapbook-fg-light tracking-wider">
            {title || 'CHECK LIST'}
          </h2>
          <p className="font-body text-sm text-scrapbook-fg-light/60 mt-1">
            {subtitle || "Don't miss these items"}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {products && Array.isArray(products) && products.map((product, index) => {
            // 處理 relationship 可能是 ID 或完整物件的情況
            if (typeof product === 'string') {
              return (
                <ProductCard
                  key={product}
                  id={product}
                  title={`Product ${index + 1}`}
                  price={0}
                  image="/api/placeholder/400/400"
                  href={`/products/${product}`}
                />
              )
            }

            // 判斷 badge 類型
            let badge: 'sale' | 'new' | 'hot' | null = null
            if (product.compareAtPrice && product.price && product.compareAtPrice > product.price) {
              badge = 'sale'
            }

            return (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title || ''}
                price={product.price || 0}
                originalPrice={product.compareAtPrice || undefined}
                image={
                  product.images?.[0] && typeof product.images[0] !== 'string'
                    ? product.images[0].url || '/api/placeholder/400/400'
                    : '/api/placeholder/400/400'
                }
                href={`/products/${product.slug || product.id}`}
                badge={badge}
                outOfStock={product.stockStatus === 'outOfStock'}
              />
            )
          })}
        </div>

        {/* View All Button */}
        <div className="text-center mt-8">
          <Link
            href={viewAllLink || '/shop/checklist'}
            className="inline-block font-display text-sm font-medium text-scrapbook-fg-light border-2 border-black rounded-full px-6 py-2 hover:bg-scrapbook-primary hover:text-white hover:border-scrapbook-primary transition-all shadow-retro-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            VIEW ALL &gt;
          </Link>
        </div>
      </div>
    </section>
  )
}
