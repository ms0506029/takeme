/**
 * Platform Seed Data
 *
 * 預設平台配置，包含 CSS 選擇器、定價規則、翻譯對照表
 */

export interface PlatformSeed {
  name: string
  slug: string
  baseUrl: string
  urlPatterns: {
    listing: string
    product: string
  }
  listingSelectors: {
    productCard: string
    productUrl: string
    productTitle: string
    productPrice: string
    salePrice?: string
    productImage: string
    brand?: string
  }
  productSelectors: {
    title: string
    description: string
    price: string
    salePrice?: string
    brand?: string
    category?: string
    images: string
    variants?: {
      color?: string
      size?: string
      variantList?: string
    }
    specifications?: string
    sizeChart?: string
    stock?: string
  }
  pricing: {
    tiers: Array<{
      name: string
      minPrice: number
      maxPrice: number
      exchangeRate: number
      taxMultiplier: number
      handlingFee: number
      internationalShipping: number
      roundTo: number
    }>
    sourceCurrency: string
    targetCurrency: string
  }
  settings: {
    pagination?: {
      type: 'button' | 'url' | 'scroll'
      nextButton?: string
      pageParam?: string
      scrollDelay?: number
    }
    pageDelay: number
    requestDelay: number
  }
  enabled: boolean
}

/**
 * Daytona Park 平台配置
 * https://www.daytona-park.com
 *
 * 實際 HTML 結構（2026-01 驗證）：
 * - 標題: h1.block-goods-name--text
 * - 價格: .block-goods-price--price
 * - 品牌: .block-goods-brand-area a
 * - 圖片: div.image-list img, .block-goods-color-variation-img img (參考 freak store 系統)
 * - 顏色變體: .block-goods-color-variation-box
 *
 * 圖片篩選規則（來自 freak store 批量上架系統）：
 * - 只接受 https://images. 開頭的 URL
 * - 排除包含 video-thumb 的 URL
 */
export const daytonaParkConfig: PlatformSeed = {
  name: 'Daytona Park',
  slug: 'daytona-park',
  baseUrl: 'https://www.daytona-park.com',
  urlPatterns: {
    listing: '/itemlist',
    product: '/item/',
  },
  listingSelectors: {
    // 列表頁選擇器（商品卡片）
    productCard: '.block-pickup-list-p, .block-item-list-p, [class*="item-list"] > div',
    productUrl: 'a[href*="/item/"]',
    productTitle: '.block-pickup-list-p--name, .block-item-list-p--name',
    productPrice: '.block-pickup-list-p--price, .block-item-list-p--price',
    salePrice: '.block-pickup-list-p--sale-price',
    productImage: '.block-pickup-list-p--img img, .block-item-list-p--img img',
    brand: '.block-pickup-list-p--brand',
  },
  productSelectors: {
    // 商品詳情頁選擇器
    title: 'h1.block-goods-name--text, h1.js-enhanced-ecommerce-goods-name',
    description: '.block-goods-description, .tab-contents.item-desc',
    price: '.block-goods-price--price, .product-reference-price-value',
    salePrice: '.block-goods-price--sale',
    brand: '.block-goods-brand-area a',
    category: '.block-breadcrumb, .breadcrumb',
    // 圖片選擇器（參考 freak store 批量上架系統邏輯）
    images: 'div.image-list img, .block-goods-color-variation-img img, .swiper-slide img',
    variants: {
      // Daytona Park 使用顏色變體盒子結構
      color: '.block-goods-color-variation-name',
      size: '.block-goods-color-variation-size-value',
      variantList: '.block-goods-color-variation-box',
    },
    specifications: '.block-goods-spec table, .tab-contents.item-spec',
    sizeChart: '.block-goods-product-size-table table',
    stock: '.block-goods-color-variation-size-stock-box',
  },
  pricing: {
    tiers: [
      {
        name: 'Tier 1 (< ¥11,000)',
        minPrice: 0,
        maxPrice: 10999,
        exchangeRate: 0.21,
        taxMultiplier: 1.07,
        handlingFee: 110,
        internationalShipping: 380,
        roundTo: 10,
      },
      {
        name: 'Tier 2 (≥ ¥11,000)',
        minPrice: 11000,
        maxPrice: 999999,
        exchangeRate: 0.21,
        taxMultiplier: 1.05,
        handlingFee: 150,
        internationalShipping: 380,
        roundTo: 10,
      },
    ],
    sourceCurrency: 'JPY',
    targetCurrency: 'TWD',
  },
  settings: {
    pagination: {
      type: 'button',
      nextButton: '.pagination__next, .pager-next, [class*="next"]',
    },
    pageDelay: 2500,
    requestDelay: 500,
  },
  enabled: true,
}

