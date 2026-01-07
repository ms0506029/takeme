import type { Access, FieldAccess } from 'payload'

/**
 * Access Control 權限函式庫
 * 
 * 提供多種權限控制策略，用於 Collections 和 Fields
 */

// =====================================================
// Collection Level Access
// =====================================================

/**
 * 僅允許 Super Admin 存取
 */
export const superAdminOnly: Access = ({ req }) => {
  return Boolean(req.user?.roles?.includes('super-admin'))
}

/**
 * 允許 Super Admin 或 Vendor 存取
 */
export const superAdminOrVendor: Access = ({ req }) => {
  const user = req.user
  if (!user) return false
  return user.roles?.includes('super-admin') || user.roles?.includes('vendor')
}

/**
 * 所有已登入用戶皆可存取
 */
export const loggedIn: Access = ({ req }) => {
  return Boolean(req.user)
}

/**
 * 公開可讀取
 */
export const publicRead: Access = () => true

// =====================================================
// Vendor-Scoped Access
// =====================================================

/**
 * Super Admin 可讀取全部，Vendor 只能讀取自己的資料
 */
export const vendorScopedRead: Access = ({ req }) => {
  const user = req.user
  if (!user) return false

  // Super Admin 可讀取全部
  if (user.roles?.includes('super-admin')) {
    return true
  }

  // Vendor 只能讀取自己的資料
  if (user.roles?.includes('vendor') && user.vendor) {
    const vendorId = typeof user.vendor === 'object' ? user.vendor.id : user.vendor
    return {
      vendor: {
        equals: vendorId,
      },
    }
  }

  return false
}

/**
 * Super Admin 可建立全部，Vendor 只能為自己建立
 */
export const vendorScopedCreate: Access = ({ req }) => {
  const user = req.user
  if (!user) return false

  return user.roles?.includes('super-admin') || user.roles?.includes('vendor')
}

/**
 * Super Admin 可更新全部，Vendor 只能更新自己的資料
 */
export const vendorScopedUpdate: Access = ({ req }) => {
  const user = req.user
  if (!user) return false

  if (user.roles?.includes('super-admin')) {
    return true
  }

  if (user.roles?.includes('vendor') && user.vendor) {
    const vendorId = typeof user.vendor === 'object' ? user.vendor.id : user.vendor
    return {
      vendor: {
        equals: vendorId,
      },
    }
  }

  return false
}

/**
 * 只有 Super Admin 可刪除
 */
export const vendorScopedDelete: Access = ({ req }) => {
  return Boolean(req.user?.roles?.includes('super-admin'))
}

// =====================================================
// Field Level Access
// =====================================================

/**
 * 只有 Super Admin 可更新此欄位
 */
export const superAdminFieldUpdate: FieldAccess = ({ req }) => {
  return Boolean(req.user?.roles?.includes('super-admin'))
}

/**
 * 只有 Super Admin 可讀取此欄位
 */
export const superAdminFieldRead: FieldAccess = ({ req }) => {
  return Boolean(req.user?.roles?.includes('super-admin'))
}

/**
 * Super Admin 或資料擁有者可讀取
 */
export const ownerOrAdminFieldRead: FieldAccess = ({ req, doc }) => {
  const user = req.user
  if (!user) return false

  if (user.roles?.includes('super-admin')) return true

  // 檢查是否為資料擁有者
  if (doc?.vendor) {
    const docVendorId = typeof doc.vendor === 'object' ? doc.vendor.id : doc.vendor
    const userVendorId = typeof user.vendor === 'object' ? user.vendor?.id : user.vendor
    return docVendorId === userVendorId
  }

  return false
}

// =====================================================
// Status-Based Access
// =====================================================

/**
 * 已發布的內容可公開讀取，草稿只有擁有者或管理員可讀取
 */
export const publishedOrOwner: Access = ({ req }) => {
  const user = req.user

  // 未登入：只能看已發布的
  if (!user) {
    return {
      _status: {
        equals: 'published',
      },
    }
  }

  // Super Admin 可讀取全部
  if (user.roles?.includes('super-admin')) {
    return true
  }

  // Vendor 可讀取自己的全部 + 已發布的
  if (user.roles?.includes('vendor') && user.vendor) {
    const vendorId = typeof user.vendor === 'object' ? user.vendor.id : user.vendor
    return {
      or: [
        { _status: { equals: 'published' } },
        { vendor: { equals: vendorId } },
      ],
    }
  }

  // 一般用戶只能看已發布的
  return {
    _status: {
      equals: 'published',
    },
  }
}

// =====================================================
// Approval Workflow Access
// =====================================================

/**
 * 審核狀態轉換權限
 * - pending -> approved/rejected: Super Admin only
 * - approved -> pending: Super Admin or owner
 * - any -> draft: owner only
 */
export const approvalStatusAccess: FieldAccess = ({ req, siblingData }) => {
  const user = req.user
  if (!user) return false

  // Super Admin 可以任意修改
  if (user.roles?.includes('super-admin')) return true

  // Vendor 只能將狀態改為 pending (送審)
  if (user.roles?.includes('vendor')) {
    // 只允許改為 pending 或 draft
    const newStatus = siblingData?.approvalStatus
    return newStatus === 'pending' || newStatus === 'draft'
  }

  return false
}
