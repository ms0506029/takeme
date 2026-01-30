'use client'

/**
 * 批量操作元件匯出
 *
 * 提供通用元件和各 Collection 的預設配置
 */

import React from 'react'
import { GenericBulkActions, BulkActionsConfig } from './GenericBulkActions'
import { Eye, EyeOff, Clock, CheckCircle, XCircle, Truck, Package, Ban } from 'lucide-react'

// ==================== 通用元件 ====================
export { GenericBulkActions }
export type { BulkActionsConfig }

// ==================== Users (客戶) ====================
export const UsersBulkActions: React.FC = () => (
  <GenericBulkActions
    config={{
      collection: 'users',
      collectionLabel: '使用者',
      enableDelete: true,
      enableExport: true,
      enableStatusChange: false, // Users 通常沒有 _status
      colorTheme: 'purple',
      exportFields: [
        { key: 'id', label: 'ID' },
        { key: 'email', label: 'Email' },
        { key: 'name', label: '姓名' },
        { key: 'roles', label: '角色', transform: (v) => Array.isArray(v) ? v.join(', ') : v },
        { key: 'createdAt', label: '註冊時間' },
        { key: 'updatedAt', label: '更新時間' },
      ],
    }}
  />
)

// ==================== Orders (訂單) ====================
export const OrdersBulkActions: React.FC = () => (
  <GenericBulkActions
    config={{
      collection: 'orders',
      collectionLabel: '訂單',
      enableDelete: true,
      enableExport: true,
      enableStatusChange: true,
      statusField: 'status',
      statusOptions: [
        { label: '待處理', value: 'pending', icon: Clock, color: 'text-amber-600' },
        { label: '處理中', value: 'processing', icon: Package, color: 'text-blue-600' },
        { label: '已出貨', value: 'shipped', icon: Truck, color: 'text-indigo-600' },
        { label: '已完成', value: 'completed', icon: CheckCircle, color: 'text-green-600' },
        { label: '已取消', value: 'cancelled', icon: Ban, color: 'text-red-600' },
      ],
      colorTheme: 'blue',
      exportFields: [
        { key: 'id', label: '訂單 ID' },
        { key: 'orderNumber', label: '訂單編號' },
        { key: 'status', label: '狀態' },
        { key: 'total', label: '總金額' },
        { key: 'customer', label: '客戶', transform: (v) => typeof v === 'object' ? v?.email || v?.name : v },
        { key: 'createdAt', label: '建立時間' },
      ],
    }}
  />
)

// ==================== Media (媒體) ====================
export const MediaBulkActions: React.FC = () => (
  <GenericBulkActions
    config={{
      collection: 'media',
      collectionLabel: '媒體',
      enableDelete: true,
      enableExport: true,
      enableStatusChange: false,
      colorTheme: 'emerald',
      exportFields: [
        { key: 'id', label: 'ID' },
        { key: 'filename', label: '檔名' },
        { key: 'mimeType', label: '類型' },
        { key: 'filesize', label: '大小 (bytes)' },
        { key: 'url', label: 'URL' },
        { key: 'createdAt', label: '上傳時間' },
      ],
    }}
  />
)

// ==================== Categories (分類) ====================
export const CategoriesBulkActions: React.FC = () => (
  <GenericBulkActions
    config={{
      collection: 'categories',
      collectionLabel: '分類',
      enableDelete: true,
      enableExport: true,
      enableStatusChange: false,
      colorTheme: 'amber',
      exportFields: [
        { key: 'id', label: 'ID' },
        { key: 'title', label: '名稱' },
        { key: 'slug', label: 'Slug' },
        { key: 'parent', label: '父分類', transform: (v) => typeof v === 'object' ? v?.title : v },
        { key: 'createdAt', label: '建立時間' },
      ],
    }}
  />
)

// ==================== Vendors (商家) ====================
export const VendorsBulkActions: React.FC = () => (
  <GenericBulkActions
    config={{
      collection: 'vendors',
      collectionLabel: '商家',
      enableDelete: true,
      enableExport: true,
      enableStatusChange: true,
      statusField: 'status',
      statusOptions: [
        { label: '待審核', value: 'pending', icon: Clock, color: 'text-amber-600' },
        { label: '已啟用', value: 'active', icon: CheckCircle, color: 'text-green-600' },
        { label: '已停用', value: 'suspended', icon: Ban, color: 'text-red-600' },
      ],
      colorTheme: 'rose',
      exportFields: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: '商家名稱' },
        { key: 'slug', label: 'Slug' },
        { key: 'status', label: '狀態' },
        { key: 'walletBalance', label: '錢包餘額' },
        { key: 'createdAt', label: '建立時間' },
      ],
    }}
  />
)

// ==================== Wishlist (願望清單) ====================
export const WishlistBulkActions: React.FC = () => (
  <GenericBulkActions
    config={{
      collection: 'wishlist',
      collectionLabel: '願望清單',
      enableDelete: true,
      enableExport: true,
      enableStatusChange: false,
      colorTheme: 'rose',
      exportFields: [
        { key: 'id', label: 'ID' },
        { key: 'user', label: '使用者', transform: (v) => typeof v === 'object' ? v?.email : v },
        { key: 'product', label: '商品', transform: (v) => typeof v === 'object' ? v?.title : v },
        { key: 'createdAt', label: '加入時間' },
      ],
    }}
  />
)

// ==================== RestockRequests (補貨通知) ====================
export const RestockRequestsBulkActions: React.FC = () => (
  <GenericBulkActions
    config={{
      collection: 'restock-requests',
      collectionLabel: '補貨通知',
      enableDelete: true,
      enableExport: true,
      enableStatusChange: true,
      statusField: 'status',
      statusOptions: [
        { label: '等待中', value: 'pending', icon: Clock, color: 'text-amber-600' },
        { label: '已通知', value: 'notified', icon: CheckCircle, color: 'text-green-600' },
        { label: '已取消', value: 'cancelled', icon: XCircle, color: 'text-red-600' },
      ],
      colorTheme: 'amber',
      exportFields: [
        { key: 'id', label: 'ID' },
        { key: 'email', label: 'Email' },
        { key: 'product', label: '商品', transform: (v) => typeof v === 'object' ? v?.title : v },
        { key: 'status', label: '狀態' },
        { key: 'createdAt', label: '申請時間' },
      ],
    }}
  />
)

// ==================== Promotions (促銷活動) ====================
export const PromotionsBulkActions: React.FC = () => (
  <GenericBulkActions
    config={{
      collection: 'promotions',
      collectionLabel: '促銷活動',
      enableDelete: true,
      enableExport: true,
      enableStatusChange: true,
      statusField: 'status',
      statusOptions: [
        { label: '草稿', value: 'draft', icon: EyeOff, color: 'text-gray-600' },
        { label: '啟用', value: 'active', icon: CheckCircle, color: 'text-green-600' },
        { label: '已結束', value: 'expired', icon: Clock, color: 'text-amber-600' },
      ],
      colorTheme: 'purple',
      exportFields: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: '活動名稱' },
        { key: 'code', label: '優惠碼' },
        { key: 'type', label: '折扣類型' },
        { key: 'value', label: '折扣值' },
        { key: 'status', label: '狀態' },
        { key: 'startDate', label: '開始日期' },
        { key: 'endDate', label: '結束日期' },
      ],
    }}
  />
)
