/**
 * Product Importer View (Server Component Wrapper)
 * 
 * 這是一個 Server Component，用於包裹 Client Component 並提供 Payload 的側邊欄佈局。
 * 作為 Custom View 註冊到 payload.config.ts
 */

import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { ProductImporter } from './index'

export const ProductImporterView: React.FC<AdminViewServerProps> = ({
  initPageResult,
  params,
  searchParams,
}) => {
  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      payload={initPageResult.req.payload}
      permissions={initPageResult.permissions}
      user={initPageResult.req.user || undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <ProductImporter />
    </DefaultTemplate>
  )
}
