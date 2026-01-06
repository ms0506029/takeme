import type { Config } from 'src/payload-types'

import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

type Global = keyof Config['globals']

async function getGlobal<T extends Global>(slug: T, depth = 0): Promise<Config['globals'][T] | null> {
  // 安全防護：Build 階段可能無法連接資料庫（如 Zeabur 部署時）
  try {
    const payload = await getPayload({ config: configPromise })

    const global = await payload.findGlobal({
      slug: slug as any, // 類型斷言：slug 類型在 Payload 內部定義，需要 as any
      depth,
    })

    return global as Config['globals'][T]
  } catch (error) {
    // Build 階段無法連接資料庫，返回 null 讓呼叫者使用 fallback
    console.warn(`[getGlobal] Failed to fetch global "${slug}" - Database may not be available during build`)
    return null
  }
}

/**
 * Returns a unstable_cache function mapped with the cache tag for the slug
 * 注意：Build 階段可能返回 null，呼叫者需處理 fallback
 */
export const getCachedGlobal = <T extends Global>(slug: T, depth = 0) =>
  unstable_cache(async () => getGlobal<T>(slug, depth), [slug], {
    tags: [`global_${slug}`],
  })
