'use client'

import { useField } from '@payloadcms/ui'
import React, { useCallback, useEffect, useState } from 'react'

/**
 * FontPicker Admin Component
 * Phase 7.4.2 - 字型選擇器
 * 
 * 用於 Payload CMS Admin 的自訂字型選擇器欄位
 * 支援：
 * - Google Fonts 常用字型
 * - 即時預覽
 * - 中文字型支援
 */

interface FontPickerProps {
  path: string
  field: {
    name: string
    label?: string
  }
}

// 常用字型列表（含 Google Fonts）
const FONT_OPTIONS = [
  // 無襯線體
  { value: 'Inter', label: 'Inter', category: '無襯線' },
  { value: 'Roboto', label: 'Roboto', category: '無襯線' },
  { value: 'Open Sans', label: 'Open Sans', category: '無襯線' },
  { value: 'Noto Sans TC', label: 'Noto Sans TC 思源黑體', category: '無襯線' },
  { value: 'Noto Sans JP', label: 'Noto Sans JP 日文黑體', category: '無襯線' },
  { value: 'Lato', label: 'Lato', category: '無襯線' },
  { value: 'Montserrat', label: 'Montserrat', category: '無襯線' },
  { value: 'Poppins', label: 'Poppins', category: '無襯線' },
  
  // 襯線體
  { value: 'Noto Serif TC', label: 'Noto Serif TC 思源宋體', category: '襯線' },
  { value: 'Playfair Display', label: 'Playfair Display', category: '襯線' },
  { value: 'Merriweather', label: 'Merriweather', category: '襯線' },
  { value: 'Georgia', label: 'Georgia', category: '襯線' },
  
  // 手寫/裝飾
  { value: 'Caveat', label: 'Caveat 手寫', category: '手寫' },
  { value: 'Dancing Script', label: 'Dancing Script', category: '手寫' },
  
  // 等寬
  { value: 'JetBrains Mono', label: 'JetBrains Mono', category: '等寬' },
  { value: 'Fira Code', label: 'Fira Code', category: '等寬' },
  
  // 系統字型
  { value: 'system-ui', label: 'System UI 系統預設', category: '系統' },
]

// 分組後的字型
const GROUPED_FONTS = FONT_OPTIONS.reduce((acc, font) => {
  if (!acc[font.category]) acc[font.category] = []
  acc[font.category].push(font)
  return acc
}, {} as Record<string, typeof FONT_OPTIONS>)

export const FontPicker: React.FC<FontPickerProps> = ({ path }) => {
  const { value, setValue } = useField<string>({ path })
  const [loaded, setLoaded] = useState(false)

  // 動態載入選中的 Google Font
  useEffect(() => {
    if (value && value !== 'system-ui' && !loaded) {
      const link = document.createElement('link')
      link.href = `https://fonts.googleapis.com/css2?family=${value.replace(/\s+/g, '+')}:wght@400;500;600;700&display=swap`
      link.rel = 'stylesheet'
      document.head.appendChild(link)
      setLoaded(true)
    }
  }, [value, loaded])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setValue(e.target.value)
    setLoaded(false) // 重新載入新字型
  }, [setValue])

  return (
    <div className="font-picker-field">
      <style>{`
        .font-picker-field {
          font-family: var(--font-body);
        }
        .font-select {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 0.875rem;
          background: var(--color-surface);
          cursor: pointer;
          margin-bottom: 0.75rem;
        }
        .font-select:focus {
          outline: none;
          border-color: var(--color-primary);
        }
        .font-select optgroup {
          font-weight: 600;
          color: var(--color-text-sub);
        }
        .font-preview {
          padding: 1rem;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-base-50);
        }
        .font-preview-title {
          font-size: 1.5rem;
          margin: 0 0 0.5rem 0;
          font-weight: 600;
        }
        .font-preview-text {
          font-size: 0.875rem;
          color: var(--color-text-sub);
          margin: 0;
        }
        .font-preview-cjk {
          font-size: 1rem;
          margin: 0.5rem 0 0 0;
        }
      `}</style>

      <select 
        className="font-select"
        value={value || 'system-ui'}
        onChange={handleChange}
      >
        {Object.entries(GROUPED_FONTS).map(([category, fonts]) => (
          <optgroup key={category} label={category}>
            {fonts.map(font => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <div className="font-preview">
        <h3 
          className="font-preview-title" 
          style={{ fontFamily: value || 'system-ui' }}
        >
          {value || 'System UI'}
        </h3>
        <p 
          className="font-preview-text"
          style={{ fontFamily: value || 'system-ui' }}
        >
          The quick brown fox jumps over the lazy dog.
        </p>
        <p 
          className="font-preview-cjk"
          style={{ fontFamily: value || 'system-ui' }}
        >
          永遠不要停止學習，因為生活永遠不會停止教導。
        </p>
      </div>
    </div>
  )
}

export default FontPicker
