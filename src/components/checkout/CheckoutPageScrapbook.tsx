'use client'

import { Message } from '@/components/Message'
import { Price } from '@/components/Price'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/Auth'
import { useTheme } from '@/providers/Theme'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { Suspense, useCallback, useEffect, useState } from 'react'

import { CreateAddressModal } from '@/components/addresses/CreateAddressModal'
import { CheckoutAddresses } from '@/components/checkout/CheckoutAddresses'
import { CheckoutForm } from '@/components/forms/CheckoutForm'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Checkbox } from '@/components/ui/checkbox'
import { cssVariables } from '@/cssVariables'
import { Address } from '@/payload-types'
import { useAddresses, useCart, usePayments } from '@payloadcms/plugin-ecommerce/client/react'
import {
    ArrowLeft,
    Check,
    CreditCard,
    Lock,
    MapPin,
    Package,
    ShoppingBag,
    Sparkles,
    Truck,
    User,
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

const apiKey = `${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`
const stripe = loadStripe(apiKey)

// 免運門檻
const FREE_SHIPPING_THRESHOLD = 10000
const SHIPPING_FEE = 60

export const CheckoutPageScrapbook: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const { cart } = useCart()
  const [error, setError] = useState<null | string>(null)
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [emailEditable, setEmailEditable] = useState(true)
  const [paymentData, setPaymentData] = useState<null | Record<string, unknown>>(null)
  const { initiatePayment } = usePayments()
  const { addresses } = useAddresses()
  const [shippingAddress, setShippingAddress] = useState<Partial<Address>>()
  const [billingAddress, setBillingAddress] = useState<Partial<Address>>()
  const [billingAddressSameAsShipping, setBillingAddressSameAsShipping] = useState(true)
  const [isProcessingPayment, setProcessingPayment] = useState(false)

  const cartIsEmpty = !cart || !cart.items || !cart.items.length
  const subtotal = cart?.subtotal || 0
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD
  const shippingFee = isFreeShipping ? 0 : SHIPPING_FEE
  const total = subtotal + shippingFee
  const estimatedPoints = Math.floor(subtotal / 100)

  const canGoToPayment = Boolean(
    (email || user) && billingAddress && (billingAddressSameAsShipping || shippingAddress),
  )

  // 計算當前步驟
  const currentStep = paymentData ? 3 : billingAddress ? 2 : 1

  useEffect(() => {
    if (!shippingAddress) {
      if (addresses && addresses.length > 0) {
        const defaultAddress = addresses[0]
        if (defaultAddress) {
          setBillingAddress(defaultAddress)
        }
      }
    }
  }, [addresses])

  useEffect(() => {
    return () => {
      setShippingAddress(undefined)
      setBillingAddress(undefined)
      setBillingAddressSameAsShipping(true)
      setEmail('')
      setEmailEditable(true)
    }
  }, [])

  const initiatePaymentIntent = useCallback(
    async (paymentID: string) => {
      try {
        const paymentData = (await initiatePayment(paymentID, {
          additionalData: {
            ...(email ? { customerEmail: email } : {}),
            billingAddress,
            shippingAddress: billingAddressSameAsShipping ? billingAddress : shippingAddress,
          },
        })) as Record<string, unknown>

        if (paymentData) {
          setPaymentData(paymentData)
        }
      } catch (error) {
        const errorData = error instanceof Error ? JSON.parse(error.message) : {}
        let errorMessage = 'An error occurred while initiating payment.'

        if (errorData?.cause?.code === 'OutOfStock') {
          errorMessage = 'One or more items in your cart are out of stock.'
        }

        setError(errorMessage)
        toast.error(errorMessage)
      }
    },
    [billingAddress, billingAddressSameAsShipping, shippingAddress],
  )

  if (!stripe) return null

  // 處理付款中狀態
  if (cartIsEmpty && isProcessingPayment) {
    return (
      <div className="min-h-screen bg-scrapbook-bg-light flex items-center justify-center">
        <div className="bg-white rounded-xl border-3 border-scrapbook-fg-light p-12 shadow-[6px_6px_0_0_rgba(45,45,45,0.15)] text-center">
          <LoadingSpinner />
          <p className="font-display text-xl text-scrapbook-fg-light mt-4">付款處理中...</p>
          <p className="font-body text-scrapbook-fg-light/60 mt-2">請稍候，正在處理您的訂單</p>
        </div>
      </div>
    )
  }

  // 空購物車
  if (cartIsEmpty) {
    return (
      <div className="min-h-screen bg-scrapbook-bg-light flex items-center justify-center py-12">
        <div className="bg-white rounded-xl border-3 border-scrapbook-fg-light p-12 shadow-[6px_6px_0_0_rgba(45,45,45,0.15)] text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-scrapbook-muted-light flex items-center justify-center border-4 border-dashed border-scrapbook-primary/30">
            <ShoppingBag className="w-12 h-12 text-scrapbook-primary/50" />
          </div>
          <h2 className="font-display text-2xl font-bold text-scrapbook-fg-light mb-3">
            購物車是空的
          </h2>
          <p className="font-body text-scrapbook-fg-light/60 mb-6">先去挑選一些商品吧！</p>
          <Link href="/shop" className="btn-sketch-primary px-8 py-3">
            前往商店
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-scrapbook-bg-light py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* 頁面標題 */}
        <div className="relative mb-8">
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 font-body text-scrapbook-fg-light/60 hover:text-scrapbook-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            返回購物車
          </Link>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-scrapbook-primary/10 rounded-xl border-3 border-scrapbook-primary shadow-[4px_4px_0_0_rgba(45,45,45,0.2)]">
              <CreditCard className="w-8 h-8 text-scrapbook-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-scrapbook-fg-light">
                結帳
              </h1>
              <p className="font-body text-scrapbook-fg-light/60">完成您的訂單</p>
            </div>
          </div>
        </div>

        {/* 步驟指示器 */}
        <CheckoutSteps currentStep={currentStep} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* 左側：結帳表單 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: 聯絡資訊 */}
            <CheckoutSection
              icon={<User className="w-5 h-5" />}
              title="聯絡資訊"
              stepNumber={1}
              isCompleted={Boolean(user || (!emailEditable && email))}
              isActive={currentStep >= 1}
            >
              {user ? (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-green-800">{user.email}</p>
                      <p className="font-body text-sm text-green-600">已登入會員</p>
                    </div>
                  </div>
                  <Link
                    href="/logout"
                    className="font-body text-sm text-green-600 hover:underline"
                  >
                    登出
                  </Link>
                </div>
              ) : !emailEditable && email ? (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-green-800">{email}</p>
                      <p className="font-body text-sm text-green-600">訪客結帳</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailEditable(true)}
                    className="font-body text-sm text-green-600 hover:underline cursor-pointer"
                  >
                    修改
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-3 p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
                    <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-display font-bold text-amber-800">會員專屬優惠</p>
                      <p className="font-body text-sm text-amber-700">
                        <Link href="/login" className="underline">
                          登入
                        </Link>
                        {' 或 '}
                        <Link href="/create-account" className="underline">
                          註冊帳號
                        </Link>
                        {' 可享會員折扣與累積點數'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="email"
                      className="font-display font-bold text-scrapbook-fg-light mb-2 block"
                    >
                      電子信箱
                    </Label>
                    <div className="flex gap-3">
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 border-2 border-scrapbook-muted-light rounded-lg focus:border-scrapbook-primary"
                      />
                      <button
                        type="button"
                        disabled={!email}
                        onClick={() => setEmailEditable(false)}
                        className="btn-sketch-primary px-6 disabled:opacity-50"
                      >
                        確認
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </CheckoutSection>

            {/* Step 2: 收件地址 */}
            <CheckoutSection
              icon={<MapPin className="w-5 h-5" />}
              title="收件地址"
              stepNumber={2}
              isCompleted={Boolean(billingAddress)}
              isActive={currentStep >= 1 && (Boolean(user) || (!emailEditable && Boolean(email)))}
            >
              {billingAddress ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 rounded-full mt-1">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-display font-bold text-green-800">
                            {billingAddress.name}
                          </p>
                          <p className="font-body text-sm text-green-700">
                            {billingAddress.line1}
                            {billingAddress.line2 && `, ${billingAddress.line2}`}
                          </p>
                          <p className="font-body text-sm text-green-700">
                            {billingAddress.city}, {billingAddress.state}{' '}
                            {billingAddress.postalCode}
                          </p>
                          <p className="font-body text-sm text-green-700">
                            {billingAddress.country}
                          </p>
                        </div>
                      </div>
                      {!paymentData && (
                        <button
                          type="button"
                          onClick={() => setBillingAddress(undefined)}
                          className="font-body text-sm text-green-600 hover:underline cursor-pointer"
                        >
                          變更
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-scrapbook-muted-light/50 rounded-lg">
                    <Checkbox
                      id="sameAsShipping"
                      checked={billingAddressSameAsShipping}
                      disabled={Boolean(paymentData)}
                      onCheckedChange={(state) =>
                        setBillingAddressSameAsShipping(state as boolean)
                      }
                    />
                    <Label htmlFor="sameAsShipping" className="font-body">
                      帳單地址與收件地址相同
                    </Label>
                  </div>

                  {!billingAddressSameAsShipping && (
                    <div className="mt-4">
                      {shippingAddress ? (
                        <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                          <p className="font-display font-bold text-blue-800 mb-1">帳單地址</p>
                          <p className="font-body text-sm text-blue-700">
                            {shippingAddress.line1}
                          </p>
                          {!paymentData && (
                            <button
                              type="button"
                              onClick={() => setShippingAddress(undefined)}
                              className="font-body text-sm text-blue-600 hover:underline mt-2 cursor-pointer"
                            >
                              變更
                            </button>
                          )}
                        </div>
                      ) : user ? (
                        <CheckoutAddresses
                          heading="選擇帳單地址"
                          setAddress={setShippingAddress}
                        />
                      ) : (
                        <CreateAddressModal
                          callback={(address) => setShippingAddress(address)}
                          disabled={!email || Boolean(emailEditable)}
                          skipSubmission={true}
                        />
                      )}
                    </div>
                  )}
                </div>
              ) : user ? (
                <CheckoutAddresses heading="選擇收件地址" setAddress={setBillingAddress} />
              ) : (
                <CreateAddressModal
                  disabled={!email || Boolean(emailEditable)}
                  callback={(address) => setBillingAddress(address)}
                  skipSubmission={true}
                />
              )}
            </CheckoutSection>

            {/* Step 3: 付款 */}
            <CheckoutSection
              icon={<CreditCard className="w-5 h-5" />}
              title="付款方式"
              stepNumber={3}
              isCompleted={false}
              isActive={Boolean(paymentData)}
            >
              {!paymentData ? (
                <div className="text-center py-8">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Lock className="w-5 h-5 text-scrapbook-fg-light/60" />
                    <span className="font-body text-scrapbook-fg-light/60">
                      安全加密付款
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!canGoToPayment}
                    onClick={() => initiatePaymentIntent('stripe')}
                    className="btn-sketch-primary px-8 py-4 text-lg disabled:opacity-50"
                  >
                    前往付款
                  </button>
                  {!canGoToPayment && (
                    <p className="font-body text-sm text-scrapbook-fg-light/60 mt-3">
                      請先完成上方步驟
                    </p>
                  )}
                </div>
              ) : (
                <Suspense fallback={<LoadingSpinner />}>
                  {paymentData?.['clientSecret'] && (
                    <div className="space-y-6">
                      {error && <Message error={error} />}
                      <Elements
                        options={{
                          appearance: {
                            theme: 'stripe',
                            variables: {
                              borderRadius: '8px',
                              colorPrimary: '#d97706',
                              gridColumnSpacing: '16px',
                              gridRowSpacing: '16px',
                              colorBackground:
                                theme === 'dark' ? '#1a1a1a' : '#ffffff',
                              colorDanger: cssVariables.colors.error500,
                              colorDangerText: cssVariables.colors.error500,
                              colorIcon:
                                theme === 'dark'
                                  ? cssVariables.colors.base0
                                  : cssVariables.colors.base1000,
                              colorText:
                                theme === 'dark' ? '#e5e5e5' : '#2d2d2d',
                              colorTextPlaceholder: '#a3a3a3',
                              fontFamily: "'Noto Sans TC', sans-serif",
                              fontSizeBase: '16px',
                              fontWeightBold: '700',
                              fontWeightNormal: '400',
                              spacingUnit: '4px',
                            },
                          },
                          clientSecret: paymentData['clientSecret'] as string,
                        }}
                        stripe={stripe}
                      >
                        <CheckoutForm
                          customerEmail={email}
                          billingAddress={billingAddress}
                          setProcessingPayment={setProcessingPayment}
                        />
                        <button
                          type="button"
                          onClick={() => setPaymentData(null)}
                          className="w-full py-2 font-body text-scrapbook-fg-light/60 hover:text-scrapbook-fg-light transition-colors cursor-pointer"
                        >
                          取消付款
                        </button>
                      </Elements>
                    </div>
                  )}
                </Suspense>
              )}
            </CheckoutSection>

            {/* 錯誤訊息 */}
            {!paymentData?.['clientSecret'] && error && (
              <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
                <Message error={error} />
                <Button
                  onClick={() => router.refresh()}
                  className="mt-4 btn-sketch-primary"
                >
                  重試
                </Button>
              </div>
            )}
          </div>

          {/* 右側：訂單摘要 */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <OrderSummaryCheckout
                cart={cart}
                subtotal={subtotal}
                shippingFee={shippingFee}
                total={total}
                estimatedPoints={estimatedPoints}
                isFreeShipping={isFreeShipping}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 步驟指示器
// ============================================
function CheckoutSteps({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, label: '聯絡資訊', icon: User },
    { number: 2, label: '收件地址', icon: MapPin },
    { number: 3, label: '付款', icon: CreditCard },
  ]

  return (
    <div className="bg-white rounded-xl border-3 border-scrapbook-fg-light p-4 shadow-[4px_4px_0_0_rgba(45,45,45,0.1)]">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-3 transition-colors ${
                  currentStep >= step.number
                    ? 'bg-scrapbook-primary border-scrapbook-primary text-white'
                    : 'bg-scrapbook-muted-light border-scrapbook-muted-light text-scrapbook-fg-light/50'
                }`}
              >
                {currentStep > step.number ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              <span
                className={`font-display font-bold hidden sm:block ${
                  currentStep >= step.number
                    ? 'text-scrapbook-fg-light'
                    : 'text-scrapbook-fg-light/50'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-4 rounded-full ${
                  currentStep > step.number
                    ? 'bg-scrapbook-primary'
                    : 'bg-scrapbook-muted-light'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// ============================================
// 結帳區塊
// ============================================
interface CheckoutSectionProps {
  icon: React.ReactNode
  title: string
  stepNumber: number
  isCompleted: boolean
  isActive: boolean
  children: React.ReactNode
}

function CheckoutSection({
  icon,
  title,
  stepNumber,
  isCompleted,
  isActive,
  children,
}: CheckoutSectionProps) {
  return (
    <div
      className={`bg-white rounded-xl border-3 p-6 shadow-[4px_4px_0_0_rgba(45,45,45,0.1)] transition-opacity ${
        isActive
          ? 'border-scrapbook-fg-light'
          : 'border-scrapbook-muted-light opacity-50'
      }`}
    >
      <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-dashed border-scrapbook-muted-light">
        <div
          className={`p-2 rounded-lg ${
            isCompleted
              ? 'bg-green-100 text-green-600'
              : isActive
              ? 'bg-scrapbook-primary/10 text-scrapbook-primary'
              : 'bg-scrapbook-muted-light text-scrapbook-fg-light/50'
          }`}
        >
          {isCompleted ? <Check className="w-5 h-5" /> : icon}
        </div>
        <div>
          <span className="font-body text-sm text-scrapbook-fg-light/60">
            步驟 {stepNumber}
          </span>
          <h2 className="font-display text-xl font-bold text-scrapbook-fg-light">{title}</h2>
        </div>
      </div>
      {children}
    </div>
  )
}

// ============================================
// 訂單摘要（結帳版）
// ============================================
interface OrderSummaryCheckoutProps {
  cart: any
  subtotal: number
  shippingFee: number
  total: number
  estimatedPoints: number
  isFreeShipping: boolean
}

function OrderSummaryCheckout({
  cart,
  subtotal,
  shippingFee,
  total,
  estimatedPoints,
  isFreeShipping,
}: OrderSummaryCheckoutProps) {
  return (
    <div className="bg-white rounded-xl border-3 border-scrapbook-fg-light p-6 shadow-[6px_6px_0_0_rgba(45,45,45,0.15)]">
      <h2 className="font-display text-xl font-bold text-scrapbook-fg-light mb-4 pb-3 border-b-2 border-dashed border-scrapbook-muted-light flex items-center gap-2">
        <Package className="w-5 h-5 text-scrapbook-primary" />
        訂單內容
      </h2>

      {/* 商品列表 */}
      <div className="space-y-4 mb-6">
        {cart?.items?.map((item: any, index: number) => {
          if (typeof item.product !== 'object' || !item.product) return null

          const { product, quantity, variant } = item
          const image = product.gallery?.[0]?.image || product.meta?.image
          let price = product.priceInUSD

          if (variant && typeof variant === 'object') {
            price = variant.priceInUSD
          }

          return (
            <div key={index} className="flex gap-3">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-scrapbook-muted-light bg-scrapbook-muted-light flex-shrink-0">
                {image && typeof image !== 'string' && (
                  <Image
                    src={image.url || ''}
                    alt={product.title || ''}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-scrapbook-fg-light text-sm line-clamp-1">
                  {product.title}
                </p>
                {variant && typeof variant === 'object' && (
                  <p className="font-body text-xs text-scrapbook-fg-light/60 capitalize">
                    {variant.options
                      ?.map((opt: any) => (typeof opt === 'object' ? opt.label : null))
                      .filter(Boolean)
                      .join(' / ')}
                  </p>
                )}
                <div className="flex justify-between items-center mt-1">
                  <span className="font-body text-xs text-scrapbook-fg-light/60">
                    x{quantity}
                  </span>
                  {typeof price === 'number' && (
                    <Price amount={price * (quantity || 1)} className="font-display text-sm font-bold text-scrapbook-primary" />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 分隔線 */}
      <div className="border-t-2 border-dashed border-scrapbook-muted-light my-4" />

      {/* 計算 */}
      <div className="space-y-2">
        <div className="flex justify-between font-body text-sm text-scrapbook-fg-light">
          <span>商品小計</span>
          <Price amount={subtotal} />
        </div>
        <div className="flex justify-between font-body text-sm text-scrapbook-fg-light">
          <span className="flex items-center gap-1">
            <Truck className="w-4 h-4" />
            運費
          </span>
          {isFreeShipping ? (
            <span className="text-green-600 font-medium">免運費</span>
          ) : (
            <Price amount={shippingFee} />
          )}
        </div>
      </div>

      {/* 分隔線 */}
      <div className="border-t-2 border-dashed border-scrapbook-muted-light my-4" />

      {/* 總計 */}
      <div className="flex justify-between items-center">
        <span className="font-display text-lg font-bold text-scrapbook-fg-light">總計</span>
        <Price
          amount={total}
          className="font-display text-2xl font-bold text-scrapbook-primary"
        />
      </div>

      {/* 點數提示 */}
      {estimatedPoints > 0 && (
        <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span className="font-body text-sm text-amber-800">
            本次訂單可獲得 <span className="font-bold">{estimatedPoints}</span> 點
          </span>
        </div>
      )}

      {/* 安全提示 */}
      <div className="flex items-center justify-center gap-2 mt-6 text-scrapbook-fg-light/50">
        <Lock className="w-4 h-4" />
        <span className="font-body text-xs">SSL 加密安全交易</span>
      </div>
    </div>
  )
}

export default CheckoutPageScrapbook
