'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import './custom-nav.scss'

/**
 * NavClient - Client Component for Custom Navigation
 * Handles pathname-based active state detection and renders navigation UI.
 * Theme Color: #C9915D
 */

const NavGroup = ({ label, children, icon }: { label: string, children: React.ReactNode, icon?: React.ReactNode }) => (
  <div className="nav-group">
    <div className="nav-group__label">
      {icon && <span className="nav-group__icon">{icon}</span>}
      <span>{label}</span>
    </div>
    <div className="nav-group__content">{children}</div>
  </div>
)

const NavLink = ({ href, children, icon }: { href: string, children: React.ReactNode, icon?: React.ReactNode }) => {
  const pathname = usePathname()
  const isActive = pathname === href || pathname?.startsWith(`${href}/`)

  return (
    <Link 
      href={href} 
      className={`nav-link ${isActive ? 'active' : ''}`}
    >
      {icon && <span className="nav-link__icon">{icon}</span>}
      <span className="nav-link__label">{children}</span>
    </Link>
  )
}

// Icons (Inline SVG)
const Icons = {
  Dashboard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  Order: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>,
  Product: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
  User: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Content: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
}

export const NavClient: React.FC = () => {
  return (
    <nav id="custom-admin-nav" className="custom-nav-container">
      <style dangerouslySetInnerHTML={{ __html: `
        #custom-admin-nav {
          padding-top: 64px !important; /* Fix overlap with toggler */
          padding-bottom: 2rem !important;
          background-color: #FFFFFF !important;
        }
        #custom-admin-nav .nav-group__label {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          padding: 12px 16px !important;
          font-size: 18px !important;
          color: #FFFFFF !important;
          background-color: #C9915D !important;
          font-weight: 700 !important;
          text-transform: none !important;
          margin-bottom: 8px !important;
          margin-top: 12px !important;
          border-radius: 5px !important;
        }
        #custom-admin-nav .nav-group__icon {
          display: flex !important;
          align-items: center !important;
          color: #FFFFFF !important;
        }
        /* Dashboard item special casing to match group style but lighter */
        #custom-admin-nav .nav-group:first-child .nav-link {
          margin-top: 0 !important;
          background-color: #FBF5F0 !important;
          color: #C9915D !important;
          margin-bottom: 12px !important;
          padding: 12px 16px !important;
          border-radius: 5px !important;
          font-size: 18px !important;
          font-weight: 700 !important;
        }
        #custom-admin-nav .nav-link {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          padding: 10px 16px !important;
          margin: 2px 0px !important;
          color: #64748B !important;
          font-size: 15px !important;
          text-decoration: none !important;
          transition: all 0.2s ease !important;
        }
        #custom-admin-nav .nav-link__icon {
          display: flex !important;
          align-items: center !important;
          opacity: 0.8 !important;
        }
        #custom-admin-nav .nav-link:hover {
          background-color: rgba(201, 145, 93, 0.05) !important;
          color: #C9915D !important;
        }
        #custom-admin-nav .nav-link.active {
          color: #C9915D !important;
          font-weight: 600 !important;
        }
        #custom-admin-nav .nav-link.active .nav-link__icon {
          opacity: 1 !important;
        }
      `}} />
      {/* Dashboard */}
      <div className="nav-group">
        <NavLink href="/admin" icon={<Icons.Dashboard />}>
          儀表板
        </NavLink>
      </div>

      {/* 訂單管理 */}
      <NavGroup label="訂單管理" icon={<Icons.Order />}>
        <NavLink href="/admin/collections/orders">
          所有訂單
        </NavLink>
        <NavLink href="/admin/collections/carts">
          購物車
        </NavLink>
      </NavGroup>

      {/* 商品管理 */}
      <NavGroup label="商品管理" icon={<Icons.Product />}>
        <NavLink href="/admin/collections/products">
          商品列表
        </NavLink>
        <NavLink href="/admin/collections/categories">
          商品分類
        </NavLink>
        <NavLink href="/admin/collections/promotions">
          促銷活動
        </NavLink>
      </NavGroup>

      {/* 客戶管理 */}
      <NavGroup label="客戶管理" icon={<Icons.User />}>
        <NavLink href="/admin/collections/users">
          用戶列表
        </NavLink>
        <NavLink href="/admin/collections/vendors">
          商家列表
        </NavLink>
      </NavGroup>

      {/* 內容管理 */}
      <NavGroup label="內容管理" icon={<Icons.Content />}>
        <NavLink href="/admin/collections/pages">
          頁面
        </NavLink>
        <NavLink href="/admin/collections/ad-banners">
          廣告橫幅
        </NavLink>
        <NavLink href="/admin/collections/media">
          媒體庫
        </NavLink>
      </NavGroup>

      {/* 網站設定 */}
      <NavGroup label="網站設定" icon={<Icons.Settings />}>
        <NavLink href="/admin/globals/header">
          頁首設定
        </NavLink>
        <NavLink href="/admin/globals/footer">
          頁尾設定
        </NavLink>
        <NavLink href="/admin/globals/site-settings">
          全站設定
        </NavLink>
        <NavLink href="/admin/globals/tracking-scripts">
          追蹤代碼
        </NavLink>
      </NavGroup>
    </nav>
  )
}
