'use client'

import { cn } from '@/utilities/cn'
import React from 'react'

/**
 * Scrapbook Design System - GamePark
 * 
 * 剪貼簿風格的遊戲園區區塊。
 * 具有萊姆綠背景、虛線邊框、彩色圖示、性別切換貼紙。
 */

export interface GameParkProps {
  title?: string
  activeGender?: 'men' | 'women'
  onGenderChange?: (gender: 'men' | 'women') => void
  children?: React.ReactNode
  className?: string
}

export function GamePark({
  title = 'GAME PARK',
  activeGender = 'men',
  onGenderChange,
  children,
  className,
}: GameParkProps) {
  return (
    <section
      className={cn(
        'py-12 md:py-16',
        'bg-lime-100 dark:bg-lime-900/30',
        className,
      )}
    >
      <div className="container">
        {/* 虛線邊框區塊 */}
        <div
          className={cn(
            'p-6 md:p-10',
            'border-4 border-dashed border-lime-600 dark:border-lime-400',
            'rounded-bubble-lg',
            'bg-white/50 dark:bg-black/20',
          )}
        >
          {/* 標題與性別切換 */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            {/* 標題 */}
            <h2
              className={cn(
                'font-display font-bold text-3xl md:text-4xl',
                'text-lime-700 dark:text-lime-300',
                'text-shadow-md',
              )}
            >
              🎮 {title}
            </h2>

            {/* 性別切換（貼紙 UI） */}
            <div className="flex gap-2">
              <button
                onClick={() => onGenderChange?.('men')}
                className={cn(
                  'px-5 py-2',
                  'font-display font-bold text-sm',
                  'border-2 border-black',
                  'rounded-bubble',
                  'transition-all duration-200',
                  activeGender === 'men'
                    ? 'bg-scrapbook-secondary text-white shadow-retro'
                    : 'bg-white text-scrapbook-fg-light hover:bg-scrapbook-muted-light',
                )}
              >
                MEN
              </button>
              <button
                onClick={() => onGenderChange?.('women')}
                className={cn(
                  'px-5 py-2',
                  'font-display font-bold text-sm',
                  'border-2 border-black',
                  'rounded-bubble',
                  'transition-all duration-200',
                  activeGender === 'women'
                    ? 'bg-scrapbook-accent text-white shadow-retro'
                    : 'bg-white text-scrapbook-fg-light hover:bg-scrapbook-muted-light',
                )}
              >
                WOMEN
              </button>
            </div>
          </div>

          {/* 內容區域 */}
          <div>{children}</div>
        </div>
      </div>
    </section>
  )
}

export default GamePark
