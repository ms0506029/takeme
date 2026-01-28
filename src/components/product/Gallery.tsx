'use client'

import type { Product } from '@/payload-types'

import { Media } from '@/components/Media'
import { GridTileImage } from '@/components/Grid/tile'
import { Button } from '@/components/ui/button'
import { useSearchParams } from 'next/navigation'
import React, { useEffect, useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Images } from 'lucide-react'

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
        {/* 圖片計數器 - 顯示在主圖右下角 */}
        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
          <Images className="h-3 w-3" />
          <span>
            {current + 1} / {gallery.length}
          </span>
        </div>
      </div>

      {/* 縮圖區域 - 未展開時用輪播，展開時用網格 */}
      {showAllThumbnails ? (
        // 展開模式：網格佈局顯示所有圖片
        <div
          className="gap-2"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          }}
        >
          {gallery.map((item, i) => {
            if (typeof item.image !== 'object') return null

            return (
              <div
                key={`${item.image.id}-${i}`}
                className="cursor-pointer aspect-square"
                onClick={() => setCurrent(i)}
              >
                <GridTileImage active={i === current} media={item.image} />
              </div>
            )
          })}
        </div>
      ) : (
        // 收合模式：輪播顯示前 10 張
        <Carousel setApi={setApi} className="w-full" opts={{ align: 'start', loop: false }}>
          <CarouselContent>
            {displayedGallery.map((item, i) => {
              if (typeof item.image !== 'object') return null

              return (
                <CarouselItem
                  className="basis-1/5 cursor-pointer"
                  key={`${item.image.id}-${i}`}
                  onClick={() => setCurrent(i)}
                >
                  <GridTileImage active={i === current} media={item.image} />
                </CarouselItem>
              )
            })}
          </CarouselContent>
        </Carousel>
      )}

      {/* 方案 A: 展開/收合按鈕放在輪播下方，始終可見 */}
      {hasMoreThumbnails && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] min-w-[44px] px-4 text-sm gap-2 hover:bg-gray-100 transition-colors"
            onClick={() => setShowAllThumbnails(!showAllThumbnails)}
          >
            {showAllThumbnails ? (
              <>
                <ChevronUp className="h-4 w-4" />
                收合圖片
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                展開更多 ({hiddenCount} 張)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
