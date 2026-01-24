import { ProductImporter } from '@/components/Admin/ProductImporter'
import { Metadata } from 'next'

/**
 * Admin - Product Import Page
 * Phase 7.2.1 - 商品匯入頁面
 * 
 * 路徑: /admin/import-products
 * 注意：此頁面位於 (payload) 路由組內，會自動繼承 Payload 的 RootLayout
 */

export const metadata: Metadata = {
  title: '商品匯入 - Payload',
}

export default function ImportProductsPage() {
  return (
    <div className="template-default__wrap">
      <div className="gutter--left gutter--right">
        <ProductImporter />
      </div>
    </div>
  )
}
