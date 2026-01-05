/**
 * XSS 防護工具函數
 * 
 * 使用 DOMPurify 清洗使用者輸入，防止 XSS 攻擊
 * 僅在客戶端執行 (Client Components)
 */
import DOMPurify from 'dompurify'

/**
 * 清洗 HTML 字串，移除所有危險標籤與屬性
 * 
 * @param dirty - 未清洗的 HTML 字串
 * @returns 清洗後的安全 HTML 字串
 * 
 * @example
 * const safeHtml = sanitizeHtml('<img src=x onerror=alert(1)>')
 * // 輸出: '<img src="x">'
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') {
    // 伺服器端不執行清洗，返回空字串以防止意外
    return ''
  }
  return DOMPurify.sanitize(dirty)
}

/**
 * 清洗純文字，移除所有 HTML 標籤
 * 
 * @param dirty - 未清洗的字串
 * @returns 純文字（無 HTML）
 * 
 * @example
 * const safeText = sanitizeText('<b>Hello</b> <script>alert(1)</script>')
 * // 輸出: 'Hello '
 */
export function sanitizeText(dirty: string): string {
  if (typeof window === 'undefined') {
    return dirty.replace(/<[^>]*>/g, '')
  }
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] })
}

/**
 * 清洗 URL，防止 javascript: 協議攻擊
 * 
 * @param url - 未驗證的 URL
 * @returns 安全的 URL 或空字串
 * 
 * @example
 * sanitizeUrl('javascript:alert(1)') // ''
 * sanitizeUrl('https://example.com') // 'https://example.com'
 */
export function sanitizeUrl(url: string): string {
  const sanitized = url.trim().toLowerCase()
  
  // 禁止危險協議
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:']
  if (dangerousProtocols.some(protocol => sanitized.startsWith(protocol))) {
    return ''
  }
  
  return url
}

/**
 * 清洗物件中的所有字串屬性
 * 
 * @param obj - 包含使用者輸入的物件
 * @returns 深度清洗後的物件
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj }
  
  for (const key in result) {
    const value = result[key]
    if (typeof value === 'string') {
      ;(result as Record<string, unknown>)[key] = sanitizeText(value)
    } else if (typeof value === 'object' && value !== null) {
      ;(result as Record<string, unknown>)[key] = sanitizeObject(
        value as Record<string, unknown>
      )
    }
  }
  
  return result
}
