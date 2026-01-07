'use client'

import React, { useEffect, useState } from 'react'

/**
 * DashboardStats Component (Phase 3 重構版)
 * 
 * 顯示即時業務數據的統計卡片：
 * - 營收 KPI (30日營收、客單價)
 * - 訂單 KPI (待出貨、已完成)
 * - 商品 KPI (低庫存)
 * - GA4 流量 (即時訪客、7日瀏覽)
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
    // 每 60 秒自動刷新
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [])

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--theme-elevation-50)',
    borderRadius: '1rem',
    padding: '1.25rem',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    border: '1px solid var(--theme-elevation-100)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  }

  const iconContainerStyle = (color: string): React.CSSProperties => ({
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: '50%',
    backgroundColor: `${color}15`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.25rem',
  })

  const numberStyle: React.CSSProperties = {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'var(--theme-elevation-500)',
    lineHeight: 1.2,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: 'var(--theme-elevation-350)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(value / 100) // 假設金額以 cents 存儲
  }

  if (loading) {
    return (
      <div style={{ padding: '1rem 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ ...cardStyle, opacity: 0.5, animation: 'pulse 2s infinite' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', backgroundColor: 'var(--theme-elevation-100)' }} />
              <div style={{ width: '4rem', height: '1.75rem', backgroundColor: 'var(--theme-elevation-100)', borderRadius: '0.25rem' }} />
              <div style={{ width: '5rem', height: '0.75rem', backgroundColor: 'var(--theme-elevation-100)', borderRadius: '0.25rem' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem 0' }}>
      {error && (
        <div style={{ 
          padding: '0.5rem 1rem', 
          backgroundColor: '#FEF2F2', 
          color: '#991B1B', 
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          fontSize: '0.875rem',
        }}>
          ⚠️ {error}
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {/* 30日營收 */}
        <div style={cardStyle}>
          <div style={iconContainerStyle('#10B981')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div style={numberStyle}>{formatCurrency(stats?.revenue.last30Days || 0)}</div>
          <div style={labelStyle}>30日營收</div>
        </div>

        {/* 客單價 */}
        <div style={cardStyle}>
          <div style={iconContainerStyle('#6366F1')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </div>
          <div style={numberStyle}>{formatCurrency(stats?.revenue.averageOrderValue || 0)}</div>
          <div style={labelStyle}>平均客單價</div>
        </div>

        {/* 待出貨 */}
        <div style={cardStyle}>
          <div style={iconContainerStyle('#F59E0B')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
          </div>
          <div style={numberStyle}>{stats?.orders.pendingShipments || 0}</div>
          <div style={labelStyle}>待出貨訂單</div>
        </div>

        {/* 低庫存 */}
        <div style={cardStyle}>
          <div style={iconContainerStyle('#EF4444')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div style={numberStyle}>{stats?.products.lowStock || 0}</div>
          <div style={labelStyle}>低庫存商品</div>
        </div>

        {/* 即時訪客 */}
        <div style={cardStyle}>
          <div style={iconContainerStyle('#06B6D4')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div style={numberStyle}>{stats?.analytics.realtime.activeUsers || 0}</div>
          <div style={labelStyle}>即時訪客</div>
        </div>

        {/* 7日工作階段 */}
        <div style={cardStyle}>
          <div style={iconContainerStyle('#8B5CF6')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <div style={numberStyle}>{stats?.analytics.last7Days.sessions || 0}</div>
          <div style={labelStyle}>7日工作階段</div>
        </div>
      </div>
    </div>
  )
}
