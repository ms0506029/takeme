import {
    HeroSection,
    IconsNav,
    NewsSection,
    ProductCard,
    PromoBadgeRow,
    RankingSection
} from '@/components/scrapbook'

/**
 * Scrapbook Design System Demo Page
 * 
 * 修訂內容：
 * - FOR YOU → CHECK LIST
 * - 移除熱門商品區塊（與 RANKING 重複）
 * - 限時優惠 → NEWS + VIEW ALL
 * - RANKING 顯示 10 個卡片（5×2）
 */

// NEWS 資料
const demoNews = [
  { id: '1', title: '新會員專屬', description: '首購享 9 折優惠', code: 'WELCOME10', color: 'pink' as const },
  { id: '2', title: '免運活動', description: '滿 $1000 免運費', color: 'mint' as const },
  { id: '3', title: '限時閃購', description: '指定商品 7 折起', color: 'yellow' as const },
  { id: '4', title: 'VIP 回饋', description: '金卡會員額外 5% 折扣', color: 'lavender' as const },
]

// CHECK LIST 商品資料
const checkListProducts = [
  { id: '1', title: 'BEAMS 限定 T-Shirt 日本製造', price: 2980, originalPrice: 3980, image: '/api/placeholder/400/400', href: '/products/1', badge: 'sale' as const },
  { id: '2', title: 'FREAK\'S STORE 經典帽 T', price: 2480, image: '/api/placeholder/400/400', href: '/products/2', badge: 'new' as const },
  { id: '3', title: 'ZOZO 獨家配色運動鞋', price: 4980, image: '/api/placeholder/400/400', href: '/products/3', badge: 'hot' as const },
  { id: '4', title: '日本直送手工包', price: 3680, image: '/api/placeholder/400/400', href: '/products/4' },
]

// RANKING 資料 (10 個卡片 = 5×2)
const demoRankingItems = [
  { id: '1', rank: 1, title: 'Military padding jacket big silhouette', brand: 'FREAK\'S STORE', price: 17600, originalPrice: 22000, image: '/api/placeholder/400/400', href: '/products/1' },
  { id: '2', rank: 2, title: 'Oversize Down Jacket Book', brand: 'UNIVERSAL OVERALL', price: 11990, originalPrice: 14900, image: '/api/placeholder/400/400', href: '/products/2' },
  { id: '3', rank: 3, title: 'Short Length Down Jacket', brand: 'Coen', price: 10971, originalPrice: 12990, image: '/api/placeholder/400/400', href: '/products/3' },
  { id: '4', rank: 4, title: 'N-33 Halis Coat Line Set', brand: 'BEAMS STORE', price: 9990, image: '/api/placeholder/400/400', href: '/products/4' },
  { id: '5', rank: 5, title: 'Premium Wool Vest Level 1', brand: 'FREAK\'S STORE', price: 14917, originalPrice: 17500, image: '/api/placeholder/400/400', href: '/products/5' },
  { id: '6', rank: 6, title: 'Cashmere Blend Coat', brand: 'JOURNAL STANDARD', price: 29800, originalPrice: 35000, image: '/api/placeholder/400/400', href: '/products/6' },
  { id: '7', rank: 7, title: 'Quilted Liner Jacket', brand: 'SHIPS', price: 16500, image: '/api/placeholder/400/400', href: '/products/7' },
  { id: '8', rank: 8, title: 'Fleece Zip-up Hoodie', brand: 'URBAN RESEARCH', price: 8900, originalPrice: 12000, image: '/api/placeholder/400/400', href: '/products/8' },
  { id: '9', rank: 9, title: 'Corduroy Wide Pants', brand: 'UNITED ARROWS', price: 11990, image: '/api/placeholder/400/400', href: '/products/9' },
  { id: '10', rank: 10, title: 'Knit Cardigan Set', brand: 'nano・universe', price: 13200, originalPrice: 16500, image: '/api/placeholder/400/400', href: '/products/10' },
]

const demoPromoBadges = [
  { id: '1', label: '¥3,000 OFF', href: '/promo/3000off', color: 'orange' as const },
  { id: '2', label: '2 BUY 10% OFF', href: '/promo/2buy', color: 'green' as const },
  { id: '3', label: 'NEW YEAR SALE', href: '/promo/newyear', color: 'red' as const },
  { id: '4', label: 'SUPPORT', href: '/support', color: 'pink' as const },
]

const demoIcons = [
  { id: '1', label: 'Shop', href: '/shop', icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
  { id: '2', label: 'Coordinate', href: '/coordinate', icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> },
  { id: '3', label: 'Info', href: '/info', icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { id: '4', label: 'Coupon', href: '/coupons', icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg> },
]

export default function ScrapbookDemoPage() {
  return (
    <div className="min-h-screen bg-scrapbook-bg-light dark:bg-scrapbook-bg-dark">
      {/* Hero Section */}
      <HeroSection
        title="Daytona Park"
        subtitle="日本直送・獨家設計・限量發售"
        ctaText="探索全部商品"
        ctaLink="/products"
      />

      {/* Promo Badge Row */}
      <PromoBadgeRow badges={demoPromoBadges} />

      {/* Icons Navigation */}
      <IconsNav items={demoIcons} />

      {/* CHECK LIST 區塊（原 FOR YOU） */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="font-display font-bold text-2xl md:text-3xl text-scrapbook-fg-light tracking-wider">
              CHECK LIST
            </h2>
            <p className="font-body text-sm text-scrapbook-fg-light/60 mt-1">
              Don&apos;t miss these items
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {checkListProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
          {/* View All Button */}
          <div className="text-center mt-8">
            <a
              href="/shop/checklist"
              className="inline-block font-display text-sm font-medium text-scrapbook-fg-light border-2 border-black rounded-full px-6 py-2 hover:bg-scrapbook-primary hover:text-white hover:border-scrapbook-primary transition-all shadow-retro-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              VIEW ALL &gt;
            </a>
          </div>
        </div>
      </section>

      {/* Ranking Section (10 個卡片 = 5×2) */}
      <RankingSection items={demoRankingItems} />

      {/* NEWS 區塊（原限時優惠 + VIEW ALL） */}
      <NewsSection items={demoNews} viewAllHref="/news" />

      {/* Game Park - 暫時註解，未來可恢復
      <GamePark title="GAME PARK" activeGender="men">
        <p className="font-body text-lg text-center text-scrapbook-fg-light">
          🎮 此區域可放置性別分類商品或遊戲互動內容
        </p>
      </GamePark>
      */}

      {/* 頁尾說明 */}
      <section className="py-8 text-center border-t border-scrapbook-muted-light/30">
        <p className="font-body text-scrapbook-fg-light/60 dark:text-scrapbook-fg-dark/60">
          Scrapbook Design System Demo - Daytona Park v4.0
        </p>
      </section>
    </div>
  )
}
