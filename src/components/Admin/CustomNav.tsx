'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import './custom-nav.scss'

/**
 * Custom Admin Navigation
 * Replaces default Payload sidebar to add icons and custom grouping.
 * Theme Color: #C9915D
 */

const NavGroup = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="nav-group">
    <div className="nav-group__label">{label}</div>
    <div className="nav-group__content">{children}</div>
  </div>
)

const NavLink = ({ href, children, icon }: { href: string, children: React.ReactNode, icon: React.ReactNode }) => {
  const pathname = usePathname()
  // Check active state strictly or loosely depending on need. loosely for collections.
  const isActive = pathname === href || pathname?.startsWith(`${href}/`)

  return (
    <Link 
      href={href} 
      className={`nav-link ${isActive ? 'active' : ''}`}
    >
      <span className="nav-link__icon">{icon}</span>
      <span className="nav-link__label">{children}</span>
    </Link>
  )
}

// Icons (Inline SVG to avoid dependency issues)
const Icons = {
  Dashboard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  Order: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>,
  Product: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
  User: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Content: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
}

export const CustomNav: React.FC = () => {
    return (
        <nav className="custom-nav-container">
            {/* Header (Logo area mostly handled by Payload, but we can add our own header here if needed) */}
            
            {/* 1. Dashboard */}
            <div className="nav-group">
                <NavLink href="/admin" icon={<Icons.Dashboard />}>
                    儀表板 (Dashboard)
                </NavLink>
            </div>

            {/* 2. Order Management */}
            <NavGroup label="訂單管理">
                {/* Note: In Payload 3.0, custom collections might be under /admin/collections/slug */}
                <NavLink href="/admin/collections/orders" icon={<Icons.Order />}>
                    所有訂單 (Orders)
                </NavLink>
                {/* Plugin generated carts */}
                <NavLink href="/admin/collections/carts" icon={<Icons.Order />}>
                    購物車 (Carts)
                </NavLink>
            </NavGroup>

            {/* 3. Product Management */}
            <NavGroup label="商品管理">
                <NavLink href="/admin/collections/products" icon={<Icons.Product />}>
                    商品列表 (Products)
                </NavLink>
                <NavLink href="/admin/collections/categories" icon={<Icons.Product />}>
                    商品分類 (Categories)
                </NavLink>
                <NavLink href="/admin/collections/promotions" icon={<Icons.Product />}>
                    促銷活動 (Promotions)
                </NavLink>
            </NavGroup>

            {/* 4. Customer Management */}
            <NavGroup label="客戶管理">
                <NavLink href="/admin/collections/users" icon={<Icons.User />}>
                    用戶列表 (Users)
                </NavLink>
                <NavLink href="/admin/collections/vendors" icon={<Icons.User />}>
                    商家列表 (Vendors)
                </NavLink>
            </NavGroup>

            {/* 5. Content Management */}
            <NavGroup label="內容管理">
                <NavLink href="/admin/collections/pages" icon={<Icons.Content />}>
                    頁面 (Pages)
                </NavLink>
                <NavLink href="/admin/collections/ad-banners" icon={<Icons.Content />}>
                    廣告橫幅 (Banners)
                </NavLink>
                <NavLink href="/admin/collections/media" icon={<Icons.Content />}>
                    媒體庫 (Media)
                </NavLink>
            </NavGroup>

            {/* 6. Settings */}
            <NavGroup label="網站設定">
                <NavLink href="/admin/globals/header" icon={<Icons.Settings />}>
                    頁首設定 (Header)
                </NavLink>
                <NavLink href="/admin/globals/footer" icon={<Icons.Settings />}>
                    頁尾設定 (Footer)
                </NavLink>
                <NavLink href="/admin/globals/site-settings" icon={<Icons.Settings />}>
                    全站設定 (Site Settings)
                </NavLink>
                <NavLink href="/admin/globals/tracking-scripts" icon={<Icons.Settings />}>
                    追蹤代碼 (Tracking)
                </NavLink>
            </NavGroup>

        </nav>
    )
}
