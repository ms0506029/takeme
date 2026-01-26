/**
 * EasyStore Import API Route - Streaming Version
 *
 * 使用 Server-Sent Events (SSE) 實現即時進度推送
 */

import { fetchAllProducts, type EasyStoreProduct } from '@/lib/import/easystore-api'
import { importSingleProduct } from '@/lib/import/easystore-importer'
import configPromise from '@payload-config'
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 分鐘超時

/**
 * POST /api/import/easystore/stream
 * 使用 SSE 串流匯入進度
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  // 建立 SSE 串流
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // 驗證用戶權限
        const payload = await getPayload({ config: configPromise })
        const { user } = await payload.auth({ headers: request.headers })

        if (!user) {
          sendEvent('error', { message: '未授權' })
          controller.close()
          return
        }

        const hasPermission = user.roles?.some(role =>
          ['super-admin', 'admin', 'vendor'].includes(role)
        )

        if (!hasPermission) {
          sendEvent('error', { message: '權限不足' })
          controller.close()
          return
        }

        // 解析請求參數
        const body = await request.json().catch(() => ({}))
        const {
          vendorId,
          skipExisting = true,
          downloadImages = true,
        } = body

        // 確定 vendorId
        let targetVendorId = vendorId

        if (!targetVendorId) {
          if (user.vendor) {
            targetVendorId = typeof user.vendor === 'object'
              ? user.vendor.id
              : user.vendor
          } else {
            const vendors = await payload.find({
              collection: 'vendors',
              limit: 1,
            })

            if (vendors.docs.length === 0) {
              sendEvent('error', { message: '找不到可用的商家，請先建立商家' })
              controller.close()
              return
            }

            targetVendorId = vendors.docs[0].id
          }
        }

        // 開始匯入流程
        sendEvent('start', { message: '正在連接 EasyStore...' })

        // 取得所有商品
        const products = await fetchAllProducts((loaded, total) => {
          sendEvent('loading', { loaded, total, message: `正在載入商品資料 (${loaded}/${total})...` })
        })

        const total = products.length
        sendEvent('loaded', { total, message: `成功取得 ${total} 個商品，開始匯入...` })

        // 統計
        let processed = 0
        let created = 0
        let updated = 0
        let skipped = 0
        let failed = 0
        let totalVariants = 0

        // 逐一處理商品
        for (const product of products) {
          processed++

          try {
            // 檢查是否已存在
            const existing = await payload.find({
              collection: 'products',
              where: {
                and: [
                  { externalId: { equals: String(product.id) } },
                  { externalSource: { equals: 'easystore' } },
                ],
              },
              limit: 1,
            })

            if (existing.docs.length > 0 && skipExisting) {
              skipped++
              sendEvent('progress', {
                processed,
                total,
                created,
                updated,
                skipped,
                failed,
                totalVariants,
                currentProduct: product.title,
                status: 'skipped',
                message: `跳過: ${product.title}`,
              })
              continue
            }

            // 匯入商品（含變體同步）
            const result = await importSingleProduct(
              product,
              targetVendorId as string,
              downloadImages,
              payload,
              existing.docs[0]?.id
            )

            if (result.action === 'created') {
              created++
            } else if (result.action === 'updated') {
              updated++
            }

            // 累計變體數量
            totalVariants += result.variantCount || 0

            // 構建訊息
            const variantInfo = result.variantCount > 0 ? ` (${result.variantCount} 變體)` : ''
            const actionText = result.action === 'created' ? '建立' : '更新'

            sendEvent('progress', {
              processed,
              total,
              created,
              updated,
              skipped,
              failed,
              totalVariants,
              currentProduct: product.title,
              status: result.action,
              message: `${actionText}: ${product.title}${variantInfo}`,
            })

          } catch (err) {
            failed++
            const errorMsg = err instanceof Error ? err.message : '未知錯誤'
            sendEvent('progress', {
              processed,
              total,
              created,
              updated,
              skipped,
              failed,
              totalVariants,
              currentProduct: product.title,
              status: 'error',
              message: `失敗: ${product.title} - ${errorMsg}`,
            })
          }

          // 每處理 5 個商品後稍微等待，避免過載（變體處理較耗時）
          if (processed % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }

        // 完成
        sendEvent('complete', {
          success: failed === 0,
          total,
          created,
          updated,
          skipped,
          failed,
          totalVariants,
          message: `匯入完成！商品: ${created} 建立, ${updated} 更新, ${skipped} 跳過, ${failed} 失敗 | 變體: ${totalVariants} 個`,
        })

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '匯入過程發生錯誤'
        sendEvent('error', { message: errorMsg })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
