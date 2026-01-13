'use client'

import React, { useEffect, useState } from 'react'
import './styles.scss'

/**
 * Customer Analytics Dashboard
 * Phase 7.3.4 - 客戶分析儀表板
 * 
 * 顯示 RFM 分群、客戶統計、Top 消費者
 */

interface SegmentData {
  segment: string
  label: string
  color: string
  count: number
}

interface TopSpender {
  userId: string
  name: string
  totalSpent: number
}

interface AnalyticsData {
  summary: {
    totalCustomers: number
    activeCustomers: number
    newCustomers: number
    averageOrderValue: number
    averageOrdersPerCustomer: number
  }
  topSpenders: TopSpender[]
  segmentData: SegmentData[]
}

// Icons
const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
)

const TrendingUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
)

const ShoppingBagIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <path d="M16 10a4 4 0 0 1-8 0"></path>
  </svg>
)

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10"></polyline>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
  </svg>
)

export const CustomerAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/customer-analytics')
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || '載入失敗')
      }
    } catch (err) {
      setError('無法連接伺服器')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount / 100)
  }

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>載入分析資料中...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="analytics-dashboard">
        <div className="error-state">
          <p>{error || '無法載入資料'}</p>
          <button className="btn btn-primary" onClick={fetchData}>
            <RefreshIcon /> 重試
          </button>
        </div>
      </div>
    )
  }

  const totalSegmentCount = data.segmentData.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>客戶分析</h1>
          <p>RFM 分群與客戶洞察</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
          <RefreshIcon /> 重新整理
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card">
          <div className="card-icon users">
            <UsersIcon />
          </div>
          <div className="card-content">
            <span className="card-value">{data.summary.totalCustomers}</span>
            <span className="card-label">總客戶數</span>
          </div>
        </div>
        <div className="card">
          <div className="card-icon active">
            <TrendingUpIcon />
          </div>
          <div className="card-content">
            <span className="card-value">{data.summary.activeCustomers}</span>
            <span className="card-label">活躍客戶 (30天)</span>
          </div>
        </div>
        <div className="card">
          <div className="card-icon orders">
            <ShoppingBagIcon />
          </div>
          <div className="card-content">
            <span className="card-value">{formatCurrency(data.summary.averageOrderValue)}</span>
            <span className="card-label">平均客單價</span>
          </div>
        </div>
        <div className="card">
          <div className="card-icon frequency">
            <ShoppingBagIcon />
          </div>
          <div className="card-content">
            <span className="card-value">{data.summary.averageOrdersPerCustomer}</span>
            <span className="card-label">人均訂單數</span>
          </div>
        </div>
      </div>

      {/* RFM Segments */}
      <div className="section">
        <h2>RFM 客戶分群</h2>
        <p className="section-desc">
          基於購買行為（最近性、頻率、金額）自動將客戶分為 10 個群體
        </p>
        
        <div className="segment-grid">
          {data.segmentData
            .filter(s => s.count > 0)
            .sort((a, b) => b.count - a.count)
            .map(segment => (
              <div 
                key={segment.segment} 
                className="segment-card"
                style={{ borderLeftColor: segment.color }}
              >
                <div className="segment-header">
                  <span 
                    className="segment-dot" 
                    style={{ backgroundColor: segment.color }}
                  ></span>
                  <span className="segment-label">{segment.label}</span>
                </div>
                <div className="segment-stats">
                  <span className="segment-count">{segment.count}</span>
                  <span className="segment-percent">
                    {totalSegmentCount > 0 
                      ? Math.round(segment.count / totalSegmentCount * 100) 
                      : 0}%
                  </span>
                </div>
                <div 
                  className="segment-bar"
                  style={{ 
                    width: `${totalSegmentCount > 0 ? (segment.count / totalSegmentCount * 100) : 0}%`,
                    backgroundColor: segment.color 
                  }}
                ></div>
              </div>
            ))}
        </div>

        {data.segmentData.filter(s => s.count > 0).length === 0 && (
          <div className="empty-state">
            <p>尚無足夠的訂單資料進行分群分析</p>
          </div>
        )}
      </div>

      {/* Top Spenders */}
      <div className="section">
        <h2>Top 消費者</h2>
        <div className="top-spenders">
          {data.topSpenders.length > 0 ? (
            <table className="spenders-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>客戶</th>
                  <th>累計消費</th>
                </tr>
              </thead>
              <tbody>
                {data.topSpenders.map((spender, index) => (
                  <tr key={spender.userId}>
                    <td className="rank">{index + 1}</td>
                    <td className="name">
                      <a href={`/admin/collections/users/${spender.userId}`}>
                        {spender.name || '未命名'}
                      </a>
                    </td>
                    <td className="amount">{formatCurrency(spender.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>尚無消費紀錄</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CustomerAnalyticsDashboard
