import 'dotenv/config'
import { createLocalReq, getPayload } from 'payload'
import { seed } from '../endpoints/seed'
import configPromise from '../payload.config'

/**
 * Seed Products Script (開發用)
 * 
 * 直接在命令行執行，不需要驗證：
 * npx tsx ./src/scripts/seedProducts.ts
 * 
 * 會生成：
 * - 2 個商品 (T-Shirt, Hat)
 * - 多種變體 (尺寸、顏色)
 * - 測試用購物車
 * - 測試用訂單
 */
async function seedProducts() {
  console.log('🛒 開始初始化測試商品資料...\n')

  try {
    const payload = await getPayload({ config: configPromise })
    
    // 創建一個臨時的 admin 用戶用於 seed
    const adminUser = await payload.find({
      collection: 'users',
      where: {
        roles: {
          contains: 'admin',
        },
      },
      limit: 1,
    })

    if (adminUser.docs.length === 0) {
      console.log('⚠️ 找不到 admin 用戶，請先在後台創建一個 admin 帳號')
      process.exit(1)
    }

    const user = adminUser.docs[0]
    console.log(`✅ 使用 admin 用戶: ${user.email}`)

    // 創建 local request
    const req = await createLocalReq({ user }, payload)

    // 執行 seed
    await seed({ payload, req })

    console.log('\n✅ 測試商品資料初始化完成！')
    console.log('🔄 請重新整理前台頁面查看商品')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ 初始化失敗:', error)
    process.exit(1)
  }
}

seedProducts()
