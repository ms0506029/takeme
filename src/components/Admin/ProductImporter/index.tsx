'use client'

import React, { useCallback, useEffect, useState } from 'react'
import './styles.scss'
import {
  Store,
  Webhook,
  Upload,
  Activity,
  RefreshCw,
  Copy,
  Check,
  X,
  Play,
  AlertCircle,
  CheckCircle2,
  XCircle,
  SkipForward,
  RotateCw,
  Palette,
  FileSpreadsheet,
  Loader2,
  ExternalLink,
} from 'lucide-react'

/**
 * Product Importer Admin View
 * Phase 7.2.1 - 商品匯入介面
 *
 * UI/UX Pro Max Design System:
 * - Primary: #6366F1 (Indigo)
 * - CTA: #10B981 (Emerald)
 * - No emojis - use Lucide icons
 * - Data-Dense Dashboard style
 */

type Tab = 'easystore' | 'webhook' | 'upload' | 'status'

interface ImportLog {
  timestamp: string
  type: 'success' | 'skip' | 'error' | 'info'
  message: string
  productTitle?: string
}

interface ImportProgress {
  total: number
  processed: number
  created: number
  updated: number
  skipped: number
  failed: number
  totalVariants?: number
  currentProduct?: string
  logs: ImportLog[]
}

interface Vendor {
  id: string
  name: string
}

interface CsvPreviewProduct {
  handle: string
  title: string
  variantCount: number
  imageCount: number
  price: number
}

interface CsvProgress {
  phase: 'parsing' | 'processing' | 'done'
  total: number
  processed: number
  created: number
  updated: number
  skipped: number
  failed: number
  currentProduct?: string
}

// ===== CSV 上傳元件 =====
interface CsvUploadSectionProps {
  vendors: Vendor[]
  selectedVendor: string
  setSelectedVendor: (id: string) => void
  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void
}

