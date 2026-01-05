import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'

/**
 * Scrapbook Seeding Script
 * 
 * 自動在資料庫中建立一個包含所有 Scrapbook 區塊的「首頁」。
 * 這樣用戶就不需要手動從頭開始建立。
 */
async function seedScrapbook() {
  const payload = await getPayload({ config: configPromise })

  console.log('🚀 開始初始化 Scrapbook 首頁資料...')

  // 1. 檢查是否已存在首頁
  const existingPages = await payload.find({
    collection: 'pages',
    where: {
      slug: {
        equals: 'home',
      },
    },
  })

  const homeData = {
    title: '首頁',
    slug: 'home',
    _status: 'published' as const,
    hero: {
      type: 'lowImpact',
      richText: {
        root: {
          type: 'root',
          children: [
            {
              type: 'heading',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'ONLINE STORE',
                  version: 1,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              tag: 'h1',
              version: 1,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
    },
    layout: [
      // 1. Hero 橫幅
      {
        blockType: 'scrapbookHero',
        blockName: 'Hero Section',
        title: 'ONLINE STORE',
        subtitle: '日本直送・獨家設計・限量發售',
        ctaText: '立即選購',
        ctaLink: '/products',
      },
      // 2. 促銷標籤列
      {
        blockType: 'scrapbookPromoBadge',
        blockName: 'Promo Badge Row',
        badges: [
          { label: '¥5,000 OFF', href: '/promotions/5000off', color: 'orange' },
          { label: '2 BUY 10% OFF', href: '/promotions/2buy', color: 'green' },
          { label: 'NEW YEAR SALE', href: '/promotions/newyear', color: 'red' },
          { label: 'SUPPORT', href: '/support', color: 'pink' },
        ],
      },
      // 3. 圖示導覽
      {
        blockType: 'scrapbookIconsNav',
        blockName: 'Icons Navigation',
        items: [
          { label: 'Shop', href: '/shop', iconType: 'shop' },
          { label: 'Coordinate', href: '/coordinate', iconType: 'coordinate' },
          { label: 'Info', href: '/info', iconType: 'info' },
          { label: 'Coupon', href: '/coupons', iconType: 'coupon' },
        ],
      },
      // 4. CHECK LIST（先於 Ranking 顯示）
      {
        blockType: 'scrapbookCheckList',
        blockName: 'Check List Section',
        title: 'CHECK LIST',
        subtitle: "Don't miss these items",
        products: [],
      },
      // 5. RANKING
      {
        blockType: 'scrapbookRanking',
        blockName: 'Ranking Section',
        title: 'RANKING',
        subtitle: '毎日更新！いま売れているアイテム',
        itemCount: 10,
        products: [],
      },
      // 6. NEWS
      {
        blockType: 'scrapbookNews',
        blockName: 'News Section',
        items: [
          {
            title: 'NEW ARRIVAL',
            description: '最新秋季單品現正發售中',
            code: 'AUTUMN2024',
            color: 'pink',
          },
          {
            title: 'MEMBER ONLY',
            description: '加入會員享全館 9 折優惠',
            code: 'WELCOME10',
            color: 'mint',
          },
        ],
      },
    ],
    meta: {
      title: 'Scrapbook Online Store',
      description: 'A stylish scrapbook-themed online store built with Payload CMS.',
    },
  }

  if (existingPages.docs.length > 0) {
    console.log('📝 發現現有首頁，正在更新內容...')
    await payload.update({
      collection: 'pages',
      id: existingPages.docs[0].id,
      data: homeData,
      context: {
        disableRevalidate: true,
      },
    })
  } else {
    console.log('✨ 建立新首頁...')
    await payload.create({
      collection: 'pages',
      data: homeData,
      context: {
        disableRevalidate: true,
      },
    })
  }

  console.log('✅ Scrapbook 首頁初始化完成！請重新整理後台。')
  process.exit(0)
}

seedScrapbook().catch((err) => {
  console.error('❌ 初始化失敗:', err)
  process.exit(1)
})
