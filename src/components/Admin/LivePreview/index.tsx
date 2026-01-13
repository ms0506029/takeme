'use client'

import React, { useState } from 'react'

/**
 * Live Preview Panel Component
 * Phase 7.4.1 - 即時預覽面板
 * 
 * 在 Admin 編輯時顯示前台頁面的即時預覽
 */

interface LivePreviewPanelProps {
  url: string
  title?: string
}

export const LivePreviewPanel: React.FC<LivePreviewPanelProps> = ({ 
  url, 
  title = '即時預覽'
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [scale, setScale] = useState(0.5)
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  const dimensions = {
    desktop: { width: 1440, height: 900 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 812 },
  }

  const currentDimension = dimensions[device]

  return (
    <div className="live-preview-panel">
      <style>{`
        .live-preview-panel {
          background: var(--color-base-100);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          overflow: hidden;
        }
        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
        }
        .preview-title {
          font-size: 0.875rem;
          font-weight: 600;
          margin: 0;
        }
        .preview-controls {
          display: flex;
          gap: 0.5rem;
        }
        .device-btn {
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          background: transparent;
          cursor: pointer;
          transition: all 0.2s;
        }
        .device-btn.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }
        .device-btn:hover:not(.active) {
          background: var(--color-base-100);
        }
        .preview-container {
          position: relative;
          padding: 2rem;
          display: flex;
          justify-content: center;
          overflow: auto;
          background: repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%) 50% / 16px 16px;
          min-height: 400px;
        }
        .preview-frame-wrapper {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }
        .preview-iframe {
          display: block;
          border: none;
        }
        .preview-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .preview-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--color-border);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="preview-header">
        <h3 className="preview-title">{title}</h3>
        <div className="preview-controls">
          <button 
            className={`device-btn ${device === 'desktop' ? 'active' : ''}`}
            onClick={() => setDevice('desktop')}
          >
            🖥️ 桌機
          </button>
          <button 
            className={`device-btn ${device === 'tablet' ? 'active' : ''}`}
            onClick={() => setDevice('tablet')}
          >
            📱 平板
          </button>
          <button 
            className={`device-btn ${device === 'mobile' ? 'active' : ''}`}
            onClick={() => setDevice('mobile')}
          >
            📲 手機
          </button>
        </div>
      </div>

      <div className="preview-container">
        {isLoading && (
          <div className="preview-loading">
            <div className="preview-spinner" />
            <span>載入中...</span>
          </div>
        )}
        <div 
          className="preview-frame-wrapper"
          style={{
            width: currentDimension.width * scale,
            height: currentDimension.height * scale,
          }}
        >
          <iframe
            className="preview-iframe"
            src={url}
            width={currentDimension.width}
            height={currentDimension.height}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </div>
    </div>
  )
}

export default LivePreviewPanel
