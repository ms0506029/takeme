import { ProductImporter } from '@/components/Admin/ProductImporter'
import { Metadata } from 'next'

/**
 * Admin - Product Import Page
 * Phase 7.2.1 - 商品匯入頁面
 * 
 * 路徑: /admin/import-products
 * 注意：Payload 3.0 自訂頁面不會自動獲得側邊欄
 * 側邊欄由 CustomNav 組件透過連結提供導航
 */

export const metadata: Metadata = {
  title: '商品匯入 - Payload',
}

export default function ImportProductsPage() {
  return <ProductImporter />
}