/**
 * BEAMS 平台配置
 * https://www.beams.co.jp
 */
export const beamsConfig: PlatformSeed = {
  name: 'BEAMS',
  slug: 'beams',
  baseUrl: 'https://www.beams.co.jp',
  urlPatterns: {
    listing: '/item/',
    product: '/item/\\d+',
  },
  listingSelectors: {
    productCard: '.item-card, .product-card, [class*="item-list"] > div',
    productUrl: 'a[href*="/item/"]',
    productTitle: '.item-name, .product-name',
    productPrice: '.item-price, .product-price',
    salePrice: '.sale-price, .discount-price',
    productImage: 'img.item-image, img.product-image',
    brand: '.item-brand, .brand-name',
  },
  productSelectors: {
    title: 'h1.product-title, h1.item-name',
    description: '.product-description, .item-description',
    price: '.product-price, .item-price',
    salePrice: '.sale-price, .discount-price',
    brand: '.product-brand, .brand-name',
    category: '.breadcrumb, .category-path',
    images: '.product-gallery img, .item-images img, .swiper-slide img',
    variants: {
      color: '.color-selector, .color-options',
      size: '.size-selector, .size-options',
    },
    specifications: '.product-spec, .item-spec',
    stock: '.stock-info, .availability',
  },
  pricing: {
    tiers: [
      {
        name: 'Standard',
        minPrice: 0,
        maxPrice: 999999,
        exchangeRate: 0.21,
        taxMultiplier: 1.06,
        handlingFee: 120,
        internationalShipping: 400,
        roundTo: 10,
      },
    ],
    sourceCurrency: 'JPY',
    targetCurrency: 'TWD',
  },
  settings: {
    pagination: {
      type: 'scroll',
      scrollDelay: 2000,
    },
    pageDelay: 3000,
    requestDelay: 500,
  },
  enabled: true,
}

/**
 * ZOZOTOWN 平台配置
 * https://zozo.jp
 */
export const zozotownConfig: PlatformSeed = {
  name: 'ZOZOTOWN',
  slug: 'zozotown',
  baseUrl: 'https://zozo.jp',
  urlPatterns: {
    listing: '/shop/',
    product: '/sp/',
  },
  listingSelectors: {
    productCard: '.p-goods-list__item, [class*="goods-card"]',
    productUrl: 'a[href*="/sp/"]',
    productTitle: '.p-goods-list__item-name, .goods-name',
    productPrice: '.p-goods-list__item-price, .goods-price',
    salePrice: '.p-goods-list__item-price--sale, .sale-price',
    productImage: '.p-goods-list__item-image img, .goods-image img',
    brand: '.p-goods-list__item-brand, .brand-name',
  },
  productSelectors: {
    title: 'h1[class*="goods-name"], .p-goods-information__name',
    description: '.p-goods-information__description, .goods-description',
    price: '.p-goods-information__price, .goods-price',
    salePrice: '.p-goods-information__price--sale, .sale-price',
    brand: '.p-goods-information__brand, .brand-name',
    category: '.p-breadcrumbs, .breadcrumb',
    images: '.p-goods-images img, .goods-gallery img, [class*="carousel"] img',
    variants: {
      color: '.p-goods-variation__color, .color-variation',
      size: '.p-goods-variation__size, .size-variation',
    },
    specifications: '.p-goods-spec, .goods-spec',
    stock: '.p-goods-stock, .stock-status',
  },
  pricing: {
    tiers: [
      {
        name: 'Standard',
        minPrice: 0,
        maxPrice: 999999,
        exchangeRate: 0.21,
        taxMultiplier: 1.05,
        handlingFee: 100,
        internationalShipping: 350,
        roundTo: 10,
      },
    ],
    sourceCurrency: 'JPY',
    targetCurrency: 'TWD',
  },
  settings: {
    pagination: {
      type: 'url',
      pageParam: 'pno',
    },
    pageDelay: 2000,
    requestDelay: 300,
  },
  enabled: true,
}

