/**
 * LINE Module Index
 * LINE 模組入口
 * 
 * 匯出所有 LINE 相關服務
 */

// 核心服務
export { BRAND_COLORS, LineService } from './line-service'
export type { FlexBubbleOptions, LineMessageResult } from './line-service'

// Flex 模板
export { FlexTemplates } from './flex-templates'
export type {
    MemberBindingFailedData, MemberBindingSuccessData, OutOfStockNotificationData, PriceDropTemplateData,
    RestockTemplateData
} from './flex-templates'

// 用戶狀態管理
export { USER_STATES, UserStateService } from './user-state'
export type { UserState, UserStateData } from './user-state'

