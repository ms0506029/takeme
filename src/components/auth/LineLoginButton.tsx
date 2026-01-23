'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import React from 'react'

/**
 * LINE Login 按鈕組件
 * 
 * 符合 UI/UX Pro Max 規範：
 * - 最小觸控區域 44x44px
 * - Focus 狀態明確
 * - Loading 狀態
 * - 可及性 (aria-label)
 * 
 * 使用 LINE 官方綠色 #06C755
 */
export interface LineLoginButtonProps {
  /** 按鈕文字 */
  text?: string
  /** 登入後返回的頁面 */
  returnTo?: string
  /** 額外的 className */
  className?: string
}

export function LineLoginButton({
  text = '使用 LINE 帳號登入',
  returnTo,
  className = '',
}: LineLoginButtonProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = React.useState(false)

  // 決定登入後返回的頁面
  const getReturnUrl = () => {
    if (returnTo) return returnTo
    // 如果有 redirect 參數，使用它
    const redirect = searchParams.get('redirect')
    if (redirect) return redirect
    // 預設返回帳號頁
    return '/account'
  }

  const handleClick = () => {
    setIsLoading(true)
    // 導向 LINE Login 啟動端點
    window.location.href = `/auth/line?returnTo=${encodeURIComponent(getReturnUrl())}`
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-label={text}
      className={`
        group
        relative
        flex
        items-center
        justify-center
        w-full
        min-h-[44px]
        px-6
        py-3
        bg-[#06C755]
        hover:bg-[#05b34c]
        active:bg-[#049a42]
        text-white
        font-medium
        rounded-lg
        transition-all
        duration-200
        focus:outline-none
        focus:ring-2
        focus:ring-[#06C755]
        focus:ring-offset-2
        disabled:opacity-70
        disabled:cursor-not-allowed
        shadow-md
        hover:shadow-lg
        ${className}
      `}
    >
      {/* LINE Logo SVG */}
      <svg
        className="w-6 h-6 mr-3 flex-shrink-0"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
      </svg>

      {/* 按鈕文字 */}
      <span className="text-base">
        {isLoading ? '處理中...' : text}
      </span>

      {/* Loading Spinner */}
      {isLoading && (
        <svg
          className="ml-2 w-5 h-5 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
    </button>
  )
}

export default LineLoginButton
