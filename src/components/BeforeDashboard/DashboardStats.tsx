'use client'

import React, { useEffect, useState } from 'react'

/**
 * DashboardStats Component
 * Phase 7.0 (Pro Max) - Bento Card Style
 * Phase 7.1.2 - Added Abandoned Cart Stats
 */

interface DashboardStatsData {
  orders: {
    pendingShipments: number
    unpaidOrders: number
    totalCompleted: number
  }
  products: {
    lowStock: number
    outOfStock: number
  }
  revenue: {
    last30Days: number
    averageOrderValue: number
  }
  analytics: {
    realtime: {
      activeUsers: number
      pageViews: number
    }
    last7Days: {
      sessions: number
      pageViews: number
      users: number
    }
  }
  abandonedCarts?: {
    totalAbandoned: number
    totalValue: number
    todayAbandoned: number
    todayValue: number
    pendingReminders: number
  }
}

// Inline SVG Icons
const ShippingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"></rect>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
    <circle cx="5.5" cy="18.5" r="2.5"></circle>
    <circle cx="18.5" cy="18.5" r="2.5"></circle>
  </svg>
)

const PaymentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
    <line x1="1" y1="10" x2="23" y2="10"></line>
  </svg>
)

const InventoryIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
)

const TrendingUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
)

const UsersRealtimeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
)

// Abandoned Cart Icon (Phase 7.1.2)
const CartAbandonedIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    <line x1="18" y1="6" x2="22" y2="10"></line>
    <line x1="22" y1="6" x2="18" y2="10"></line>
  </svg>
)

export const DashboardStats: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard-stats')
        if (!response.ok) {
          throw new Error('Failed to fetch stats')
        }
        const data = await response.json() as DashboardStatsData
        setStats(data)
      } catch (err) {
        console.error('Dashboard stats error:', err)
        setError('無法載入統計數據')
        setStats({
          orders: { pendingShipments: 0, unpaidOrders: 0, totalCompleted: 0 },
          products: { lowStock: 0, outOfStock: 0 },
          revenue: { last30Days: 0, averageOrderValue: 0 },
          analytics: {
            realtime: { activeUsers: 0, pageViews: 0 },
            last7Days: { sessions: 0, pageViews: 0, users: 0 },
          },
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [])

  // Card skeleton for loading
  const SkeletonCard = () => (
    <div className="bento-card" style={{ padding: '1.5rem', opacity: 0.7 }}>
      <div>
        <div style={{ width: '4rem', height: '2rem', backgroundColor: 'var(--color-primary-lighter)', borderRadius: '0.5rem', marginBottom: '0.5rem' }} />
        <div style={{ width: '6rem', height: '1rem', backgroundColor: 'var(--color-primary-lighter)', borderRadius: '0.5rem' }} />
      </div>
    </div>
  )

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  // Stat card data (including abandoned carts from Phase 7.1.2)
  const cards = [
    {
      value: stats?.orders.pendingShipments || 0,
      label: '訂單未出貨',
      icon: <ShippingIcon />,
      iconBg: 'var(--color-primary-light)',
      iconColor: 'var(--color-primary)',
    },
    {
      value: stats?.abandonedCarts?.totalAbandoned || 0,
      label: '遺棄購物車',
      icon: <CartAbandonedIcon />,
      iconBg: 'rgba(239, 68, 68, 0.1)',
      iconColor: 'var(--color-error)',
      isWarning: (stats?.abandonedCarts?.totalAbandoned || 0) > 0,
      subLabel: stats?.abandonedCarts?.totalAbandoned 
        ? `NT$ ${Math.round((stats.abandonedCarts.totalValue || 0) / 100).toLocaleString()}` 
        : undefined,
      link: '/admin/collections/carts?where[isAbandoned][equals]=true',
    },
    {
      value: stats?.products.lowStock || 0,
      label: '商品需補貨',
      icon: <InventoryIcon />,
      iconBg: 'rgba(245, 158, 11, 0.1)',
      iconColor: 'var(--color-warning)',
      isWarning: (stats?.products.lowStock || 0) > 0,
    },
    {
      value: new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format((stats?.revenue.last30Days || 0) / 100),
      label: '30日總營收',
      icon: <TrendingUpIcon />,
      iconBg: 'var(--color-primary-light)',
      iconColor: 'var(--color-primary)',
      isHighlight: true,
    },
  ]

  return (
    <div>
      {error && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        {cards.map((card, idx) => (
          <div 
            key={idx} 
            className="bento-card" 
            style={{ 
              padding: '1.5rem', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              position: 'relative',
              overflow: 'hidden',
              ...(card.isHighlight ? { borderLeft: '4px solid var(--color-primary)' } : {})
            }}
          >
            {/* Large Background Icon */}
            <div style={{
              position: 'absolute',
              right: '-10px',
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: 0.05,
              color: card.iconColor,
            }}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
                {card.icon.props.children}
              </svg>
            </div>

            <div style={{ zIndex: 1 }}>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: 700, 
                color: 'var(--color-text-main)', 
                lineHeight: 1.2, 
                marginBottom: '0.25rem',
                fontFamily: 'var(--font-heading)',
              }}>
                {card.value}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-sub)' }}>
                {card.label}
              </div>
              {card.isWarning && (
                <div style={{ 
                  marginTop: '0.5rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: 'var(--color-warning)',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  查看詳情 →
                </div>
              )}
            </div>

            <div style={{ 
              width: '3rem', 
              height: '3rem', 
              borderRadius: '50%', 
              backgroundColor: card.iconBg, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: card.iconColor,
              flexShrink: 0,
              zIndex: 1,
            }}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Realtime Shoppers Row */}
      <div style={{ marginTop: '1.5rem' }}>
        <div 
          className="bento-card" 
          style={{ 
            padding: '1.5rem', 
            display: 'flex', 
            alignItems: 'center',
            gap: '1rem',
            borderLeft: '4px solid var(--color-primary)',
          }}
        >
          {/* Ping Animation */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{
              position: 'absolute',
              width: '12px',
              height: '12px',
              backgroundColor: 'var(--color-primary)',
              borderRadius: '50%',
              animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
              opacity: 0.75,
            }} />
            <span style={{
              width: '12px',
              height: '12px',
              backgroundColor: 'var(--color-primary)',
              borderRadius: '50%',
            }} />
          </div>
          <style>{`
            @keyframes ping {
              75%, 100% {
                transform: scale(2);
                opacity: 0;
              }
            }
          `}</style>
          
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              即時在線訪客
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)', fontFamily: 'var(--font-heading)' }}>
              {stats?.analytics.realtime.activeUsers || 0}
            </div>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
            <UsersRealtimeIcon />
          </div>
        </div>
      </div>
    </div>
  )
}
