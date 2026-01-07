'use client'

import { useAuth } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

/**
 * VendorDashboard Component
 * 
 * 商家專屬 Dashboard：
 * - 商品統計 (上架中、待審核)
 * - 訂單統計 (待處理、已完成)
 * - 營收統計 (總營收、本月、待提領)
 */

interface VendorStats {
  vendor: {
    id: string
    name: string
    status: string
    walletBalance: number
    commissionRate: number
  }
  products: {
    active: number
    pending: number
    total: number
  }
  orders: {
    processing: number
    completed: number
    total: number
  }
  revenue: {
    total: number
    monthly: number
    pendingPayout: number
  }
}

export const VendorDashboard: React.FC = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState<VendorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 取得商家 ID
  const vendorId = typeof user?.vendor === 'object' ? user?.vendor?.id : user?.vendor

  useEffect(() => {
    if (!vendorId) {
      setLoading(false)
      return
    }

    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/vendor-stats?vendorId=${vendorId}`)
        if (!response.ok) throw new Error('Failed to fetch stats')
        const data = await response.json()
        setStats(data)
      } catch (err) {
        console.error('Vendor stats error:', err)
        setError('無法載入統計數據')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [vendorId])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--theme-elevation-50)',
    borderRadius: '1rem',
    padding: '1.25rem',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    border: '1px solid var(--theme-elevation-100)',
  }

  const statBlockStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  }

  const numberStyle: React.CSSProperties = {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'var(--theme-elevation-500)',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: 'var(--theme-elevation-350)',
    textTransform: 'uppercase',
  }

  // 非商家用戶不顯示
  if (!user?.roles?.includes('vendor')) {
    return null
  }

  if (loading) {
    return (
      <div style={{ padding: '1rem' }}>
        <div style={{ color: 'var(--theme-elevation-350)' }}>載入中...</div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div style={{ padding: '1rem' }}>
        <div style={{ color: '#EF4444' }}>{error || '無法載入數據'}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem 0' }}>
      {/* 歡迎區 */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(201, 145, 93, 0.1) 0%, rgba(201, 145, 93, 0.05) 100%)',
        borderRadius: '1rem',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
          {stats.vendor.name}
        </h2>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--theme-elevation-350)', fontSize: '0.875rem' }}>
          商家控制台
        </p>
      </div>

      {/* 統計卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* 錢包餘額 */}
        <div style={{ ...cardStyle, borderLeft: '4px solid #10B981' }}>
          <div style={statBlockStyle}>
            <span style={labelStyle}>待提領收入</span>
            <span style={numberStyle}>{formatCurrency(stats.revenue.pendingPayout)}</span>
          </div>
        </div>

        {/* 本月營收 */}
        <div style={{ ...cardStyle, borderLeft: '4px solid #6366F1' }}>
          <div style={statBlockStyle}>
            <span style={labelStyle}>本月營收</span>
            <span style={numberStyle}>{formatCurrency(stats.revenue.monthly)}</span>
          </div>
        </div>

        {/* 待處理訂單 */}
        <div style={{ ...cardStyle, borderLeft: '4px solid #F59E0B' }}>
          <div style={statBlockStyle}>
            <span style={labelStyle}>待處理訂單</span>
            <span style={numberStyle}>{stats.orders.processing}</span>
          </div>
        </div>

        {/* 上架商品 */}
        <div style={{ ...cardStyle, borderLeft: '4px solid #06B6D4' }}>
          <div style={statBlockStyle}>
            <span style={labelStyle}>上架中商品</span>
            <span style={numberStyle}>{stats.products.active}</span>
            {stats.products.pending > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#F59E0B' }}>
                {stats.products.pending} 待審核
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 提醒區 */}
      {stats.products.pending > 0 && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '0.5rem',
          borderLeft: '4px solid #F59E0B',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>📦 有商品待審核</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--theme-elevation-400)' }}>
            您有 {stats.products.pending} 個商品正在等待管理員審核，審核通過後將自動上架。
          </div>
        </div>
      )}
    </div>
  )
}
