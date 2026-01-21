'use client'

import { Price } from '@/components/Price'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Product } from '@/payload-types'
import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import {
    Minus,
    Package,
    Plus,
    ShoppingBag,
    Sparkles,
    X
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// ============================================
// CartDrawer Context - 全域購物車抽屜控制
// ============================================
interface CartDrawerContextValue {
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

const CartDrawerContext = createContext<CartDrawerContextValue>({
  isOpen: false,
  openCart: () => {},
  closeCart: () => {},
  toggleCart: () => {},
})

export function useCartDrawer() {
  return useContext(CartDrawerContext)
}

// ============================================
// CartDrawer Provider - 包裹整個應用
// ============================================
export function CartDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // 當路徑變化時關閉抽屜
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), [])

  return (
    <CartDrawerContext.Provider value={{ isOpen, openCart, closeCart, toggleCart }}>
      {children}
      <CartDrawerSheet isOpen={isOpen} onOpenChange={setIsOpen} />
    </CartDrawerContext.Provider>
  )
}

// ============================================
// CartDrawerSheet - Scrapbook Retro 風格購物車抽屜
// ============================================
interface CartDrawerSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

function CartDrawerSheet({ isOpen, onOpenChange }: CartDrawerSheetProps) {
  const { cart, removeItem, incrementItem, decrementItem, isLoading } = useCart()


  // 計算總數量
  const totalQuantity = useMemo(() => {
    if (!cart || !cart.items || !cart.items.length) return 0
    return cart.items.reduce((quantity, item) => (item.quantity || 0) + quantity, 0)
  }, [cart])

  // 免運計算（暫時硬編碼，後續會從 SiteSettings 讀取，$100 = 10000 cents）
  const freeShippingThreshold = 10000

  const subtotal = cart?.subtotal || 0
  const remaining = Math.max(0, freeShippingThreshold - subtotal)
  const shippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100)
  const isFreeShipping = subtotal >= freeShippingThreshold

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        className="flex flex-col w-full max-w-md bg-scrapbook-bg-light border-l-4 border-scrapbook-fg-light p-0 overflow-hidden"
        style={{ boxShadow: '-8px 0 0 0 rgba(45, 45, 45, 0.3)' }}
      >
        {/* 頂部標題區 - 膠帶裝飾 */}
        <SheetHeader className="relative px-6 pt-6 pb-4 border-b-2 border-dashed border-scrapbook-muted-light">
          {/* 膠帶裝飾 */}
          <div 
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-24 h-5 bg-amber-100/90 border border-amber-200/50 rotate-1"
            style={{ 
              background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px), #f5e6c8',
            }}
          />
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-scrapbook-primary/10 rounded-lg border-2 border-scrapbook-primary">
              <ShoppingBag className="w-5 h-5 text-scrapbook-primary" />
            </div>
            <div>
              <SheetTitle className="font-display text-xl text-scrapbook-fg-light">
                購物車
              </SheetTitle>
              <SheetDescription className="font-body text-sm text-scrapbook-fg-light/60">
                {totalQuantity > 0 ? `${totalQuantity} 件商品` : '開始購物吧！'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* 免運進度條 */}
        {!isFreeShipping && subtotal > 0 && (
          <div className="px-6 py-3 bg-amber-50/50 border-b border-scrapbook-muted-light">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-scrapbook-primary" />
              <span className="font-body text-sm text-scrapbook-fg-light">
                再買 <span className="font-bold text-scrapbook-accent">${(remaining / 100).toFixed(2)}</span> 即可免運！
              </span>

            </div>
            <div className="h-2 bg-scrapbook-muted-light rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-scrapbook-primary to-scrapbook-accent transition-all duration-500 ease-out rounded-full"
                style={{ width: `${shippingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 已達免運提示 */}
        {isFreeShipping && subtotal > 0 && (
          <div className="px-6 py-3 bg-green-50 border-b border-green-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-600" />
              <span className="font-body text-sm text-green-700 font-medium">
                🎉 恭喜！您已符合免運資格
              </span>
            </div>
          </div>
        )}

        {/* 購物車內容 */}
        {!cart || cart?.items?.length === 0 ? (
          // 空購物車狀態
          <EmptyCartState onClose={() => onOpenChange(false)} />
        ) : (
          <>
            {/* 商品列表 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ul className="space-y-4">
                {cart?.items?.map((item) => {
                  if (!item.id) return null
                  return (
                    <CartItem 
                      key={item.id}
                      item={item}
                      isLoading={isLoading}
                      onRemove={() => removeItem(item.id!)}
                      onIncrement={() => incrementItem(item.id!)}
                      onDecrement={() => {
                        if ((item.quantity || 1) <= 1) {
                          removeItem(item.id!)
                        } else {
                          decrementItem(item.id!)
                        }
                      }}
                    />
                  )
                })}

              </ul>
            </div>

            {/* 底部結帳區 */}
            <CartFooter subtotal={subtotal} shippingFee={isFreeShipping ? 0 : 60} />
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ============================================
// CartItem - 商品項目 (Scrapbook 風格)
// ============================================
interface CartItemProps {
  item: any
  isLoading?: boolean
  onRemove: () => void
  onIncrement: () => void
  onDecrement: () => void
}

function CartItem({ item, isLoading, onRemove, onIncrement, onDecrement }: CartItemProps) {

  const product = item.product as Product
  const variant = item.variant

  if (!product || !product.slug) return null

  // 取得商品圖片
  const metaImage =
    product.meta?.image && typeof product.meta?.image === 'object'
      ? product.meta.image
      : undefined
  const firstGalleryImage =
    typeof product.gallery?.[0]?.image === 'object'
      ? product.gallery?.[0]?.image
      : undefined
  let image = firstGalleryImage || metaImage

  // 取得價格
  let price = product.priceInUSD
  const isVariant = Boolean(variant) && typeof variant === 'object'

  if (isVariant) {
    price = variant?.priceInUSD
    // 嘗試找到對應變體的圖片
    const imageVariant = product.gallery?.find((galleryItem) => {
      if (!galleryItem.variantOption) return false
      const variantOptionID =
        typeof galleryItem.variantOption === 'object'
          ? galleryItem.variantOption.id
          : galleryItem.variantOption
      const hasMatch = variant?.options?.some((option: any) => {
        if (typeof option === 'object') return option.id === variantOptionID
        else return option === variantOptionID
      })
      return hasMatch
    })
    if (imageVariant && typeof imageVariant.image === 'object') {
      image = imageVariant.image
    }
  }

  return (
    <li className="relative bg-white rounded-lg border-2 border-scrapbook-muted-light p-3 shadow-[3px_3px_0_0_rgba(45,45,45,0.15)] hover:shadow-[4px_4px_0_0_rgba(45,45,45,0.2)] transition-shadow group">
      {/* 刪除按鈕 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="absolute -top-2 -right-2 w-6 h-6 bg-scrapbook-accent text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors shadow-sm cursor-pointer z-10"
        aria-label="移除商品"
      >
        <X className="w-3 h-3" />
      </button>

      <div className="flex gap-3">
        {/* 商品圖片 */}
        <Link href={`/products/${product.slug}`} className="flex-shrink-0">
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-scrapbook-muted-light bg-scrapbook-muted-light">
            {image?.url && (
              <Image
                alt={image?.alt || product?.title || ''}
                className="object-cover"
                fill
                sizes="80px"
                src={image.url}
              />
            )}
          </div>
        </Link>

        {/* 商品資訊 */}
        <div className="flex-1 min-w-0">
          <Link 
            href={`/products/${product.slug}`}
            className="font-display text-sm font-medium text-scrapbook-fg-light hover:text-scrapbook-primary transition-colors line-clamp-2"
          >
            {product?.title}
          </Link>
          
          {/* 變體選項 */}
          {isVariant && variant && (
            <p className="font-body text-xs text-scrapbook-fg-light/60 mt-0.5 capitalize">
              {variant.options
                ?.map((option: any) => {
                  if (typeof option === 'object') return option.label
                  return null
                })
                .filter(Boolean)
                .join(' / ')}
            </p>
          )}


          {/* 價格 */}
          {typeof price === 'number' && (
            <div className="mt-1">
              <Price
                amount={price * (item.quantity || 1)}
                className="font-display text-sm font-bold text-scrapbook-primary"
              />
            </div>
          )}

          {/* 數量調整 */}
          <div className="flex items-center gap-2 mt-2">
            <div className="inline-flex items-center border-2 border-scrapbook-fg-light rounded-lg overflow-hidden relative z-10">
              <button
                type="button"
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation()
                  onDecrement()
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-scrapbook-muted-light transition-colors cursor-pointer active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="減少數量"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-8 h-8 flex items-center justify-center font-display text-sm font-medium border-x-2 border-scrapbook-fg-light bg-white">
                {item.quantity || 1}
              </span>
              <button
                type="button"
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation()
                  onIncrement()
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-scrapbook-muted-light transition-colors cursor-pointer active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="增加數量"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </li>
  )

}

// ============================================
// EmptyCartState - 空購物車狀態
// ============================================
function EmptyCartState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
      {/* 裝飾性插圖 */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-scrapbook-muted-light flex items-center justify-center border-4 border-dashed border-scrapbook-primary/30">
          <ShoppingBag className="w-12 h-12 text-scrapbook-primary/50" />
        </div>
        {/* 便條紙裝飾 */}
        <div className="absolute -bottom-2 -right-2 rotate-6 bg-amber-100 px-3 py-1 text-xs font-body border border-amber-200 shadow-sm">
          空空如也～
        </div>
      </div>

      <h3 className="font-display text-lg font-bold text-scrapbook-fg-light mb-2">
        購物車內沒有商品
      </h3>
      <p className="font-body text-sm text-scrapbook-fg-light/60 mb-6">
        快來挑選喜歡的商品吧！
      </p>

      <Link 
        href="/shop" 
        onClick={onClose}
        className="btn-sketch-primary"
      >
        繼續購物
      </Link>
    </div>
  )
}

// ============================================
// CartFooter - 結帳區域
// ============================================
interface CartFooterProps {
  subtotal: number
  shippingFee: number
}

function CartFooter({ subtotal, shippingFee }: CartFooterProps) {
  const total = subtotal + shippingFee
  
  // 預計獲得點數（假設 100 元 = 1 點）
  const estimatedPoints = Math.floor(subtotal / 100)

  return (
    <div className="border-t-2 border-dashed border-scrapbook-muted-light bg-white px-6 py-4">
      {/* 點數預覽 */}
      {estimatedPoints > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span className="font-body text-sm text-amber-800">
            結帳可獲得 <span className="font-bold">{estimatedPoints}</span> 點
          </span>
        </div>
      )}

      {/* 小計 */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between font-body text-sm text-scrapbook-fg-light/80">
          <span>小計</span>
          <Price amount={subtotal} />
        </div>
        <div className="flex justify-between font-body text-sm text-scrapbook-fg-light/80">
          <span>運費</span>
          {shippingFee === 0 ? (
            <span className="text-green-600 font-medium">免運費</span>
          ) : (
            <Price amount={shippingFee} />
          )}
        </div>
        <div className="flex justify-between pt-2 border-t border-scrapbook-muted-light">
          <span className="font-display font-bold text-scrapbook-fg-light">總計</span>
          <Price 
            amount={total} 
            className="font-display text-lg font-bold text-scrapbook-primary"
          />
        </div>
      </div>

      {/* 結帳按鈕 */}
      <div className="space-y-2">
        <Link 
          href="/checkout" 
          className="block w-full btn-sketch-primary text-center"
        >
          前往結帳
        </Link>
        <Link 
          href="/cart" 
          className="block w-full btn-sketch-secondary text-center text-sm"
        >
          查看購物車
        </Link>
      </div>
    </div>
  )
}
