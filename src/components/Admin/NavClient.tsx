'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

/**
 * NavClient - Client Component for Custom Navigation
 * Theme Color: #C9915D (Pro Max Update v2 - Feedback Fix)
 * Group Labels = Main Visual Items (Icon, Bold, Large)
 * Nav Links = Secondary Items (Indented, Small, No Icon)
 */

// Icons (Inline SVG)
const Icons = {
  Dashboard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  Order: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>,
  Product: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
  User: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Content: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  ChevronRight: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
}

// Styles Object - Refined for Correct Hierarchy
const styles = {
  nav: {
    paddingTop: '64px',
    paddingBottom: '2rem',
    backgroundColor: '#FFFFFF',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
  },
  
  // Group Label = Main Visual (Icon + Large Text)
  groupLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 24px',
    marginTop: '16px',
    marginBottom: '4px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#333333', // Darker text for main items
    letterSpacing: '0.02em',
  },
  
  // Nav Link = Secondary Visual (Indented, No Icon, Smaller)
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    paddingLeft: '56px', // 24px + 20px(icon) + 12px(gap) = 56px Indent
    margin: '2px 8px',
    color: '#64748B', // Muted text for sub items
    fontSize: '14px',
    textDecoration: 'none',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    position: 'relative' as const,
  },
  navLinkHover: {
    backgroundColor: '#FAF5F2',
    color: '#C9915D',
  },
  navLinkActive: {
    backgroundColor: '#F4EBE4',
    color: '#C9915D',
    fontWeight: 600,
  },
  // Sub-item visual indicator (optional dot)
  subItemDot: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    backgroundColor: 'currentColor',
    opacity: 0.5,
    marginRight: '8px',
  },
  
  activeIndicator: {
    position: 'absolute' as const,
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '4px',
    height: '60%',
    backgroundColor: '#C9915D',
    borderTopRightRadius: '4px',
    borderBottomRightRadius: '4px',
  },
  userProfile: {
    padding: '16px',
    borderTop: '1px solid #E8E4DF',
    marginTop: 'auto',
  },
  userProfileInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#F4EBE4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#C9915D',
    fontWeight: 700,
    fontSize: '14px',
  },
}

const NavGroup = ({ label, children, icon }: { label: string, children: React.ReactNode, icon?: React.ReactNode }) => (
  <div>
    <div style={styles.groupLabel}>
      {icon && <span style={{ display: 'flex', alignItems: 'center', color: '#94A3B8' }}>{icon}</span>}
      <span>{label}</span>
    </div>
    <div>{children}</div>
  </div>
)

const NavLink = ({ href, children }: { href: string, children: React.ReactNode }) => {
  const pathname = usePathname()
  const isActive = pathname === href || pathname?.startsWith(`${href}/`)
  const [isHovered, setIsHovered] = React.useState(false)

  const linkStyle = {
    ...styles.navLink,
    ...(isHovered && !isActive ? styles.navLinkHover : {}),
    ...(isActive ? styles.navLinkActive : {}),
  }

  return (
    <Link 
      href={href} 
      style={linkStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isActive && <span style={styles.activeIndicator} />}
      {/* Dot removed as requested */}
      <span>{children}</span>
    </Link>
  )
}

export const NavClient: React.FC = () => {
  return (
    <nav id="custom-admin-nav" style={styles.nav}>
      <div>
        {/* Dashboard - Treated as a primary item similar to a group header but clickable */}
        <Link 
          href="/admin"
          style={{
             ...styles.groupLabel,
             textDecoration: 'none',
             cursor: 'pointer',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', color: '#C9915D' }}><Icons.Dashboard /></span>
          <span style={{ color: '#C9915D', fontWeight: 800, letterSpacing: '0.05em' }}>TAKE ME JAPAN</span>
        </Link>
        <div style={{ height: '1px', backgroundColor: '#F0F0F0', margin: '8px 24px' }}></div>

        {/* 訂單管理 */}
        <NavGroup label="訂單管理" icon={<Icons.Order />}>
          <NavLink href="/admin/collections/orders">
            所有訂單
          </NavLink>
          <NavLink href="/admin/collections/carts">
            購物車
          </NavLink>
          <NavLink href="/admin/collections/transactions">
            交易紀錄
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
          <NavLink href="/admin/collections/addresses">
            地址管理
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
          <NavLink href="/admin/collections/forms">
            表單設計
          </NavLink>
          <NavLink href="/admin/collections/form-submissions">
            表單回應
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
      </div>

      {/* User Profile (Bottom) */}
      <div style={styles.userProfile}>
        <Link href="/admin/account" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div 
            style={styles.userProfileInner}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF5F2')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <div style={styles.userAvatar}>AD</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#333333' }}>管理員</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Super Admin</div>
            </div>
            <Icons.ChevronRight />
          </div>
        </Link>
      </div>
    </nav>
  )
}