/**
 * United Arrows 平台配置
 * https://store.united-arrows.co.jp
 */
export const unitedArrowsConfig: PlatformSeed = {
  name: 'United Arrows',
  slug: 'united-arrows',
  baseUrl: 'https://store.united-arrows.co.jp',
  urlPatterns: {
    listing: '/shop/',
    product: '/item/',
  },
  listingSelectors: {
    productCard: '.item-list__item, .product-item',
    productUrl: 'a[href*="/item/"]',
    productTitle: '.item-list__name, .product-name',
    productPrice: '.item-list__price, .product-price',
    salePrice: '.item-list__sale-price, .sale-price',
    productImage: '.item-list__image img, .product-image img',
    brand: '.item-list__brand, .brand-name',
  },
  productSelectors: {
    title: 'h1.product-name, .item-detail__name',
    description: '.product-description, .item-detail__description',
    price: '.product-price, .item-detail__price',
    salePrice: '.sale-price',
    brand: '.brand-name, .item-detail__brand',
    category: '.breadcrumb',
    images: '.product-images img, .item-detail__images img',
    variants: {
      color: '.color-selector',
      size: '.size-selector',
    },
    specifications: '.product-spec',
    stock: '.stock-status',
  },
  pricing: {
    tiers: [
      {
        name: 'Standard',
        minPrice: 0,
        maxPrice: 999999,
        exchangeRate: 0.21,
        taxMultiplier: 1.06,
        handlingFee: 130,
        internationalShipping: 420,
        roundTo: 10,
      },
    ],
    sourceCurrency: 'JPY',
    targetCurrency: 'TWD',
  },
  settings: {
    pagination: {
      type: 'button',
      nextButton: '.pagination-next',
    },
    pageDelay: 2500,
    requestDelay: 500,
  },
  enabled: true,
}

/**
 * FREAK'S STORE 平台配置
 * https://www.freaksstore.com
 */
export const freaksStoreConfig: PlatformSeed = {
  name: "FREAK'S STORE",
  slug: 'freaks-store',
  baseUrl: 'https://www.freaksstore.com',
  urlPatterns: {
    listing: '/category/',
    product: '/item/',
  },
  listingSelectors: {
    productCard: '.product-list__item, .item-card',
    productUrl: 'a[href*="/item/"]',
    productTitle: '.product-list__name, .item-name',
    productPrice: '.product-list__price, .item-price',
    salePrice: '.product-list__sale-price, .sale-price',
    productImage: '.product-list__image img, .item-image img',
    brand: '.product-list__brand',
  },
  productSelectors: {
    title: 'h1.item-name, .product-detail__name',
    description: '.item-description, .product-detail__description',
    price: '.item-price, .product-detail__price',
    salePrice: '.sale-price',
    brand: '.brand-name',
    category: '.breadcrumb',
    images: '.item-images img, .product-gallery img',
    variants: {
      color: '.color-options',
      size: '.size-options',
    },
    specifications: '.item-spec',
    stock: '.stock-info',
  },
  pricing: {
    tiers: [
      {
        name: 'Standard',
        minPrice: 0,
        maxPrice: 999999,
        exchangeRate: 0.21,
        taxMultiplier: 1.05,
        handlingFee: 100,
        internationalShipping: 380,
        roundTo: 10,
      },
    ],
    sourceCurrency: 'JPY',
    targetCurrency: 'TWD',
  },
  settings: {
    pagination: {
      type: 'button',
      nextButton: '.pagination__next',
    },
    pageDelay: 2500,
    requestDelay: 500,
  },
  enabled: true,
}

