'use client'

import { Heart, Search, ShoppingBag, User } from 'lucide-react'
import Link from 'next/link'

export interface ScrapbookHeaderProps {
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
 */
export function ScrapbookHeader({
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
        <div className="container flex items-center justify-between py-4">
          {/* 左側：搜尋框 */}
          <div className="flex-1 max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-scrapbook-fg-light/50" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 rounded-full border-2 border-scrapbook-fg-light/20 bg-white/80 backdrop-blur-sm font-body text-sm focus:outline-none focus:border-scrapbook-primary transition-colors"
              />
            </div>
          </div>

          {/* 中央：Logo */}
          <div className="flex-1 text-center">
            <Link href="/" className="inline-block">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-scrapbook-primary tracking-wide">
                Daytona Park
              </h1>
            </Link>
          </div>

          {/* 右側：圖示 */}
          <div className="flex-1 flex items-center justify-end gap-4">
            <button
              aria-label="Wishlist"
              className="p-2 hover:text-scrapbook-primary transition-colors"
            >
              <Heart className="w-5 h-5" />
            </button>
            <button
              aria-label="Account"
              className="p-2 hover:text-scrapbook-primary transition-colors"
            >
              <User className="w-5 h-5" />
            </button>
            <button
              aria-label="Cart"
              className="p-2 hover:text-scrapbook-primary transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
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
