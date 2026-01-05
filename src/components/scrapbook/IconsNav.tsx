'use client'

import { cn } from '@/utilities/cn'
import Link from 'next/link'
import React from 'react'

/**
 * Scrapbook Design System - IconsNav
 * 
 * 剪貼簿風格的圖示導航。
 * 具有圓形白色背景、懸停變主色效果。
 */

export interface IconNavItem {
  id: string
  label: string
  icon: React.ReactNode
  href: string
}

export interface IconsNavProps {
  items: IconNavItem[]
  className?: string
}

export function IconsNav({ items, className }: IconsNavProps) {
  return (
    <section className={cn('py-8 md:py-12', className)}>
      <div className="container">
        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group flex flex-col items-center gap-2"
            >
              {/* 圓形圖示容器 */}
              <div
                className={cn(
                  'w-16 h-16 md:w-20 md:h-20',
                  'flex items-center justify-center',
                  'bg-white dark:bg-scrapbook-muted-dark',
                  'border-2 border-black dark:border-scrapbook-fg-dark',
                  'rounded-full',
                  'shadow-retro',
                  'transition-all duration-300',
                  'group-hover:bg-scrapbook-primary',
                  'group-hover:shadow-retro-sm',
                  'group-hover:translate-x-[2px] group-hover:translate-y-[2px]',
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 md:w-10 md:h-10',
                    'text-scrapbook-fg-light dark:text-scrapbook-fg-dark',
                    'group-hover:text-white',
                    'transition-colors',
                  )}
                >
                  {item.icon}
                </div>
              </div>

              {/* 標籤 */}
              <span
                className={cn(
                  'font-body text-sm',
                  'text-scrapbook-fg-light dark:text-scrapbook-fg-dark',
                  'group-hover:text-scrapbook-primary',
                  'transition-colors',
                )}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default IconsNav
