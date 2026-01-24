'use client'

import React, { useCallback, useEffect, useState } from 'react'
import './styles.scss'

/**
 * Product Importer Admin View
 * Phase 7.2.1 - 商品匯入介面
 * 
 * 功能：
 * 1. EasyStore 商品匯入（新增）
 * 2. Webhook 端點資訊供爬蟲系統使用
 * 3. CSV 上傳（開發中）
 * 4. 同步狀態監控
 */

type Tab = 'easystore' | 'webhook' | 'upload' | 'status'

// Types
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
  currentProduct?: string
  logs: ImportLog[]
}

interface Vendor {
  id: string
  name: string
}

// Icons
const UploadIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
)

const WebhookIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"></path>
    <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"></path>
    <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8"></path>
  </svg>
)

const StoreIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
)

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
)

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
)

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
)

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
)

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
)

// ===== CSV 上傳元件 =====

interface CsvUploadSectionProps {
  vendors: Vendor[]
  selectedVendor: string
  setSelectedVendor: (id: string) => void
  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void
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

  // 拖放處理
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

  // 預覽 CSV
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
    } catch (err) {
      setMessage({ type: 'error', text: '預覽過程發生錯誤' })
    }
  }

  // 執行匯入
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
    } catch (err) {
      setMessage({ type: 'error', text: '匯入過程發生錯誤' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="upload-section">
      {/* 拖放上傳區域 */}
      <div
        className={`dropzone ${isDragging ? 'dropzone-active' : ''} ${file ? 'dropzone-has-file' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadIcon />
        {file ? (
          <>
            <p className="dropzone-title">📄 {file.name}</p>
            <p className="dropzone-hint">{(file.size / 1024).toFixed(1)} KB</p>
            <button className="btn btn-secondary btn-sm" onClick={() => { setFile(null); setPreviewData(null) }}>
              移除檔案
            </button>
          </>
        ) : (
          <>
            <p className="dropzone-title">拖放 CSV/Excel 檔案至此</p>
            <p className="dropzone-hint">或點擊下方按鈕選擇檔案</p>
            <label className="btn btn-secondary">
              選擇檔案
              <input type="file" accept=".csv,.xlsx" onChange={handleFileSelect} hidden />
            </label>
          </>
        )}
      </div>

      {/* 設定區塊 */}
      {file && (
        <div className="settings-card">
          <h3>匯入設定</h3>

          <div className="form-group">
            <label>目標商家</label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              disabled={importing}
            >
              {vendors.length === 0 && <option value="">載入中...</option>}
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={downloadImages}
                onChange={(e) => setDownloadImages(e.target.checked)}
                disabled={importing}
              />
              下載圖片並轉換為 WebP（建議勾選）
            </label>
          </div>

          {downloadImages && (
            <div className="form-group">
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

          <div className="action-buttons">
            <button className="btn btn-secondary" onClick={handlePreview} disabled={importing}>
              🔍 預覽
            </button>
            <button className="btn btn-primary" onClick={handleImport} disabled={importing || !selectedVendor}>
              <PlayIcon />
              {importing ? '匯入中...' : '開始匯入'}
            </button>
          </div>
        </div>
      )}

      {/* 預覽結果 */}
      {previewData && (
        <div className="preview-result">
          <h3>預覽結果</h3>
          <div className="preview-stats">
            <div className="stat">
              <span className="stat-value">{previewData.rowCount}</span>
              <span className="stat-label">CSV 行數</span>
            </div>
            <div className="stat">
              <span className="stat-value">{previewData.productCount}</span>
              <span className="stat-label">商品數量</span>
            </div>
          </div>

          {previewData.products.length > 0 && (
            <table className="preview-table">
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
          )}
        </div>
      )}

      {/* 匯入進度 */}
      {progress && (
        <div className="import-progress">
          <h3>匯入進度</h3>
          <div className="progress-bar">
            {progress.phase === 'parsing' ? (
              <div className="progress-fill progress-indeterminate" style={{ width: '30%' }} />
            ) : (
              <div
                className="progress-fill"
                style={{ width: `${progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}%` }}
              />
            )}
          </div>
          <div className="progress-text">
            {progress.processed} / {progress.total}
          </div>
          <div className="progress-stats">
            <span className="stat-success">✅ 建立: {progress.created}</span>
            <span className="stat-update">🔄 更新: {progress.updated}</span>
            <span className="stat-skip">⏭️ 跳過: {progress.skipped}</span>
            <span className="stat-error">❌ 失敗: {progress.failed}</span>
          </div>
        </div>
      )}
    </div>
  )
}

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

  // Webhook URL
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

  // 複製 URL
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  // 檢查 Webhook 狀態
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
    } catch (err) {
      setMessage({ type: 'error', text: '無法連接 Webhook 服務' })
    } finally {
      setLoading(false)
    }
  }

  // 測試 EasyStore 連線
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
    } catch (err) {
      setMessage({ type: 'error', text: '無法連接 EasyStore API' })
    } finally {
      setLoading(false)
    }
  }

  // 預覽 EasyStore 商品
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
    } catch (err) {
      setMessage({ type: 'error', text: '無法預覽商品' })
    } finally {
      setLoading(false)
    }
  }

  // 執行 EasyStore 匯入
  const startEasyStoreImport = async () => {
    if (!selectedVendor) {
      setMessage({ type: 'error', text: '請選擇目標商家' })
      return
    }

    setImporting(true)
    setImportLogs([])
    // 立即顯示進度條（初始狀態）
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
      const response = await fetch('/api/import/easystore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: selectedVendor,
          skipExisting,
          downloadImages,
        }),
      })

      const data = await response.json()
      
      if (data.success !== undefined) {
        setImportProgress({
          total: data.total,
          processed: data.total,
          created: data.created,
          updated: data.updated,
          skipped: data.skipped,
          failed: data.failed,
          logs: data.logs || [],
        })
        setImportLogs(data.logs || [])
        
        if (data.success) {
          setMessage({ 
            type: 'success', 
            text: `匯入完成！建立: ${data.created}, 更新: ${data.updated}, 跳過: ${data.skipped}` 
          })
        } else {
          setMessage({ 
            type: 'error', 
            text: `匯入完成但有錯誤。失敗: ${data.failed}` 
          })
        }
      } else {
        setMessage({ type: 'error', text: data.error || '匯入失敗' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: '匯入過程發生錯誤' })
    } finally {
      setImporting(false)
    }
  }

  // 清除訊息
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 8000)
      return () => clearTimeout(timer)
    }
  }, [message])

  return (
    <div className="product-importer">
      {/* Header */}
      <div className="importer-header">
        <div>
          <h1>商品匯入</h1>
          <p>從 EasyStore 或其他平台匯入商品</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'easystore' ? 'active' : ''}`}
          onClick={() => setActiveTab('easystore')}
        >
          🏪 EasyStore 匯入
        </button>
        <button
          className={`tab ${activeTab === 'webhook' ? 'active' : ''}`}
          onClick={() => setActiveTab('webhook')}
        >
          Webhook 整合
        </button>
        <button
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          CSV 上傳
        </button>
        <button
          className={`tab ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          同步狀態
        </button>
      </div>

      {/* Toast Message */}
      {message && (
        <div className={`toast toast-${message.type}`}>
          {message.type === 'success' ? <CheckIcon /> : <XIcon />}
          {message.text}
        </div>
      )}

      {/* Tab: EasyStore */}
      {activeTab === 'easystore' && (
        <div className="easystore-section">
          <div className="info-card">
            <div className="info-card-icon">
              <StoreIcon />
            </div>
            <h2>EasyStore 商品匯入</h2>
            <p>從您的 EasyStore 商店批量匯入商品到 Payload CMS</p>
            
            <button 
              className="btn btn-secondary"
              onClick={testEasyStoreConnection}
              disabled={loading}
            >
              <RefreshIcon />
              {loading ? '測試中...' : '測試連線'}
            </button>
          </div>

          {/* 設定區塊 */}
          <div className="settings-card">
            <h3>匯入設定</h3>
            
            <div className="form-group">
              <label>目標商家</label>
              <select 
                value={selectedVendor} 
                onChange={(e) => setSelectedVendor(e.target.value)}
                disabled={importing}
              >
                {vendors.length === 0 && (
                  <option value="">載入中...</option>
                )}
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={skipExisting}
                  onChange={(e) => setSkipExisting(e.target.checked)}
                  disabled={importing}
                />
                跳過已存在的商品（依據 EasyStore Product ID）
              </label>
            </div>

            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={downloadImages}
                  onChange={(e) => setDownloadImages(e.target.checked)}
                  disabled={importing}
                />
                下載圖片到 Payload Media（建議勾選）
              </label>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="action-buttons">
            <button 
              className="btn btn-secondary"
              onClick={previewEasyStore}
              disabled={loading || importing}
            >
              🔍 預覽商品
            </button>
            <button 
              className="btn btn-primary"
              onClick={startEasyStoreImport}
              disabled={loading || importing || !selectedVendor}
            >
              <PlayIcon />
              {importing ? '匯入中...' : '開始匯入'}
            </button>
          </div>

          {/* 預覽結果 */}
          {previewData && (
            <div className="preview-result">
              <h3>預覽結果</h3>
              <div className="preview-stats">
                <div className="stat">
                  <span className="stat-value">{previewData.productCount}</span>
                  <span className="stat-label">EasyStore 商品總數</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{previewData.existingCount}</span>
                  <span className="stat-label">已匯入過</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{previewData.newCount}</span>
                  <span className="stat-label">待匯入</span>
                </div>
              </div>
            </div>
          )}

          {/* 匯入進度 */}
          {importProgress && (
            <div className="import-progress">
              <h3>匯入進度</h3>
              <div className="progress-bar">
                {importProgress.total === 0 ? (
                  // 連接中 - indeterminate 動畫
                  <div 
                    className="progress-fill progress-indeterminate"
                    style={{ width: '30%' }}
                  />
                ) : (
                  // 正常進度條
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${(importProgress.processed / importProgress.total) * 100}%` 
                    }}
                  />
                )}
              </div>
              <div className="current-product">
                <div className="spinner" />
                {importProgress.currentProduct || '正在處理中...'}
              </div>
              <div className="progress-text">
                {importProgress.processed} / {importProgress.total} 
              </div>
              <div className="progress-stats">
                <span className="stat-success">✅ 建立: {importProgress.created}</span>
                <span className="stat-update">🔄 更新: {importProgress.updated}</span>
                <span className="stat-skip">⏭️ 跳過: {importProgress.skipped}</span>
                <span className="stat-error">❌ 失敗: {importProgress.failed}</span>
              </div>
            </div>
          )}

          {/* 匯入日誌 */}
          {importLogs.length > 0 && (
            <div className="import-logs">
              <h3>匯入日誌</h3>
              <div className="logs-container">
                {importLogs.slice(-50).map((log, index) => (
                  <div key={index} className={`log-entry log-${log.type}`}>
                    <span className="log-time">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="log-icon">
                      {log.type === 'success' && '✅'}
                      {log.type === 'skip' && '⏭️'}
                      {log.type === 'error' && '❌'}
                      {log.type === 'info' && 'ℹ️'}
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
          )}
        </div>
      )}

      {/* Tab: Webhook */}
      {activeTab === 'webhook' && (
        <div className="webhook-section">
          <div className="info-card">
            <div className="info-card-icon">
              <WebhookIcon />
            </div>
            <h2>Webhook 端點</h2>
            <p>使用此端點讓 Python 爬蟲系統將商品資料同步至 Payload CMS</p>
            
            <div className="endpoint-box">
              <code>{webhookUrl}</code>
              <button 
                className="btn btn-icon" 
                onClick={() => handleCopy(webhookUrl)}
                title="複製"
              >
                <CopyIcon />
                {copied && <span className="copy-tooltip">已複製！</span>}
              </button>
            </div>
            
            <button 
              className="btn btn-secondary"
              onClick={checkWebhookStatus}
              disabled={loading}
            >
              <RefreshIcon />
              {loading ? '檢查中...' : '檢查服務狀態'}
            </button>
          </div>

          <div className="code-section">
            <h3>Python 整合範例</h3>
            <pre className="code-block">
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

          <div className="api-docs">
            <h3>API 文件</h3>
            <table className="docs-table">
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
        <div className="status-section">
          <div className="status-header">
            <h2>最近同步紀錄</h2>
            <a href="/admin/collections/products?where[syncStatus][equals]=synced" className="btn btn-secondary">
              查看全部已同步商品
            </a>
          </div>
          <p className="status-hint">
            可在商品列表中依「同步狀態」篩選查看同步結果
          </p>
        </div>
      )}
    </div>
  )
}

export default ProductImporter
