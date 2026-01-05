'use client'

import { cn } from '@/utilities/cn'
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

/**
 * Scrapbook Design System - SketchCard
 * 
 * 剪貼簿風格的卡片元件，具有紙張質感與雙層陰影效果。
 * 可選擇性添加膠帶或長尾夾裝飾。
 * 
 * 變體：
 * - default: 標準卡片 (collage-sm 陰影)
 * - elevated: 突出卡片 (collage-md 陰影)
 * - hero: 大型卡片 (collage-lg 陰影)
 */

export interface SketchCardProps extends HTMLAttributes<HTMLDivElement> {
  /** 卡片陰影層次 */
  variant?: 'default' | 'elevated' | 'hero'
  /** 膠帶裝飾位置 */
  tape?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'none'
  /** 長尾夾裝飾 */
  clip?: 'top-left' | 'top-right' | 'none'
  /** 是否有邊框 */
  bordered?: boolean
  /** 內距尺寸 */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children?: ReactNode
}

const shadowStyles = {
  default: 'shadow-collage-sm',
  elevated: 'shadow-collage-md',
  hero: 'shadow-collage-lg',
}

const paddingStyles = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
}

export const SketchCard = forwardRef<HTMLDivElement, SketchCardProps>(
  (
    {
      className,
      variant = 'default',
      tape = 'none',
      clip = 'none',
      bordered = true,
      padding = 'md',
      children,
      ...props
    },
    ref,
  ) => {
    // 膠帶 class 映射
    const tapeClass = tape !== 'none' ? `tape-${tape}` : ''
    // 長尾夾 class 映射
    const clipClass = clip !== 'none' ? `clip-${clip}` : ''

    return (
      <div
        ref={ref}
        className={cn(
          // 基礎樣式
          'relative',
          'bg-white dark:bg-scrapbook-muted-dark',
          'rounded-bubble',
          // 邊框
          bordered && 'border-2 border-black dark:border-scrapbook-fg-dark',
          // 陰影
          shadowStyles[variant],
          // 內距
          paddingStyles[padding],
          // 裝飾
          tapeClass,
          clipClass,
          // 過渡動畫
          'transition-shadow duration-200',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)

SketchCard.displayName = 'SketchCard'

export default SketchCard
