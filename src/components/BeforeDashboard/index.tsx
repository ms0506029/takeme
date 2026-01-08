'use client'

import { useAuth } from '@payloadcms/ui'
import React from 'react'

import { VendorDashboard } from '../VendorDashboard'
import { DashboardStats } from './DashboardStats'
import './index.scss'
import { TrafficChart } from './TrafficChart'

const baseClass = 'before-dashboard'

/**
 * BeforeDashboard Component
 * EasyStore Style - Phase 6 Refinement
 */
export const BeforeDashboard: React.FC = () => {
  const { user } = useAuth()
  const userName = user?.name || user?.email?.split('@')[0] || '管理員'
  const isVendor = user?.roles?.includes('vendor')
  const isSuperAdmin = user?.roles?.includes('super-admin')

  // Shared Styles
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.25rem', // 1.125rem in original, bumping up slightly
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

  // --- Sales Channels Mock Data ---
  const channels = [
    { name: '品牌官網', icon: 'store', iconColor: 'var(--color-primary)' },
    { name: 'Facebook', icon: 'public', iconColor: '#1877F2' }, // Replace with SVG in future
    { name: 'Instagram', icon: 'camera_alt', iconColor: '#E1306C' }, // Replace with SVG
    { name: 'Google購物', icon: 'shopping_bag', iconColor: '#4285F4' }, // Replace with SVG
    { name: 'LINE', icon: 'chat', iconColor: '#06C755' },
  ]

  // --- News Mock Data ---
  const newsItems = [
    {
      title: '91APP Payments X Mastercard 2026 線上講座',
      date: '2026.01.08 (四) 15:00 - 17:00',
      desc: 'AI 支付 x 電商成長引擎，一次升級轉換率！',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    },
    {
      title: 'TakeMe System Update 2025.12',
      date: '12月功能更新報告',
      desc: '新增自動化庫存鎖定與 LINE 通知功能。',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    },
  ]

  return (
    <div className={baseClass} style={{ fontFamily: 'var(--font-body)' }}>
      {/* 商家專屬 Dashboard */}
      {isVendor && !isSuperAdmin && <VendorDashboard />}

      {/* Super Admin Dashboard */}
      {isSuperAdmin && (
        <div style={{ padding: '0 1rem' }}>
          
          {/* 0. 歡迎區塊 (Greeting) */}
          <div style={{ marginBottom: '2rem' }}>
             <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
               歡迎回來，<span style={{color: 'var(--color-primary)'}}>{userName}</span>
             </h2>
             <p style={{ color: 'var(--color-text-sub)' }}>查看目前的業務情形</p>
          </div>

          {/* 1. 銷售管道 (Sales Channels) */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={sectionTitleStyle}>銷售管道</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {channels.map((channel) => (
                <a
                  key={channel.name}
                  href="#"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: '0.75rem',
                    boxShadow: 'var(--shadow-soft)',
                    border: '1px solid var(--theme-border-color)',
                    textDecoration: 'none',
                    transition: 'transform 0.2s',
                  }}
                  className="hover-card" // defined below or in css
                >
                  <span className="material-icons-outlined" style={{ color: channel.iconColor }}>{channel.icon}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-main)' }}>
                    {channel.name}
                  </span>
                </a>
              ))}
              <a
                href="#"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.75rem',
                  border: '2px dashed var(--theme-border-color)',
                  color: 'var(--color-text-sub)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                <span className="material-icons-outlined" style={{ fontSize: '1.25rem' }}>add</span>
                新增管道
              </a>
            </div>
          </div>

          {/* 2. 總覽 (Overview) */}
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
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', color: 'var(--color-text-sub)', marginBottom: '0.25rem' }}>總訪客數</h4>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                                138,804 <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--color-text-sub)' }}>訪客數</span>
                            </div>
                        </div>
                    </div>
                    <TrafficChart height={200} title="" />
                </div>
                {/* 預留空間給另一個圖表 */}
                <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', backgroundColor: '#F8FAFC' }}>
                    <div style={{ textAlign: 'center', color: 'var(--color-text-sub)' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem' }}>insights</span>
                        <p>銷售分析報表 (Coming Soon)</p>
                    </div>
                </div>
            </div>
          </div>

          {/* 3. 最新資訊 (News) */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={sectionTitleStyle}>最新資訊</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {newsItems.map((news, index) => (
                <div key={index} style={{ ...cardStyle, padding: 0, overflow: 'hidden', cursor: 'pointer' }} className="news-card">
                   <div style={{ position: 'relative', aspectRatio: '16/9' }}>
                      <img src={news.image} alt={news.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ 
                          position: 'absolute', 
                          top: '1rem', 
                          left: '1rem', 
                          backgroundColor: 'var(--color-primary)', 
                          color: 'white', 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '2rem', 
                          fontSize: '0.75rem', 
                          fontWeight: 700 
                      }}>New</div>
                   </div>
                   <div style={{ padding: '1.5rem' }}>
                     <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                       {news.title}
                     </h4>
                     <p style={{ fontSize: '0.875rem', color: 'var(--color-text-sub)', lineHeight: 1.6 }}>
                       {news.desc}
                     </p>
                     <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--color-text-sub)' }}>
                       {news.date}
                     </div>
                   </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

