'use client'

/**
 * GenericBulkActions - 通用批量操作元件
 *
 * 可套用到任何 Collection，支援：
 * - 批量刪除
 * - 批量修改狀態
 * - 批量匯出 CSV
 * - 自訂操作
 *
 * 使用方式：
 * 在 Collection 的 admin.components.beforeListTable 中設定：
 * beforeListTable: ['@/components/Admin/BulkActions/GenericBulkActions#GenericBulkActions']
 *
 * 或使用預設配置的包裝元件（見下方範例）
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
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
import { useSearchParams, usePathname } from 'next/navigation'

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

interface StatusOption {
  label: string
  value: string
  icon?: React.ElementType
  color?: string
}

interface ExportField {
  key: string
  label: string
  transform?: (value: any, doc: any) => string
}

export interface BulkActionsConfig {
  /** Collection slug (e.g., 'products', 'users', 'orders') */
  collection: string
  /** Collection display name */
  collectionLabel?: string
  /** Enable delete action */
  enableDelete?: boolean
  /** Enable export action */
  enableExport?: boolean
  /** Enable status change action */
  enableStatusChange?: boolean
  /** Status field name (default: '_status') */
  statusField?: string
  /** Status options for status change */
  statusOptions?: StatusOption[]
  /** Fields to export (for CSV) */
  exportFields?: ExportField[]
  /** Primary color theme */
  colorTheme?: 'amber' | 'blue' | 'emerald' | 'purple' | 'rose'
}

// 預設 Export 欄位（通用）
const DEFAULT_EXPORT_FIELDS: ExportField[] = [
  { key: 'id', label: 'ID' },
  { key: 'createdAt', label: '建立時間' },
  { key: 'updatedAt', label: '更新時間' },
]

// 預設狀態選項
const DEFAULT_STATUS_OPTIONS: StatusOption[] = [
  { label: '已發布', value: 'published', icon: Eye, color: 'text-green-600' },
  { label: '草稿', value: 'draft', icon: EyeOff, color: 'text-gray-600' },
]

// 顏色主題配置
const COLOR_THEMES = {
  amber: {
    bg: 'bg-amber-500',
    hover: 'hover:bg-amber-600',
    ring: 'focus:ring-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    progress: 'bg-amber-500',
  },
  blue: {
    bg: 'bg-blue-600',
    hover: 'hover:bg-blue-700',
    ring: 'focus:ring-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    progress: 'bg-blue-600',
  },
  emerald: {
    bg: 'bg-emerald-600',
    hover: 'hover:bg-emerald-700',
    ring: 'focus:ring-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    progress: 'bg-emerald-600',
  },
  purple: {
    bg: 'bg-purple-600',
    hover: 'hover:bg-purple-700',
    ring: 'focus:ring-purple-500',
    badge: 'bg-purple-100 text-purple-700',
    progress: 'bg-purple-600',
  },
  rose: {
    bg: 'bg-rose-600',
    hover: 'hover:bg-rose-700',
    ring: 'focus:ring-rose-500',
    badge: 'bg-rose-100 text-rose-700',
    progress: 'bg-rose-600',
  },
}

