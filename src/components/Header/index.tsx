import { getCachedGlobal } from '@/utilities/getGlobals'

import { HeaderClient } from './index.client'
import './index.css'

export async function Header() {
  const header = await getCachedGlobal('header', 1)()

  // Build 階段可能無法連接資料庫，header 可能為 null
  return <HeaderClient header={header} />
}
