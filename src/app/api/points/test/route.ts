import {
    awardOrderPoints,
    calculateOrderPoints,
    checkAndUpgradeMemberLevel,
    getCampaignMultiplier,
    getLoyaltySettings,
    updateUserTotalSpent,
    type OrderItem
} from '@/lib/points'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * Points System Test API
 * 點數系統測試端點
 * 
 * POST /api/points/test - 執行完整測試流程
 * 
 * 測試內容：
 * 1. 建立測試會員等級
 * 2. 選取/建立測試用戶
 * 3. 模擬訂單完成
 * 4. 驗證點數發放
 * 5. 驗證等級升級
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const logs: string[] = []
  
  const log = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
    logs.push(`[${timestamp}] ${message}`)
    console.log(`[PointsTest] ${message}`)
  }
  
  try {
    const payload = await getPayload({ config: configPromise })
    
    log('========== 點數系統測試開始 ==========')
    
    // ===== Step 1: 檢查點數系統設定 =====
    log('Step 1: 檢查點數系統設定...')
    const settings = await getLoyaltySettings()
    
    if (!settings) {
      log('❌ 點數系統未啟用！請先到後台設定。')
      return NextResponse.json({
        success: false,
        error: '點數系統未啟用',
        action: '請到後台 > 網站設定 > 點數系統設定 > 勾選「啟用點數系統」',
        logs,
      })
    }
    
    log(`✅ 點數系統已啟用`)
    log(`   - 匯率: 每 ${settings.pointsPerAmount} 元得 ${settings.pointsEarned} 點`)
    log(`   - 折扣商品: 固定 ${settings.discountProductRule.fixedPercentage}% 回饋`)
    
    const campaignMultiplier = getCampaignMultiplier(settings)
    if (campaignMultiplier > 1) {
      log(`   - 活動倍率: ${campaignMultiplier}x (${settings.campaign.name || '進行中'})`)
    }
    
    // ===== Step 2: 檢查/建立測試會員等級 =====
    log('Step 2: 檢查會員等級...')
    const existingLevels = await payload.find({
      collection: 'member-levels',
      limit: 100,
    })
    
    if (existingLevels.docs.length === 0) {
      log('⚠️ 尚無會員等級，正在建立預設等級...')
      
      // 建立預設等級
      const defaultLevels = [
        { name: '銅卡會員', code: 'bronze', minSpent: 0, pointsMultiplier: 1, discountPercent: 0, isDefault: true, order: 1 },
        { name: '銀卡會員', code: 'silver', minSpent: 5000, pointsMultiplier: 1.5, discountPercent: 3, order: 2 },
        { name: '金卡會員', code: 'gold', minSpent: 15000, pointsMultiplier: 2, discountPercent: 5, order: 3 },
        { name: 'VIP 會員', code: 'vip', minSpent: 30000, pointsMultiplier: 3, discountPercent: 10, order: 4 },
      ]
      
      for (const level of defaultLevels) {
        await payload.create({
          collection: 'member-levels',
          data: level,
        })
        log(`   ✅ 建立等級: ${level.name} (消費滿 ${level.minSpent} 元, ${level.pointsMultiplier}x 點數)`)
      }
    } else {
      log(`✅ 已有 ${existingLevels.docs.length} 個會員等級`)
      for (const level of existingLevels.docs) {
        log(`   - ${(level as any).name}: 消費滿 ${(level as any).minSpent} 元, ${(level as any).pointsMultiplier}x 點數`)
      }
    }
    
    // ===== Step 3: 選取測試用戶 =====
    log('Step 3: 選取測試用戶...')
    const users = await payload.find({
      collection: 'users',
      where: {
        roles: { contains: 'customer' },
      },
      limit: 1,
    })
    
    let testUser: any
    
    if (users.docs.length === 0) {
      log('⚠️ 尚無客戶用戶，正在建立測試用戶...')
      testUser = await payload.create({
        collection: 'users',
        data: {
          email: `test-${Date.now()}@example.com`,
          password: 'test12345',
          name: '測試客戶',
          roles: ['customer'],
          memberLevel: 'bronze',
          totalSpent: 0,
          points: 0,
        },
      })
      log(`✅ 建立測試用戶: ${testUser.email}`)
    } else {
      testUser = users.docs[0]
      log(`✅ 使用現有用戶: ${testUser.email}`)
    }
    
    log(`   - 當前等級: ${testUser.memberLevel || '無'}`)
    log(`   - 累計消費: ${testUser.totalSpent || 0} 元`)
    log(`   - 點數餘額: ${testUser.points || 0} 點`)
    
    // ===== Step 4: 模擬訂單計算 =====
    log('Step 4: 模擬訂單點數計算...')
    
    // 模擬訂單商品
    const mockItems: OrderItem[] = [
      { productId: 'product-1', quantity: 2, price: 1500, originalPrice: 1500, isDiscounted: false },
      { productId: 'product-2', quantity: 1, price: 800, originalPrice: 1000, isDiscounted: true },
    ]
    
    const mockOrderAmount = mockItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const mockShippingAmount = 100
    
    log(`   模擬訂單:`)
    log(`   - 正價商品: 2 x 1500 = 3000 元`)
    log(`   - 折扣商品: 1 x 800 = 800 元 (原價 1000)`)
    log(`   - 小計: ${mockOrderAmount} 元`)
    log(`   - 運費: ${mockShippingAmount} 元`)
    
    const calculation = await calculateOrderPoints(
      'test-order-' + Date.now(),
      testUser.id,
      mockItems,
      mockOrderAmount,
      mockShippingAmount
    )
    
    if (!calculation) {
      log('❌ 點數計算失敗')
      return NextResponse.json({
        success: false,
        error: '點數計算失敗',
        logs,
      })
    }
    
    log(`   ✅ 計算結果:`)
    log(`   - 正價商品點數: ${calculation.breakdown.regularItems} 點`)
    log(`   - 折扣商品點數: ${calculation.breakdown.discountedItems} 點`)
    log(`   - 會員倍率: ${calculation.breakdown.memberMultiplier}x`)
    log(`   - 活動倍率: ${calculation.breakdown.campaignMultiplier}x`)
    log(`   - 總計: ${calculation.totalPoints} 點`)
    
    // ===== Step 5: 實際發放點數 =====
    log('Step 5: 發放點數...')
    
    const mockOrderId = 'test-order-' + Date.now()
    const awardResult = await awardOrderPoints(
      mockOrderId,
      testUser.id,
      mockItems,
      mockOrderAmount,
      mockShippingAmount
    )
    
    if (!awardResult.success) {
      log(`❌ 發放失敗: ${awardResult.error}`)
    } else {
      log(`✅ 發放成功: ${awardResult.points} 點`)
    }
    
    // ===== Step 6: 更新累計消費 =====
    log('Step 6: 更新累計消費...')
    await updateUserTotalSpent(testUser.id, mockOrderAmount)
    log(`✅ 累計消費已更新`)
    
    // ===== Step 7: 檢查等級升級 =====
    log('Step 7: 檢查等級升級...')
    const upgradeResult = await checkAndUpgradeMemberLevel(testUser.id)
    
    if (upgradeResult.upgraded) {
      log(`🎉 等級升級！${upgradeResult.oldLevel} → ${upgradeResult.newLevel}`)
    } else {
      log(`✅ 等級不變`)
    }
    
    // ===== Step 8: 驗證最終狀態 =====
    log('Step 8: 驗證最終狀態...')
    
    const updatedUser = await payload.findByID({
      collection: 'users',
      id: testUser.id,
    })
    
    const transactions = await payload.find({
      collection: 'point-transactions',
      where: {
        customer: { equals: testUser.id },
      },
      sort: '-createdAt',
      limit: 5,
    })
    
    log(`   用戶狀態:`)
    log(`   - Email: ${updatedUser.email}`)
    log(`   - 等級: ${(updatedUser as any).memberLevel}`)
    log(`   - 累計消費: ${(updatedUser as any).totalSpent} 元`)
    log(`   - 點數餘額: ${(updatedUser as any).points} 點`)
    log(`   - 最近交易: ${transactions.docs.length} 筆`)
    
    const duration = Date.now() - startTime
    log(`========== 測試完成 (耗時 ${duration}ms) ==========`)
    
    return NextResponse.json({
      success: true,
      testResults: {
        settings: {
          enabled: true,
          exchangeRate: `${settings.pointsPerAmount} 元 = ${settings.pointsEarned} 點`,
          discountRule: `${settings.discountProductRule.fixedPercentage}%`,
          campaignMultiplier: campaignMultiplier > 1 ? `${campaignMultiplier}x` : '無活動',
        },
        user: {
          id: testUser.id,
          email: updatedUser.email,
          memberLevel: (updatedUser as any).memberLevel,
          totalSpent: (updatedUser as any).totalSpent,
          points: (updatedUser as any).points,
        },
        order: {
          id: mockOrderId,
          amount: mockOrderAmount,
          items: mockItems.length,
        },
        calculation: {
          regularItemsPoints: calculation.breakdown.regularItems,
          discountedItemsPoints: calculation.breakdown.discountedItems,
          memberMultiplier: calculation.breakdown.memberMultiplier,
          campaignMultiplier: calculation.breakdown.campaignMultiplier,
          totalPoints: calculation.totalPoints,
        },
        levelUpgrade: upgradeResult,
        transactions: transactions.docs.map((t: any) => ({
          type: t.type,
          amount: t.amount,
          description: t.description,
          createdAt: t.createdAt,
        })),
      },
      duration: `${duration}ms`,
      logs,
    })
    
  } catch (error) {
    log(`❌ 測試失敗: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs,
    }, { status: 500 })
  }
}

// GET: 顯示測試說明
export async function GET() {
  return NextResponse.json({
    name: 'Points System Test API',
    description: '點數系統完整測試端點',
    usage: 'POST /api/points/test',
    testFlow: [
      '1. 檢查點數系統設定',
      '2. 檢查/建立會員等級',
      '3. 選取/建立測試用戶',
      '4. 模擬訂單計算',
      '5. 實際發放點數',
      '6. 更新累計消費',
      '7. 檢查等級升級',
      '8. 驗證最終狀態',
    ],
  })
}
