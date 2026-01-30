'use client'

/**
 * Scraper Dashboard (Client Component)
 *
 * 爬蟲系統主控制台
 * - Extension 連線狀態
 * - 快速建立任務
 * - 執行中任務監控
 * - 歷史任務列表
 *
 * UI/UX Pro Max Design System:
 * - Primary: #6366F1 (Indigo)
 * - CTA: #10B981 (Emerald)
 * - No emojis - use Lucide icons
 * - Data-Dense Dashboard style
 */

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import './styles.scss'
import {
  Globe,
  Play,
  Pause,
  Square,
  RefreshCw,
  Clock,
  AlertCircle,
  Settings,
  List,
  Package,
  Wifi,
  WifiOff,
  Loader2,
  ChevronRight,
  Eye,
  Download,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react'

// 類型定義
type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'
type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

interface Platform {
  id: string
  name: string
  slug: string
  baseUrl?: string
  enabled: boolean
}

interface Job {
  id: string
  platform: Platform | string
  type: 'deep' | 'shallow'
  status: JobStatus
  sourceUrl: string
  progress: {
    current: number
    total: number
    percentage: number
  }
  createdAt: string
  startedAt?: string
  completedAt?: string
}

interface DashboardStats {
  activePlatforms: number
  runningJobs: number
  pendingProducts: number
}

export const ScraperDashboard: React.FC = () => {
  // 狀態
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [runningJobs, setRunningJobs] = useState<Job[]>([])
  const [recentJobs, setRecentJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<DashboardStats>({ activePlatforms: 0, runningJobs: 0, pendingProducts: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  // 新任務表單
  const [newJob, setNewJob] = useState({
    platformId: '',
    sourceUrl: '',
    type: 'deep' as 'deep' | 'shallow',
    maxPages: 10,
  })

  // 載入資料
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/scraper')
      const data = await response.json()

      if (data.success) {
        setPlatforms(data.data.platforms || [])
        setStats(data.data.stats || { activePlatforms: 0, runningJobs: 0, pendingProducts: 0 })
        setRunningJobs(data.data.runningJobs || [])
        setRecentJobs(data.data.recentJobs || [])

        if (data.data.stats?.runningJobs > 0) {
          setConnectionStatus('connected')
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 載入 API Key
  const fetchApiKey = useCallback(async () => {
    try {
      const response = await fetch('/api/scraper/settings')
      const data = await response.json()
      if (data.success && data.apiKey) {
        setApiKey(data.apiKey)
      }
    } catch (err) {
      console.error('Failed to fetch API key:', err)
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchApiKey()

    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData, fetchApiKey])

  // 任務狀態徽章
  const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
    const labels: Record<JobStatus, string> = {
      pending: '等待中',
      running: '執行中',
      paused: '已暫停',
      completed: '已完成',
      failed: '失敗',
      cancelled: '已取消',
    }
    return (
      <span className={`status-badge ${status}`}>
        {labels[status]}
      </span>
    )
  }

  // 建立任務
  const handleCreateJob = async () => {
    if (!newJob.platformId || !newJob.sourceUrl) return

    setIsCreating(true)
    try {
      const response = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: newJob.platformId,
          sourceUrl: newJob.sourceUrl,
          type: newJob.type,
          config: {
            maxPages: newJob.maxPages,
          },
        }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchData()
        setNewJob({ platformId: '', sourceUrl: '', type: 'deep', maxPages: 10 })
      } else {
        alert(data.error || '建立任務失敗')
      }
    } catch (err) {
      console.error('Failed to create job:', err)
      alert('建立任務失敗')
    } finally {
      setIsCreating(false)
    }
  }

  // 控制任務
  const handleJobControl = async (jobId: string, command: 'pause' | 'resume' | 'stop') => {
    try {
      const response = await fetch('/api/scraper/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: command === 'pause' ? 'PAUSE_JOB' : command === 'resume' ? 'RESUME_JOB' : 'STOP_JOB',
          jobId,
        }),
      })

      if (response.ok) {
        await fetchData()
      }
    } catch (err) {
      console.error('Failed to control job:', err)
    }
  }

  // 複製 API Key
  const handleCopyApiKey = async () => {
    if (apiKey) {
      await navigator.clipboard.writeText(apiKey)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  // 取得平台名稱
  const getPlatformName = (platform: Platform | string) => {
    if (typeof platform === 'string') return platform
    return platform.name
  }

  if (isLoading) {
    return (
      <div className="scraper-dashboard">
        <div className="loading-state">
          <div className="spinner" />
          <p>載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="scraper-dashboard">
      {/* 頁面標題 */}
      <div className="dashboard-header">
        <div className="header-title">
          <h1>爬蟲系統控制台</h1>
          <p>管理平台配置、執行爬取任務、預覽匯入商品</p>
        </div>
        <div className="header-actions">
          <button onClick={fetchData} className="btn btn-secondary">
            <RefreshCw />
            重新整理
          </button>
          <Link href="/admin/globals/scraper-settings" className="btn btn-secondary">
            <Settings />
            全局設定
          </Link>
        </div>
      </div>

      {/* Extension 連線狀態列 + API Key */}
      <div className="connection-bar">
        <div className="connection-info">
          <div className={`connection-icon ${connectionStatus === 'connected' ? 'connected' : 'disconnected'}`}>
            {connectionStatus === 'connected' ? <Wifi /> : <WifiOff />}
          </div>
          <div className="connection-status">
            <div className="status-indicator">
              <span className={`status-dot ${connectionStatus}`} />
              <span>
                {connectionStatus === 'connected' && 'Extension 已連線'}
                {connectionStatus === 'connecting' && 'Extension 連線中...'}
                {connectionStatus === 'disconnected' && 'Extension 未連線'}
              </span>
            </div>
            {connectionStatus === 'disconnected' && (
              <p className="status-hint">請安裝並啟用 Chrome Extension 以使用爬蟲功能</p>
            )}
          </div>
        </div>

        <div className="api-key-section">
          {apiKey && (
            <div className="api-key-display">
              <span className="api-key-label">API Key:</span>
              <code>{showApiKey ? apiKey : '••••••••••••••••'}</code>
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="icon-btn"
                title={showApiKey ? '隱藏' : '顯示'}
              >
                <Eye />
              </button>
              <button
                onClick={handleCopyApiKey}
                className={`icon-btn ${copySuccess ? 'success' : ''}`}
                title="複製"
              >
                {copySuccess ? <Check /> : <Copy />}
              </button>
            </div>
          )}
          {connectionStatus === 'disconnected' && (
            <a href="/chrome-extension" target="_blank" className="btn btn-primary">
              <Download />
              下載 Extension
            </a>
          )}
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="stats-grid">
        <Link href="/admin/collections/scraper-platforms" className="stat-card indigo">
          <div className="stat-header">
            <div className="stat-icon indigo"><Globe /></div>
            <div className="stat-arrow"><ChevronRight /></div>
          </div>
          <h3 className="stat-title">平台管理</h3>
          <p className="stat-desc">配置爬蟲目標網站的選擇器</p>
          <div className="stat-value">
            <span className="value indigo">{stats.activePlatforms}</span>
            <span className="label">個啟用平台</span>
          </div>
        </Link>

        <Link href="/admin/collections/scraping-jobs" className="stat-card amber">
          <div className="stat-header">
            <div className="stat-icon amber"><List /></div>
            <div className="stat-arrow"><ChevronRight /></div>
          </div>
          <h3 className="stat-title">爬取任務</h3>
          <p className="stat-desc">查看所有任務的執行狀態</p>
          <div className="stat-value">
            <span className="value amber">{stats.runningJobs}</span>
            <span className="label">執行中</span>
          </div>
        </Link>

        <Link href="/admin/collections/scraped-products" className="stat-card emerald">
          <div className="stat-header">
            <div className="stat-icon emerald"><Package /></div>
            <div className="stat-arrow"><ChevronRight /></div>
          </div>
          <h3 className="stat-title">商品預覽</h3>
          <p className="stat-desc">審核爬取的商品資料</p>
          <div className="stat-value">
            <span className="value emerald">{stats.pendingProducts}</span>
            <span className="label">待處理</span>
          </div>
        </Link>
      </div>

      {/* 快速建立任務 */}
      <div className="section-card">
        <div className="section-header">
          <h2>建立新任務</h2>
        </div>
        <div className="section-body">
          <div className="create-job-form">
            <div className="form-grid">
              <div className="form-group">
                <label>目標平台</label>
                <select
                  value={newJob.platformId}
                  onChange={(e) => setNewJob({ ...newJob, platformId: e.target.value })}
                >
                  <option value="">選擇平台...</option>
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>起始 URL</label>
                <input
                  type="text"
                  value={newJob.sourceUrl}
                  onChange={(e) => setNewJob({ ...newJob, sourceUrl: e.target.value })}
                  placeholder="https://www.daytona-park.com/itemlist?stock=1&sort=new"
                />
              </div>

              <div className="form-group">
                <label>任務類型</label>
                <select
                  value={newJob.type}
                  onChange={(e) => setNewJob({ ...newJob, type: e.target.value as 'deep' | 'shallow' })}
                >
                  <option value="deep">深層爬取</option>
                  <option value="shallow">淺層同步</option>
                </select>
              </div>
            </div>

            <div className="form-grid" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>最大頁數</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newJob.maxPages}
                  onChange={(e) => setNewJob({ ...newJob, maxPages: parseInt(e.target.value) || 10 })}
                />
              </div>
            </div>

            <div className="form-hint">
              <AlertCircle />
              <span>{newJob.type === 'deep' ? '深層爬取會取得完整商品資料' : '淺層同步只更新價格和庫存'}</span>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCreateJob}
                disabled={isCreating || !newJob.platformId || !newJob.sourceUrl}
                className="btn btn-success"
              >
                {isCreating ? <Loader2 className="animate-spin" /> : <Play />}
                {isCreating ? '建立中...' : '開始爬取'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 執行中任務 */}
      {runningJobs.length > 0 && (
        <div className="section-card">
          <div className="section-header">
            <h2>執行中任務 ({runningJobs.length})</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)' }}>每 10 秒更新</span>
          </div>
          <div className="section-body running-jobs">
            {runningJobs.map((job) => (
              <div key={job.id} className="job-item">
                <div className="job-info">
                  <div className="job-header">
                    <span className="job-platform">{getPlatformName(job.platform)}</span>
                    <StatusBadge status={job.status} />
                    <span className="job-type">{job.type === 'deep' ? '深層' : '淺層'}</span>
                  </div>
                  <p className="job-url">{job.sourceUrl}</p>
                  <div className="job-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${job.progress.percentage}%` }} />
                    </div>
                    <span className="progress-text">
                      {job.progress.current} / {job.progress.total || '?'} 商品 ({job.progress.percentage}%)
                    </span>
                  </div>
                </div>
                <div className="job-actions">
                  {job.status === 'running' && (
                    <button onClick={() => handleJobControl(job.id, 'pause')} className="action-btn" title="暫停">
                      <Pause />
                    </button>
                  )}
                  {job.status === 'paused' && (
                    <button onClick={() => handleJobControl(job.id, 'resume')} className="action-btn" title="繼續">
                      <Play />
                    </button>
                  )}
                  <button onClick={() => handleJobControl(job.id, 'stop')} className="action-btn" title="停止">
                    <Square />
                  </button>
                  <Link href={`/admin/collections/scraping-jobs/${job.id}`} className="action-btn" title="查看詳情">
                    <Eye />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 歷史任務 */}
      <div className="section-card recent-jobs">
        <div className="section-header">
          <h2>最近任務</h2>
          <Link href="/admin/collections/scraping-jobs" className="action-link">查看全部</Link>
        </div>
        <div className="section-body">
          {recentJobs.length === 0 ? (
            <div className="empty-state">
              <Clock />
              <p>尚無任務記錄</p>
              <p>建立第一個爬取任務開始使用</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>狀態</th>
                    <th>平台</th>
                    <th>類型</th>
                    <th>進度</th>
                    <th>時間</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job) => (
                    <tr key={job.id}>
                      <td><StatusBadge status={job.status} /></td>
                      <td>{getPlatformName(job.platform)}</td>
                      <td>
                        <span className={`status-badge ${job.type === 'deep' ? 'running' : 'pending'}`}>
                          {job.type === 'deep' ? '深層' : '淺層'}
                        </span>
                      </td>
                      <td>{job.progress.current} / {job.progress.total || '?'}</td>
                      <td>{new Date(job.createdAt).toLocaleString('zh-TW')}</td>
                      <td>
                        <Link href={`/admin/collections/scraping-jobs/${job.id}`} className="action-link">
                          查看
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScraperDashboard
