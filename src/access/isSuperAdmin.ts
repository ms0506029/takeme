/**
 * isSuperAdmin 權限檢查函數
 * 
 * 用於驗證用戶是否為平台超級管理員
 */
import type { User } from '@/payload-types'
import type { Access } from 'payload'

/**
 * 檢查用戶是否為 Super Admin
 */
export const isSuperAdmin = (user: User | null): boolean => {
  if (!user) return false
  return Boolean(user.roles?.includes('super-admin'))
}

/**
 * Access Control 函數版本
 */
export const isSuperAdminAccess: Access = ({ req }): boolean => {
  return isSuperAdmin(req.user as User)
}
