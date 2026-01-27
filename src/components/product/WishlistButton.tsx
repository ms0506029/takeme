'use client'

import { Button } from '@/components/ui/button'
import type { Product, Variant, Wishlist } from '@/payload-types'
import { useAuth } from '@/providers/Auth'
import { Heart } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

type Props = {
  product: Product
}

export function WishlistButton({ product }: Props) {
  const { user, status } = useAuth()
  const searchParams = useSearchParams()
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [wishlistItemId, setWishlistItemId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const variants = product.variants?.docs || []

  // 取得當前選中的變體
  const selectedVariant = useMemo<Variant | undefined>(() => {
    if (product.enableVariants && variants.length) {
      const variantId = searchParams.get('variant')
      const validVariant = variants.find((variant) => {
        if (typeof variant === 'object') {
          return String(variant.id) === variantId
        }
        return String(variant) === variantId
      })

      if (validVariant && typeof validVariant === 'object') {
        return validVariant
      }
    }
    return undefined
  }, [product.enableVariants, searchParams, variants])

  // 從變體選項中取得顏色和尺寸
  const variantInfo = useMemo(() => {
    if (!selectedVariant?.options) return { color: '', size: '', sku: selectedVariant?.sku || '' }

    let color = ''
    let size = ''

    selectedVariant.options.forEach((opt) => {
      if (typeof opt === 'object' && opt.type) {
        const typeName = typeof opt.type === 'object' ? opt.type.name : ''
        if (typeName?.toLowerCase().includes('color') || typeName?.toLowerCase().includes('顏色')) {
          color = opt.label || ''
        }
        if (typeName?.toLowerCase().includes('size') || typeName?.toLowerCase().includes('尺寸')) {
          size = opt.label || ''
        }
      }
    })

    return { color, size, sku: selectedVariant?.sku || '' }
  }, [selectedVariant])

  // 檢查商品是否在願望清單中
  useEffect(() => {
    if (status !== 'loggedIn' || !user) {
      setIsInWishlist(false)
      setWishlistItemId(null)
      return
    }

    const checkWishlist = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/wishlist`, {
          credentials: 'include',
        })

        if (res.ok) {
          const data = await res.json()
          const items = data.items as Wishlist[]

          // 找到匹配的願望清單項目
          const matchedItem = items.find((item) => {
            const itemProductId = typeof item.product === 'object' ? item.product.id : item.product

            if (itemProductId !== product.id) return false

            // 如果有變體，檢查 SKU 是否匹配
            if (selectedVariant && variantInfo.sku) {
              return item.variant?.sku === variantInfo.sku
            }

            // 沒有變體的商品，只檢查 productId
            return !product.enableVariants
          })

          setIsInWishlist(!!matchedItem)
          setWishlistItemId(matchedItem?.id || null)
        }
      } catch (error) {
        console.error('Check wishlist error:', error)
      }
    }

    checkWishlist()
  }, [user, status, product.id, product.enableVariants, selectedVariant, variantInfo.sku])

  // 切換願望清單狀態
  const toggleWishlist = useCallback(async () => {
    if (status !== 'loggedIn' || !user) {
      toast.error('請先登入才能加入願望清單')
      return
    }

    // 如果有變體但未選擇，提示用戶
    if (product.enableVariants && !selectedVariant) {
      toast.error('請先選擇商品規格')
      return
    }

    setIsLoading(true)

    try {
      if (isInWishlist && wishlistItemId) {
        // 從願望清單移除
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/wishlist?id=${wishlistItemId}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        )

        if (res.ok) {
          setIsInWishlist(false)
          setWishlistItemId(null)
          toast.success('已從願望清單移除')
        } else {
          throw new Error('移除失敗')
        }
      } else {
        // 加入願望清單
        const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/wishlist`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: product.id,
            variant: variantInfo,
            notifyOnPriceDrop: true,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setIsInWishlist(true)
          setWishlistItemId(data.item?.id || null)
          toast.success('已加入願望清單')
        } else {
          throw new Error('加入失敗')
        }
      }
    } catch (error) {
      console.error('Toggle wishlist error:', error)
      toast.error('操作失敗，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }, [user, status, product, selectedVariant, isInWishlist, wishlistItemId, variantInfo])

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 rounded-full hover:bg-red-50 transition-colors"
      onClick={toggleWishlist}
      disabled={isLoading}
      aria-label={isInWishlist ? '從願望清單移除' : '加入願望清單'}
      title={isInWishlist ? '從願望清單移除' : '加入願望清單'}
    >
      <Heart
        className={`h-5 w-5 transition-colors ${
          isInWishlist
            ? 'fill-red-500 text-red-500'
            : 'text-gray-400 hover:text-red-400'
        }`}
      />
    </Button>
  )
}
