'use client'

import { useField, } from '@payloadcms/ui'
import React, { useCallback, useEffect, useState } from 'react'

/**
 * ColorPicker Admin Component
 * Phase 7.4.2 - 顏色選擇器
 * 
 * 用於 Payload CMS Admin 的自訂顏色選擇器欄位
 * 支援：
 * - 視覺化顏色選擇
 * - Hex 輸入
 * - 預設調色盤
 */

interface ColorPickerProps {
  path: string
  field: {
    name: string
    label?: string
  }
}

// 預設調色盤顏色
const PRESET_COLORS = [
  '#C9915D', '#6B5844', '#FDF8F3', '#2D2A26', '#E5DED5', // 品牌色
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', // 彩色
  '#ef4444', '#eab308', '#14b8a6', '#06b6d4', '#6366f1', // 更多
  '#FFFFFF', '#F5F5F5', '#E5E5E5', '#A3A3A3', '#525252', '#171717', '#000000', // 灰階
]

export const ColorPicker: React.FC<ColorPickerProps> = ({ path }) => {
  const { value, setValue } = useField<string>({ path })
  const [inputValue, setInputValue] = useState(value || '#000000')

  useEffect(() => {
    setInputValue(value || '#000000')
  }, [value])

  const handleColorChange = useCallback((color: string) => {
    setInputValue(color)
    setValue(color)
  }, [setValue])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // 只有當是有效的 hex 格式時才更新
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue) || /^#[0-9A-Fa-f]{3}$/.test(newValue)) {
      setValue(newValue)
    }
  }, [setValue])

  return (
    <div className="color-picker-field">
      <style>{`
        .color-picker-field {
          font-family: var(--font-body);
        }
        .color-picker-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .color-preview {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          border: 2px solid var(--color-border);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .color-preview input[type="color"] {
          position: absolute;
          width: 100%;
          height: 100%;
          border: none;
          cursor: pointer;
          opacity: 0;
        }
        .color-preview-inner {
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .color-text-input {
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 0.875rem;
          font-family: var(--font-mono, monospace);
          width: 120px;
          background: var(--color-surface);
        }
        .color-text-input:focus {
          outline: none;
          border-color: var(--color-primary);
        }
        .preset-colors {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .preset-color {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 1px solid var(--color-border);
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .preset-color:hover {
          transform: scale(1.15);
        }
        .preset-color.active {
          box-shadow: 0 0 0 2px var(--color-primary);
        }
      `}</style>

      <div className="color-picker-container">
        <div className="color-preview">
          <div 
            className="color-preview-inner" 
            style={{ backgroundColor: inputValue }}
          />
          <input 
            type="color" 
            value={inputValue} 
            onChange={(e) => handleColorChange(e.target.value)}
          />
        </div>
        <input 
          type="text"
          className="color-text-input"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#000000"
        />
      </div>

      <div className="preset-colors">
        {PRESET_COLORS.map(color => (
          <button
            key={color}
            type="button"
            className={`preset-color ${value === color ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => handleColorChange(color)}
            title={color}
          />
        ))}
      </div>
    </div>
  )
}

export default ColorPicker