/**
 * 所有平台配置
 */
export const allPlatformSeeds: PlatformSeed[] = [
  daytonaParkConfig,
  beamsConfig,
  zozotownConfig,
  unitedArrowsConfig,
  freaksStoreConfig,
]

/**
 * 翻譯對照表 - 類別
 */
export const categoryTranslations: Record<string, string> = {
  // 日文 → 中文
  'トップス': '上衣',
  'Tシャツ': 'T恤',
  'シャツ': '襯衫',
  'ニット': '針織衫',
  'パーカー': '帽T',
  'スウェット': '衛衣',
  'カーディガン': '開襟衫',
  'ジャケット': '外套',
  'コート': '大衣',
  'ブルゾン': '夾克',
  'ダウン': '羽絨服',
  'パンツ': '褲子',
  'デニム': '牛仔褲',
  'チノ': '卡其褲',
  'スラックス': '西裝褲',
  'ショーツ': '短褲',
  'スカート': '裙子',
  'ワンピース': '連身裙',
  'バッグ': '包包',
  'シューズ': '鞋子',
  'スニーカー': '運動鞋',
  'ブーツ': '靴子',
  'サンダル': '涼鞋',
  'アクセサリー': '配件',
  '帽子': '帽子',
  'キャップ': '棒球帽',
  'ハット': '紳士帽',
  'マフラー': '圍巾',
  'ストール': '披巾',
  '手袋': '手套',
  '時計': '手錶',
  'ベルト': '皮帶',
  '財布': '錢包',
  'サングラス': '太陽眼鏡',
}

/**
 * 翻譯對照表 - 顏色
 */
export const colorTranslations: Record<string, string> = {
  // 日文 → 中文
  '黒': '黑色',
  'ブラック': '黑色',
  '白': '白色',
  'ホワイト': '白色',
  'オフホワイト': '米白色',
  '赤': '紅色',
  'レッド': '紅色',
  '青': '藍色',
  'ブルー': '藍色',
  'ネイビー': '海軍藍',
  '紺': '深藍色',
  '緑': '綠色',
  'グリーン': '綠色',
  'カーキ': '卡其色',
  '黄': '黃色',
  'イエロー': '黃色',
  'オレンジ': '橘色',
  'ピンク': '粉紅色',
  '紫': '紫色',
  'パープル': '紫色',
  '茶': '棕色',
  'ブラウン': '棕色',
  'ベージュ': '米色',
  'キャメル': '駝色',
  'グレー': '灰色',
  'チャコール': '炭灰色',
  'シルバー': '銀色',
  'ゴールド': '金色',
  'マルチ': '多色',
  'ボーダー': '條紋',
  'チェック': '格紋',
  'ストライプ': '直條紋',
}

/**
 * 翻譯對照表 - 尺寸
 */
export const sizeTranslations: Record<string, string> = {
  // 日文測量項目 → 中文
  '着丈': '衣長',
  '身幅': '胸寬',
  '肩幅': '肩寬',
  '袖丈': '袖長',
  'そで丈': '袖長',
  '裄丈': '裄長',
  'ウエスト': '腰圍',
  'ヒップ': '臀圍',
  '股上': '前襠',
  '股下': '內檔長',
  'わたり': '大腿圍',
  '裾幅': '褲腳寬',
  '総丈': '總長',
  // 尺寸
  'フリー': 'FREE',
  'FREE': 'FREE',
  'XS': 'XS',
  'S': 'S',
  'M': 'M',
  'L': 'L',
  'XL': 'XL',
  'XXL': 'XXL',
}
