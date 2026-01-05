'use client'

import Link from 'next/link'

export interface PromoBadge {
  id: string
  label: string
  href: string
  color: 'orange' | 'green' | 'red' | 'pink'
}

export interface PromoBadgeRowProps {
  badges: PromoBadge[]
}

const colorStyles = {
  orange: 'bg-scrapbook-primary text-white',
  green: 'bg-scrapbook-secondary text-white',
  red: 'bg-scrapbook-accent text-white',
  pink: 'bg-pink-100 text-pink-800 border-pink-300',
}

/**
 * Promo Badge Row
 * 
 * 促銷標籤列，顯示於 Hero 下方
 */
export function PromoBadgeRow({ badges }: PromoBadgeRowProps) {
  return (
    <div className="py-4 px-4 md:px-0">
      <div className="container">
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
          {badges.map((badge) => (
            <Link
              key={badge.id}
              href={badge.href}
              className={`
                inline-flex items-center px-4 py-2 rounded-full
                font-display text-xs md:text-sm font-medium
                border-2 border-black shadow-retro-sm
                hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
                transition-all
                ${colorStyles[badge.color]}
              `}
            >
              {badge.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
