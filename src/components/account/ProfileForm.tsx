'use client'

/**
 * ProfileForm 組件
 * Phase 8.4 - 會員基本資料編輯表單
 * 
 * UI/UX Pro Max 設計指標：
 * - 使用 Lucide SVG Icons (無 Emoji)
 * - 所有互動項目都有 cursor-pointer
 * - Scrapbook Retro 視覺風格 (shadow-retro、紙張紋理)
 * - 表單驗證與即時回饋
 */

import { AlertCircle, CheckCircle, Loader2, Mail, Phone, Save, User } from 'lucide-react'
import { useState } from 'react'

interface ProfileFormProps {
  user: {
    id: string
    name?: string | null
    email: string
    phone?: string | null
  }
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    phone: user.phone || '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setStatus('idle')

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
        }),
      })

      if (response.ok) {
        setStatus('success')
        setMessage('資料已成功更新！')
      } else {
        throw new Error('更新失敗')
      }
    } catch (error) {
      setStatus('error')
      setMessage('更新時發生錯誤，請稍後再試。')
    } finally {
      setIsLoading(false)
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 姓名欄位 */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 font-display">
          <User className="w-4 h-4" />
          姓名
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="請輸入您的姓名"
          className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 rounded-xl shadow-retro-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-500 transition-all placeholder:text-slate-400"
        />
      </div>

      {/* Email 欄位 (唯讀) */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 font-display">
          <Mail className="w-4 h-4" />
          電子郵件
          <span className="text-xs font-normal text-slate-400">(無法修改)</span>
        </label>
        <input
          type="email"
          value={user.email}
          readOnly
          className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed"
        />
      </div>

      {/* 電話欄位 */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 font-display">
          <Phone className="w-4 h-4" />
          電話號碼
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="例：0912-345-678"
          className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 rounded-xl shadow-retro-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-500 transition-all placeholder:text-slate-400"
        />
      </div>

      {/* 狀態訊息 */}
      {status !== 'idle' && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl border-2 ${
            status === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400'
          }`}
        >
          {status === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message}
        </div>
      )}

      {/* 提交按鈕 */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl border-2 border-slate-900 shadow-retro hover:shadow-retro-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-display"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            儲存中...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            儲存變更
          </>
        )}
      </button>
    </form>
  )
}

export default ProfileForm
