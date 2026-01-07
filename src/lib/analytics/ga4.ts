import { GoogleAuth } from 'google-auth-library'

/**
 * GA4 Analytics Service
 * 
 * 使用 Google Analytics Data API v1 獲取流量與銷售數據
 * 文檔: https://developers.google.com/analytics/devguides/reporting/data/v1
 */

// GA4 Property ID - 從環境變數取得
const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID

// Service Account 認證
const getAuthClient = async () => {
  // 優先使用環境變數中的 JSON 字串
  if (process.env.GA4_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GA4_SERVICE_ACCOUNT_JSON)
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    })
    return auth.getClient()
  }
  
  // 否則使用本地檔案 (開發環境)
  const auth = new GoogleAuth({
    keyFilename: './takemejapan-hp-61769c41004e.json',
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  })
  return auth.getClient()
}

/**
 * GA4 Data API 回應類型
 */
export interface GA4ReportData {
  sessions: number
  pageViews: number
  users: number
  newUsers: number
  avgSessionDuration: number
  bounceRate: number
}

/**
 * 取得即時流量數據
 */
export async function getRealtimeData(): Promise<{
  activeUsers: number
  pageViews: number
}> {
  if (!GA4_PROPERTY_ID) {
    console.warn('GA4_PROPERTY_ID not configured')
    return { activeUsers: 0, pageViews: 0 }
  }

  try {
    const client = await getAuthClient()
    const accessToken = await client.getAccessToken()
    
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runRealtimeReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: [
            { name: 'activeUsers' },
            { name: 'screenPageViews' },
          ],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`GA4 API error: ${response.status}`)
    }

    const data = await response.json()
    const row = data.rows?.[0]
    
    return {
      activeUsers: parseInt(row?.metricValues?.[0]?.value || '0', 10),
      pageViews: parseInt(row?.metricValues?.[1]?.value || '0', 10),
    }
  } catch (error) {
    console.error('Failed to fetch GA4 realtime data:', error)
    return { activeUsers: 0, pageViews: 0 }
  }
}

/**
 * 取得指定日期範圍的流量報表
 */
export async function getTrafficReport(
  startDate: string = '7daysAgo',
  endDate: string = 'today'
): Promise<GA4ReportData> {
  if (!GA4_PROPERTY_ID) {
    console.warn('GA4_PROPERTY_ID not configured')
    return {
      sessions: 0,
      pageViews: 0,
      users: 0,
      newUsers: 0,
      avgSessionDuration: 0,
      bounceRate: 0,
    }
  }

  try {
    const client = await getAuthClient()
    const accessToken = await client.getAccessToken()
    
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'totalUsers' },
            { name: 'newUsers' },
            { name: 'averageSessionDuration' },
            { name: 'bounceRate' },
          ],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`GA4 API error: ${response.status}`)
    }

    const data = await response.json()
    const row = data.rows?.[0]?.metricValues || []
    
    return {
      sessions: parseInt(row[0]?.value || '0', 10),
      pageViews: parseInt(row[1]?.value || '0', 10),
      users: parseInt(row[2]?.value || '0', 10),
      newUsers: parseInt(row[3]?.value || '0', 10),
      avgSessionDuration: parseFloat(row[4]?.value || '0'),
      bounceRate: parseFloat(row[5]?.value || '0'),
    }
  } catch (error) {
    console.error('Failed to fetch GA4 traffic report:', error)
    return {
      sessions: 0,
      pageViews: 0,
      users: 0,
      newUsers: 0,
      avgSessionDuration: 0,
      bounceRate: 0,
    }
  }
}

/**
 * 取得每日流量趨勢 (用於圖表)
 */
export async function getDailyTrafficTrend(
  days: number = 7
): Promise<{ date: string; sessions: number; users: number }[]> {
  if (!GA4_PROPERTY_ID) {
    console.warn('GA4_PROPERTY_ID not configured')
    return []
  }

  try {
    const client = await getAuthClient()
    const accessToken = await client.getAccessToken()
    
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
          ],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`GA4 API error: ${response.status}`)
    }

    const data = await response.json()
    
    return (data.rows || []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      date: row.dimensionValues[0]?.value || '',
      sessions: parseInt(row.metricValues[0]?.value || '0', 10),
      users: parseInt(row.metricValues[1]?.value || '0', 10),
    }))
  } catch (error) {
    console.error('Failed to fetch GA4 daily trend:', error)
    return []
  }
}

/**
 * 取得熱門頁面
 */
export async function getTopPages(
  limit: number = 10
): Promise<{ path: string; pageViews: number }[]> {
  if (!GA4_PROPERTY_ID) {
    console.warn('GA4_PROPERTY_ID not configured')
    return []
  }

  try {
    const client = await getAuthClient()
    const accessToken = await client.getAccessToken()
    
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`GA4 API error: ${response.status}`)
    }

    const data = await response.json()
    
    return (data.rows || []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      path: row.dimensionValues[0]?.value || '',
      pageViews: parseInt(row.metricValues[0]?.value || '0', 10),
    }))
  } catch (error) {
    console.error('Failed to fetch GA4 top pages:', error)
    return []
  }
}
