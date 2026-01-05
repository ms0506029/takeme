/**
 * Cloudflare R2 圖片儲存配置
 * 
 * 用於儲存商品圖片至 CDN，提供全球加速訪問
 * 如未配置環境變數，此 plugin 將不會啟用
 */
import { s3Storage } from '@payloadcms/storage-s3'

// 檢查是否有配置 S3/R2 環境變數
const isS3Configured = Boolean(
  process.env.S3_BUCKET &&
  process.env.S3_ACCESS_KEY &&
  process.env.S3_SECRET_KEY
)

/**
 * 建立 S3/R2 Storage Plugin
 * 如果環境變數未配置，返回 undefined（不啟用）
 */
export const createStoragePlugin = () => {
  if (!isS3Configured) {
    return undefined
  }

  return s3Storage({
    collections: {
      media: {
        // 允許覆蓋現有檔案
        disableLocalStorage: true,
        // 產生圖片路徑前綴
        prefix: 'media',
      },
    },
    bucket: process.env.S3_BUCKET!,
    config: {
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      // Cloudflare R2 使用 'auto' region
      region: process.env.S3_REGION || 'auto',
      // R2 endpoint 格式: https://<account-id>.r2.cloudflarestorage.com
      endpoint: process.env.S3_ENDPOINT,
      // R2 需要此設定
      forcePathStyle: true,
    },
  })
}
