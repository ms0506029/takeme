'use client'

import React from 'react'

interface MarqueeBlockProps {
  text: string
  speed?: 'slow' | 'normal' | 'fast'
  direction?: 'left' | 'right'
  texture?: 'kraft' | 'tape' | 'solid'
  backgroundColor?: string
  textColor?: string
  fontSize?: 'sm' | 'md' | 'lg' | 'xl'
  repeatCount?: number
  id?: string
}

/**
 * MarqueeBlock Component
 * 
 * 復古風格跑馬燈，支援多種材質與動畫效果
 */
export const MarqueeBlock: React.FC<MarqueeBlockProps> = ({
  text,
  speed = 'normal',
  direction = 'left',
  texture = 'kraft',
  backgroundColor = '#C9915D',
  textColor = '#FFFFFF',
  fontSize = 'md',
  repeatCount = 3,
  id,
}) => {
  // 速度對應的動畫時長
  const speedMap = {
    slow: '30s',
    normal: '20s',
    fast: '10s',
  }

  // 字體大小對應
  const fontSizeMap = {
    sm: '0.875rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
  }

  // 材質背景樣式
  const getTextureStyle = (): React.CSSProperties => {
    switch (texture) {
      case 'kraft':
        return {
          background: 'linear-gradient(135deg, #D4A574 0%, #C9915D 50%, #B8845A 100%)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
        }
      case 'tape':
        return {
          background: 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, transparent 2%, transparent 98%, rgba(255,255,255,0.3) 100%), #F5E6B8',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transform: 'rotate(-0.5deg)',
        }
      case 'solid':
      default:
        return {
          backgroundColor: backgroundColor,
        }
    }
  }

  // 重複文字內容
  const repeatedText = Array(repeatCount).fill(text).join(' • ')

  const containerStyle: React.CSSProperties = {
    ...getTextureStyle(),
    overflow: 'hidden',
    padding: '0.75rem 0',
    position: 'relative',
  }

  const marqueeStyle: React.CSSProperties = {
    display: 'flex',
    whiteSpace: 'nowrap',
    animation: `marquee-${direction} ${speedMap[speed]} linear infinite`,
    color: textColor,
    fontSize: fontSizeMap[fontSize],
    fontWeight: 500,
    letterSpacing: '0.05em',
  }

  return (
    <div id={id} style={containerStyle}>
      <style>
        {`
          @keyframes marquee-left {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes marquee-right {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
          }
        `}
      </style>
      <div style={marqueeStyle}>
        <span style={{ paddingRight: '2rem' }}>{repeatedText}</span>
        <span style={{ paddingRight: '2rem' }}>{repeatedText}</span>
      </div>
    </div>
  )
}
