import config from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

interface ProductGridBlockProps {
  title?: string
  subtitle?: string
  filterMode?: 'category' | 'manual' | 'latest' | 'bestselling'
  limit?: number
  categories?: { id: string; title: string }[]
  products?: { id: string; title: string; slug: string; gallery?: { image: { url?: string } }[]; priceInUSD?: number }[]
  layout?: 'grid' | 'masonry' | 'carousel'
  columns?: '2' | '3' | '4' | '5'
  showPrice?: boolean
  showQuickView?: boolean
  cardStyle?: 'scrapbook' | 'minimal' | 'bordered'
  viewAllLink?: string
  id?: string
}

/**
 * ProductGridBlock Component
 * 
 * 商品網格展示區塊，支援多種篩選與排版模式
 */
export const ProductGridBlock: React.FC<ProductGridBlockProps> = async ({
  title = 'NEW ARRIVALS',
  subtitle,
  filterMode = 'latest',
  limit = 8,
  categories,
  products: manualProducts,
  layout = 'grid',
  columns = '4',
  showPrice = true,
  cardStyle = 'scrapbook',
  viewAllLink = '/shop',
  id,
}) => {
  // 取得商品資料
  let products = manualProducts || []
  
  if (filterMode !== 'manual' || !manualProducts?.length) {
    try {
      const payload = await getPayload({ config })
      
      const query: Record<string, unknown> = {
        _status: { equals: 'published' },
      }
      
      // 分類篩選
      if (filterMode === 'category' && categories?.length) {
        query.categories = {
          in: categories.map((c) => c.id),
        }
      }
      
      const result = await payload.find({
        collection: 'products',
        where: query,
        limit,
        sort: filterMode === 'latest' ? '-createdAt' : '-createdAt',
        depth: 1,
      })
      
      products = result.docs as unknown as ProductGridBlockProps['products'] ?? []
    } catch (error) {
      console.error('Failed to fetch products for ProductGridBlock:', error)
    }
  }
  
  // 欄數對應 CSS
  const columnsMap = {
    '2': 'grid-cols-1 sm:grid-cols-2',
    '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    '5': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
  }
  
  // 卡片風格
  const cardStyles = {
    scrapbook: 'bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:-rotate-1',
    minimal: 'bg-transparent',
    bordered: 'border-2 border-gray-200 rounded-lg hover:border-primary transition-colors',
  }

  return (
    <section id={id} className="py-12 px-4">
      {/* 標題區 */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-end">
          <div>
            {title && (
              <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-lexend)' }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          {viewAllLink && (
            <Link 
              href={viewAllLink}
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--brand-primary, #C9915D)' }}
            >
              View All →
            </Link>
          )}
        </div>
      </div>
      
      {/* 商品網格 */}
      <div className="max-w-7xl mx-auto">
        {layout === 'carousel' ? (
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
            {products?.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cardStyle={cardStyle}
                showPrice={showPrice}
                isCarousel
              />
            ))}
          </div>
        ) : (
          <div className={`grid gap-6 ${columnsMap[columns]}`}>
            {products?.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cardStyle={cardStyle}
                showPrice={showPrice}
              />
            ))}
          </div>
        )}
        
        {(!products || products.length === 0) && (
          <div className="text-center py-12 text-gray-500">
            暫無商品
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * ProductCard Component
 */
function ProductCard({
  product,
  cardStyle,
  showPrice,
  isCarousel,
}: {
  product: NonNullable<ProductGridBlockProps['products']>[number]
  cardStyle?: string
  showPrice?: boolean
  isCarousel?: boolean
}) {
  const imageUrl = product.gallery?.[0]?.image?.url || '/placeholder.jpg'
  
  const cardStyles: Record<string, string> = {
    scrapbook: 'bg-white rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-rotate-1 hover:scale-[1.02]',
    minimal: 'group',
    bordered: 'border-2 border-gray-200 rounded-lg hover:border-[var(--brand-primary)] transition-colors p-2',
  }
  
  return (
    <Link
      href={`/products/${product.slug}`}
      className={`block ${cardStyles[cardStyle || 'scrapbook']} ${isCarousel ? 'flex-shrink-0 w-64 snap-start' : ''}`}
    >
      <div className="aspect-square overflow-hidden rounded-t-lg relative">
        <img
          src={imageUrl}
          alt={product.title}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2">{product.title}</h3>
        {showPrice && product.priceInUSD && (
          <p className="text-sm mt-1 font-semibold" style={{ color: 'var(--brand-primary, #C9915D)' }}>
            ${(product.priceInUSD / 100).toFixed(0)}
          </p>
        )}
      </div>
    </Link>
  )
}
