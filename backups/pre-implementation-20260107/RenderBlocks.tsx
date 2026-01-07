import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { BannerBlock } from '@/blocks/Banner/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { CarouselBlock } from '@/blocks/Carousel/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { ThreeItemGridBlock } from '@/blocks/ThreeItemGrid/Component'
// Scrapbook Blocks
import { ScrapbookCheckListBlock } from '@/blocks/ScrapbookCheckList/Component'
import { ScrapbookHeroBlock } from '@/blocks/ScrapbookHero/Component'
import { ScrapbookIconsNavBlock } from '@/blocks/ScrapbookIconsNav/Component'
import { ScrapbookNewsBlock } from '@/blocks/ScrapbookNews/Component'
import { ScrapbookPromoBadgeBlock } from '@/blocks/ScrapbookPromoBadge/Component'
import { ScrapbookRankingBlock } from '@/blocks/ScrapbookRanking/Component'
import { toKebabCase } from '@/utilities/toKebabCase'
import React, { Fragment } from 'react'

import type { Page } from '../payload-types'

const blockComponents = {
  archive: ArchiveBlock,
  banner: BannerBlock,
  carousel: CarouselBlock,
  content: ContentBlock,
  cta: CallToActionBlock,
  formBlock: FormBlock,
  mediaBlock: MediaBlock,
  threeItemGrid: ThreeItemGridBlock,
  // Scrapbook Blocks
  scrapbookHero: ScrapbookHeroBlock,
  scrapbookPromoBadge: ScrapbookPromoBadgeBlock,
  scrapbookIconsNav: ScrapbookIconsNavBlock,
  scrapbookRanking: ScrapbookRankingBlock,
  scrapbookNews: ScrapbookNewsBlock,
  scrapbookCheckList: ScrapbookCheckListBlock,
}

export const RenderBlocks: React.FC<{
  blocks: Page['layout'][0][]
}> = (props) => {
  const { blocks } = props

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (hasBlocks) {
    return (
      <Fragment>
        {blocks.map((block, index) => {
          const { blockName, blockType } = block

          if (blockType && blockType in blockComponents) {
            const Block = blockComponents[blockType]

            if (Block) {
              return (
                <div className="my-16" key={index}>
                  {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                  {/* @ts-ignore - weird type mismatch here */}
                  <Block id={toKebabCase(blockName!)} {...block} />
                </div>
              )
            }
          }
          return null
        })}
      </Fragment>
    )
  }

  return null
}
