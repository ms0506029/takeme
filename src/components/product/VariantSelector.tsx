'use client'

import { Button } from '@/components/ui/button'
import type { Product } from '@/payload-types'

import { createUrl } from '@/utilities/createUrl'
import clsx from 'clsx'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React from 'react'

export function VariantSelector({ product }: { product: Product }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const variants = product.variants?.docs
  const variantTypes = product.variantTypes
  const hasVariants = Boolean(product.enableVariants && variants?.length && variantTypes?.length)

  if (!hasVariants) {
    return null
  }

  // 收集該商品所有變體實際使用的選項 ID
  const usedOptionIds = new Set<string>()
  variants?.forEach((variant) => {
    if (typeof variant === 'object' && variant.options) {
      variant.options.forEach((opt) => {
        const optId = typeof opt === 'object' ? opt.id : opt
        if (optId) usedOptionIds.add(String(optId))
      })
    }
  })

  return variantTypes?.map((type) => {
    if (!type || typeof type !== 'object') {
      return <></>
    }

    const allOptions = type.options?.docs

    // 只過濾出該商品實際使用的選項
    const options = allOptions?.filter((option) => {
      if (!option || typeof option !== 'object') return false
      return usedOptionIds.has(String(option.id))
    })

    if (!options || !Array.isArray(options) || !options.length) {
      return <></>
    }

    return (
      <dl className="" key={type.id}>
        <dt className="mb-4 text-sm">{type.label}</dt>
        <dd className="flex flex-wrap gap-3">
          <React.Fragment>
            {options?.map((option) => {
              if (!option || typeof option !== 'object') {
                return <></>
              }

              const optionID = option.id
              const optionKeyLowerCase = type.name

              // Base option params on current params so we can preserve any other param state in the url.
              const optionSearchParams = new URLSearchParams(searchParams.toString())

              // Remove image and variant ID from this search params so we can loop over it safely.
              optionSearchParams.delete('variant')
              optionSearchParams.delete('image')

              // Update the option params using the current option to reflect how the url *would* change,
              // if the option was clicked.
              optionSearchParams.set(optionKeyLowerCase, String(optionID))

              const currentOptions = Array.from(optionSearchParams.values())

              let isAvailableForSale = true

              // Find a matching variant
              if (variants) {
                const matchingVariant = variants
                  .filter((variant) => typeof variant === 'object')
                  .find((variant) => {
                    if (!variant.options || !Array.isArray(variant.options)) return false

                    // Check if all variant options match the current options in the URL
                    return variant.options.every((variantOption) => {
                      if (typeof variantOption !== 'object')
                        return currentOptions.includes(String(variantOption))

                      return currentOptions.includes(String(variantOption.id))
                    })
                  })

                if (matchingVariant) {
                  // If we found a matching variant, set the variant ID in the search params.
                  optionSearchParams.set('variant', String(matchingVariant.id))

                  if (matchingVariant.inventory && matchingVariant.inventory > 0) {
                    isAvailableForSale = true
                  } else {
                    isAvailableForSale = false
                  }
                }
              }

              const optionUrl = createUrl(pathname, optionSearchParams)

              // The option is active if it's in the url params.
              const isActive = searchParams.get(optionKeyLowerCase) === String(optionID)

              return (
                <Button
                  variant={'ghost'}
                  aria-disabled={!isAvailableForSale}
                  className={clsx('px-2', {
                    'bg-primary/5 text-primary': isActive && isAvailableForSale,
                    'bg-red-50 text-red-400 border-red-200': isActive && !isAvailableForSale,
                    'text-muted-foreground line-through opacity-60': !isAvailableForSale && !isActive,
                  })}
                  key={option.id}
                  onClick={() => {
                    router.replace(`${optionUrl}`, {
                      scroll: false,
                    })
                  }}
                  title={`${option.label} ${!isAvailableForSale ? ' (缺貨)' : ''}`}
                >
                  {option.label}
                  {!isAvailableForSale && <span className="ml-1 text-xs">(缺貨)</span>}
                </Button>
              )
            })}
          </React.Fragment>
        </dd>
      </dl>
    )
  })
}
