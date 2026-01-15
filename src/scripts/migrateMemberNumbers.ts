/**
 * 遷移腳本：為現有用戶生成 memberNumber
 * 
 * 使用方式：npx tsx src/scripts/migrateMemberNumbers.ts
 */

import config from '@payload-config'
import 'dotenv/config'
import { getPayload } from 'payload'

async function migrateMemberNumbers() {
  console.log('🚀 開始遷移用戶會員編號...')
  
  const payload = await getPayload({ config })
  
  // 查找沒有 memberNumber 的用戶
  const usersWithoutNumber = await payload.find({
    collection: 'users',
    where: {
      or: [
        { memberNumber: { exists: false } },
        { memberNumber: { equals: null } },
        { memberNumber: { equals: '' } },
      ],
    },
    limit: 1000,
  })
  
  console.log(`📊 找到 ${usersWithoutNumber.docs.length} 個用戶需要生成會員編號`)
  
  let successCount = 0
  let errorCount = 0
  
  for (const user of usersWithoutNumber.docs) {
    try {
      // 生成 13 位數字：時間戳後 10 位 + 3 位隨機數
      const timestamp = Date.now().toString().slice(-10)
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const memberNumber = timestamp + random
      
      await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          memberNumber,
        },
      })
      
      console.log(`✅ 用戶 ${user.email} 已分配會員編號：${memberNumber}`)
      successCount++
      
      // 加入小延遲避免生成重複編號
      await new Promise(resolve => setTimeout(resolve, 10))
    } catch (error) {
      console.error(`❌ 用戶 ${user.email} 更新失敗:`, error)
      errorCount++
    }
  }
  
  console.log('\n📋 遷移完成！')
  console.log(`   成功：${successCount} 個用戶`)
  console.log(`   失敗：${errorCount} 個用戶`)
  
  process.exit(0)
}

migrateMemberNumbers().catch((error) => {
  console.error('遷移腳本執行失敗:', error)
  process.exit(1)
})
