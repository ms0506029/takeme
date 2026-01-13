'use client'

import React, { useCallback, useEffect, useState } from 'react'
import './styles.scss'

/**
 * Abandoned Carts Management View
 * Phase 7.1.2 - 遺棄購物車管理介面
 * 
 * 功能：
 * 1. 顯示遺棄購物車統計
 * 2. 列表顯示所有遺棄購物車
 * 3. 手動掃描功能
 * 4. 發送提醒功能
 */

interface AbandonedCart {
  id: string
  customerEmail: string | null
  customerName: string | null
  customerId: string | null
  subtotal: number
  createdAt: string
  abandonedAt: string | null
  itemCount: number
  reminderSentAt: string | null
  reminderCount: number
}

interface Stats {
  totalAbandoned: number
  totalValue: number
  todayAbandoned: number
  todayValue: number
  pendingReminders: number
}

// Icons (Lucide-style inline SVGs)
const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
)

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
)

const ScanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 7 3 3 7 3"></polyline>
    <polyline points="21 7 21 3 17 3"></polyline>
    <polyline points="21 17 21 21 17 21"></polyline>
    <polyline points="3 17 3 21 7 21"></polyline>
    <line x1="3" y1="12" x2="21" y2="12"></line>
  </svg>
)

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
)

const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
)

export const AbandonedCartsView: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null)
  const [carts, setCarts] = useState<AbandonedCart[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // 格式化金額
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount / 100)
  }

  // 格式化時間
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 取得資料
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/abandoned-carts?page=${page}&limit=20`)
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
        setCarts(data.items)
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Failed to fetch abandoned carts:', error)
      setMessage({ type: 'error', text: '載入資料失敗' })
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 執行掃描
  const handleScan = async () => {
    try {
      setActionLoading('scan')
      const response = await fetch('/api/abandoned-carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan', thresholdHours: 24 }),
      })
      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error || '掃描失敗' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '掃描失敗' })
    } finally {
      setActionLoading(null)
    }
  }

  // 發送單一提醒
  const handleRemind = async (cartId: string) => {
    try {
      setActionLoading(cartId)
      const response = await fetch('/api/abandoned-carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remind', cartId }),
      })
      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: '提醒已發送' })
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error || '發送失敗' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '發送失敗' })
    } finally {
      setActionLoading(null)
    }
  }

  // 發送所有待提醒
  const handleRemindAll = async () => {
    try {
      setActionLoading('remind-all')
      const response = await fetch('/api/abandoned-carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remind-all' }),
      })
      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error || '發送失敗' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '發送失敗' })
    } finally {
      setActionLoading(null)
    }
  }

  // 清除訊息
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  return (
    <div className="abandoned-carts-view">
      {/* Header */}
      <div className="view-header">
        <div>
          <h1>遺棄購物車管理</h1>
          <p>追蹤並挽回未完成結帳的顧客</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshIcon />
            重新整理
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleScan}
            disabled={actionLoading === 'scan'}
          >
            <ScanIcon />
            {actionLoading === 'scan' ? '掃描中...' : '掃描遺棄購物車'}
          </button>
        </div>
      </div>

      {/* Toast Message */}
      {message && (
        <div className={`toast toast-${message.type}`}>
          {message.type === 'success' ? <CheckIcon /> : <AlertIcon />}
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalAbandoned}</div>
            <div className="stat-label">遺棄購物車總數</div>
          </div>
          <div className="stat-card highlight">
            <div className="stat-value">{formatCurrency(stats.totalValue)}</div>
            <div className="stat-label">遺棄金額總計</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.todayAbandoned}</div>
            <div className="stat-label">今日遺棄</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-value">{stats.pendingReminders}</div>
            <div className="stat-label">待發送提醒</div>
            {stats.pendingReminders > 0 && (
              <button 
                className="btn btn-sm btn-warning"
                onClick={handleRemindAll}
                disabled={actionLoading === 'remind-all'}
              >
                <BellIcon />
                {actionLoading === 'remind-all' ? '發送中...' : '全部發送'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>載入中...</p>
          </div>
        ) : carts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <h3>目前沒有遺棄購物車</h3>
            <p>可點擊「掃描遺棄購物車」來偵測閒置超過 24 小時的購物車</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>顧客</th>
                <th>商品數</th>
                <th>金額</th>
                <th>建立時間</th>
                <th>遺棄時間</th>
                <th>提醒狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {carts.map((cart) => (
                <tr key={cart.id}>
                  <td>
                    <div className="customer-cell">
                      <span className="customer-name">{cart.customerName || '匿名'}</span>
                      {cart.customerEmail && (
                        <span className="customer-email">{cart.customerEmail}</span>
                      )}
                    </div>
                  </td>
                  <td>{cart.itemCount} 件</td>
                  <td className="amount-cell">{formatCurrency(cart.subtotal)}</td>
                  <td>{formatDate(cart.createdAt)}</td>
                  <td>{formatDate(cart.abandonedAt)}</td>
                  <td>
                    {cart.reminderSentAt ? (
                      <span className="badge badge-success">
                        已提醒 ({cart.reminderCount}次)
                      </span>
                    ) : (
                      <span className="badge badge-pending">待發送</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleRemind(cart.id)}
                      disabled={actionLoading === cart.id}
                    >
                      <BellIcon />
                      {actionLoading === cart.id ? '...' : '發送提醒'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {carts.length > 0 && (
        <div className="pagination">
          <button 
            className="btn btn-secondary"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一頁
          </button>
          <span className="page-info">第 {page} 頁</span>
          <button 
            className="btn btn-secondary"
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore}
          >
            下一頁
          </button>
        </div>
      )}
    </div>
  )
}

export default AbandonedCartsView
