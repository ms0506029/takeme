'use client'

import { Button } from '@/components/ui/button'
import type { Product, Wishlist } from '@/payload-types'
import { useAuth } from '@/providers/Auth'
import { Heart, Loader2 } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

type Props = {
  product: Product
  variantSku: string
  colorLabel: string
  sizeLabel: string
}

export function VariantWishlistButton({ product, variantSku, colorLabel, sizeLabel }: Props) {
  const { user, status } = useAuth()
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [wishlistItemId, setWishlistItemId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 檢查此變體是否在願望清單中
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

          const matchedItem = items.find((item) => {
            const itemProductId = typeof item.product === 'object' ? item.product.id : item.product
            if (itemProductId !== product.id) return false
            return item.variant?.sku === variantSku
          })

          setIsInWishlist(!!matchedItem)
          setWishlistItemId(matchedItem?.id || null)
        }
      } catch (error) {
        console.error('Check wishlist error:', error)
      }
    }

    checkWishlist()
  }, [user, status, product.id, variantSku])

  const toggleWishlist = useCallback(async () => {
    if (status !== 'loggedIn' || !user) {
      toast.error('請先登入才能加入願望清單')
      return
    }

    setIsLoading(true)

    try {
      if (isInWishlist && wishlistItemId) {
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/wishlist`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: product.id,
            variant: {
              color: colorLabel,
              size: sizeLabel,
              sku: variantSku,
            },
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
  }, [user, status, product.id, isInWishlist, wishlistItemId, variantSku, colorLabel, sizeLabel])

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`min-h-[36px] min-w-[36px] h-9 w-9 rounded-full transition-all duration-200 flex-shrink-0 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-400 ${
        isInWishlist ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-red-50'
      }`}
      onClick={toggleWishlist}
      disabled={isLoading}
      aria-label={isInWishlist ? '從願望清單移除' : '加入願望清單'}
      aria-pressed={isInWishlist}
      title={isInWishlist ? '從願望清單移除' : '加入願望清單'}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Heart
          className={`h-5 w-5 transition-all duration-200 ${
            isInWishlist ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-400 hover:text-red-400'
          }`}
          aria-hidden="true"
        />
      )}
    </Button>
  )
}
