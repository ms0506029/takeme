import { ProductImporter } from '@/components/Admin/ProductImporter'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Metadata } from 'next'

/**
 * Admin - Product Import Page
 * Phase 7.2.1 - 商品匯入頁面
 * 
 * 路徑: /admin/import-products
 * 使用 DefaultTemplate 確保側邊欄正常顯示
 */

export const metadata: Metadata = {
  title: '商品匯入 - Payload',
}

export default function ImportProductsPage() {
  return (
    <DefaultTemplate>
      <ProductImporter />
    </DefaultTemplate>
  )
}
