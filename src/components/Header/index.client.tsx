'use client'
import { Cart } from '@/components/Cart'
import { OpenCartButton } from '@/components/Cart/OpenCart'
import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'

import type { Header } from 'src/payload-types'
import { MobileMenu } from './MobileMenu'

import { LogoIcon } from '@/components/icons/logo'
import { cn } from '@/utilities/cn'
import { usePathname } from 'next/navigation'

type Props = {
  header: Header
}

export function HeaderClient({ header }: Props) {
  const menu = header.navItems || []
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)

  // 監聽滾動以觸發毛玻璃效果
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        // Scrapbook: 毛玻璃效果 + 粗底線
        isScrolled
          ? 'bg-scrapbook-bg-light/80 dark:bg-scrapbook-bg-dark/80 backdrop-blur-md border-b-[3px] border-black dark:border-scrapbook-fg-dark shadow-retro-sm'
          : 'bg-scrapbook-bg-light dark:bg-scrapbook-bg-dark border-b-[3px] border-black dark:border-scrapbook-fg-dark',
      )}
    >
      <nav className="flex items-center justify-between container py-3">
        {/* 左側：Mobile Menu + Logo */}
        <div className="flex items-center gap-4">
          <div className="block md:hidden">
            <Suspense fallback={null}>
              <MobileMenu menu={menu} />
            </Suspense>
          </div>
          <Link
            className="flex items-center gap-2 font-display font-bold text-xl text-scrapbook-primary hover:scale-105 transition-transform"
            href="/"
          >
            <LogoIcon className="w-7 h-auto" />
            <span className="hidden sm:inline">Daytona Park</span>
          </Link>
        </div>

        {/* 中間：導航連結 */}
        {menu.length ? (
          <ul className="hidden md:flex items-center gap-6">
            {menu.map((item) => (
              <li key={item.id}>
                <CMSLink
                  {...item.link}
                  size={'clear'}
                  className={cn('relative navLink text-sm uppercase tracking-wide', {
                    active:
                      item.link.url && item.link.url !== '/'
                        ? pathname.includes(item.link.url)
                        : false,
                  })}
                  appearance="nav"
                />
              </li>
            ))}
          </ul>
        ) : null}

        {/* 右側：搜尋框 + 購物車 */}
        <div className="flex items-center gap-4">
          {/* Scrapbook 搜尋框 (桌面版) */}
          <div className="hidden lg:block relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-scrapbook-fg-light/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              placeholder="搜尋商品..."
              className="scrapbook-search w-48 text-sm"
            />
          </div>

          <Suspense fallback={<OpenCartButton />}>
            <Cart />
          </Suspense>
        </div>
      </nav>
    </header>
  )
}
