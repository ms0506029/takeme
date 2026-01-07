import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'

/**
 * 商品審核工作流程 Hooks
 * 
 * 審核狀態：
 * - draft: 草稿 (商家可編輯)
 * - pending: 待審核 (已送審，等待管理員審核)
 * - approved: 已通過 (自動發布)
 * - rejected: 已拒絕 (需商家修改後重新送審)
 */

/**
 * BeforeChange Hook: 處理審核狀態變更邏輯
 */
export const handleApprovalWorkflow: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  const user = req.user
  const isAdmin = user?.roles?.includes('super-admin')
  
  // 新建商品時
  if (operation === 'create') {
    // 商家建立的商品預設為 draft
    if (!isAdmin) {
      data.approvalStatus = 'draft'
      data._status = 'draft'
    }
    return data
  }

  // 更新商品時
  if (operation === 'update' && originalDoc) {
    const oldStatus = originalDoc.approvalStatus
    const newStatus = data.approvalStatus

    // 狀態沒變，不處理
    if (oldStatus === newStatus) return data

    // 商家操作
    if (!isAdmin) {
      // 商家只能將狀態改為 pending (送審) 或 draft (退回編輯)
      if (newStatus !== 'pending' && newStatus !== 'draft') {
        data.approvalStatus = oldStatus
        return data
      }

      // 送審時記錄時間
      if (newStatus === 'pending') {
        data.submittedAt = new Date().toISOString()
      }
    }

    // 管理員操作
    if (isAdmin) {
      // 審核通過時自動發布
      if (newStatus === 'approved') {
        data._status = 'published'
        data.approvedAt = new Date().toISOString()
        data.approvedBy = user.id
      }

      // 拒絕時記錄原因
      if (newStatus === 'rejected') {
        data.rejectedAt = new Date().toISOString()
        data.rejectedBy = user.id
        // 保持為草稿狀態
        data._status = 'draft'
      }
    }
  }

  return data
}

/**
 * AfterChange Hook: 發送審核通知
 */
export const sendApprovalNotification: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (operation !== 'update') return doc

  const oldStatus = previousDoc?.approvalStatus
  const newStatus = doc.approvalStatus

  // 狀態沒變，不處理
  if (oldStatus === newStatus) return doc

  const payload = req.payload

  try {
    // 商品送審通知 (通知管理員)
    if (newStatus === 'pending') {
      console.log(`[Approval] Product ${doc.id} submitted for review`)
      // TODO: 發送通知給管理員
      // await payload.sendEmail({ ... })
    }

    // 審核通過通知 (通知商家)
    if (newStatus === 'approved') {
      console.log(`[Approval] Product ${doc.id} approved`)
      // TODO: 發送通知給商家
      // await payload.sendEmail({ ... })
    }

    // 審核拒絕通知 (通知商家)
    if (newStatus === 'rejected') {
      console.log(`[Approval] Product ${doc.id} rejected: ${doc.rejectionReason || 'No reason'}`)
      // TODO: 發送通知給商家
      // await payload.sendEmail({ ... })
    }
  } catch (error) {
    console.error('[Approval] Failed to send notification:', error)
  }

  return doc
}
