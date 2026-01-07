'use client'

import Link from 'next/link'
import React from 'react'

interface CollageItem {
  image?: {
    url?: string
    alt?: string
  }
  rotation?: number
  size?: 'small' | 'medium' | 'large'
  link?: string
  caption?: string
  id?: string
}

interface Sticker {
  text: string
  style?: 'handwritten' | 'tape' | 'postit' | 'circle'
  color?: 'pink' | 'mint' | 'yellow' | 'lavender' | 'kraft'
  rotation?: number
  id?: string
}

interface CollageBlockProps {
  title?: string
  items?: CollageItem[]
  stickers?: Sticker[]
  layout?: 'scattered' | 'grid' | 'stacked'
  backgroundColor?: string
  showTapeCorners?: boolean
  id?: string
}

/**
 * CollageBlock Component
 * 
 * 雜誌風格拼貼區塊，支援不規則排列與手寫貼紙效果
 */
export const CollageBlock: React.FC<CollageBlockProps> = ({
  title = 'LOOK BOOK',
  items = [],
  stickers = [],
  layout = 'scattered',
  backgroundColor = '#FDF8F3',
  showTapeCorners = true,
  id,
}) => {
  // 尺寸對應
  const sizeMap = {
    small: 'w-32 h-32 md:w-40 md:h-40',
    medium: 'w-48 h-48 md:w-56 md:h-56',
    large: 'w-64 h-64 md:w-72 md:h-72',
  }

  // 貼紙顏色
  const colorMap = {
    pink: 'bg-pink-200 text-pink-800',
    mint: 'bg-emerald-200 text-emerald-800',
    yellow: 'bg-yellow-200 text-yellow-800',
    lavender: 'bg-purple-200 text-purple-800',
    kraft: 'bg-amber-200 text-amber-900',
  }

  // 散落式位置 (預設位置)
  const scatteredPositions = [
    { top: '5%', left: '10%' },
    { top: '15%', right: '15%' },
    { top: '40%', left: '25%' },
    { top: '35%', right: '10%' },
    { bottom: '20%', left: '15%' },
    { bottom: '10%', right: '20%' },
  ]

  return (
    <section
      id={id}
      className="relative py-16 px-4 overflow-hidden"
      style={{ backgroundColor }}
    >
      {/* 標題 */}
      {title && (
        <h2
          className="text-center text-4xl font-bold mb-12 tracking-tight"
          style={{ fontFamily: 'var(--font-lexend)' }}
        >
          {title}
        </h2>
      )}

      {/* 拼貼容器 */}
      <div className={`max-w-6xl mx-auto ${layout === 'scattered' ? 'relative min-h-[500px]' : ''}`}>
        {layout === 'scattered' ? (
          // 散落式排列
          <>
            {items.map((item, index) => {
              const position = scatteredPositions[index % scatteredPositions.length]
              return (
                <CollageItemComponent
                  key={item.id || index}
                  item={item}
                  sizeClass={sizeMap[item.size || 'medium']}
                  showTapeCorners={showTapeCorners}
                  style={{
                    position: 'absolute',
                    ...position,
                    transform: `rotate(${item.rotation || 0}deg)`,
                    zIndex: index + 1,
                  }}
                />
              )
            })}
          </>
        ) : layout === 'grid' ? (
          // 網格排列
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {items.map((item, index) => (
              <CollageItemComponent
                key={item.id || index}
                item={item}
                sizeClass="w-full aspect-square"
                showTapeCorners={showTapeCorners}
                style={{
                  transform: `rotate(${item.rotation || 0}deg)`,
                }}
              />
            ))}
          </div>
        ) : (
          // 疊加式
          <div className="relative flex justify-center items-center min-h-[400px]">
            {items.map((item, index) => (
              <CollageItemComponent
                key={item.id || index}
                item={item}
                sizeClass={sizeMap[item.size || 'medium']}
                showTapeCorners={showTapeCorners}
                style={{
                  position: 'absolute',
                  transform: `rotate(${item.rotation || 0}deg) translateX(${index * 30 - items.length * 15}px)`,
                  zIndex: items.length - index,
                }}
              />
            ))}
          </div>
        )}

        {/* 貼紙 */}
        {stickers.map((sticker, index) => (
          <StickerComponent
            key={sticker.id || index}
            sticker={sticker}
            colorClass={colorMap[sticker.color || 'pink']}
            index={index}
          />
        ))}
      </div>
    </section>
  )
}

/**
 * CollageItemComponent - 單個拼貼項目
 */
function CollageItemComponent({
  item,
  sizeClass,
  showTapeCorners,
  style,
}: {
  item: CollageItem
  sizeClass: string
  showTapeCorners?: boolean
  style?: React.CSSProperties
}) {
  const content = (
    <div
      className={`${sizeClass} relative bg-white shadow-lg transition-transform hover:scale-105 cursor-pointer`}
      style={{
        ...style,
        padding: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      {/* 膠帶角落 */}
      {showTapeCorners && (
        <>
          <div
            className="absolute -top-2 -left-2 w-8 h-4 bg-yellow-200/80"
            style={{ transform: 'rotate(-45deg)' }}
          />
          <div
            className="absolute -top-2 -right-2 w-8 h-4 bg-yellow-200/80"
            style={{ transform: 'rotate(45deg)' }}
          />
        </>
      )}
      
      {/* 圖片 */}
      <div className="w-full h-full overflow-hidden">
        <img
          src={item.image?.url || '/placeholder.jpg'}
          alt={item.image?.alt || ''}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* 說明文字 */}
      {item.caption && (
        <p
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-sm whitespace-nowrap"
          style={{ fontFamily: 'var(--font-patrick-hand)' }}
        >
          {item.caption}
        </p>
      )}
    </div>
  )

  if (item.link) {
    return <Link href={item.link}>{content}</Link>
  }

  return content
}

/**
 * StickerComponent - 手寫貼紙
 */
function StickerComponent({
  sticker,
  colorClass,
  index,
}: {
  sticker: Sticker
  colorClass: string
  index: number
}) {
  const positions = [
    { top: '10%', right: '5%' },
    { bottom: '15%', left: '5%' },
    { top: '50%', right: '10%' },
    { bottom: '30%', right: '15%' },
  ]
  
  const position = positions[index % positions.length]
  
  const baseStyles: React.CSSProperties = {
    position: 'absolute',
    ...position,
    transform: `rotate(${sticker.rotation || -3}deg)`,
    zIndex: 10,
  }

  if (sticker.style === 'circle') {
    return (
      <div
        className={`${colorClass} rounded-full w-20 h-20 flex items-center justify-center text-center p-2 shadow-md`}
        style={baseStyles}
      >
        <span style={{ fontFamily: 'var(--font-patrick-hand)', fontSize: '0.875rem' }}>
          {sticker.text}
        </span>
      </div>
    )
  }

  if (sticker.style === 'tape') {
    return (
      <div
        className="bg-yellow-100/90 px-4 py-1 shadow-sm"
        style={{
          ...baseStyles,
          fontFamily: 'var(--font-patrick-hand)',
        }}
      >
        {sticker.text}
      </div>
    )
  }

  // handwritten or postit
  return (
    <div
      className={`${colorClass} px-3 py-2 shadow-md ${sticker.style === 'postit' ? 'rounded-sm' : 'rounded-lg'}`}
      style={{
        ...baseStyles,
        fontFamily: 'var(--font-patrick-hand)',
      }}
    >
      {sticker.text}
    </div>
  )
}
