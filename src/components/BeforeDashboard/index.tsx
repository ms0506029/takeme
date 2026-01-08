'use client'

import { useAuth } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

import { VendorDashboard } from '../VendorDashboard'
import { DashboardStats } from './DashboardStats'
import './index.scss'
import { TrafficChart } from './TrafficChart'

const baseClass = 'before-dashboard'

/**
 * BeforeDashboard Component
 * Simplified Dashboard - Phase 6.1 User Feedback
 */
export const BeforeDashboard: React.FC = () => {
  const { user } = useAuth()
  const userName = user?.name || user?.email?.split('@')[0] || '管理員'
  const isVendor = user?.roles?.includes('vendor')
  const isSuperAdmin = user?.roles?.includes('super-admin')

  // State for real visitor data
  const [totalVisitors, setTotalVisitors] = useState<number | null>(null)

  useEffect(() => {
    const fetchVisitors = async () => {
      try {
        const response = await fetch('/api/dashboard-stats')
        if (response.ok) {
          const data = await response.json()
          // Sum up 7-day users from analytics
          setTotalVisitors(data.analytics?.last7Days?.users || 0)
        }
      } catch (error) {
        console.error('Failed to fetch visitor data:', error)
        setTotalVisitors(0)
      }
    }
    fetchVisitors()
  }, [])

  // Shared Styles
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--color-text-main)',
    marginBottom: '1rem',
    fontFamily: 'var(--font-heading)',
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-soft)',
    border: '1px solid var(--theme-border-color)',
    padding: '1.5rem',
  }

  // Inline SVG Icons (replacing Material Icons to avoid font loading issues)
  const UsersIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  )

  const ChartIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
  )

  return (
    <div className={baseClass} style={{ fontFamily: 'var(--font-body)' }}>
      {/* 商家專屬 Dashboard */}
      {isVendor && !isSuperAdmin && <VendorDashboard />}

      {/* Super Admin Dashboard */}
      {isSuperAdmin && (
        <div style={{ padding: '0 1rem' }}>
          
          {/* 歡迎區塊 (Greeting) */}
          <div style={{ marginBottom: '2rem' }}>
             <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
               歡迎回來，<span style={{color: 'var(--color-primary)'}}>{userName}</span>
             </h2>
             <p style={{ color: 'var(--color-text-sub)' }}>查看目前的業務情形</p>
          </div>

          {/* 總覽 (Overview) */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={sectionTitleStyle}>總覽</h3>
            
            {/* 統計概況區 */}
            <DashboardStats />
            
            {/* 圖表區 */}
            <div style={{ 
                marginTop: '1.5rem', 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '1.5rem' 
            }}>
                {/* 訪客趨勢圖 */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', color: 'var(--color-text-sub)', marginBottom: '0.25rem' }}>7 日訪客數</h4>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)', fontFamily: 'var(--font-heading)' }}>
                                {totalVisitors !== null ? totalVisitors.toLocaleString() : '載入中...'}
                            </div>
                        </div>
                        <div style={{ 
                            width: '2.5rem', 
                            height: '2.5rem', 
                            borderRadius: '50%', 
                            backgroundColor: 'rgba(201, 145, 93, 0.1)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'var(--color-primary)'
                        }}>
                            <UsersIcon />
                        </div>
                    </div>
                    <TrafficChart height={200} title="" />
                </div>

                {/* 銷售分析卡片 (Coming Soon Placeholder) */}
                <div style={{ 
                    ...cardStyle, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    minHeight: '300px', 
                    background: 'linear-gradient(135deg, rgba(201, 145, 93, 0.05) 0%, rgba(201, 145, 93, 0.02) 100%)',
                    border: '1px dashed var(--color-primary-light)'
                }}>
                    <div style={{ textAlign: 'center', color: 'var(--color-text-sub)' }}>
                        <div style={{ 
                            width: '4rem', 
                            height: '4rem', 
                            borderRadius: '50%', 
                            backgroundColor: 'rgba(201, 145, 93, 0.1)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            margin: '0 auto 1rem',
                            color: 'var(--color-primary)'
                        }}>
                            <ChartIcon />
                        </div>
                        <p style={{ fontWeight: 500 }}>銷售分析報表</p>
                        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>即將推出</p>
                    </div>
                </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}


