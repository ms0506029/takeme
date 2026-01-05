'use client'

/**
 * 商品標籤元件
 * 
 * 用於顯示特價、新品、熱銷等標籤
 */

type BadgeVariant = 'sale' | 'new' | 'hot' | 'default'

interface ProductBadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  sale: 'bg-[var(--sale)] text-[var(--sale-foreground)]',
  new: 'bg-[var(--new)] text-[var(--new-foreground)]',
  hot: 'bg-[var(--hot)] text-[var(--hot-foreground)]',
  default: 'bg-secondary text-secondary-foreground',
}

export function ProductBadge({ variant, children }: ProductBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantStyles[variant]}`}
    >
      {children}
    </span>
  )
}

/**
 * 會員等級標籤
 */
type MemberLevel = 'bronze' | 'silver' | 'gold' | 'vip'

interface MemberBadgeProps {
  level: MemberLevel
}

const levelLabels: Record<MemberLevel, string> = {
  bronze: '銅級會員',
  silver: '銀級會員',
  gold: '金級會員',
  vip: 'VIP 會員',
}

const levelStyles: Record<MemberLevel, string> = {
  bronze: 'bg-[var(--member-bronze)] text-white',
  silver: 'bg-[var(--member-silver)] text-gray-900',
  gold: 'bg-[var(--member-gold)] text-gray-900',
  vip: 'bg-[var(--member-vip)] text-white',
}

export function MemberBadge({ level }: MemberBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${levelStyles[level]}`}
    >
      {level === 'vip' && '⭐ '}
      {levelLabels[level]}
    </span>
  )
}
