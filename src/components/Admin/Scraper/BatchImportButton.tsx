'use client'

/**
 * BatchImportButton - 批量匯入爬取商品到 Products
 *
 * 設計原則 (UI/UX Pro Max):
 * - 直覺操作：選取項目後，可選擇「匯入已選取」或「匯入已選取以外的全部」
 * - 視覺反饋：hover/active 狀態、進度指示
 * - 自動分批處理（每批 50 個，避免 MongoDB 512MB 限制）
 * - 匯入成功後自動清除 Base64 數據
 */

import React, { useState, useCallback, useEffect } from 'react'
import { useSelection } from '@payloadcms/ui'
import { toast } from 'sonner'
import {
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Check,
  X,
  Package,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'

enum SelectAllStatus {
  AllAvailable = 'allAvailable',
  AllInPage = 'allInPage',
  Some = 'some',
  None = 'none',
}

const BATCH_SIZE = 50

interface ImportProgress {
  currentBatch: number
  totalBatches: number
  processedCount: number
  totalCount: number
  importedCount: number
  failedCount: number
  currentStatus: string
}

export const BatchImportButton: React.FC = () => {
  const { count, selectAll, selectedIDs, toggleAll } = useSelection()
  const searchParams = useSearchParams()

  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [result, setResult] = useState<{
    imported: number
    failed: number
    errors: string[]
  } | null>(null)
  const [totalProducts, setTotalProducts] = useState<number>(0)
  const [showDropdown, setShowDropdown] = useState(false)

  const selectingAll = selectAll === SelectAllStatus.AllAvailable
  const hasSelection = count > 0

  // 計算「已選取以外」的數量
  const exceptSelectedCount = Math.max(0, totalProducts - count)

  // 獲取商品總數
  useEffect(() => {
    const fetchTotal = async () => {
      try {
        const whereParam = searchParams.get('where')
        const params = new URLSearchParams()
        if (whereParam) params.set('where', whereParam)
        params.set('limit', '0')

        const response = await fetch(`/api/scraped-products?${params.toString()}`)
        const data = await response.json()
        setTotalProducts(data.totalDocs || 0)
      } catch (err) {
        console.error('Failed to fetch total:', err)
      }
    }
    fetchTotal()
  }, [searchParams])

  // 關閉下拉選單
  useEffect(() => {
    const handleClickOutside = () => setShowDropdown(false)
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showDropdown])

  // 分批處理單一批次
  const importBatch = useCallback(async (batchIds: string[]): Promise<{
    imported: number
    failed: number
    errors: string[]
  }> => {
    const response = await fetch('/api/scraper/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productIds: batchIds,
        options: { updateExisting: false },
      }),
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || '匯入失敗')
    }

    return data.results
  }, [])

  // 獲取要匯入的商品 ID
  const getProductIds = useCallback(async (useExcept: boolean): Promise<string[]> => {
    const selectedSet = new Set(selectedIDs as string[])

    // 需要獲取全部商品的情況：排除模式 或 全選模式
    if (useExcept || selectingAll) {
      const whereParam = searchParams.get('where')
      const params = new URLSearchParams()
      if (whereParam) params.set('where', whereParam)
      params.set('limit', '2000')

      const response = await fetch(`/api/scraped-products?${params.toString()}`)
      const data = await response.json()

      if (!data.docs || data.docs.length === 0) return []

      // 過濾出待處理的商品
      let pendingProducts = data.docs.filter((doc: any) => doc.importStatus !== 'imported')

      if (useExcept) {
        // 排除已選取的
        pendingProducts = pendingProducts.filter((doc: any) => !selectedSet.has(doc.id))
      }

      return pendingProducts.map((doc: any) => doc.id)
    }

    // 個別選取模式
    return selectedIDs as string[]
  }, [selectingAll, selectedIDs, searchParams])

  const handleImport = async (useExcept: boolean) => {
    const productIds = await getProductIds(useExcept)

    if (productIds.length === 0) {
      toast.info('沒有可匯入的商品（可能都已匯入過了）')
      return
    }

    // 確認對話框
    const batchInfo = productIds.length > BATCH_SIZE
      ? `\n\n將分 ${Math.ceil(productIds.length / BATCH_SIZE)} 批處理（每批 ${BATCH_SIZE} 個）`
      : ''

    const modeInfo = useExcept ? '（排除已選取的商品）' : ''

    const confirmed = window.confirm(
      `確定要匯入 ${productIds.length} 個商品到商品庫嗎？${modeInfo}\n\n此操作會：\n• 將爬取的商品匯入到 Products\n• 自動翻譯顏色名稱\n• 自動生成 SKU\n• 處理並上傳圖片\n• 匯入成功後自動清除 Base64 數據${batchInfo}`,
    )

    if (!confirmed) return

    setIsImporting(true)
    setResult(null)
    setProgress(null)
    setShowDropdown(false)

    try {
      // 分批處理
      const totalBatches = Math.ceil(productIds.length / BATCH_SIZE)
      const totalResults = {
        imported: 0,
        failed: 0,
        errors: [] as string[],
      }

      setProgress({
        currentBatch: 0,
        totalBatches,
        processedCount: 0,
        totalCount: productIds.length,
        importedCount: 0,
        failedCount: 0,
        currentStatus: '準備中...',
      })

      for (let i = 0; i < totalBatches; i++) {
        const batchStart = i * BATCH_SIZE
        const batchEnd = Math.min(batchStart + BATCH_SIZE, productIds.length)
        const batchIds = productIds.slice(batchStart, batchEnd)

        setProgress(prev => ({
          ...prev!,
          currentBatch: i + 1,
          currentStatus: `正在處理第 ${i + 1}/${totalBatches} 批（${batchIds.length} 個商品）...`,
        }))

        try {
          const batchResult = await importBatch(batchIds)

          totalResults.imported += batchResult.imported
          totalResults.failed += batchResult.failed
          totalResults.errors.push(...batchResult.errors)

          setProgress(prev => ({
            ...prev!,
            processedCount: batchEnd,
            importedCount: totalResults.imported,
            failedCount: totalResults.failed,
            currentStatus: `第 ${i + 1} 批完成：成功 ${batchResult.imported}，失敗 ${batchResult.failed}`,
          }))

          // 批次之間稍微延遲
          if (i < totalBatches - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } catch (err: any) {
          console.error(`Batch ${i + 1} error:`, err)
          totalResults.failed += batchIds.length
          totalResults.errors.push(`批次 ${i + 1} 失敗: ${err.message}`)

          if (i < totalBatches - 1) {
            const shouldContinue = window.confirm(
              `第 ${i + 1} 批處理失敗：${err.message}\n\n是否繼續處理剩餘批次？`
            )
            if (!shouldContinue) break
          }
        }
      }

      setResult(totalResults)

      if (totalResults.errors.length > 0) {
        console.error('[BatchImport] Import errors:', totalResults.errors)
      }

      if (totalResults.imported > 0) {
        toast.success(
          `匯入完成！成功 ${totalResults.imported} 個${totalResults.failed > 0 ? `，失敗 ${totalResults.failed} 個` : ''}`,
        )
        toggleAll()
        setTimeout(() => window.location.reload(), 2000)
      } else {
        toast.error(`匯入失敗：${totalResults.errors[0] || '未知錯誤'}`)
      }
    } catch (err: any) {
      console.error('Import error:', err)
      toast.error(`匯入發生錯誤: ${err.message}`)
    } finally {
      setIsImporting(false)
    }
  }

  // 沒有選取時不顯示
  if (!hasSelection && !isImporting) {
    return (
      <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Package className="w-5 h-5 text-slate-400" />
          <span>請勾選要匯入的商品。勾選後可選擇「匯入已選取」或「匯入已選取以外的全部」。</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* 選取資訊和匯入按鈕 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
              {selectingAll ? totalProducts : count}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {selectingAll ? '已全選所有商品' : '個商品已選取'}
              </p>
              {!selectingAll && exceptSelectedCount > 0 && (
                <p className="text-xs text-gray-500">
                  共 {totalProducts} 個商品，剩餘 {exceptSelectedCount} 個未選取
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 匯入按鈕（帶下拉選項） */}
        {!isImporting && (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowDropdown(!showDropdown)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm
                transition-all duration-200 focus:outline-none focus:ring-2
                focus:ring-offset-2 focus:ring-amber-400 active:scale-95 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>批量匯入</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                {/* 匯入已選取 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleImport(false)
                  }}
                  disabled={selectingAll}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left
                    hover:bg-gray-50 transition-colors duration-150 cursor-pointer
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  <Check className="w-4 h-4 text-amber-600" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">匯入已選取</div>
                    <div className="text-xs text-gray-500">
                      {selectingAll ? '已全選，請使用下方選項' : `${count} 個商品`}
                    </div>
                  </div>
                </button>

                <div className="border-t border-gray-100 my-1" />

                {/* 匯入已選取以外的全部 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleImport(true)
                  }}
                  disabled={exceptSelectedCount === 0}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left
                    hover:bg-gray-50 transition-colors duration-150 cursor-pointer
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  <X className="w-4 h-4 text-orange-500" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">匯入已選取以外的全部</div>
                    <div className="text-xs text-gray-500">
                      {exceptSelectedCount > 0 ? `${exceptSelectedCount} 個商品` : '沒有其他商品'}
                    </div>
                  </div>
                </button>

                {/* 全選時顯示「匯入全部」選項 */}
                {selectingAll && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleImport(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left
                        hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                    >
                      <Package className="w-4 h-4 text-purple-600" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">匯入全部商品</div>
                        <div className="text-xs text-gray-500">{totalProducts} 個商品</div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* 處理中狀態 */}
        {isImporting && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
            <span>匯入中...</span>
          </div>
        )}

        {/* 最終結果顯示 */}
        {result && !isImporting && (
          <div className="flex items-center gap-3 text-sm">
            {result.imported > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                成功 {result.imported}
              </span>
            )}
            {result.failed > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700">
                <XCircle className="w-4 h-4" />
                失敗 {result.failed}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 進度條和狀態 */}
      {isImporting && progress && (
        <div className="mt-4 space-y-2">
          {/* 進度條 */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300 ease-out"
              style={{
                width: `${(progress.processedCount / progress.totalCount) * 100}%`
              }}
            />
          </div>

          {/* 進度文字 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{progress.currentStatus}</span>
            <span>
              {progress.processedCount}/{progress.totalCount}
              {progress.importedCount > 0 && (
                <span className="text-emerald-600 ml-2">
                  <CheckCircle2 className="w-3 h-3 inline mr-0.5" />
                  {progress.importedCount}
                </span>
              )}
              {progress.failedCount > 0 && (
                <span className="text-red-600 ml-2">
                  <XCircle className="w-3 h-3 inline mr-0.5" />
                  {progress.failedCount}
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default BatchImportButton
