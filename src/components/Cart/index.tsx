
import { Cart as CartType } from '@/payload-types'
import { CartModal } from './CartModal'

export type CartItem = NonNullable<CartType['items']>[number]

// 匯出 CartDrawer 相關
export { CartDrawerProvider, useCartDrawer } from './CartDrawer'

export function Cart() {
  return <CartModal />
}

