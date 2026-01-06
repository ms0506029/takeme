// 強制動態渲染，避免 Build 時嘗試連接資料庫
export const dynamic = 'force-dynamic'

import PageTemplate, { generateMetadata } from './[slug]/page'

export default PageTemplate

export { generateMetadata }
