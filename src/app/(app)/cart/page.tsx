'use client'

import { Price } from '@/components/Price'
import { Product } from '@/payload-types'
import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import {
    ArrowRight,
    Gift,
    Minus,
    Package,
    Plus,
    ShoppingBag,
    Sparkles,
    Trash2,
    Truck,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useMemo } from 'react'

// 免運門檻 ($100 = 10000 cents)
const FREE_SHIPPING_THRESHOLD = 10000
const SHIPPING_FEE = 60

export default function CartPage() {
  const { cart, removeItem, incrementItem, decrementItem, isLoading } = useCart()

  // 計算總數量
  const totalQuantity = useMemo(() => {
    if (!cart || !cart.items || !cart.items.length) return 0
    return cart.items.reduce((quantity, item) => (item.quantity || 0) + quantity, 0)
  }, [cart])

  // 免運計算
  const subtotal = cart?.subtotal || 0
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const shippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD
  const shippingFee = isFreeShipping ? 0 : SHIPPING_FEE
  const total = subtotal + shippingFee

  // 點數計算
  const estimatedPoints = Math.floor(subtotal / 100)

  return (
    <div className="min-h-screen bg-scrapbook-bg-light py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* 頁面標題 */}
        <div className="relative mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-scrapbook-primary/10 rounded-xl border-3 border-scrapbook-primary shadow-[4px_4px_0_0_rgba(45,45,45,0.2)]">
              <ShoppingBag className="w-8 h-8 text-scrapbook-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-scrapbook-fg-light">
                購物車
              </h1>
              <p className="font-body text-scrapbook-fg-light/60">
                {totalQuantity > 0 ? `共 ${totalQuantity} 件商品` : '還沒有商品喔'}
              </p>
            </div>
          </div>
          {/* 膠帶裝飾 */}
          <div
            className="absolute -top-2 right-0 w-20 h-6 bg-amber-100/80 border border-amber-200/50 -rotate-3 hidden md:block"
            style={{
              background:
                'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px), #f5e6c8',
            }}
          />
        </div>

        {/* 空購物車狀態 */}
        {!cart || cart?.items?.length === 0 ? (
          <EmptyCartState />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左側：商品列表 */}
            <div className="lg:col-span-2 space-y-4">
              {/* 免運進度條 */}
              <FreeShippingProgress
                subtotal={subtotal}
                remaining={remaining}
                progress={shippingProgress}
                isFreeShipping={isFreeShipping}
              />

              {/* 商品列表 */}
              <div className="bg-white rounded-xl border-3 border-scrapbook-fg-light p-6 shadow-[6px_6px_0_0_rgba(45,45,45,0.15)]">
                <h2 className="font-display text-xl font-bold text-scrapbook-fg-light mb-4 pb-3 border-b-2 border-dashed border-scrapbook-muted-light">
                  商品明細
                </h2>
                <ul className="divide-y-2 divide-dashed divide-scrapbook-muted-light">
                  {cart?.items?.map((item) => {
                    if (!item.id) return null
                    return (
                      <CartItemRow
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
            </div>

            {/* 右側：結帳摘要 */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 space-y-4">
                {/* 訂單摘要 */}
                <OrderSummary
                  subtotal={subtotal}
                  shippingFee={shippingFee}
                  total={total}
                  estimatedPoints={estimatedPoints}
                  isFreeShipping={isFreeShipping}
                />

                {/* 優惠碼輸入 */}
                <PromoCodeInput />

                {/* 結帳按鈕 */}
                <Link
                  href="/checkout"
                  className="block w-full btn-sketch-primary text-center py-4 text-lg"
                >
                  <span className="flex items-center justify-center gap-2">
                    前往結帳
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </Link>

                {/* 繼續購物 */}
                <Link
                  href="/shop"
                  className="block w-full text-center font-body text-scrapbook-primary hover:underline"
                >
                  ← 繼續購物
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// 商品列表項目
// ============================================
interface CartItemRowProps {
  item: any
  isLoading: boolean
  onRemove: () => void
  onIncrement: () => void
  onDecrement: () => void
}

function CartItemRow({ item, isLoading, onRemove, onIncrement, onDecrement }: CartItemRowProps) {
  const product = item.product as Product
  const variant = item.variant

  if (!product || !product.slug) return null

  // 取得商品圖片
  const metaImage =
    product.meta?.image && typeof product.meta?.image === 'object' ? product.meta.image : undefined
  const firstGalleryImage =
    typeof product.gallery?.[0]?.image === 'object' ? product.gallery?.[0]?.image : undefined
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

  const itemTotal = (price || 0) * (item.quantity || 1)

  return (
    <li className="py-6 first:pt-0 last:pb-0">
      <div className="flex gap-4">
        {/* 商品圖片 */}
        <Link href={`/products/${product.slug}`} className="flex-shrink-0 group">
          <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden border-3 border-scrapbook-muted-light bg-scrapbook-muted-light shadow-[3px_3px_0_0_rgba(45,45,45,0.1)] group-hover:shadow-[4px_4px_0_0_rgba(45,45,45,0.15)] transition-shadow">
            {image?.url && (
              <Image
                alt={image?.alt || product?.title || ''}
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                fill
                sizes="(max-width: 768px) 96px, 128px"
                src={image.url}
              />
            )}
          </div>
        </Link>

        {/* 商品資訊 */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between gap-4">
            <div className="flex-1">
              <Link
                href={`/products/${product.slug}`}
                className="font-display text-lg font-bold text-scrapbook-fg-light hover:text-scrapbook-primary transition-colors line-clamp-2"
              >
                {product?.title}
              </Link>

              {/* 變體選項 */}
              {isVariant && variant && (
                <p className="font-body text-sm text-scrapbook-fg-light/60 mt-1 capitalize">
                  {variant.options
                    ?.map((option: any) => {
                      if (typeof option === 'object') return option.label
                      return null
                    })
                    .filter(Boolean)
                    .join(' / ')}
                </p>
              )}

              {/* 單價 */}
              {typeof price === 'number' && (
                <div className="mt-2">
                  <span className="font-body text-sm text-scrapbook-fg-light/60">單價：</span>
                  <Price amount={price} className="font-display text-sm text-scrapbook-fg-light" />
                </div>
              )}
            </div>

            {/* 小計 */}
            <div className="text-right">
              <Price
                amount={itemTotal}
                className="font-display text-lg font-bold text-scrapbook-primary"
              />
            </div>
          </div>

          {/* 數量控制 & 刪除 */}
          <div className="flex items-center justify-between mt-4">
            {/* 數量調整 */}
            <div className="inline-flex items-center border-3 border-scrapbook-fg-light rounded-lg overflow-hidden shadow-[2px_2px_0_0_rgba(45,45,45,0.1)]">
              <button
                type="button"
                disabled={isLoading}
                onClick={onDecrement}
                className="w-10 h-10 flex items-center justify-center hover:bg-scrapbook-muted-light transition-colors cursor-pointer disabled:opacity-50"
                aria-label="減少數量"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 h-10 flex items-center justify-center font-display text-base font-bold border-x-3 border-scrapbook-fg-light bg-white">
                {item.quantity || 1}
              </span>
              <button
                type="button"
                disabled={isLoading}
                onClick={onIncrement}
                className="w-10 h-10 flex items-center justify-center hover:bg-scrapbook-muted-light transition-colors cursor-pointer disabled:opacity-50"
                aria-label="增加數量"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* 刪除按鈕 */}
            <button
              type="button"
              disabled={isLoading}
              onClick={onRemove}
              className="flex items-center gap-2 px-3 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              aria-label="移除商品"
            >
              <Trash2 className="w-4 h-4" />
              <span className="font-body text-sm hidden sm:inline">移除</span>
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}

// ============================================
// 免運進度條
// ============================================
interface FreeShippingProgressProps {
  subtotal: number
  remaining: number
  progress: number
  isFreeShipping: boolean
}

function FreeShippingProgress({
  remaining,
  progress,
  isFreeShipping,
}: FreeShippingProgressProps) {
  if (isFreeShipping) {
    return (
      <div className="bg-green-50 rounded-xl border-3 border-green-300 p-4 shadow-[4px_4px_0_0_rgba(34,197,94,0.2)]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Truck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-display font-bold text-green-700">🎉 恭喜！您已符合免運資格</p>
            <p className="font-body text-sm text-green-600">感謝您的支持！</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 rounded-xl border-3 border-amber-200 p-4 shadow-[4px_4px_0_0_rgba(251,191,36,0.2)]">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Package className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="font-display font-bold text-amber-800">
            再買 <span className="text-scrapbook-accent">${(remaining / 100).toFixed(2)}</span> 即可享免運！
          </p>

        </div>
      </div>
      <div className="h-3 bg-amber-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

// ============================================
// 訂單摘要
// ============================================
interface OrderSummaryProps {
  subtotal: number
  shippingFee: number
  total: number
  estimatedPoints: number
  isFreeShipping: boolean
}

function OrderSummary({
  subtotal,
  shippingFee,
  total,
  estimatedPoints,
  isFreeShipping,
}: OrderSummaryProps) {
  return (
    <div className="bg-white rounded-xl border-3 border-scrapbook-fg-light p-6 shadow-[6px_6px_0_0_rgba(45,45,45,0.15)]">
      {/* 膠帶裝飾 */}
      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-5 bg-amber-100/90 border border-amber-200/50 rotate-1 hidden"
        style={{
          background:
            'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px), #f5e6c8',
        }}
      />

      <h2 className="font-display text-xl font-bold text-scrapbook-fg-light mb-4 pb-3 border-b-2 border-dashed border-scrapbook-muted-light">
        訂單摘要
      </h2>

      <div className="space-y-3">
        {/* 小計 */}
        <div className="flex justify-between font-body text-scrapbook-fg-light">
          <span>商品小計</span>
          <Price amount={subtotal} />
        </div>

        {/* 運費 */}
        <div className="flex justify-between font-body text-scrapbook-fg-light">
          <span>運費</span>
          {isFreeShipping ? (
            <span className="text-green-600 font-medium">免運費</span>
          ) : (
            <Price amount={shippingFee} />
          )}
        </div>

        {/* 分隔線 */}
        <div className="border-t-2 border-dashed border-scrapbook-muted-light my-3" />

        {/* 總計 */}
        <div className="flex justify-between items-center">
          <span className="font-display text-lg font-bold text-scrapbook-fg-light">總計</span>
          <Price
            amount={total}
            className="font-display text-2xl font-bold text-scrapbook-primary"
          />
        </div>

        {/* 點數預覽 */}
        {estimatedPoints > 0 && (
          <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="font-body text-sm text-amber-800">
              結帳可獲得 <span className="font-bold">{estimatedPoints}</span> 點
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// 優惠碼輸入
// ============================================
function PromoCodeInput() {
  return (
    <div className="bg-white rounded-xl border-3 border-scrapbook-fg-light p-4 shadow-[4px_4px_0_0_rgba(45,45,45,0.1)]">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-5 h-5 text-scrapbook-primary" />
        <span className="font-display font-bold text-scrapbook-fg-light">優惠碼</span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="輸入優惠碼"
          className="flex-1 px-4 py-2 border-2 border-scrapbook-muted-light rounded-lg font-body focus:border-scrapbook-primary focus:outline-none transition-colors"
        />
        <button
          type="button"
          className="px-4 py-2 bg-scrapbook-fg-light text-white font-display font-bold rounded-lg hover:bg-scrapbook-fg-light/90 transition-colors cursor-pointer"
        >
          套用
        </button>
      </div>
    </div>
  )
}

// ============================================
// 空購物車狀態
// ============================================
function EmptyCartState() {
  return (
    <div className="bg-white rounded-xl border-3 border-scrapbook-fg-light p-12 shadow-[6px_6px_0_0_rgba(45,45,45,0.15)] text-center max-w-lg mx-auto">
      {/* 裝飾性插圖 */}
      <div className="relative inline-block mb-6">
        <div className="w-32 h-32 rounded-full bg-scrapbook-muted-light flex items-center justify-center border-4 border-dashed border-scrapbook-primary/30">
          <ShoppingBag className="w-16 h-16 text-scrapbook-primary/50" />
        </div>
        {/* 便條紙裝飾 */}
        <div className="absolute -bottom-2 -right-4 rotate-6 bg-amber-100 px-4 py-2 text-sm font-body border border-amber-200 shadow-sm">
          空空如也～
        </div>
      </div>

      <h2 className="font-display text-2xl font-bold text-scrapbook-fg-light mb-3">
        購物車內沒有商品
      </h2>
      <p className="font-body text-scrapbook-fg-light/60 mb-8">快來挑選喜歡的商品吧！</p>

      <Link href="/shop" className="inline-block btn-sketch-primary px-8 py-3 text-lg">
        開始購物
      </Link>
    </div>
  )
}
