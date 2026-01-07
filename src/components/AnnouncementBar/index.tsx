import type { SiteSettingsData } from '@/lib/globals'
import React from 'react'

interface AnnouncementBarProps {
  settings: SiteSettingsData['announcementBar']
}

/**
 * AnnouncementBar Component
 * 
 * 頂部公告跑馬燈，可透過後台開關控制顯示
 */
export function AnnouncementBar({ settings }: AnnouncementBarProps) {
  if (!settings?.enabled || !settings?.text) {
    return null
  }

  const style: React.CSSProperties = {
    backgroundColor: settings.backgroundColor || '#C9915D',
    color: settings.textColor || '#FFFFFF',
    padding: '0.5rem 1rem',
    textAlign: 'center',
    fontSize: '0.875rem',
    fontWeight: 500,
  }

  const content = (
    <span>{settings.text}</span>
  )

  if (settings.link) {
    return (
      <a href={settings.link} style={{ ...style, display: 'block', textDecoration: 'none' }}>
        {content}
      </a>
    )
  }

  return (
    <div style={style}>
      {content}
    </div>
  )
}
