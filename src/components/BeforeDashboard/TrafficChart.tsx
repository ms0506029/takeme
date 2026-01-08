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
 * EasyStore Style - Minimalist Line Chart
 */
export const TrafficChart: React.FC<TrafficChartProps> = ({
  title = '',
  height = 200,
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

    // EasyStore Style Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(201, 145, 93, 0.2)');
    gradient.addColorStop(1, 'rgba(201, 145, 93, 0)');

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '訪客數',
            data: data.map((d) => d.users),
            borderColor: '#C9915D',
            backgroundColor: gradient,
            borderWidth: 2,
            fill: true,
            tension: 0.4, // Smooth curve
            pointRadius: 0,
            pointHoverRadius: 4,
            pointBackgroundColor: '#C9915D',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false, // Hide legend for cleaner look
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#333',
            bodyColor: '#666',
            borderColor: '#E2E8F0',
            borderWidth: 1,
            padding: 12,
            titleFont: { size: 13, family: "'Noto Sans TC', sans-serif" },
            bodyFont: { size: 13, family: "'Noto Sans TC', sans-serif" },
            displayColors: false,
            callbacks: {
                label: (context) => `訪客: ${context.parsed.y}`
            }
          },
        },
        scales: {
          x: {
            grid: {
              display: false, // Hide X grid
            },
            ticks: {
                color: '#94A3B8',
                font: { size: 11 }
            }
          },
          y: {
            display: false, // Hide Y axis completely like suggestion
            beginAtZero: true,
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

  // Container style is now handled by parent specific card wrapper, 
  // but if used standalone we ensure full height
  return (
    <div style={{ padding: 0, height: '100%', width: '100%' }}>
      {title && <div style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--color-text-sub)' }}>{title}</div>}
      
      {loading ? (
        <div style={{ height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
          載入中...
        </div>
      ) : data.length === 0 ? (
        <div style={{ height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
          尚無數據
        </div>
      ) : (
        <div style={{ height: `${height}px` }}>
          <canvas ref={chartRef} />
        </div>
      )}
    </div>
  )
}

