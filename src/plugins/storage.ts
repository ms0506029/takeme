/**
 * Cloudflare R2 圖片儲存配置
 *
 * 用於儲存商品圖片至 CDN，提供全球加速訪問
 * 如未配置環境變數，此 plugin 將不會啟用
 *
 * 環境變數:
 * - S3_BUCKET: R2 儲存桶名稱
 * - S3_ACCESS_KEY: R2 API Access Key
 * - S3_SECRET_KEY: R2 API Secret Key
 * - S3_ENDPOINT: R2 S3 API 端點
 * - S3_REGION: 地區（R2 使用 'auto'）
 * - S3_PUBLIC_URL: 公開訪問 URL（用於產生圖片連結）
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
    console.log('[R2 Storage] 未配置環境變數，使用本地儲存')
    return undefined
  }

  console.log('[R2 Storage] 使用 Cloudflare R2 儲存')

  return s3Storage({
    collections: {
      media: {
        // 禁用本地儲存，完全使用 R2
        disableLocalStorage: true,
        // 產生圖片路徑前綴
        prefix: 'media',
        // 產生公開訪問 URL
        generateFileURL: ({ filename, prefix }) => {
          const publicUrl = process.env.S3_PUBLIC_URL
          if (publicUrl) {
            // 使用公開 URL（R2 Public Development URL 或自定義域名）
            return `${publicUrl}/${prefix}/${filename}`
          }
          // 後備方案：使用 S3 API 端點（需要適當的訪問權限）
          return `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${prefix}/${filename}`
        },
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
