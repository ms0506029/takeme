'use client'

import { Button } from '@/components/ui/button'
import { Media } from '@/components/Media'
import type { Media as MediaType, Product, RestockRequest, Variant } from '@/payload-types'
import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import { useCartDrawer } from '@/components/Cart/CartDrawer'
import { useAuth } from '@/providers/Auth'
import { Bell, BellRing, Loader2, ShoppingCart } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { VariantWishlistButton } from './VariantWishlistButton'

type Props = {
  product: Product
}

type VariantInfo = {
  variant: Variant
  colorLabel: string
  sizeLabel: string
  inventory: number
  sku: string
}

type ColorGroup = {
  colorLabel: string
  colorOptionId: string
  thumbnail: MediaType | null
  variants: VariantInfo[]
}

export function VariantMatrix({ product }: Props) {
  const variantTypes = product.variantTypes || []

  // 解析變體類型：找出顏色和尺寸的 type
  const colorType = variantTypes.find((type) => {
    if (typeof type !== 'object') return false
    const name = type.name?.toLowerCase() || ''
    return name.includes('color') || name.includes('顏色')
  })

  const sizeType = variantTypes.find((type) => {
    if (typeof type !== 'object') return false
    const name = type.name?.toLowerCase() || ''
    return name.includes('size') || name.includes('尺寸')
  })

  // 按顏色分組變體
  const colorGroups = useMemo<ColorGroup[]>(() => {
    const variants = product.variants?.docs || []
    const gallery = product.gallery || []

    if (!variants.length) return []

    const groups = new Map<string, ColorGroup>()

    variants.forEach((variant) => {
      if (typeof variant !== 'object') return

      let colorLabel = ''
      let colorOptionId = ''
      let sizeLabel = ''

      variant.options?.forEach((opt) => {
        if (typeof opt !== 'object') return

        // 注意：欄位是 variantType 不是 type
        const typeId =
          typeof opt.variantType === 'object' ? opt.variantType.id : opt.variantType
        const typeName =
          typeof opt.variantType === 'object' ? opt.variantType.name?.toLowerCase() || '' : ''

        if (
          (colorType && typeof colorType === 'object' && typeId === colorType.id) ||
          typeName.includes('color') ||
          typeName.includes('顏色')
        ) {
          colorLabel = opt.label || ''
          colorOptionId = opt.id || ''
        }

        if (
          (sizeType && typeof sizeType === 'object' && typeId === sizeType.id) ||
          typeName.includes('size') ||
          typeName.includes('尺寸')
        ) {
          sizeLabel = opt.label || ''
        }
      })

      // 如果沒有顏色，使用 'default'
      const groupKey = colorOptionId || 'default'

      if (!groups.has(groupKey)) {
        // 找出該顏色的縮圖
        const colorThumbnail = gallery.find((item) => {
          if (!item.variantOption) return false
          const optionId =
            typeof item.variantOption === 'object' ? item.variantOption.id : item.variantOption
          return String(optionId) === colorOptionId
        })

        groups.set(groupKey, {
          colorLabel: colorLabel || '預設',
          colorOptionId: groupKey,
          thumbnail:
            colorThumbnail && typeof colorThumbnail.image === 'object'
              ? colorThumbnail.image
              : null,
          variants: [],
        })
      }

      groups.get(groupKey)!.variants.push({
        variant,
        colorLabel: colorLabel || '預設',
        sizeLabel: sizeLabel || '預設',
        inventory: variant.inventory || 0,
        sku: variant.sku || '',
      })
    })

    // 轉換為陣列並排序
    return Array.from(groups.values()).sort((a, b) => a.colorLabel.localeCompare(b.colorLabel))
  }, [product.variants?.docs, product.gallery, colorType, sizeType])

  if (!colorGroups.length) {
    return null
  }

  return (
    <div className="space-y-4">
      {colorGroups.map((group) => (
        <ColorGroupCard key={group.colorOptionId} group={group} product={product} />
      ))}
    </div>
  )
}

