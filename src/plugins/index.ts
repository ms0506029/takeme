import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { Plugin } from 'payload'

import { stripeAdapter } from '@payloadcms/plugin-ecommerce/payments/stripe'

import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { adminOrPublishedStatus } from '@/access/adminOrPublishedStatus'
import { customerOnlyFieldAccess } from '@/access/customerOnlyFieldAccess'
import { isAdmin } from '@/access/isAdmin'
import { isDocumentOwner } from '@/access/isDocumentOwner'
import { ProductsCollection } from '@/collections/Products'
import { Page, Product } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import { createStoragePlugin } from './storage'

const generateTitle: GenerateTitle<Product | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | Payload Ecommerce Template` : 'Payload Ecommerce Template'
}

const generateURL: GenerateURL<Product | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

// 建立 storage plugin（如有配置 S3/R2）
const storagePlugin = createStoragePlugin()

export const plugins: Plugin[] = [
  // S3/R2 Storage（條件式啟用）
  ...(storagePlugin ? [storagePlugin] : []),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    formSubmissionOverrides: {
      admin: {
        group: 'Content',
      },
    },
    formOverrides: {
      admin: {
        group: 'Content',
      },
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },
    },
  }),
  ecommercePlugin({
    access: {
      adminOnlyFieldAccess,
      adminOrPublishedStatus,
      customerOnlyFieldAccess,
      isAdmin,
      isDocumentOwner,
    },
    customers: {
      slug: 'users',
    },
    payments: {
      paymentMethods: [
        stripeAdapter({
          secretKey: process.env.STRIPE_SECRET_KEY!,
          publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
          webhookSecret: process.env.STRIPE_WEBHOOKS_SIGNING_SECRET!,
        }),
      ],
    },
    products: {
      productsCollectionOverride: ProductsCollection,
    },
    // 側邊欄分組設定
    orders: {
      ordersCollectionOverride: ({ defaultCollection }) => ({
        ...defaultCollection,
        labels: {
          singular: '訂單',
          plural: '訂單',
        },
        admin: {
          ...defaultCollection?.admin,
          group: '訂單管理',
        },
      }),
    },
    carts: {
      cartsCollectionOverride: ({ defaultCollection }) => ({
        ...defaultCollection,
        labels: {
          singular: '購物車',
          plural: '購物車',
        },
        admin: {
          ...defaultCollection?.admin,
          group: '訂單管理',
          defaultColumns: ['customer', 'createdAt', 'purchasedAt', 'abandonedAt', 'subtotal'],
        },
        fields: [
          ...defaultCollection.fields,
          {
            name: 'abandonedAt',
            type: 'date',
            label: '標記遺棄時間',
            admin: {
              position: 'sidebar',
              description: '購物車被系統標記為遺棄的時間',
              date: {
                displayFormat: 'yyyy-MM-dd HH:mm',
              },
            },
          },
          {
            name: 'isAbandoned',
            type: 'checkbox',
            label: '已遺棄',
            defaultValue: false,
            admin: {
              position: 'sidebar',
              description: '此購物車是否被標記為遺棄',
            },
          },
        ],
      }),
    },
    transactions: {
      transactionsCollectionOverride: ({ defaultCollection }) => ({
        ...defaultCollection,
        labels: {
          singular: '交易',
          plural: '交易紀錄',
        },
        admin: {
          ...defaultCollection?.admin,
          group: '訂單管理',
        },
      }),
    },
    addresses: {
      addressesCollectionOverride: ({ defaultCollection }) => ({
        ...defaultCollection,
        labels: {
          singular: '地址',
          plural: '地址管理',
        },
        admin: {
          ...defaultCollection?.admin,
          group: '客戶管理',
        },
      }),
    },
    variants: {
      variantsCollectionOverride: ({ defaultCollection }) => ({
        ...defaultCollection,
        labels: {
          singular: '規格變體',
          plural: '規格變體',
        },
        admin: {
          ...defaultCollection?.admin,
          group: '商品管理',
        },
      }),
      variantOptionsCollectionOverride: ({ defaultCollection }) => ({
        ...defaultCollection,
        labels: {
          singular: '規格選項',
          plural: '規格選項',
        },
        admin: {
          ...defaultCollection?.admin,
          group: '商品管理',
        },
      }),
      variantTypesCollectionOverride: ({ defaultCollection }) => ({
        ...defaultCollection,
        labels: {
          singular: '規格類型',
          plural: '規格類型',
        },
        admin: {
          ...defaultCollection?.admin,
          group: '商品管理',
        },
      }),
    },
  }),
]

