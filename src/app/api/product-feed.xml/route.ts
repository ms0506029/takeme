import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * Google Merchant Center Product Feed
 * 
 * 產生符合 Google 規格的商品資料 Feed (XML 格式)
 * 文檔: https://support.google.com/merchants/answer/7052112
 * 
 * 訪問: /api/product-feed.xml
 */

// 強制動態渲染
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await getPayload({ config })
    const siteUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'https://example.com'
    
    // 取得所有已發布的商品
    const productsResult = await payload.find({
      collection: 'products',
      where: {
        _status: { equals: 'published' },
      },
      limit: 0,
      pagination: false,
      depth: 2,
    })

    // 產生 XML
    const items = productsResult.docs.map((product) => {
      const id = product.id as string
      const title = escapeXml(product.title as string || '')
      const description = escapeXml((product.description as string || '').slice(0, 5000))
      const link = `${siteUrl}/products/${product.slug}`
      
      // 取得主圖片
      const mainImage = product.images as Array<{ image?: { url?: string } }> | undefined
      const imageUrl = mainImage?.[0]?.image?.url || ''
      const imageLink = imageUrl.startsWith('http') ? imageUrl : `${siteUrl}${imageUrl}`
      
      // 價格資訊
      const price = product.price as number || 0
      const salePrice = product.salePrice as number | null
      const currency = 'TWD'
      
      // 庫存狀態
      const inventory = product.inventory as number || 0
      const availability = inventory > 0 ? 'in_stock' : 'out_of_stock'
      
      // 分類
      const categories = product.categories as Array<{ title?: string }> | undefined
      const category = categories?.[0]?.title || 'Apparel'
      
      // 品牌
      const brand = product.brand as string || 'Daytona Park'
      
      // GTIN/MPN (如果有)
      const gtin = product.gtin as string | undefined
      const mpn = product.mpn as string | undefined
      const sku = product.sku as string | undefined

      return `
    <item>
      <g:id>${id}</g:id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${imageLink}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${price.toFixed(2)} ${currency}</g:price>
      ${salePrice ? `<g:sale_price>${salePrice.toFixed(2)} ${currency}</g:sale_price>` : ''}
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:google_product_category>${escapeXml(category)}</g:google_product_category>
      <g:condition>new</g:condition>
      ${gtin ? `<g:gtin>${escapeXml(gtin)}</g:gtin>` : ''}
      ${mpn ? `<g:mpn>${escapeXml(mpn)}</g:mpn>` : ''}
      ${sku ? `<g:mpn>${escapeXml(sku)}</g:mpn>` : ''}
      <g:identifier_exists>${gtin || mpn || sku ? 'true' : 'false'}</g:identifier_exists>
    </item>`
    }).join('')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Daytona Park Product Feed</title>
    <link>${siteUrl}</link>
    <description>Product feed for Google Merchant Center</description>
    ${items}
  </channel>
</rss>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // 快取 1 小時
      },
    })
  } catch (error) {
    console.error('[Product Feed] Error generating feed:', error)
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate feed</error>`,
      {
        status: 500,
        headers: { 'Content-Type': 'application/xml' },
      }
    )
  }
}

/**
 * 轉義 XML 特殊字元
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