// 顏色分組卡片
function ColorGroupCard({ group, product }: { group: ColorGroup; product: Product }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex">
        {/* 左側縮圖 */}
        <div className="w-20 h-auto flex-shrink-0 bg-gray-50 flex items-center justify-center border-r">
          {group.thumbnail ? (
            <Media
              resource={group.thumbnail}
              className="w-full h-full object-cover"
              imgClassName="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <span className="text-xs text-gray-400">無圖</span>
            </div>
          )}
        </div>

        {/* 右側尺寸列表 */}
        <div className="flex-1 divide-y">
          {/* 顏色標題 */}
          <div className="px-3 py-2 bg-gray-50">
            <span className="text-sm font-medium">{group.colorLabel}</span>
          </div>

          {/* 尺寸行 */}
          {group.variants.map((variantInfo) => (
            <VariantRow
              key={variantInfo.sku || variantInfo.variant.id}
              variantInfo={variantInfo}
              product={product}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// 單個變體行
function VariantRow({ variantInfo, product }: { variantInfo: VariantInfo; product: Product }) {
  const { variant, colorLabel, sizeLabel, inventory, sku } = variantInfo
  const isOutOfStock = inventory <= 0

  return (
    <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors">
      {/* 尺寸標籤 */}
      <span className="w-10 text-sm font-medium flex-shrink-0">{sizeLabel}</span>

      {/* 庫存狀態 */}
      <span
        className={`text-xs flex-shrink-0 ${isOutOfStock ? 'text-red-500' : 'text-green-600'}`}
      >
        {isOutOfStock ? '缺貨' : inventory < 10 ? `剩 ${inventory}` : '有庫存'}
      </span>

      {/* 操作按鈕 */}
      <div className="flex-1 flex items-center justify-end gap-1">
        {isOutOfStock ? (
          <RestockButton product={product} variantInfo={variantInfo} />
        ) : (
          <AddToCartButton product={product} variant={variant} />
        )}

        <VariantWishlistButton
          product={product}
          variantSku={sku}
          colorLabel={colorLabel}
          sizeLabel={sizeLabel}
        />
      </div>
    </div>
  )
}

// 加入購物車按鈕（行內版）
function AddToCartButton({ product, variant }: { product: Product; variant: Variant }) {
  const { addItem, cart, isLoading } = useCart()
  const { openCart } = useCartDrawer()

  const isInCart = useMemo(() => {
    return cart?.items?.some((item) => {
      const productID = typeof item.product === 'object' ? item.product?.id : item.product
      const variantID = item.variant
        ? typeof item.variant === 'object'
          ? item.variant?.id
          : item.variant
        : undefined
      return productID === product.id && variantID === variant.id
    })
  }, [cart?.items, product.id, variant.id])

  const handleAddToCart = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      await addItem({
        product: product.id,
        variant: variant.id,
      })
      toast.success('商品已加入購物車')
      openCart()
    },
    [addItem, product.id, variant.id, openCart]
  )

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs gap-1"
      onClick={handleAddToCart}
      disabled={isLoading || isInCart}
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <ShoppingCart className="h-3 w-3" />
      )}
      {isInCart ? '已加入' : '加入購物車'}
    </Button>
  )
}

// 到貨通知按鈕（行內版）
function RestockButton({
  product,
  variantInfo,
}: {
  product: Product
  variantInfo: VariantInfo
}) {
  const { user, status } = useAuth()
  const [hasRequested, setHasRequested] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { colorLabel, sizeLabel, sku } = variantInfo

  // 檢查是否已申請補貨通知
  useEffect(() => {
    if (status !== 'loggedIn' || !user) {
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
          const items = data.items || []

          const matchedItem = items.find((item: RestockRequest) => {
            const itemProductId = typeof item.product === 'object' ? item.product.id : item.product
            if (itemProductId !== product.id) return false
            if (item.status !== 'pending') return false
            return item.variant?.sku === sku
          })

          setHasRequested(!!matchedItem)
          setRequestId(matchedItem?.id || null)
        }
      } catch (error) {
        console.error('Check restock request error:', error)
      }
    }

    checkRestockRequest()
  }, [user, status, product.id, sku])

  const handleRestockRequest = useCallback(async () => {
    if (status !== 'loggedIn' || !user) {
      toast.error('請先登入才能申請補貨通知')
      return
    }

    setIsLoading(true)

    try {
      if (hasRequested && requestId) {
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/restock-requests`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: product.id,
            variant: { color: colorLabel, size: sizeLabel, sku },
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setHasRequested(true)
          setRequestId(data.item?.id || null)
          toast.success('已申請補貨通知')
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
  }, [user, status, product.id, hasRequested, requestId, colorLabel, sizeLabel, sku])

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-7 px-2 text-xs gap-1 ${hasRequested ? 'text-amber-600' : 'text-gray-500'}`}
      onClick={handleRestockRequest}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : hasRequested ? (
        <BellRing className="h-3 w-3" />
      ) : (
        <Bell className="h-3 w-3" />
      )}
      {hasRequested ? '已訂閱' : '到貨通知'}
    </Button>
  )
}
