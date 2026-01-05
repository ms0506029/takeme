'use client'

import { cn } from '@/utilities/cn'
import { forwardRef, type InputHTMLAttributes } from 'react'

/**
 * Scrapbook Design System - SketchInput
 * 
 * 剪貼簿風格的輸入框元件，具有手繪邊框效果。
 */

export interface SketchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 輸入框尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 錯誤狀態 */
  error?: boolean
  /** 錯誤訊息 */
  errorMessage?: string
  /** 標籤文字 */
  label?: string
}

const sizeStyles = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-5 py-4 text-lg',
}

export const SketchInput = forwardRef<HTMLInputElement, SketchInputProps>(
  (
    {
      className,
      size = 'md',
      error = false,
      errorMessage,
      label,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || `sketch-input-${Math.random().toString(36).slice(2, 9)}`

    return (
      <div className="w-full">
        {/* 標籤 */}
        {label && (
          <label
            htmlFor={inputId}
            className="block mb-2 font-body text-scrapbook-fg-light dark:text-scrapbook-fg-dark text-shadow-sm"
          >
            {label}
          </label>
        )}

        {/* 輸入框 */}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            // 基礎樣式
            'w-full',
            'font-body',
            'bg-white dark:bg-scrapbook-muted-dark',
            'rounded-bubble',
            'border-2',
            // 邊框顏色
            error
              ? 'border-scrapbook-accent'
              : 'border-black dark:border-scrapbook-fg-dark',
            // 陰影
            'shadow-retro-sm',
            // Focus 狀態
            'focus:outline-none focus:ring-2 focus:ring-scrapbook-primary focus:ring-offset-2',
            // 過渡動畫
            'transition-all duration-150',
            // 尺寸
            sizeStyles[size],
            // Placeholder
            'placeholder:text-scrapbook-fg-light/50 dark:placeholder:text-scrapbook-fg-dark/50',
            className,
          )}
          {...props}
        />

        {/* 錯誤訊息 */}
        {error && errorMessage && (
          <p className="mt-2 text-sm font-body text-scrapbook-accent">
            {errorMessage}
          </p>
        )}
      </div>
    )
  },
)

SketchInput.displayName = 'SketchInput'

export default SketchInput
