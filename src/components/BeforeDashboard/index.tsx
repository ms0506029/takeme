'use client'

import { useAuth } from '@payloadcms/ui'
import React from 'react'

import { DashboardStats } from './DashboardStats'
import { SeedButton } from './SeedButton'
import './index.scss'

const baseClass = 'before-dashboard'

/**
 * BeforeDashboard Component
 * 
 * 自訂 Dashboard 首頁：
 * - 歡迎訊息
 * - 統計卡片（訂單未出貨、未付款、商品需補貨）
 * - 快速操作按鈕
 */
export const BeforeDashboard: React.FC = () => {
  const { user } = useAuth()
  const userName = user?.name || user?.email?.split('@')[0] || '管理員'

  return (
    <div className={baseClass}>
      {/* 歡迎區塊 */}
      <div className={`${baseClass}__welcome`} style={{
        background: 'linear-gradient(135deg, rgba(201, 145, 93, 0.1) 0%, rgba(201, 145, 93, 0.05) 100%)',
        borderRadius: '1rem',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '1.5rem', 
          fontWeight: 700,
          color: 'var(--theme-elevation-500)',
        }}>
          歡迎回來，{userName}！
        </h2>
        <p style={{ 
          margin: '0.5rem 0 0', 
          color: 'var(--theme-elevation-350)',
          fontSize: '0.875rem',
        }}>
          查看目前的業務情形
        </p>
      </div>

      {/* 統計卡片 */}
      <DashboardStats />

      {/* 快速操作區 */}
      <div style={{ 
        marginTop: '1.5rem',
        padding: '1rem',
        backgroundColor: 'var(--theme-elevation-50)',
        borderRadius: '0.75rem',
        border: '1px solid var(--theme-elevation-100)',
      }}>
        <h3 style={{ 
          margin: '0 0 1rem', 
          fontSize: '0.875rem', 
          fontWeight: 600,
          color: 'var(--theme-elevation-400)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          快速操作
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <SeedButton />
          <a 
            href="/" 
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--theme-elevation-100)',
              color: 'var(--theme-elevation-500)',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            前往網站
          </a>
        </div>
      </div>
    </div>
  )
}
