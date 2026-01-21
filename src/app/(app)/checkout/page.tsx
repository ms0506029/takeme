import type { Metadata } from 'next'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { Fragment } from 'react'

import { CheckoutPageScrapbook } from '@/components/checkout/CheckoutPageScrapbook'

// 強制動態渲染，避免 Build 時嘗試連接資料庫
export const dynamic = 'force-dynamic'

export default function Checkout() {
  return (
    <>
      {!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
        <div className="container py-4">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 text-amber-800">
            <Fragment>
              {'要啟用結帳功能，請先 '}
              <a
                href="https://dashboard.stripe.com/test/apikeys"
                rel="noopener noreferrer"
                target="_blank"
                className="underline font-bold"
              >
                取得 Stripe API Keys
              </a>
              {' 並設定環境變數。詳見 '}
              <a
                href="https://github.com/payloadcms/payload/blob/main/templates/ecommerce/README.md#stripe"
                rel="noopener noreferrer"
                target="_blank"
                className="underline font-bold"
              >
                README
              </a>
              {' 說明。'}
            </Fragment>
          </div>
        </div>
      )}

      <h1 className="sr-only">結帳</h1>

      <CheckoutPageScrapbook />
    </>
  )
}


export const metadata: Metadata = {
  description: 'Checkout.',
  openGraph: mergeOpenGraph({
    title: 'Checkout',
    url: '/checkout',
  }),
  title: 'Checkout',
}
