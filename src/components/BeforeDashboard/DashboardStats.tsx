'use client'

import React, { useEffect, useState } from 'react'

/**
 * DashboardStats Component
 * 
 * 統計卡片組件，顯示即時業務數據：
 * - 訂單未出貨
 * - 訂單未付款
 * - 商品需補貨
 */

interface StatsData {
  pendingShipments: number
  unpaidOrders: number
  lowStockProducts: number
  loading: boolean
}

export const DashboardStats: React.FC = () => {
  const [stats, setStats] = useState<StatsData>({
    pendingShipments: 0,
    unpaidOrders: 0,
    lowStockProducts: 0,
    loading: true,
  })

  useEffect(() => {
    // 模擬數據載入 - 實際應用中會呼叫 API
    const fetchStats = async () => {
      try {
        // TODO: 替換為實際 API 呼叫
        // const response = await fetch('/api/dashboard-stats')
        // const data = await response.json()
        
        // 暫時使用模擬數據
        setTimeout(() => {
          setStats({
            pendingShipments: 42,
            unpaidOrders: 7,
            lowStockProducts: 15,
            loading: false,
          })
        }, 500)
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
        setStats(prev => ({ ...prev, loading: false }))
      }
    }

    fetchStats()
  }, [])

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--theme-elevation-50)',
    borderRadius: '1rem',
    padding: '1.5rem',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    border: '1px solid var(--theme-elevation-100)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  }

  const iconContainerStyle: React.CSSProperties = {
    width: '3rem',
    height: '3rem',
    borderRadius: '50%',
    backgroundColor: 'rgba(201, 145, 93, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.5rem',
  }

  const numberStyle: React.CSSProperties = {
    fontSize: '2rem',
    fontWeight: '700',
    color: 'var(--theme-elevation-500)',
    lineHeight: 1.2,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: 'var(--theme-elevation-350)',
  }

  if (stats.loading) {
    return (
      <div style={{ padding: '1rem 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ ...cardStyle, opacity: 0.5 }}>
              <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: 'var(--theme-elevation-100)' }} />
              <div style={{ width: '4rem', height: '2rem', backgroundColor: 'var(--theme-elevation-100)', borderRadius: '0.25rem' }} />
              <div style={{ width: '6rem', height: '1rem', backgroundColor: 'var(--theme-elevation-100)', borderRadius: '0.25rem' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* 訂單未出貨 */}
        <div style={cardStyle}>
          <div style={iconContainerStyle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9915D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
          </div>
          <div style={numberStyle}>{stats.pendingShipments}</div>
          <div style={labelStyle}>訂單未出貨</div>
        </div>

        {/* 訂單未付款 */}
        <div style={cardStyle}>
          <div style={iconContainerStyle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9915D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
          </div>
          <div style={numberStyle}>{stats.unpaidOrders}</div>
          <div style={labelStyle}>訂單未付款</div>
        </div>

        {/* 商品需補貨 */}
        <div style={cardStyle}>
          <div style={iconContainerStyle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9915D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div style={numberStyle}>{stats.lowStockProducts}</div>
          <div style={labelStyle}>商品需補貨</div>
        </div>
      </div>
    </div>
  )
}
