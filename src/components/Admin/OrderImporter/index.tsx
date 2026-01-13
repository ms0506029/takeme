'use client'

import React, { useCallback, useState } from 'react'
import './styles.scss'

/**
 * Order Importer Admin View
 * Phase 7.1.1 - 訂單匯入介面
 * 
 * 功能：
 * 1. 支援 CSV 和 Excel 檔案拖放上傳
 * 2. 來源平台選擇（EasyStore / Shopify）
 * 3. 預覽匯入資料
 * 4. 執行匯入與結果報告
 */

type ImportSource = 'easystore' | 'shopify' | 'other'
type Step = 'upload' | 'preview' | 'importing' | 'result'

interface PreviewOrder {
  externalOrderId: string
  orderNumber?: string
  externalCustomerEmail?: string
  amount: number
  currency: string
  status: string
}

interface ImportResult {
  imported: number
  updated: number
  totalRows: number
  totalErrors: number
  errors: { row: number; message: string }[]
}

// Icons
const UploadIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
)

const CheckCircleIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
)

const AlertCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
)

export const OrderImporter: React.FC = () => {
  const [step, setStep] = useState<Step>('upload')
  const [source, setSource] = useState<ImportSource>('easystore')
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [previewData, setPreviewData] = useState<{
    columns: string[]
    preview: PreviewOrder[]
    totalRows: number
  } | null>(null)
  
  const [result, setResult] = useState<ImportResult | null>(null)

  // 格式化金額
  const formatCurrency = (amount: number, currency: string = 'TWD') => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount / 100)
  }

  // 處理檔案選擇
  const handleFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setError(null)
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('action', 'preview')
      formData.append('source', source)

      const response = await fetch('/api/import-orders', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setPreviewData({
          columns: data.columns,
          preview: data.preview,
          totalRows: data.totalRows,
        })
        setStep('preview')
      } else {
        setError(data.error || '預覽失敗')
      }
    } catch (err) {
      setError('無法解析檔案')
    } finally {
      setLoading(false)
    }
  }, [source])

  // 拖放處理
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [handleFile])

  // 執行匯入
  const handleImport = async () => {
    if (!file) return
    
    setLoading(true)
    setStep('importing')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('action', 'import')
      formData.append('source', source)

      const response = await fetch('/api/import-orders', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      
      setResult({
        imported: data.imported || 0,
        updated: data.updated || 0,
        totalRows: data.totalRows || 0,
        totalErrors: data.totalErrors || 0,
        errors: data.errors || [],
      })
      setStep('result')
    } catch (err) {
      setError('匯入失敗')
      setStep('preview')
    } finally {
      setLoading(false)
    }
  }

  // 重置
  const handleReset = () => {
    setStep('upload')
    setFile(null)
    setPreviewData(null)
    setResult(null)
    setError(null)
  }

  return (
    <div className="order-importer">
      {/* Header */}
      <div className="importer-header">
        <div>
          <h1>訂單匯入</h1>
          <p>從外部平台匯入歷史訂單資料</p>
        </div>
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="upload-section">
          {/* Source Selection */}
          <div className="source-selection">
            <label>來源平台</label>
            <div className="source-buttons">
              {[
                { value: 'easystore', label: 'EasyStore' },
                { value: 'shopify', label: 'Shopify' },
                { value: 'other', label: '其他' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`source-btn ${source === opt.value ? 'active' : ''}`}
                  onClick={() => setSource(opt.value as ImportSource)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dropzone */}
          <div
            className={`dropzone ${dragActive ? 'drag-active' : ''} ${loading ? 'loading' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-input"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-input" className="dropzone-content">
              <UploadIcon />
              <p className="dropzone-title">
                {loading ? '解析中...' : '拖放檔案至此處或點擊選擇'}
              </p>
              <p className="dropzone-hint">
                支援 CSV 及 Excel (.xlsx) 格式
              </p>
            </label>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircleIcon /> {error}
            </div>
          )}
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && previewData && (
        <div className="preview-section">
          <div className="preview-header">
            <div>
              <h2>預覽匯入資料</h2>
              <p>
                檔案：{file?.name} ・ 共 {previewData.totalRows} 筆訂單
              </p>
            </div>
            <div className="preview-actions">
              <button className="btn btn-secondary" onClick={handleReset}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleImport}>
                開始匯入
              </button>
            </div>
          </div>

          <div className="preview-table-container">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>外部訂單編號</th>
                  <th>客戶 Email</th>
                  <th>金額</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {previewData.preview.map((order, idx) => (
                  <tr key={idx}>
                    <td>{order.externalOrderId}</td>
                    <td>{order.externalCustomerEmail || '-'}</td>
                    <td>{formatCurrency(order.amount, order.currency)}</td>
                    <td>
                      <span className={`status-badge status-${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.totalRows > 5 && (
              <p className="preview-more">... 還有 {previewData.totalRows - 5} 筆資料</p>
            )}
          </div>

          <div className="column-info">
            <h4>偵測到的欄位</h4>
            <div className="columns-list">
              {previewData.columns.map((col, idx) => (
                <span key={idx} className="column-tag">{col}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === 'importing' && (
        <div className="importing-section">
          <div className="spinner"></div>
          <h2>正在匯入訂單...</h2>
          <p>請勿關閉此頁面</p>
        </div>
      )}

      {/* Step: Result */}
      {step === 'result' && result && (
        <div className="result-section">
          <div className="result-icon success">
            <CheckCircleIcon />
          </div>
          <h2>匯入完成</h2>
          
          <div className="result-stats">
            <div className="stat">
              <span className="stat-value">{result.imported}</span>
              <span className="stat-label">新增</span>
            </div>
            <div className="stat">
              <span className="stat-value">{result.updated}</span>
              <span className="stat-label">更新</span>
            </div>
            <div className="stat warning">
              <span className="stat-value">{result.totalErrors}</span>
              <span className="stat-label">失敗</span>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="error-list">
              <h4>錯誤紀錄（前 10 筆）</h4>
              <ul>
                {result.errors.slice(0, 10).map((err, idx) => (
                  <li key={idx}>
                    <strong>第 {err.row} 行：</strong> {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="result-actions">
            <button className="btn btn-primary" onClick={handleReset}>
              繼續匯入
            </button>
            <a href="/admin/collections/orders" className="btn btn-secondary">
              查看訂單列表
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderImporter
