'use client'

import React, { useCallback, useState } from 'react'
import './styles.scss'

/**
 * Product Importer Admin View
 * Phase 7.2.1 - 商品匯入介面
 * 
 * 功能：
 * 1. 手動上傳 CSV/Excel 檔案匯入商品
 * 2. 顯示 Webhook 端點資訊供爬蟲系統使用
 * 3. 同步狀態監控
 */

type Tab = 'upload' | 'webhook' | 'status'

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

export const ProductImporter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('webhook')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Webhook URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const webhookUrl = `${baseUrl}/api/webhooks/product-sync`

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

  // 清除訊息
  React.useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  return (
    <div className="product-importer">
      {/* Header */}
      <div className="importer-header">
        <div>
          <h1>商品匯入</h1>
          <p>從外部平台匯入商品或透過 Webhook 接收爬蟲資料</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
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
          {message.text}
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
    return response.json()

# 批量同步
def batch_sync_products(products):
    payload = {
        "action": "batch-sync",
        "products": products
    }
    response = requests.post(WEBHOOK_URL, json=payload, headers=headers)
    return response.json()

# 更新折扣
def update_discount(external_id, sale_price):
    payload = {
        "action": "update-discount",
        "discount": {
            "externalId": external_id,
            "externalSource": "freaks",
            "salePrice": sale_price
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
                  <td>product: { title, externalId, externalSource, price }</td>
                </tr>
                <tr>
                  <td><code>batch-sync</code></td>
                  <td>批量同步多個商品</td>
                  <td>products: ProductData[]</td>
                </tr>
                <tr>
                  <td><code>update-discount</code></td>
                  <td>更新商品折扣價</td>
                  <td>discount: { externalId, externalSource, salePrice }</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Upload */}
      {activeTab === 'upload' && (
        <div className="upload-section">
          <div className="dropzone">
            <UploadIcon />
            <p className="dropzone-title">CSV 上傳功能開發中</p>
            <p className="dropzone-hint">
              目前請使用 Webhook 方式整合爬蟲系統
            </p>
          </div>
        </div>
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
