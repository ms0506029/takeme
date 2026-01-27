'use client'

import type { Product } from '@/payload-types'

import { Media } from '@/components/Media'
import { GridTileImage } from '@/components/Grid/tile'
import { Button } from '@/components/ui/button'
import { useSearchParams } from 'next/navigation'
import React, { useEffect, useState, useMemo } from 'react'
import { ChevronUp } from 'lucide-react'

import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { DefaultDocumentIDType } from 'payload'

type Props = {
  gallery: NonNullable<Product['gallery']>
}

// 初始顯示的縮圖數量（2 排 x 5 個）
const INITIAL_THUMBNAIL_COUNT = 10

export const Gallery: React.FC<Props> = ({ gallery }) => {
  const searchParams = useSearchParams()
  const [current, setCurrent] = useState(0)
  const [api, setApi] = useState<CarouselApi>()
  const [showAllThumbnails, setShowAllThumbnails] = useState(false)

  // 計算要顯示的縮圖
  const displayedGallery = useMemo(() => {
    if (showAllThumbnails || gallery.length <= INITIAL_THUMBNAIL_COUNT) {
      return gallery
    }
    return gallery.slice(0, INITIAL_THUMBNAIL_COUNT)
  }, [gallery, showAllThumbnails])

  const hasMoreThumbnails = gallery.length > INITIAL_THUMBNAIL_COUNT
  const hiddenCount = gallery.length - INITIAL_THUMBNAIL_COUNT

  useEffect(() => {
    if (!api) {
      return
    }
  }, [api])

  // 當 URL 參數變化時，滾動到對應的圖片
  useEffect(() => {
    // 使用 Array.from() 取代 .toArray() 以支援 Safari
    const values = Array.from(searchParams.values())

    if (values && api) {
      // 優先找有 variantOption 匹配的圖片
      const index = gallery.findIndex((item) => {
        if (!item.variantOption) return false

        let variantID: DefaultDocumentIDType

        if (typeof item.variantOption === 'object') {
          variantID = item.variantOption.id
        } else variantID = item.variantOption

        return Boolean(values.find((value) => value === String(variantID)))
      })

      if (index !== -1) {
        setCurrent(index)
        api.scrollTo(index, true)

        // 如果匹配的圖片在隱藏區域，展開顯示全部
        if (index >= INITIAL_THUMBNAIL_COUNT && !showAllThumbnails) {
          setShowAllThumbnails(true)
        }
      }
    }
  }, [searchParams, api, gallery, showAllThumbnails])

  if (!gallery.length) {
    return null
  }

  return (
    <div>
      {/* 主圖 */}
      <div className="relative w-full overflow-hidden mb-4">
        <Media
          resource={gallery[current]?.image}
          className="w-full"
          imgClassName="w-full rounded-lg"
        />
      </div>

      {/* 縮圖輪播 */}
      <Carousel setApi={setApi} className="w-full" opts={{ align: 'start', loop: false }}>
        <CarouselContent>
          {displayedGallery.map((item, i) => {
            if (typeof item.image !== 'object') return null

            return (
              <CarouselItem
                className="basis-1/5"
                key={`${item.image.id}-${i}`}
                onClick={() => setCurrent(i)}
              >
                <GridTileImage active={i === current} media={item.image} />
              </CarouselItem>
            )
          })}

          {/* 顯示更多計數器 */}
          {hasMoreThumbnails && !showAllThumbnails && (
            <CarouselItem className="basis-1/5">
              <button
                onClick={() => setShowAllThumbnails(true)}
                className="w-full aspect-square rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex flex-col items-center justify-center text-gray-600"
              >
                <span className="text-lg font-medium">+{hiddenCount}</span>
                <span className="text-xs">更多</span>
              </button>
            </CarouselItem>
          )}
        </CarouselContent>
      </Carousel>

      {/* 收合按鈕 */}
      {hasMoreThumbnails && showAllThumbnails && (
        <div className="mt-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500"
            onClick={() => setShowAllThumbnails(false)}
          >
            <ChevronUp className="h-3 w-3 mr-1" />
            收合圖片
          </Button>
        </div>
      )}
    </div>
  )
}
