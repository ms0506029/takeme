'use client'

import Chart from 'chart.js/auto'
import React, { useEffect, useRef, useState } from 'react'

interface TrafficData {
  date: string
  sessions: number
  users: number
}

interface TrafficChartProps {
  title?: string
  height?: number
}

/**
 * TrafficChart Component
 * 
 * 使用 Chart.js 顯示 GA4 流量趨勢圖
 */
export const TrafficChart: React.FC<TrafficChartProps> = ({
  title = '7 日流量趨勢',
  height = 250,
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)
  const [data, setData] = useState<TrafficData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard-stats')
        if (response.ok) {
          const result = await response.json()
          setData(result.analytics?.dailyTrend || [])
        }
      } catch (error) {
        console.error('Failed to fetch traffic data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (!chartRef.current || loading || data.length === 0) return

    // 銷毀舊圖表
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    // 格式化日期
    const labels = data.map((d) => {
      const date = new Date(
        `${d.date.slice(0, 4)}-${d.date.slice(4, 6)}-${d.date.slice(6, 8)}`
      )
      return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
    })

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '工作階段',
            data: data.map((d) => d.sessions),
            borderColor: '#C9915D',
            backgroundColor: 'rgba(201, 145, 93, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#C9915D',
          },
          {
            label: '使用者',
            data: data.map((d) => d.users),
            borderColor: '#6B5844',
            backgroundColor: 'rgba(107, 88, 68, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#6B5844',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14 },
            bodyFont: { size: 13 },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false,
        },
      },
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data, loading])

  const containerStyle: React.CSSProperties = {
    backgroundColor: 'var(--theme-elevation-50)',
    borderRadius: '1rem',
    padding: '1.5rem',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    border: '1px solid var(--theme-elevation-100)',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--theme-elevation-450)',
    marginBottom: '1rem',
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={titleStyle}>{title}</div>
        <div
          style={{
            height: `${height}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--theme-elevation-350)',
          }}
        >
          載入中...
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={titleStyle}>{title}</div>
        <div
          style={{
            height: `${height}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--theme-elevation-350)',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <span>尚無流量數據</span>
          <span style={{ fontSize: '0.75rem' }}>請確認 GA4 已正確配置</span>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>{title}</div>
      <div style={{ height: `${height}px` }}>
        <canvas ref={chartRef} />
      </div>
    </div>
  )
}
