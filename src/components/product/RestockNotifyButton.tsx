'use client'

import { Button } from '@/components/ui/button'
import type { Product, RestockRequest, Variant } from '@/payload-types'
import { useAuth } from '@/providers/Auth'
import { Bell, BellRing, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

type Props = {
  product: Product
}

export function RestockNotifyButton({ product }: Props) {
  const { user, status } = useAuth()
  const searchParams = useSearchParams()
  const [hasRequested, setHasRequested] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)
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

  // 檢查庫存狀態
  const isOutOfStock = useMemo(() => {
    if (product.enableVariants) {
      if (selectedVariant) {
        return !selectedVariant.inventory || selectedVariant.inventory <= 0
      }
      // 如果有變體但未選擇，不顯示按鈕
      return false
    }
    return !product.inventory || product.inventory <= 0
  }, [product.enableVariants, product.inventory, selectedVariant])

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

  // 檢查是否已申請補貨通知
  useEffect(() => {
    if (status !== 'loggedIn' || !user || !isOutOfStock) {
      setHasRequested(false)
      setRequestId(null)
      return
    }

    const checkRestockRequest = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/restock-requests`, {
          credentials: 'include',
        })

        if (res.ok) {
          const data = await res.json()
          const items = data.items as RestockRequest[]

          // 找到匹配的補貨申請（只考慮 pending 狀態）
          const matchedItem = items.find((item) => {
            const itemProductId = typeof item.product === 'object' ? item.product.id : item.product

            if (itemProductId !== product.id) return false
            if (item.status !== 'pending') return false

            // 如果有變體，檢查 SKU 是否匹配
            if (selectedVariant && variantInfo.sku) {
              return item.variant?.sku === variantInfo.sku
            }

            // 沒有變體的商品，只檢查 productId
            return !product.enableVariants
          })

          setHasRequested(!!matchedItem)
          setRequestId(matchedItem?.id || null)
        }
      } catch (error) {
        console.error('Check restock request error:', error)
      }
    }

    checkRestockRequest()
  }, [user, status, product.id, product.enableVariants, selectedVariant, variantInfo.sku, isOutOfStock])

  // 申請或取消補貨通知
  const handleRestockRequest = useCallback(async () => {
    if (status !== 'loggedIn' || !user) {
      toast.error('請先登入才能申請補貨通知')
      return
    }

    setIsLoading(true)

    try {
      if (hasRequested && requestId) {
        // 取消申請
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/restock-requests?id=${requestId}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        )

        if (res.ok) {
          setHasRequested(false)
          setRequestId(null)
          toast.success('已取消補貨通知')
        } else {
          throw new Error('取消失敗')
        }
      } else {
        // 申請補貨通知
        const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/restock-requests`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: product.id,
            variant: variantInfo,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setHasRequested(true)
          setRequestId(data.item?.id || null)
          toast.success('已申請補貨通知，商品到貨時會通知您')
        } else {
          throw new Error('申請失敗')
        }
      }
    } catch (error) {
      console.error('Restock request error:', error)
      toast.error('操作失敗，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }, [user, status, product.id, hasRequested, requestId, variantInfo])

  // 如果不是缺貨狀態，不顯示此按鈕
  if (!isOutOfStock) {
    return null
  }

  // 如果有變體但未選擇，不顯示
  if (product.enableVariants && !selectedVariant) {
    return null
  }

  return (
    <Button
      variant={hasRequested ? 'secondary' : 'outline'}
      className={`gap-2 ${hasRequested ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200' : ''}`}
      onClick={handleRestockRequest}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : hasRequested ? (
        <BellRing className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {hasRequested ? '已訂閱補貨通知' : '到貨通知我'}
    </Button>
  )
}
