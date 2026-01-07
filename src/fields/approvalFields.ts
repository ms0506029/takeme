import { superAdminFieldUpdate } from '@/access/vendorAccess'
import type { Field } from 'payload'

/**
 * 審核狀態欄位配置
 * 
 * 可直接加入需要審核功能的 Collection fields 中使用
 */
export const approvalFields: Field[] = [
  {
    name: 'approvalStatus',
    type: 'select',
    label: '審核狀態',
    defaultValue: 'draft',
    options: [
      { label: '草稿', value: 'draft' },
      { label: '待審核', value: 'pending' },
      { label: '已通過', value: 'approved' },
      { label: '已拒絕', value: 'rejected' },
    ],
    admin: {
      position: 'sidebar',
      description: '商品審核狀態',
    },
  },
  {
    name: 'submittedAt',
    type: 'date',
    label: '送審時間',
    admin: {
      position: 'sidebar',
      readOnly: true,
      condition: (data) => data?.approvalStatus === 'pending' || data?.approvalStatus === 'approved' || data?.approvalStatus === 'rejected',
    },
  },
  {
    name: 'approvedAt',
    type: 'date',
    label: '通過時間',
    admin: {
      position: 'sidebar',
      readOnly: true,
      condition: (data) => data?.approvalStatus === 'approved',
    },
  },
  {
    name: 'approvedBy',
    type: 'relationship',
    relationTo: 'users',
    label: '審核人',
    admin: {
      position: 'sidebar',
      readOnly: true,
      condition: (data) => data?.approvalStatus === 'approved',
    },
  },
  {
    name: 'rejectedAt',
    type: 'date',
    label: '拒絕時間',
    admin: {
      position: 'sidebar',
      readOnly: true,
      condition: (data) => data?.approvalStatus === 'rejected',
    },
  },
  {
    name: 'rejectedBy',
    type: 'relationship',
    relationTo: 'users',
    label: '拒絕人',
    admin: {
      position: 'sidebar',
      readOnly: true,
      condition: (data) => data?.approvalStatus === 'rejected',
    },
  },
  {
    name: 'rejectionReason',
    type: 'textarea',
    label: '拒絕原因',
    admin: {
      condition: (data) => data?.approvalStatus === 'rejected',
      description: '請填寫拒絕原因，商家可據此修改商品',
    },
    access: {
      update: superAdminFieldUpdate,
    },
  },
]
