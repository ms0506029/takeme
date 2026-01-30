import configPromise from '@payload-config'
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'

/**
 * Scraper Events API (Server-Sent Events)
 * Extension 即時事件訂閱端點
 *
 * GET /api/scraper/events - SSE 連線，接收即時指令
 */

// 全域命令佇列（在實際生產環境應使用 Redis 等）
const commandQueues = new Map<string, any[]>()

// 清理過期的佇列
setInterval(() => {
  const now = Date.now()
  for (const [key, _] of commandQueues) {
    const [, timestamp] = key.split(':')
    if (now - parseInt(timestamp) > 300000) {
      // 5 分鐘後清理
      commandQueues.delete(key)
    }
  }
}, 60000)

// 驗證 Extension Token
async function verifyExtensionToken(request: NextRequest) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return false
  }

  const payload = await getPayload({ config: configPromise })

  try {
    const settings = await payload.findGlobal({
      slug: 'scraper-settings',
    })

    const extensionSettings = (settings as any)?.extension
    if (!extensionSettings?.enabled) return false

    return extensionSettings.apiKey === token
  } catch {
    return false
  }
}

// GET: SSE 連線
export async function GET(request: NextRequest) {
  const isValid = await verifyExtensionToken(request)
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 建立 SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // 發送連線成功事件
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`),
      )

      // 心跳計時器
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`),
          )
        } catch {
          clearInterval(heartbeatInterval)
        }
      }, 30000)

      // 任務輪詢計時器（每 5 秒檢查新任務）
      const pollInterval = setInterval(async () => {
        try {
          const payload = await getPayload({ config: configPromise })

          // 檢查待執行任務
          const pendingJobs = await payload.find({
            collection: 'scraping-jobs',
            where: { status: { equals: 'pending' } },
            sort: 'createdAt',
            depth: 2,
            limit: 5,
          })

          if (pendingJobs.docs.length > 0) {
            for (const job of pendingJobs.docs) {
              const platform = typeof (job as any).platform === 'object' ? (job as any).platform : null

              controller.enqueue(
                encoder.encode(
                  `event: job\ndata: ${JSON.stringify({
                    type: 'START_JOB',
                    jobId: job.id,
                    config: {
                      platform: platform?.slug,
                      platformId: platform?.id,
                      type: (job as any).type,
                      sourceUrl: (job as any).sourceUrl,
                      selectors: platform
                        ? {
                            listing: platform.listingSelectors,
                            product: platform.productSelectors,
                          }
                        : null,
                      pagination: platform?.settings?.pagination,
                      maxPages: (job as any).config?.maxPages || 10,
                    },
                  })}\n\n`,
                ),
              )

              // 更新任務狀態為 running
              await payload.update({
                collection: 'scraping-jobs',
                id: job.id,
                data: {
                  status: 'running',
                  startedAt: new Date().toISOString(),
                  logs: [
                    ...((job as any).logs || []),
                    {
                      timestamp: new Date().toISOString(),
                      level: 'info',
                      message: '任務已發送到 Extension',
                    },
                  ],
                },
              })
            }
          }
        } catch (err) {
          console.error('SSE poll error:', err)
        }
      }, 5000)

      // 清理函數
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        clearInterval(pollInterval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

// POST: 發送命令到 Extension（Admin UI 呼叫）
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })

    // 驗證 Admin 權限
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const userRoles = (user as any).roles || []
    const isAdmin = userRoles.includes('admin') || userRoles.includes('superAdmin')
    if (!isAdmin) {
      return new Response('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const { command, jobId, data } = body

    // 更新任務狀態（根據命令）
    if (jobId) {
      const updateData: any = {
        logs: [],
      }

      switch (command) {
        case 'PAUSE_JOB':
          updateData.status = 'paused'
          break
        case 'RESUME_JOB':
          updateData.status = 'running'
          break
        case 'STOP_JOB':
          updateData.status = 'cancelled'
          updateData.completedAt = new Date().toISOString()
          break
      }

      const existingJob = await payload.findByID({
        collection: 'scraping-jobs',
        id: jobId,
      })

      if (existingJob) {
        updateData.logs = [
          ...((existingJob as any).logs || []),
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Admin 執行命令: ${command}`,
          },
        ]

        await payload.update({
          collection: 'scraping-jobs',
          id: jobId,
          data: updateData,
        })
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Scraper Events POST error:', error)
    return new Response(JSON.stringify({ success: false, error: 'Failed to send command' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
