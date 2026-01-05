'use client'

import { cn } from '@/utilities/cn'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

/**
 * Scrapbook Design System - SketchButton
 * 
 * 剪貼簿風格的按鈕元件，具有手繪邊框與硬陰影效果。
 * 
 * 變體：
 * - primary: 銅棕色底 + 白字
 * - secondary: 白底 + 黑字
 * - outline: 透明底 + 黑邊框
 */

export interface SketchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按鈕變體樣式 */
  variant?: 'primary' | 'secondary' | 'outline'
  /** 按鈕尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否為全寬 */
  fullWidth?: boolean
}

const variantStyles = {
  primary: [
    'bg-scrapbook-primary text-white',
    'shadow-retro',
    'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-retro-sm',
  ].join(' '),
  secondary: [
    'bg-white text-scrapbook-fg-light',
    'shadow-retro',
    'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-retro-sm',
  ].join(' '),
  outline: [
    'bg-transparent text-scrapbook-fg-light',
    'border-2 border-current',
    'hover:bg-scrapbook-muted-light dark:hover:bg-scrapbook-muted-dark',
  ].join(' '),
}

const sizeStyles = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

export const SketchButton = forwardRef<HTMLButtonElement, SketchButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          // 基礎樣式
          'relative font-display font-bold',
          'border-2 border-black rounded-bubble',
          'transition-all duration-150 ease-out',
          // 變體樣式
          variantStyles[variant],
          // 尺寸樣式
          sizeStyles[size],
          // 全寬
          fullWidth && 'w-full',
          // 禁用狀態
          disabled && 'opacity-50 cursor-not-allowed hover:translate-x-0 hover:translate-y-0',
          className,
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  },
)

SketchButton.displayName = 'SketchButton'

export default SketchButton
