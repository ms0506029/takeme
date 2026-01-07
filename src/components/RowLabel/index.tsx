'use client'

import { useRowLabel } from '@payloadcms/ui'
import React from 'react'

/**
 * NavItemRowLabel Component
 * 
 * 在 Header 的 navItems 陣列中顯示友善的 Row Label
 */
export const NavItemRowLabel: React.FC = () => {
  const { data, rowNumber } = useRowLabel<{
    label?: string
    style?: string
  }>()

  const customLabel = data?.label || `選單項目 ${String(rowNumber).padStart(2, '0')}`
  const styleEmoji = data?.style === 'highlight' ? '✨' : data?.style === 'button' ? '🔘' : ''

  return (
    <span>
      {styleEmoji} {customLabel}
    </span>
  )
}
