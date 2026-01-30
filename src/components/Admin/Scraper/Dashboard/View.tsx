/**
 * Scraper Dashboard View (Server Component Wrapper)
 *
 * 爬蟲系統控制台的 Server Component wrapper
 * 提供 Payload Admin 側邊欄佈局
 */

import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { ScraperDashboard } from './index'

export const ScraperDashboardView: React.FC<AdminViewServerProps> = ({
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
      <ScraperDashboard />
    </DefaultTemplate>
  )
}
