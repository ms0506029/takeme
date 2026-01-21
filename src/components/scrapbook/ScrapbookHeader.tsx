'use client'

import { useCartDrawer } from '@/components/Cart/CartDrawer'
import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import { Heart, Search, ShoppingBag, User } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'

export interface ScrapbookHeaderProps {
  /** 網站名稱 (從後台讀取) */
  siteName?: string
  /** 公告條文字 */
  announcementText?: string
  /** 導航項目 */
  navItems?: { label: string; href: string }[]
  /** 搜尋框佔位符 */
  searchPlaceholder?: string
  /** 顯示公告條 */
  showAnnouncement?: boolean
}

/**
 * Scrapbook Header
 * 
 * 完整的頁首組件，包含：
 * - 頂部公告條（銅棕色背景）
 * - 主列：搜尋框（左）、Logo（中）、圖示（右）
 * - 導航列（置中）
 * - Sticky + 毛玻璃效果
 * 
 * Icon 功能：
 * - ❤️ 愛心 → /account/wishlist
 * - 👤 帳號 → /account
 * - 🛒 購物車 → 開啟 CartDrawer
 */
export function ScrapbookHeader({
  siteName = 'Daytona Park',
  announcementText = 'FREE SHIPPING ON ORDERS OVER $100',
  navItems = [
    { label: 'MEN', href: '/shop/men' },
    { label: 'WOMEN', href: '/shop/women' },
    { label: 'LIFESTYLE', href: '/shop/lifestyle' },
    { label: 'SALE', href: '/shop/sale' },
  ],
  searchPlaceholder = 'What are you looking for?',
  showAnnouncement = true,
}: ScrapbookHeaderProps) {
  const { cart } = useCart()
  const { openCart } = useCartDrawer()

  // 計算購物車商品數量
  const totalQuantity = useMemo(() => {
    if (!cart || !cart.items || !cart.items.length) return 0
    return cart.items.reduce((quantity, item) => (item.quantity || 0) + quantity, 0)
  }, [cart])

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* 公告條 */}
      {showAnnouncement && (
        <div className="w-full bg-scrapbook-primary text-white text-center py-2 px-4">
          <p className="font-display text-xs md:text-sm tracking-wider uppercase">
            {announcementText}
          </p>
        </div>
      )}

      {/* 主 Header 列 - 毛玻璃效果 */}
      <div className="bg-scrapbook-bg-light/80 backdrop-blur-md border-b border-scrapbook-muted-light">
        {/* 主 Header 列內容 - 使用 relative + absolute 實現真正置中 */}
        <div className="container relative flex items-center py-4">
          {/* 左側：搜尋框 */}
          <div className="w-64 max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-scrapbook-fg-light/50" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 rounded-full border-2 border-scrapbook-fg-light/20 bg-white/80 backdrop-blur-sm font-body text-sm focus:outline-none focus:border-scrapbook-primary transition-colors"
              />
            </div>
          </div>

          {/* 中央：Logo - 使用 absolute 實現真正水平置中 */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Link href="/" className="inline-block">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-scrapbook-primary tracking-wide whitespace-nowrap">
                {siteName}
              </h1>
            </Link>
          </div>

          {/* 右側：圖示 - 功能已接上 */}
          <div className="ml-auto flex items-center gap-4">
            {/* ❤️ 愛心 → 願望清單 */}
            <Link
              href="/account/wishlist"
              aria-label="願望清單"
              className="p-2 hover:text-scrapbook-primary transition-colors cursor-pointer"
            >
              <Heart className="w-5 h-5" />
            </Link>

            {/* 👤 帳號 → 會員中心 */}
            <Link
              href="/account"
              aria-label="會員中心"
              className="p-2 hover:text-scrapbook-primary transition-colors cursor-pointer"
            >
              <User className="w-5 h-5" />
            </Link>

            {/* 🛒 購物車 → 開啟 CartDrawer + Badge */}
            <button
              onClick={openCart}
              aria-label="購物車"
              className="relative p-2 hover:text-scrapbook-primary transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5" />
              {/* 購物車 Badge - 紅點 + 數量 */}
              {totalQuantity > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-scrapbook-accent rounded-full border-2 border-scrapbook-bg-light shadow-sm">
                  {totalQuantity > 99 ? '99+' : totalQuantity}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 導航列 */}
        <nav className="border-t border-scrapbook-muted-light/50">
          <ul className="container flex items-center justify-center gap-8 py-3">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-display text-sm font-medium text-scrapbook-fg-light hover:text-scrapbook-primary transition-colors tracking-wide"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
