'use client'

import React, { useEffect, useState } from 'react'

/**
 * DashboardStats Component
 * Simplified Dashboard Stats - Phase 6.1 User Feedback
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
}

// Inline SVG Icons to avoid font loading issues
const ShippingIcon = ({ color }: { color: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"></rect>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
    <circle cx="5.5" cy="18.5" r="2.5"></circle>
    <circle cx="18.5" cy="18.5" r="2.5"></circle>
  </svg>
)

const PaymentIcon = ({ color }: { color: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
    <line x1="1" y1="10" x2="23" y2="10"></line>
  </svg>
)

const InventoryIcon = ({ color }: { color: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
)

const TrendingUpIcon = ({ color }: { color: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
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

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    boxShadow: 'var(--shadow-soft)',
    border: '1px solid var(--theme-border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  }

  const valueStyle: React.CSSProperties = {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--color-text-main)',
    lineHeight: 1.2,
    marginBottom: '0.25rem',
    fontFamily: 'var(--font-heading)',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--color-text-sub)',
  }

  const iconBoxStyle = (bgColor: string): React.CSSProperties => ({
    width: '3rem',
    height: '3rem',
    borderRadius: '50%',
    backgroundColor: bgColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  })

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ ...cardStyle, opacity: 0.7 }}>
            <div>
              <div style={{ width: '4rem', height: '2rem', backgroundColor: 'rgba(201, 145, 93, 0.1)', borderRadius: '0.5rem', marginBottom: '0.5rem' }} />
              <div style={{ width: '6rem', height: '1rem', backgroundColor: 'rgba(201, 145, 93, 0.05)', borderRadius: '0.5rem' }} />
            </div>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: 'rgba(201, 145, 93, 0.1)' }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        
        {/* 訂單未出貨 */}
        <div style={cardStyle}>
          <div>
            <div style={valueStyle}>{stats?.orders.pendingShipments || 0}</div>
            <div style={labelStyle}>訂單未出貨</div>
          </div>
          <div style={iconBoxStyle('rgba(201, 145, 93, 0.1)')}>
            <ShippingIcon color="#C9915D" />
          </div>
        </div>

        {/* 訂單未付款 */}
        <div style={cardStyle}>
          <div>
            <div style={valueStyle}>{stats?.orders.unpaidOrders || 0}</div>
            <div style={labelStyle}>訂單未付款</div>
          </div>
          <div style={iconBoxStyle('rgba(201, 145, 93, 0.08)')}>
            <PaymentIcon color="#A6764A" />
          </div>
        </div>

        {/* 商品需補貨 */}
        <div style={cardStyle}>
          <div>
            <div style={valueStyle}>{stats?.products.lowStock || 0}</div>
            <div style={labelStyle}>商品需補貨</div>
          </div>
          <div style={iconBoxStyle('rgba(239, 68, 68, 0.1)')}>
            <InventoryIcon color="#EF4444" />
          </div>
        </div>

        {/* 30日總營收 */}
        <div style={cardStyle}>
          <div>
            <div style={valueStyle}>
              {new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format((stats?.revenue.last30Days || 0) / 100)}
            </div>
            <div style={labelStyle}>30日總營收</div>
          </div>
          <div style={iconBoxStyle('rgba(201, 145, 93, 0.1)')}>
            <TrendingUpIcon color="#C9915D" />
          </div>
        </div>

      </div>
    </div>
  )
}


