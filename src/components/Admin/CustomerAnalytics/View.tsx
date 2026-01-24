/**
 * Customer Analytics View (Server Component Wrapper)
 * 
 * 這是一個 Server Component，用於包裹 Client Component 並提供 Payload 的側邊欄佈局。
 */

import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import CustomerAnalyticsDashboard from './index'

export const CustomerAnalyticsView: React.FC<AdminViewServerProps> = ({
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
      <CustomerAnalyticsDashboard />
    </DefaultTemplate>
  )
}
