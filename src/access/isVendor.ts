/**
 * isVendor 權限檢查函數
 * 
 * 用於驗證用戶是否為商家 (Vendor)
 */
import type { User } from '@/payload-types'
import type { Access } from 'payload'

/**
 * 檢查用戶是否為 Vendor
 */
export const isVendor = (user: User | null): boolean => {
  if (!user) return false
  return Boolean(user.roles?.includes('vendor'))
}

/**
 * Access Control 函數版本
 */
export const isVendorAccess: Access = ({ req }): boolean => {
  return isVendor(req.user as User)
}

/**
 * 檢查用戶是否為 Super Admin 或 Vendor
 */
export const isSuperAdminOrVendor = (user: User | null): boolean => {
  if (!user) return false
  return Boolean(
    user.roles?.includes('super-admin') || 
    user.roles?.includes('vendor')
  )
}

/**
 * Access Control: Super Admin 或 Vendor
 */
export const isSuperAdminOrVendorAccess: Access = ({ req }): boolean => {
  return isSuperAdminOrVendor(req.user as User)
}
