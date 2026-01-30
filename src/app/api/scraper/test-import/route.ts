import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * 診斷端點：測試圖片處理邏輯
 * GET /api/scraper/test-import?id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })
    const headersList = await headers()

    // 驗證登入
    const { user } = await payload.auth({ headers: headersList })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const productId = request.nextUrl.searchParams.get('id')
    if (!productId) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
    }

    // 取得爬取商品
    const scrapedProduct = await payload.findByID({
      collection: 'scraped-products',
      id: productId,
      depth: 2,
    })

    if (!scrapedProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // 診斷資訊
    const diagnostics: any = {
      productId,
      title: (scrapedProduct as any).originalTitle,
      imageUrls: {
        count: (scrapedProduct as any).imageUrls?.length || 0,
        isArray: Array.isArray((scrapedProduct as any).imageUrls),
      },
      firstThreeImages: [],
    }

    // 檢查前三張圖片
    const images = (scrapedProduct as any).imageUrls || []
    for (let i = 0; i < Math.min(3, images.length); i++) {
      const img = images[i]
      const imgDiag: any = {
        index: i,
        hasUrl: !!img.url,
        urlPreview: img.url?.substring(0, 60),
        hasColorName: !!img.colorName,
        colorName: img.colorName,
        hasBase64: !!img.base64,
        base64Type: typeof img.base64,
        base64Length: img.base64?.length || 0,
        base64First50: 'HIDDEN', // 不回傳實際 base64 內容
        base64StartsWithData: img.base64?.startsWith('data:') || false,
        base64IncludesMarker: img.base64?.includes(';base64,') || false,
      }

      // 測試 parseBase64Image
      if (img.base64) {
        const matches = img.base64.match(/^data:([^;]+);base64,(.+)$/)
        imgDiag.regexMatches = !!matches
        if (matches) {
          imgDiag.parsedMimetype = matches[1]
          imgDiag.base64DataLength = matches[2].length
          try {
            const buffer = Buffer.from(matches[2], 'base64')
            imgDiag.bufferSize = buffer.length
            imgDiag.parseSuccess = true

            // 測試實際上傳 (只測試第一張)
            if (i === 0) {
              try {
                const media = await payload.create({
                  collection: 'media',
                  data: {
                    alt: 'test-import-image',
                  },
                  file: {
                    data: buffer,
                    mimetype: matches[1],
                    name: `test-import-${Date.now()}.jpg`,
                    size: buffer.length,
                  },
                })
                imgDiag.uploadSuccess = true
                imgDiag.mediaId = media.id
              } catch (uploadErr: any) {
                imgDiag.uploadSuccess = false
                imgDiag.uploadError = uploadErr.message
                imgDiag.uploadErrorData = uploadErr.data
              }
            }
          } catch (err: any) {
            imgDiag.parseSuccess = false
            imgDiag.parseError = err.message
          }
        }
      }

      diagnostics.firstThreeImages.push(imgDiag)
    }

    return NextResponse.json({ success: true, diagnostics })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
