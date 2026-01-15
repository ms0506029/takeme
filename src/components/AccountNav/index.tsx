'use client'

/**
 * AccountNav 組件 - 會員中心側邊欄導航
 * Phase 8.1 更新版本：
 * - 中文化導航項目
 * - 新增所有會員功能入口
 * - 分組顯示
 * - Icon 支援
 */

import clsx from 'clsx'
import {
    Bell,
    Gift,
    Heart,
    Link as LinkIcon,
    LogOut,
    MapPin,
    Settings,
    ShoppingBag,
    User
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  className?: string
}

// 定義導航項目
const NAV_ITEMS = [
  {
    group: '我的帳戶',
    items: [
      { href: '/account', label: '會員中心', icon: User, exact: true },
      { href: '/account/orders', label: '訂單履歷', icon: ShoppingBag },
      { href: '/account/points', label: '點數履歷', icon: Gift },
    ],
  },
  {
    group: '收藏與通知',
    items: [
      { href: '/account/wishlist', label: '收藏清單', icon: Heart },
      { href: '/account/restock-requests', label: '補貨通知', icon: Bell },
    ],
  },
  {
    group: '帳戶設定',
    items: [
      { href: '/account/profile', label: '基本資料', icon: User },
      { href: '/account/addresses', label: '收件地址', icon: MapPin },
      { href: '/account/social', label: '社群綁定', icon: LinkIcon },
      { href: '/account/settings', label: '安全設定', icon: Settings },
    ],
  },
]

export const AccountNav: React.FC<Props> = ({ className }) => {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className={clsx('space-y-6', className)}>
      {NAV_ITEMS.map((group) => (
        <div key={group.group}>
          {/* 群組標題 */}
          <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-3">
            {group.group}
          </h3>
          
          {/* 導航項目 */}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href, item.exact)
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer',
                      active
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-2 border-slate-900 dark:border-amber-500/50 shadow-retro-sm translate-x-1'
                        : 'text-gray-600 dark:text-gray-400 border-2 border-transparent hover:border-slate-900 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800 hover:shadow-retro-sm hover:-translate-y-0.5'
                    )}
                  >
                    <Icon className={clsx('w-5 h-5 flex-shrink-0', active ? 'text-amber-600' : 'text-gray-400')} />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {/* 分隔線 */}
      <hr className="border-gray-200 dark:border-slate-700" />

      {/* 登出按鈕 */}
      <Link
        href="/logout"
        className={clsx(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
        )}
      >
        <LogOut className="w-4 h-4" />
        登出
      </Link>
    </nav>
  )
}
