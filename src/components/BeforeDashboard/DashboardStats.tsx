'use client'

import React, { useEffect, useState } from 'react'
import './index.scss'; // Ensure utility classes

/**
 * DashboardStats Component
 * EasyStore Style - Phase 6 Refinement
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
        // 使用預設數據
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

  // Design Tokens mapped to Inline Styles for precision in Payload Admin
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    boxShadow: 'var(--shadow-soft)',
    border: '1px solid var(--theme-border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
    overflow: 'hidden',
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
  })

  // Skeleton Loader
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ ...cardStyle, opacity: 0.7 }}>
            <div>
              <div style={{ width: '4rem', height: '2rem', backgroundColor: '#F1F5F9', borderRadius: '0.5rem', marginBottom: '0.5rem' }} />
              <div style={{ width: '6rem', height: '1rem', backgroundColor: '#F1F5F9', borderRadius: '0.5rem' }} />
            </div>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#F1F5F9' }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div style={{ padding: '0.5rem 1rem', backgroundColor: '#FEF2F2', color: '#EF4444', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        
        {/* 1. 訂單未出貨 (High Priority) */}
        <div style={cardStyle}>
          <div>
            <div style={valueStyle}>{stats?.orders.pendingShipments || 0}</div>
            <div style={labelStyle}>訂單未出貨</div>
          </div>
          <div style={iconBoxStyle('rgba(201, 145, 93, 0.1)')}>
             <span className="material-icons-outlined" style={{ color: 'var(--color-primary)' }}>local_shipping</span>
          </div>
        </div>

        {/* 2. 訂單未付款 */}
        <div style={cardStyle}>
          <div>
            <div style={valueStyle}>{stats?.orders.unpaidOrders || 0}</div>
            <div style={labelStyle}>訂單未付款</div>
          </div>
          <div style={iconBoxStyle('rgba(16, 185, 129, 0.1)')}>
             <span className="material-icons-outlined" style={{ color: '#10B981' }}>payments</span>
          </div>
        </div>

        {/* 3. 商品需補貨 */}
        <div style={cardStyle}>
          <div>
            <div style={valueStyle}>{stats?.products.lowStock || 0}</div>
            <div style={labelStyle}>商品需補貨</div>
          </div>
          <div style={iconBoxStyle('rgba(239, 68, 68, 0.1)')}>
             <span className="material-icons-outlined" style={{ color: '#EF4444' }}>inventory_2</span>
          </div>
        </div>

        {/* 4. 總銷售額 (Last 30 Days) */}
        <div style={cardStyle}>
            <div>
                <div style={valueStyle}>
                    {new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format((stats?.revenue.last30Days || 0) / 100)}
                </div>
                <div style={labelStyle}>30日總營收</div>
            </div>
            <div style={iconBoxStyle('rgba(59, 130, 246, 0.1)')}>
                <span className="material-icons-outlined" style={{ color: '#3B82F6' }}>trending_up</span>
            </div>
        </div>

      </div>
    </div>
  )
}

