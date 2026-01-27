'use client'
import type { Product, Variant } from '@/payload-types'

import { RichText } from '@/components/RichText'
import { AddToCart } from '@/components/Cart/AddToCart'
import { Price } from '@/components/Price'
import React, { Suspense } from 'react'

import { VariantMatrix } from './VariantMatrix'
import { useCurrency } from '@payloadcms/plugin-ecommerce/client/react'
import { StockIndicator } from '@/components/product/StockIndicator'
import { WishlistButton } from '@/components/product/WishlistButton'
import { RestockNotifyButton } from '@/components/product/RestockNotifyButton'

export function ProductDescription({ product }: { product: Product }) {
  const { currency } = useCurrency()
  let amount = 0,
    lowestAmount = 0,
    highestAmount = 0
  const priceField = `priceIn${currency.code}` as keyof Product
  const hasVariants = product.enableVariants && Boolean(product.variants?.docs?.length)

  if (hasVariants) {
    const priceField = `priceIn${currency.code}` as keyof Variant
    const variantsOrderedByPrice = product.variants?.docs
      ?.filter((variant) => variant && typeof variant === 'object')
      .sort((a, b) => {
        if (
          typeof a === 'object' &&
          typeof b === 'object' &&
          priceField in a &&
          priceField in b &&
          typeof a[priceField] === 'number' &&
          typeof b[priceField] === 'number'
        ) {
          return a[priceField] - b[priceField]
        }

        return 0
      }) as Variant[]

    const lowestVariant = variantsOrderedByPrice[0][priceField]
    const highestVariant = variantsOrderedByPrice[variantsOrderedByPrice.length - 1][priceField]
    if (
      variantsOrderedByPrice &&
      typeof lowestVariant === 'number' &&
      typeof highestVariant === 'number'
    ) {
      lowestAmount = lowestVariant
      highestAmount = highestVariant
    }
  } else if (product[priceField] && typeof product[priceField] === 'number') {
    amount = product[priceField]
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 標題與價格 */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2">
        <h1 className="text-xl font-medium">{product.title}</h1>
        <div className="uppercase font-mono text-lg">
          {hasVariants ? (
            <Price highestAmount={highestAmount} lowestAmount={lowestAmount} />
          ) : (
            <Price amount={amount} />
          )}
        </div>
      </div>

      {/* 商品描述 */}
      {product.description ? (
        <RichText className="text-sm text-gray-600" data={product.description} enableGutter={false} />
      ) : null}

      {/* 變體矩陣（有變體時顯示） */}
      {hasVariants ? (
        <Suspense fallback={<div className="h-32 bg-gray-100 animate-pulse rounded-lg" />}>
          <VariantMatrix product={product} />
        </Suspense>
      ) : (
        <>
          {/* 無變體商品：顯示庫存狀態、收藏按鈕、加入購物車 */}
          <div className="flex items-center justify-between border rounded-lg p-3">
            <Suspense fallback={null}>
              <StockIndicator product={product} />
            </Suspense>
            <div className="flex items-center gap-2">
              <Suspense fallback={null}>
                <AddToCart product={product} />
              </Suspense>
              <Suspense fallback={null}>
                <RestockNotifyButton product={product} />
              </Suspense>
              <Suspense fallback={null}>
                <WishlistButton product={product} />
              </Suspense>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