const CsvUploadSection: React.FC<CsvUploadSectionProps> = ({
  vendors,
  selectedVendor,
  setSelectedVendor,
  setMessage,
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewData, setPreviewData] = useState<{
    rowCount: number
    productCount: number
    products: CsvPreviewProduct[]
  } | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<CsvProgress | null>(null)
  const [downloadImages, setDownloadImages] = useState(true)
  const [imageQuality, setImageQuality] = useState<'thumbnail' | 'detail'>('detail')

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx'))) {
      setFile(droppedFile)
      setPreviewData(null)
    } else {
      setMessage({ type: 'error', text: '請上傳 CSV 或 Excel 檔案' })
    }
  }, [setMessage])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPreviewData(null)
    }
  }, [])

  const handlePreview = async () => {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/import/csv?preview=true', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (data.success) {
        setPreviewData({
          rowCount: data.rowCount,
          productCount: data.productCount,
          products: data.products,
        })
        setMessage({ type: 'success', text: `預覽完成：${data.productCount} 個商品` })
      } else {
        setMessage({ type: 'error', text: data.error || '預覽失敗' })
      }
    } catch {
      setMessage({ type: 'error', text: '預覽過程發生錯誤' })
    }
  }

  const handleImport = async () => {
    if (!file || !selectedVendor) {
      setMessage({ type: 'error', text: '請選擇檔案和目標商家' })
      return
    }

    setImporting(true)
    setProgress({ phase: 'parsing', total: 0, processed: 0, created: 0, updated: 0, skipped: 0, failed: 0 })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('downloadImages', String(downloadImages))
    formData.append('imageQuality', imageQuality)

    try {
      const response = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (data.success !== undefined) {
        setProgress({
          phase: 'done',
          total: data.total,
          processed: data.total,
          created: data.created,
          updated: data.updated,
          skipped: data.skipped,
          failed: data.failed,
        })

        if (data.success) {
          setMessage({
            type: 'success',
            text: `匯入完成！建立: ${data.created}, 更新: ${data.updated}, 跳過: ${data.skipped}`,
          })
        } else {
          setMessage({
            type: 'error',
            text: `匯入完成但有錯誤。失敗: ${data.failed}`,
          })
        }
      } else {
        setMessage({ type: 'error', text: data.error || '匯入失敗' })
      }
    } catch {
      setMessage({ type: 'error', text: '匯入過程發生錯誤' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="tab-content">
      {/* 拖放上傳區域 */}
      <div
        className={`file-upload ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="upload-icon" />
        {file ? (
          <>
            <p><strong><FileSpreadsheet style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />{file.name}</strong></p>
            <p style={{ marginTop: '0.25rem' }}>{(file.size / 1024).toFixed(1)} KB</p>
            <button
              onClick={() => { setFile(null); setPreviewData(null) }}
              className="btn btn-secondary"
              style={{ marginTop: '1rem' }}
            >
              <X />
              移除檔案
            </button>
          </>
        ) : (
          <>
            <p><strong>拖放 CSV/Excel 檔案至此</strong></p>
            <p style={{ marginTop: '0.25rem' }}>或點擊下方按鈕選擇檔案</p>
            <label className="btn btn-secondary" style={{ marginTop: '1rem', cursor: 'pointer' }}>
              選擇檔案
              <input type="file" accept=".csv,.xlsx" onChange={handleFileSelect} hidden />
            </label>
          </>
        )}
      </div>

      {/* 設定區塊 */}
      {file && (
        <div className="card">
          <div className="card-header">
            <h3>匯入設定</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>目標商家</label>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                disabled={importing}
              >
                {vendors.length === 0 && <option value="">載入中...</option>}
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            </div>

            <label className="checkbox-group">
              <input
                type="checkbox"
                checked={downloadImages}
                onChange={(e) => setDownloadImages(e.target.checked)}
                disabled={importing}
              />
              <span>下載圖片並轉換為 WebP（建議勾選）</span>
            </label>

            {downloadImages && (
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>圖片品質</label>
                <select
                  value={imageQuality}
                  onChange={(e) => setImageQuality(e.target.value as 'thumbnail' | 'detail')}
                  disabled={importing}
                >
                  <option value="detail">高品質 (80%, ≈150KB)</option>
                  <option value="thumbnail">壓縮 (65%, ≈50KB)</option>
                </select>
              </div>
            )}

            <div className="btn-group" style={{ borderTop: '1px solid var(--theme-border-color)', paddingTop: '1.5rem' }}>
              <button
                onClick={handlePreview}
                disabled={importing}
                className="btn btn-secondary"
              >
                <AlertCircle />
                預覽
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !selectedVendor}
                className="btn btn-success"
              >
                {importing ? <Loader2 className="animate-spin" /> : <Play />}
                {importing ? '匯入中...' : '開始匯入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 預覽結果 */}
      {previewData && (
        <div className="card">
          <div className="card-header">
            <h3>預覽結果</h3>
          </div>
          <div className="card-body">
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '1.5rem' }}>
              <div className="stat-item">
                <p className="stat-value primary">{previewData.rowCount}</p>
                <p className="stat-label">CSV 行數</p>
              </div>
              <div className="stat-item">
                <p className="stat-value primary">{previewData.productCount}</p>
                <p className="stat-label">商品數量</p>
              </div>
            </div>

            {previewData.products.length > 0 && (
              <div style={{ overflow: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Handle</th>
                      <th>標題</th>
                      <th>變體數</th>
                      <th>圖片數</th>
                      <th>價格</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.products.map((p, i) => (
                      <tr key={i}>
                        <td><code>{p.handle}</code></td>
                        <td>{p.title}</td>
                        <td>{p.variantCount}</td>
                        <td>{p.imageCount}</td>
                        <td>NT${p.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 匯入進度 */}
      {progress && (
        <ProgressCard
          title="匯入進度"
          progress={progress}
          showVariants={false}
        />
      )}
    </div>
  )
}

// ===== 進度卡片元件 =====
interface ProgressCardProps {
  title: string
  progress: ImportProgress | CsvProgress
  currentProduct?: string
  showVariants?: boolean
}

const ProgressCard: React.FC<ProgressCardProps> = ({ title, progress, currentProduct, showVariants = true }) => {
  const isImportProgress = 'totalVariants' in progress
  const percentage = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ width: '0.5rem', height: '0.5rem', background: 'var(--color-success)', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
        <h3>{title}</h3>
      </div>
      <div className="card-body">
        {/* 進度條 */}
        <div className="progress-section">
          <div className="progress-header">
            <span className="progress-label">處理進度</span>
            <span className="progress-value">{progress.processed} / {progress.total}</span>
          </div>
          <div className="progress-bar">
            {progress.total === 0 ? (
              <div className="progress-fill" style={{ width: '33%', animation: 'pulse 2s infinite' }} />
            ) : (
              <div className="progress-fill" style={{ width: `${percentage}%` }} />
            )}
          </div>

          {/* 當前處理中 */}
          {(currentProduct || (isImportProgress && (progress as ImportProgress).currentProduct)) && (
            <div className="progress-status" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Loader2 className="animate-spin" style={{ width: '1rem', height: '1rem' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentProduct || (progress as ImportProgress).currentProduct}
              </span>
            </div>
          )}
        </div>

        {/* 統計 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
          <span className="status-badge active">
            <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem' }} />
            建立: {progress.created}
          </span>
          <span className="status-badge info">
            <RotateCw style={{ width: '0.875rem', height: '0.875rem' }} />
            更新: {progress.updated}
          </span>
          <span className="status-badge pending">
            <SkipForward style={{ width: '0.875rem', height: '0.875rem' }} />
            跳過: {progress.skipped}
          </span>
          <span className="status-badge error">
            <XCircle style={{ width: '0.875rem', height: '0.875rem' }} />
            失敗: {progress.failed}
          </span>
          {showVariants && isImportProgress && (progress as ImportProgress).totalVariants !== undefined && (progress as ImportProgress).totalVariants! > 0 && (
            <span className="status-badge" style={{ background: 'rgba(147, 51, 234, 0.1)', color: '#9333ea' }}>
              <Palette style={{ width: '0.875rem', height: '0.875rem' }} />
              變體: {(progress as ImportProgress).totalVariants}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== 主元件 =====
export const ProductImporter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('easystore')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // EasyStore 相關狀態
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedVendor, setSelectedVendor] = useState<string>('')
  const [skipExisting, setSkipExisting] = useState(true)
  const [downloadImages, setDownloadImages] = useState(true)
  const [previewData, setPreviewData] = useState<{
    productCount?: number
    existingCount?: number
    newCount?: number
  } | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const [importLogs, setImportLogs] = useState<ImportLog[]>([])

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const webhookUrl = `${baseUrl}/api/webhooks/product-sync`

  // 載入商家列表
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const response = await fetch('/api/vendors')
        if (response.ok) {
          const data = await response.json()
          setVendors(data.docs || [])
          if (data.docs?.length > 0) {
            setSelectedVendor(data.docs[0].id)
          }
        }
      } catch (err) {
        console.error('載入商家失敗:', err)
      }
    }
    loadVendors()
  }, [])

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const checkWebhookStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/webhooks/product-sync')
      const data = await response.json()
      if (data.status === 'ok') {
        setMessage({ type: 'success', text: 'Webhook 服務運作正常' })
      } else {
        setMessage({ type: 'error', text: 'Webhook 服務異常' })
      }
    } catch {
      setMessage({ type: 'error', text: '無法連接 Webhook 服務' })
    } finally {
      setLoading(false)
    }
  }

  const testEasyStoreConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/import/easystore?action=test')
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: `EasyStore 連線成功！共有 ${data.productCount} 個商品` })
      } else {
        setMessage({ type: 'error', text: data.error || 'EasyStore 連線失敗' })
      }
    } catch {
      setMessage({ type: 'error', text: '無法連接 EasyStore API' })
    } finally {
      setLoading(false)
    }
  }

  const previewEasyStore = async () => {
    setLoading(true)
    setPreviewData(null)
    try {
      const response = await fetch('/api/import/easystore')
      const data = await response.json()
      if (data.success) {
        setPreviewData({
          productCount: data.productCount,
          existingCount: data.existingCount,
          newCount: data.newCount,
        })
        setMessage({ type: 'success', text: `預覽完成：${data.productCount} 個商品` })
      } else {
        setMessage({ type: 'error', text: data.error || '預覽失敗' })
      }
    } catch {
      setMessage({ type: 'error', text: '無法預覽商品' })
    } finally {
      setLoading(false)
    }
  }

  const startEasyStoreImport = async () => {
    if (!selectedVendor) {
      setMessage({ type: 'error', text: '請選擇目標商家' })
      return
    }

    setImporting(true)
    setImportLogs([])
    setImportProgress({
      total: 0,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      currentProduct: '正在連接 EasyStore...',
      logs: [],
    })

    try {
      const response = await fetch('/api/import/easystore/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: selectedVendor,
          skipExisting,
          downloadImages,
        }),
      })

      if (!response.ok) {
        throw new Error('連接失敗')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('無法讀取串流')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let eventType = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7)
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              handleSSEEvent(eventType, data)
            } catch {
              // 忽略解析錯誤
            }
          }
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '匯入過程發生錯誤' })
    } finally {
      setImporting(false)
    }
  }

  const handleSSEEvent = (event: string, data: any) => {
    switch (event) {
      case 'start':
      case 'loading':
        setImportProgress(prev => ({
          ...prev!,
          currentProduct: data.message,
          total: data.total || prev?.total || 0,
        }))
        break

      case 'loaded':
        setImportProgress(prev => ({
          ...prev!,
          total: data.total,
          currentProduct: data.message,
        }))
        break

      case 'progress':
        setImportProgress({
          total: data.total,
          processed: data.processed,
          created: data.created,
          updated: data.updated,
          skipped: data.skipped,
          failed: data.failed,
          totalVariants: data.totalVariants || 0,
          currentProduct: data.currentProduct,
          logs: [],
        })
        setImportLogs(prev => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            type: data.status === 'error' ? 'error' : data.status === 'skipped' ? 'skip' : 'success',
            message: data.message,
            productTitle: data.currentProduct,
          },
        ].slice(-100))
        break

      case 'complete':
        setImportProgress({
          total: data.total,
          processed: data.total,
          created: data.created,
          updated: data.updated,
          skipped: data.skipped,
          failed: data.failed,
          totalVariants: data.totalVariants || 0,
          logs: [],
        })
        setMessage({
          type: data.success ? 'success' : 'error',
          text: data.message,
        })
        break

      case 'error':
        setMessage({ type: 'error', text: data.message })
        break
    }
  }

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 8000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const tabs = [
    { id: 'easystore' as Tab, label: 'EasyStore 匯入', icon: Store },
    { id: 'webhook' as Tab, label: 'Webhook 整合', icon: Webhook },
    { id: 'upload' as Tab, label: 'CSV 上傳', icon: Upload },
    { id: 'status' as Tab, label: '同步狀態', icon: Activity },
  ]

  return (
    <div className="product-importer">
      {/* Header */}
      <div className="page-header">
        <h1>商品匯入</h1>
        <p>從 EasyStore 或其他平台匯入商品</p>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toast Message */}
      {message && (
        <div className={`toast-message ${message.type}`}>
          {message.type === 'success' ? <CheckCircle2 /> : <XCircle />}
          {message.text}
        </div>
      )}

      {/* Tab: EasyStore */}
      {activeTab === 'easystore' && (
        <div className="tab-content">
          {/* Info Card */}
          <div className="info-card">
            <div className="info-icon">
              <Store />
            </div>
            <h2>EasyStore 商品匯入</h2>
            <p>從您的 EasyStore 商店批量匯入商品到 Payload CMS</p>

            <button
              onClick={testEasyStoreConnection}
              disabled={loading}
              className="btn btn-secondary"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} />
              {loading ? '測試中...' : '測試連線'}
            </button>
          </div>

          {/* 設定區塊 */}
          <div className="card">
            <div className="card-header">
              <h3>匯入設定</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label>目標商家</label>
                <select
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  disabled={importing}
                >
                  {vendors.length === 0 && <option value="">載入中...</option>}
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                  ))}
                </select>
              </div>

              <label className="checkbox-group">
                <input
                  type="checkbox"
                  checked={skipExisting}
                  onChange={(e) => setSkipExisting(e.target.checked)}
                  disabled={importing}
                />
                <span>跳過已存在的商品（依據 EasyStore Product ID）</span>
              </label>

              <label className="checkbox-group">
                <input
                  type="checkbox"
                  checked={downloadImages}
                  onChange={(e) => setDownloadImages(e.target.checked)}
                  disabled={importing}
                />
                <span>下載圖片到 Payload Media（建議勾選）</span>
              </label>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="btn-group">
            <button
              onClick={previewEasyStore}
              disabled={loading || importing}
              className="btn btn-secondary"
            >
              <AlertCircle />
              預覽商品
            </button>
            <button
              onClick={startEasyStoreImport}
              disabled={loading || importing || !selectedVendor}
              className="btn btn-success"
            >
              {importing ? <Loader2 className="animate-spin" /> : <Play />}
              {importing ? '匯入中...' : '開始匯入'}
            </button>
          </div>

          {/* 預覽結果 */}
          {previewData && (
            <div className="card">
              <div className="card-header">
                <h3>預覽結果</h3>
              </div>
              <div className="card-body">
                <div className="stats-grid">
                  <div className="stat-item">
                    <p className="stat-value primary">{previewData.productCount}</p>
                    <p className="stat-label">EasyStore 商品總數</p>
                  </div>
                  <div className="stat-item">
                    <p className="stat-value muted">{previewData.existingCount}</p>
                    <p className="stat-label">已匯入過</p>
                  </div>
                  <div className="stat-item">
                    <p className="stat-value success">{previewData.newCount}</p>
                    <p className="stat-label">待匯入</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 匯入進度 */}
          {importProgress && (
            <ProgressCard
              title="匯入進度"
              progress={importProgress}
              currentProduct={importProgress.currentProduct}
              showVariants={true}
            />
          )}

          {/* 匯入日誌 */}
          {importLogs.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3>匯入日誌</h3>
              </div>
              <div className="card-body">
                <div className="logs-container">
                  {importLogs.slice(-50).map((log, index) => (
                    <div key={index} className="log-entry">
                      <span className="log-time">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`log-icon ${log.type}`}>
                        {log.type === 'success' && <CheckCircle2 />}
                        {log.type === 'skip' && <SkipForward />}
                        {log.type === 'error' && <XCircle />}
                        {log.type === 'info' && <AlertCircle />}
                      </span>
                      <span className="log-message">
                        {log.productTitle && <strong>{log.productTitle}</strong>}
                        {log.productTitle && ' - '}
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Webhook */}
      {activeTab === 'webhook' && (
        <div className="tab-content">
          {/* Info Card */}
          <div className="info-card">
            <div className="info-icon">
              <Webhook />
            </div>
            <h2>Webhook 端點</h2>
            <p>使用此端點讓 Python 爬蟲系統將商品資料同步至 Payload CMS</p>

            <div className="url-display" style={{ maxWidth: '600px', margin: '0 auto 1.5rem' }}>
              <code>{webhookUrl}</code>
              <button
                onClick={() => handleCopy(webhookUrl)}
                className={`copy-btn ${copied ? 'copied' : ''}`}
              >
                {copied ? <Check /> : <Copy />}
              </button>
            </div>

            <button
              onClick={checkWebhookStatus}
              disabled={loading}
              className="btn btn-secondary"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} />
              {loading ? '檢查中...' : '檢查服務狀態'}
            </button>
          </div>

          {/* Code Section */}
          <div className="card">
            <div className="card-header">
              <h3>Python 整合範例</h3>
            </div>
            <div className="card-body">
              <pre className="logs-container" style={{ background: '#1e293b', color: '#f1f5f9', overflow: 'auto' }}>
{`import requests

# Payload CMS Webhook URL
WEBHOOK_URL = "${webhookUrl}"
API_KEY = "your-api-key"  # 設定於環境變數 PRODUCT_SYNC_API_KEY

headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

# 單一商品同步
def sync_product(product_data):
    payload = {
        "action": "sync",
        "product": {
            "title": product_data["title"],
            "externalId": product_data["id"],
            "externalSource": "freaks",  # beams, zozo, freaks, easystore
            "externalUrl": product_data["url"],
            "price": product_data["price"],
            "inventory": product_data.get("inventory", 10),
        }
    }
    response = requests.post(WEBHOOK_URL, json=payload, headers=headers)
    return response.json()`}
              </pre>
            </div>
          </div>

          {/* API Docs */}
          <div className="card">
            <div className="card-header">
              <h3>API 文件</h3>
            </div>
            <div className="card-body" style={{ padding: 0, overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>說明</th>
                    <th>必要參數</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>sync</code></td>
                    <td>同步單一商品（建立或更新）</td>
                    <td><code>{'product: { title, externalId, externalSource, price }'}</code></td>
                  </tr>
                  <tr>
                    <td><code>batch-sync</code></td>
                    <td>批量同步多個商品</td>
                    <td><code>{'products: ProductData[]'}</code></td>
                  </tr>
                  <tr>
                    <td><code>update-discount</code></td>
                    <td>更新商品折扣價</td>
                    <td><code>{'discount: { externalId, externalSource, salePrice }'}</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Upload */}
      {activeTab === 'upload' && (
        <CsvUploadSection
          vendors={vendors}
          selectedVendor={selectedVendor}
          setSelectedVendor={setSelectedVendor}
          setMessage={setMessage}
        />
      )}

      {/* Tab: Status */}
      {activeTab === 'status' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3>最近同步紀錄</h3>
              <a
                href="/admin/collections/products?where[syncStatus][equals]=synced"
                className="btn btn-secondary"
                style={{ margin: 0 }}
              >
                查看全部已同步商品
                <ExternalLink />
              </a>
            </div>
            <div className="card-body">
              <div className="empty-state">
                <Activity />
                <h3>同步紀錄</h3>
                <p>可在商品列表中依「同步狀態」篩選查看同步結果</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductImporter
