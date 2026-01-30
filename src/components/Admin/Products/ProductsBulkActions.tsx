'use client'

/**
 * ProductsBulkActions - 商品批量操作元件
 *
 * 設計原則 (UI/UX Pro Max):
 * - 直覺操作：選取項目後，可選擇「操作已選取」或「操作已選取以外的全部」
 * - 視覺反饋：hover/active 狀態、進度指示
 * - 色彩系統：SaaS Dashboard 風格
 *   - Primary: #2563EB (藍)
 *   - Success: #22C55E (綠)
 *   - Warning: #F59E0B (橙)
 *   - Danger: #DC2626 (紅)
 */

import React, { useState, useCallback, useEffect } from 'react'
import { useSelection } from '@payloadcms/ui'
import { toast } from 'sonner'
import {
  Trash2,
  FileDown,
  Loader2,
  Eye,
  EyeOff,
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

interface ActionProgress {
  current: number
  total: number
  status: string
}

export const ProductsBulkActions: React.FC = () => {
  const { count, selectAll, selectedIDs, toggleAll } = useSelection()
  const searchParams = useSearchParams()

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<ActionProgress | null>(null)
  const [totalProducts, setTotalProducts] = useState<number>(0)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

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

        const response = await fetch(`/api/products?${params.toString()}`)
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
    const handleClickOutside = () => setActiveDropdown(null)
    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [activeDropdown])

  // 獲取要操作的商品 ID
  const getProductIds = useCallback(async (useExcept: boolean): Promise<string[]> => {
    const selectedSet = new Set(selectedIDs as string[])

    if (useExcept || selectingAll) {
      // 獲取全部商品
      const whereParam = searchParams.get('where')
      const params = new URLSearchParams()
      if (whereParam) params.set('where', whereParam)
      params.set('limit', '5000')

      const response = await fetch(`/api/products?${params.toString()}`)
      const data = await response.json()

      if (!data.docs) return []

      if (useExcept) {
        // 排除已選取的
        return data.docs.filter((doc: any) => !selectedSet.has(doc.id)).map((doc: any) => doc.id)
      } else {
        // 全選模式
        return data.docs.map((doc: any) => doc.id)
      }
    }

    return selectedIDs as string[]
  }, [selectingAll, selectedIDs, searchParams])

  // 批量刪除
  const handleDelete = async (useExcept: boolean) => {
    const targetCount = useExcept ? exceptSelectedCount : (selectingAll ? totalProducts : count)
    const productIds = await getProductIds(useExcept)

    if (productIds.length === 0) {
      toast.error('沒有可刪除的商品')
      return
    }

    const confirmed = window.confirm(
      `確定要刪除 ${productIds.length} 個商品嗎？\n\n此操作無法復原！`
    )
    if (!confirmed) return

    setIsProcessing(true)
    setActiveDropdown(null)
    setProgress({ current: 0, total: productIds.length, status: '準備刪除...' })

    try {
      let deleted = 0, failed = 0

      for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        const batch = productIds.slice(i, i + BATCH_SIZE)
        setProgress({
          current: deleted + failed,
          total: productIds.length,
          status: `刪除中 ${i + 1} - ${Math.min(i + BATCH_SIZE, productIds.length)}...`,
        })

        for (const id of batch) {
          try {
            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
            if (res.ok) deleted++
            else failed++
          } catch { failed++ }
        }

        if (i + BATCH_SIZE < productIds.length) {
          await new Promise(r => setTimeout(r, 300))
        }
      }

      if (deleted > 0) {
        toast.success(`已刪除 ${deleted} 個商品${failed > 0 ? `，${failed} 個失敗` : ''}`)
        toggleAll()
        setTimeout(() => window.location.reload(), 1000)
      } else {
        toast.error('刪除失敗')
      }
    } catch (err: any) {
      toast.error(`錯誤: ${err.message}`)
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }

  // 批量修改狀態
  const handleStatusChange = async (newStatus: 'draft' | 'published', useExcept: boolean) => {
    const productIds = await getProductIds(useExcept)

    if (productIds.length === 0) {
      toast.error('沒有可修改的商品')
      return
    }

    const statusLabel = newStatus === 'draft' ? '草稿' : '已發布'
    const confirmed = window.confirm(`確定要將 ${productIds.length} 個商品設為「${statusLabel}」嗎？`)
    if (!confirmed) return

    setIsProcessing(true)
    setActiveDropdown(null)
    setProgress({ current: 0, total: productIds.length, status: '準備修改...' })

    try {
      let updated = 0, failed = 0

      for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        const batch = productIds.slice(i, i + BATCH_SIZE)
        setProgress({
          current: updated + failed,
          total: productIds.length,
          status: `修改中 ${i + 1} - ${Math.min(i + BATCH_SIZE, productIds.length)}...`,
        })

        for (const id of batch) {
          try {
            const res = await fetch(`/api/products/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ _status: newStatus }),
            })
            if (res.ok) updated++
            else failed++
          } catch { failed++ }
        }

        if (i + BATCH_SIZE < productIds.length) {
          await new Promise(r => setTimeout(r, 300))
        }
      }

      if (updated > 0) {
        toast.success(`已更新 ${updated} 個商品${failed > 0 ? `，${failed} 個失敗` : ''}`)
        toggleAll()
        setTimeout(() => window.location.reload(), 1000)
      } else {
        toast.error('更新失敗')
      }
    } catch (err: any) {
      toast.error(`錯誤: ${err.message}`)
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }

  // 批量匯出
  const handleExport = async (useExcept: boolean) => {
    const productIds = await getProductIds(useExcept)

    if (productIds.length === 0) {
      toast.error('沒有可匯出的商品')
      return
    }

    setIsProcessing(true)
    setActiveDropdown(null)
    setProgress({ current: 0, total: productIds.length, status: '準備匯出...' })

    try {
      const products: any[] = []

      for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        const batch = productIds.slice(i, i + BATCH_SIZE)
        setProgress({
          current: products.length,
          total: productIds.length,
          status: `獲取資料 ${i + 1} - ${Math.min(i + BATCH_SIZE, productIds.length)}...`,
        })

        const params = new URLSearchParams()
        params.set('where[id][in]', batch.join(','))
        params.set('limit', String(BATCH_SIZE))
        params.set('depth', '1')

        const res = await fetch(`/api/products?${params.toString()}`)
        const data = await res.json()
        if (data.docs) products.push(...data.docs)
      }

      setProgress({ current: productIds.length, total: productIds.length, status: '生成 CSV...' })

      const headers = ['ID', '商品名稱', 'Slug', '狀態', '價格(USD)', '庫存', '商家', '分類', '建立時間']
      const rows = products.map(p => [
        p.id,
        `"${(p.title || '').replace(/"/g, '""')}"`,
        p.slug || '',
        p._status || 'draft',
        p.priceInUSD || '',
        p.inventory?.stock ?? '',
        typeof p.vendor === 'object' ? p.vendor?.name || '' : '',
        Array.isArray(p.categories) ? p.categories.map((c: any) => typeof c === 'object' ? c.title : c).join('; ') : '',
        p.createdAt || '',
      ])

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `products-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`已匯出 ${products.length} 個商品`)
    } catch (err: any) {
      toast.error(`錯誤: ${err.message}`)
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }

  // 下拉選單按鈕
  const DropdownButton = ({
    id,
    icon: Icon,
    label,
    variant,
    onSelectAction,
    disabled,
  }: {
    id: string
    icon: React.ElementType
    label: string
    variant: 'primary' | 'success' | 'warning' | 'danger'
    onSelectAction: (useExcept: boolean) => void
    disabled?: boolean
  }) => {
    const isOpen = activeDropdown === id

    const variantStyles = {
      primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      success: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
      warning: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400',
      danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    }

    return (
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setActiveDropdown(isOpen ? null : id)
          }}
          disabled={disabled || isProcessing}
          className={`
            inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white
            rounded-lg shadow-sm transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2
            active:scale-95 cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
            ${variantStyles[variant]}
          `}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {/* 操作已選取 */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelectAction(false)
              }}
              disabled={!hasSelection || selectingAll}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left
                hover:bg-gray-50 transition-colors duration-150 cursor-pointer
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              <Check className="w-4 h-4 text-blue-600" />
              <div className="flex-1">
                <div className="font-medium text-gray-900">操作已選取</div>
                <div className="text-xs text-gray-500">
                  {selectingAll ? '已全選，請使用下方選項' : `${count} 個商品`}
                </div>
              </div>
            </button>

            <div className="border-t border-gray-100 my-1" />

            {/* 操作已選取以外的全部 */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelectAction(true)
              }}
              disabled={!hasSelection || exceptSelectedCount === 0}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left
                hover:bg-gray-50 transition-colors duration-150 cursor-pointer
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              <X className="w-4 h-4 text-orange-500" />
              <div className="flex-1">
                <div className="font-medium text-gray-900">操作已選取以外的全部</div>
                <div className="text-xs text-gray-500">
                  {exceptSelectedCount > 0 ? `${exceptSelectedCount} 個商品` : '沒有其他商品'}
                </div>
              </div>
            </button>

            {selectingAll && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectAction(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left
                    hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                >
                  <Package className="w-4 h-4 text-purple-600" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">操作全部商品</div>
                    <div className="text-xs text-gray-500">{totalProducts} 個商品</div>
                  </div>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  // 沒有選取時不顯示
  if (!hasSelection && !isProcessing) {
    return (
      <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Package className="w-5 h-5 text-slate-400" />
          <span>請勾選商品以進行批量操作。勾選後可選擇「操作已選取」或「操作已選取以外的全部」。</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* 選取資訊 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
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

        {/* 操作按鈕 */}
        {!isProcessing && (
          <div className="flex flex-wrap items-center gap-2">
            {/* 修改狀態 */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveDropdown(activeDropdown === 'status' ? null : 'status')
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                  text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm
                  transition-all duration-200 focus:outline-none focus:ring-2
                  focus:ring-offset-2 focus:ring-amber-400 active:scale-95 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>修改狀態</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === 'status' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'status' && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    設為已發布
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStatusChange('published', false) }}
                    disabled={!hasSelection || selectingAll}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Eye className="w-4 h-4 text-green-600" />
                    <span>已選取 ({selectingAll ? '全選中' : count})</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStatusChange('published', true) }}
                    disabled={exceptSelectedCount === 0}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Eye className="w-4 h-4 text-green-600" />
                    <span>已選取以外 ({exceptSelectedCount})</span>
                  </button>
                  {selectingAll && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStatusChange('published', false) }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-green-600" />
                      <span>全部 ({totalProducts})</span>
                    </button>
                  )}

                  <div className="border-t border-gray-100 my-1" />

                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    設為草稿
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStatusChange('draft', false) }}
                    disabled={!hasSelection || selectingAll}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <EyeOff className="w-4 h-4 text-gray-600" />
                    <span>已選取 ({selectingAll ? '全選中' : count})</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStatusChange('draft', true) }}
                    disabled={exceptSelectedCount === 0}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <EyeOff className="w-4 h-4 text-gray-600" />
                    <span>已選取以外 ({exceptSelectedCount})</span>
                  </button>
                  {selectingAll && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStatusChange('draft', false) }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                    >
                      <EyeOff className="w-4 h-4 text-gray-600" />
                      <span>全部 ({totalProducts})</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 匯出 */}
            <DropdownButton
              id="export"
              icon={FileDown}
              label="匯出 CSV"
              variant="success"
              onSelectAction={handleExport}
            />

            {/* 刪除 */}
            <DropdownButton
              id="delete"
              icon={Trash2}
              label="刪除"
              variant="danger"
              onSelectAction={handleDelete}
            />
          </div>
        )}

        {/* 處理中 */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>處理中...</span>
          </div>
        )}
      </div>

      {/* 進度條 */}
      {isProcessing && progress && (
        <div className="mt-4 space-y-2">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{progress.status}</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductsBulkActions
