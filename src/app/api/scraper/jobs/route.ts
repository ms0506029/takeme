import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * Scraper Jobs API
 * Extension 任務輪詢與更新端點
 *
 * GET /api/scraper/jobs - Extension 取得待執行任務
 * PATCH /api/scraper/jobs - Extension 更新任務狀態
 */

// 驗證 Extension Token
async function verifyExtensionToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.slice(7)
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

// GET: Extension 輪詢待執行任務
export async function GET(request: NextRequest) {
  try {
    const isValid = await verifyExtensionToken(request)
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await getPayload({ config: configPromise })

    // 取得待執行的任務（pending 或 running）
    const jobs = await payload.find({
      collection: 'scraping-jobs',
      where: {
        status: { in: ['pending', 'running', 'paused'] },
      },
      sort: 'createdAt', // FIFO
      depth: 2, // 包含 platform 詳情
      limit: 10,
    })

    // 格式化任務資料（包含 platform selectors）
    const formattedJobs = jobs.docs.map((job: any) => {
      const platform = typeof job.platform === 'object' ? job.platform : null

      return {
        id: job.id,
        status: job.status,
        type: job.type,
        sourceUrl: job.sourceUrl,
        progress: job.progress,
        config: job.config,
        platform: platform
          ? {
              id: platform.id,
              name: platform.name,
              slug: platform.slug,
              selectors: {
                listing: platform.listingSelectors,
                product: platform.productSelectors,
              },
              pagination: platform.settings?.pagination,
            }
          : null,
      }
    })

    return NextResponse.json({
      success: true,
      jobs: formattedJobs,
    })
  } catch (error) {
    console.error('Scraper Jobs GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get jobs' }, { status: 500 })
  }
}

// PATCH: Extension 更新任務狀態
export async function PATCH(request: NextRequest) {
  try {
    const isValid = await verifyExtensionToken(request)
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { jobId, status, progress, log, error: errorMsg } = body

    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Missing jobId' }, { status: 400 })
    }

    const payload = await getPayload({ config: configPromise })

    // 取得現有任務
    const existingJob = await payload.findByID({
      collection: 'scraping-jobs',
      id: jobId,
    })

    if (!existingJob) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    }

    // 準備更新資料
    const updateData: any = {}

    if (status) {
      updateData.status = status

      // 如果是開始執行，記錄開始時間
      if (status === 'running' && !(existingJob as any).startedAt) {
        updateData.startedAt = new Date().toISOString()
      }

      // 如果是完成或失敗，記錄結束時間
      if (['completed', 'failed', 'cancelled'].includes(status)) {
        updateData.completedAt = new Date().toISOString()
      }
    }

    if (progress) {
      updateData.progress = {
        current: progress.current ?? (existingJob as any).progress?.current ?? 0,
        total: progress.total ?? (existingJob as any).progress?.total ?? 0,
        percentage:
          progress.percentage ??
          (progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0),
      }
    }

    // 新增日誌
    if (log || errorMsg) {
      const existingLogs = (existingJob as any).logs || []
      updateData.logs = [
        ...existingLogs,
        {
          timestamp: new Date().toISOString(),
          level: errorMsg ? 'error' : 'info',
          message: errorMsg || log,
        },
      ]
    }

    // 更新任務
    const updatedJob = await payload.update({
      collection: 'scraping-jobs',
      id: jobId,
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      job: {
        id: updatedJob.id,
        status: (updatedJob as any).status,
        progress: (updatedJob as any).progress,
      },
    })
  } catch (error) {
    console.error('Scraper Jobs PATCH error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update job' }, { status: 500 })
  }
}