export const GenericBulkActions: React.FC<{ config?: BulkActionsConfig }> = ({ config: propConfig }) => {
  const { count, selectAll, selectedIDs, toggleAll } = useSelection()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // 從 URL 路徑自動偵測 collection
  const detectedCollection = useMemo(() => {
    const match = pathname.match(/\/admin\/collections\/([^/]+)/)
    return match ? match[1] : ''
  }, [pathname])

  // 合併設定
  const config: BulkActionsConfig = useMemo(() => ({
    collection: propConfig?.collection || detectedCollection,
    collectionLabel: propConfig?.collectionLabel || detectedCollection,
    enableDelete: propConfig?.enableDelete ?? true,
    enableExport: propConfig?.enableExport ?? true,
    enableStatusChange: propConfig?.enableStatusChange ?? true,
    statusField: propConfig?.statusField || '_status',
    statusOptions: propConfig?.statusOptions || DEFAULT_STATUS_OPTIONS,
    exportFields: propConfig?.exportFields || DEFAULT_EXPORT_FIELDS,
    colorTheme: propConfig?.colorTheme || 'blue',
  }), [propConfig, detectedCollection])

  const theme = COLOR_THEMES[config.colorTheme || 'blue']

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<ActionProgress | null>(null)
  const [totalDocs, setTotalDocs] = useState<number>(0)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  const selectingAll = selectAll === SelectAllStatus.AllAvailable
  const hasSelection = count > 0
  const exceptSelectedCount = Math.max(0, totalDocs - count)

  // 獲取總數（使用 limit=1 比 limit=0 快很多，totalDocs 仍會返回正確數量）
  useEffect(() => {
    if (!config.collection) return

    const fetchTotal = async () => {
      try {
        const whereParam = searchParams.get('where')
        const params = new URLSearchParams()
        if (whereParam) params.set('where', whereParam)
        params.set('limit', '1')
        params.set('depth', '0')

        const response = await fetch(`/api/${config.collection}?${params.toString()}`)
        const data = await response.json()
        setTotalDocs(data.totalDocs || 0)
      } catch (err) {
        console.error('Failed to fetch total:', err)
      }
    }
    fetchTotal()
  }, [config.collection, searchParams])

  // 關閉下拉選單
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null)
    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [activeDropdown])

  // 獲取要操作的 ID（優化：只取 ID，分頁處理）
  const getDocIds = useCallback(async (useExcept: boolean): Promise<string[]> => {
    const selectedSet = new Set(selectedIDs as string[])

    if (useExcept || selectingAll) {
      const whereParam = searchParams.get('where')
      const allIds: string[] = []
      let page = 1
      const pageSize = 500

      // 分頁取得所有 ID
      while (true) {
        const params = new URLSearchParams()
        if (whereParam) params.set('where', whereParam)
        params.set('limit', String(pageSize))
        params.set('page', String(page))
        params.set('depth', '0')
        // 只選取 id 欄位以加速查詢
        params.set('select', 'id')

        const response = await fetch(`/api/${config.collection}?${params.toString()}`)
        const data = await response.json()

        if (!data.docs || data.docs.length === 0) break

        allIds.push(...data.docs.map((doc: any) => doc.id))

        if (!data.hasNextPage) break
        page++
      }

      if (useExcept) {
        return allIds.filter(id => !selectedSet.has(id))
      }
      return allIds
    }

    return selectedIDs as string[]
  }, [config.collection, selectingAll, selectedIDs, searchParams])

  // 批量刪除
  const handleDelete = async (useExcept: boolean) => {
    // 先計算預估數量，快速顯示確認對話框
    const estimatedCount = useExcept ? exceptSelectedCount : (selectingAll ? totalDocs : count)

    if (estimatedCount === 0) {
      toast.error('沒有可刪除的項目')
      return
    }

    const confirmed = window.confirm(
      `確定要刪除約 ${estimatedCount} 個${config.collectionLabel}嗎？\n\n此操作無法復原！`
    )
    if (!confirmed) return

    setIsProcessing(true)
    setActiveDropdown(null)
    setProgress({ current: 0, total: estimatedCount, status: '正在取得項目清單...' })

    // 確認後才取得實際 ID
    const docIds = await getDocIds(useExcept)

    if (docIds.length === 0) {
      toast.error('沒有可刪除的項目')
      setIsProcessing(false)
      setProgress(null)
      return
    }

    setProgress({ current: 0, total: docIds.length, status: '準備刪除...' })

    try {
      let deleted = 0, failed = 0

      for (let i = 0; i < docIds.length; i += BATCH_SIZE) {
        const batch = docIds.slice(i, i + BATCH_SIZE)
        setProgress({
          current: deleted + failed,
          total: docIds.length,
          status: `刪除中 ${i + 1} - ${Math.min(i + BATCH_SIZE, docIds.length)}...`,
        })

        for (const id of batch) {
          try {
            const res = await fetch(`/api/${config.collection}/${id}`, { method: 'DELETE' })
            if (res.ok) deleted++
            else failed++
          } catch { failed++ }
        }

        if (i + BATCH_SIZE < docIds.length) {
          await new Promise(r => setTimeout(r, 300))
        }
      }

      if (deleted > 0) {
        toast.success(`已刪除 ${deleted} 個${config.collectionLabel}${failed > 0 ? `，${failed} 個失敗` : ''}`)
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
  const handleStatusChange = async (newStatus: string, useExcept: boolean) => {
    // 先計算預估數量，快速顯示確認對話框
    const estimatedCount = useExcept ? exceptSelectedCount : (selectingAll ? totalDocs : count)

    if (estimatedCount === 0) {
      toast.error('沒有可修改的項目')
      return
    }

    const statusLabel = config.statusOptions?.find(s => s.value === newStatus)?.label || newStatus
    const confirmed = window.confirm(`確定要將約 ${estimatedCount} 個${config.collectionLabel}設為「${statusLabel}」嗎？`)
    if (!confirmed) return

    setIsProcessing(true)
    setActiveDropdown(null)
    setProgress({ current: 0, total: estimatedCount, status: '正在取得項目清單...' })

    // 確認後才取得實際 ID
    const docIds = await getDocIds(useExcept)

    if (docIds.length === 0) {
      toast.error('沒有可修改的項目')
      setIsProcessing(false)
      setProgress(null)
      return
    }

    setProgress({ current: 0, total: docIds.length, status: '準備修改...' })

    try {
      let updated = 0, failed = 0

      for (let i = 0; i < docIds.length; i += BATCH_SIZE) {
        const batch = docIds.slice(i, i + BATCH_SIZE)
        setProgress({
          current: updated + failed,
          total: docIds.length,
          status: `修改中 ${i + 1} - ${Math.min(i + BATCH_SIZE, docIds.length)}...`,
        })

        for (const id of batch) {
          try {
            const res = await fetch(`/api/${config.collection}/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ [config.statusField!]: newStatus }),
            })
            if (res.ok) updated++
            else failed++
          } catch { failed++ }
        }

        if (i + BATCH_SIZE < docIds.length) {
          await new Promise(r => setTimeout(r, 300))
        }
      }

      if (updated > 0) {
        toast.success(`已更新 ${updated} 個${config.collectionLabel}${failed > 0 ? `，${failed} 個失敗` : ''}`)
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
    // 先計算預估數量
    const estimatedCount = useExcept ? exceptSelectedCount : (selectingAll ? totalDocs : count)

    if (estimatedCount === 0) {
      toast.error('沒有可匯出的項目')
      return
    }

    setIsProcessing(true)
    setActiveDropdown(null)
    setProgress({ current: 0, total: estimatedCount, status: '正在取得項目清單...' })

    // 取得實際 ID
    const docIds = await getDocIds(useExcept)

    if (docIds.length === 0) {
      toast.error('沒有可匯出的項目')
      setIsProcessing(false)
      setProgress(null)
      return
    }

    setProgress({ current: 0, total: docIds.length, status: '準備匯出...' })

    try {
      const docs: any[] = []

      for (let i = 0; i < docIds.length; i += BATCH_SIZE) {
        const batch = docIds.slice(i, i + BATCH_SIZE)
        setProgress({
          current: docs.length,
          total: docIds.length,
          status: `獲取資料 ${i + 1} - ${Math.min(i + BATCH_SIZE, docIds.length)}...`,
        })

        const params = new URLSearchParams()
        params.set('where[id][in]', batch.join(','))
        params.set('limit', String(BATCH_SIZE))
        params.set('depth', '1')

        const res = await fetch(`/api/${config.collection}?${params.toString()}`)
        const data = await res.json()
        if (data.docs) docs.push(...data.docs)
      }

      setProgress({ current: docIds.length, total: docIds.length, status: '生成 CSV...' })

      // 生成 CSV
      const fields = config.exportFields || DEFAULT_EXPORT_FIELDS
      const headers = fields.map(f => f.label)

      const rows = docs.map(doc => {
        return fields.map(field => {
          const value = field.key.split('.').reduce((obj, key) => obj?.[key], doc)
          if (field.transform) {
            return `"${String(field.transform(value, doc)).replace(/"/g, '""')}"`
          }
          if (value === null || value === undefined) return ''
          if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
          return `"${String(value).replace(/"/g, '""')}"`
        })
      })

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${config.collection}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`已匯出 ${docs.length} 個${config.collectionLabel}`)
    } catch (err: any) {
      toast.error(`錯誤: ${err.message}`)
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }

  // 下拉選項按鈕
  const DropdownItem = ({
    onClick,
    disabled,
    icon: Icon,
    iconColor,
    label,
    description,
  }: {
    onClick: () => void
    disabled?: boolean
    icon: React.ElementType
    iconColor?: string
    label: string
    description: string
  }) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left
        hover:bg-gray-50 transition-colors duration-150 cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
    >
      <Icon className={`w-4 h-4 ${iconColor || 'text-gray-600'}`} />
      <div className="flex-1">
        <div className="font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
    </button>
  )

  // 沒有選取時顯示提示
  if (!hasSelection && !isProcessing) {
    return (
      <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Package className="w-5 h-5 text-slate-400" />
          <span>請勾選項目以進行批量操作。勾選後可選擇「操作已選取」或「操作已選取以外的全部」。</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        {/* 選取資訊 */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${theme.badge}`}>
              {selectingAll ? totalDocs : count}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {selectingAll ? `已全選所有${config.collectionLabel}` : `個${config.collectionLabel}已選取`}
              </p>
              {!selectingAll && exceptSelectedCount > 0 && (
                <p className="text-xs text-gray-500">
                  共 {totalDocs} 個，剩餘 {exceptSelectedCount} 個未選取
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 操作按鈕 */}
        {!isProcessing && (
          <div className="flex flex-wrap items-center gap-2">
            {/* 修改狀態 */}
            {config.enableStatusChange && config.statusOptions && config.statusOptions.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveDropdown(activeDropdown === 'status' ? null : 'status')
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                    text-white rounded-lg shadow-sm transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 cursor-pointer
                    bg-amber-500 hover:bg-amber-600 focus:ring-amber-400`}
                >
                  <Eye className="w-4 h-4" />
                  <span>修改狀態</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === 'status' ? 'rotate-180' : ''}`} />
                </button>

                {activeDropdown === 'status' && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-96 overflow-y-auto">
                    {config.statusOptions.map((status) => (
                      <React.Fragment key={status.value}>
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          設為{status.label}
                        </div>
                        <DropdownItem
                          onClick={() => handleStatusChange(status.value, false)}
                          disabled={selectingAll}
                          icon={status.icon || Eye}
                          iconColor={status.color}
                          label={`已選取`}
                          description={selectingAll ? '已全選，請使用下方選項' : `${count} 個`}
                        />
                        <DropdownItem
                          onClick={() => handleStatusChange(status.value, true)}
                          disabled={exceptSelectedCount === 0}
                          icon={status.icon || Eye}
                          iconColor={status.color}
                          label={`已選取以外`}
                          description={`${exceptSelectedCount} 個`}
                        />
                        {selectingAll && (
                          <DropdownItem
                            onClick={() => handleStatusChange(status.value, false)}
                            icon={Package}
                            iconColor="text-purple-600"
                            label={`全部`}
                            description={`${totalDocs} 個`}
                          />
                        )}
                        <div className="border-t border-gray-100 my-1" />
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 匯出 */}
            {config.enableExport && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveDropdown(activeDropdown === 'export' ? null : 'export')
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                    text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm
                    transition-all duration-200 focus:outline-none focus:ring-2
                    focus:ring-offset-2 focus:ring-emerald-500 active:scale-95 cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>匯出 CSV</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === 'export' ? 'rotate-180' : ''}`} />
                </button>

                {activeDropdown === 'export' && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <DropdownItem
                      onClick={() => handleExport(false)}
                      disabled={selectingAll}
                      icon={Check}
                      iconColor="text-emerald-600"
                      label="匯出已選取"
                      description={selectingAll ? '已全選，請使用下方選項' : `${count} 個`}
                    />
                    <div className="border-t border-gray-100 my-1" />
                    <DropdownItem
                      onClick={() => handleExport(true)}
                      disabled={exceptSelectedCount === 0}
                      icon={X}
                      iconColor="text-orange-500"
                      label="匯出已選取以外"
                      description={`${exceptSelectedCount} 個`}
                    />
                    {selectingAll && (
                      <>
                        <div className="border-t border-gray-100 my-1" />
                        <DropdownItem
                          onClick={() => handleExport(false)}
                          icon={Package}
                          iconColor="text-purple-600"
                          label="匯出全部"
                          description={`${totalDocs} 個`}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 刪除 */}
            {config.enableDelete && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveDropdown(activeDropdown === 'delete' ? null : 'delete')
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                    text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm
                    transition-all duration-200 focus:outline-none focus:ring-2
                    focus:ring-offset-2 focus:ring-red-500 active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>刪除</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === 'delete' ? 'rotate-180' : ''}`} />
                </button>

                {activeDropdown === 'delete' && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <DropdownItem
                      onClick={() => handleDelete(false)}
                      disabled={selectingAll}
                      icon={Check}
                      iconColor="text-red-600"
                      label="刪除已選取"
                      description={selectingAll ? '已全選，請使用下方選項' : `${count} 個`}
                    />
                    <div className="border-t border-gray-100 my-1" />
                    <DropdownItem
                      onClick={() => handleDelete(true)}
                      disabled={exceptSelectedCount === 0}
                      icon={X}
                      iconColor="text-orange-500"
                      label="刪除已選取以外"
                      description={`${exceptSelectedCount} 個`}
                    />
                    {selectingAll && (
                      <>
                        <div className="border-t border-gray-100 my-1" />
                        <DropdownItem
                          onClick={() => handleDelete(false)}
                          icon={Package}
                          iconColor="text-purple-600"
                          label="刪除全部"
                          description={`${totalDocs} 個`}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 處理中 */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className={`w-5 h-5 animate-spin ${theme.badge.split(' ')[1]}`} />
            <span>處理中...</span>
          </div>
        )}
      </div>

      {/* 進度條 */}
      {isProcessing && progress && (
        <div className="mt-4 space-y-2">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-out ${theme.progress}`}
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

export default GenericBulkActions
