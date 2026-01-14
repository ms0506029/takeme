/**
 * Products Collection 擴展
 * 
 * 基於 ecommerce plugin 的預設 Collection 進行擴展：
 * - 新增 vendor 關聯（商家隔離）
 * - 新增爬蟲來源欄位
 * - 調整權限控制
 */
import { CallToAction } from '@/blocks/CallToAction/config'
import { Content } from '@/blocks/Content/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { priceDropDetectionHook } from '@/hooks/priceDropDetectionHook'
import { restockDetectionHook } from '@/hooks/restockDetectionHook'
import { generatePreviewPath } from '@/utilities/generatePreviewPath'
import { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import {
    MetaDescriptionField,
    MetaImageField,
    MetaTitleField,
    OverviewField,
    PreviewField,
} from '@payloadcms/plugin-seo/fields'
import {
    FixedToolbarFeature,
    HeadingFeature,
    HorizontalRuleFeature,
    InlineToolbarFeature,
    lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { DefaultDocumentIDType, slugField, Where } from 'payload'

export const ProductsCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  labels: {
    singular: '商品',
    plural: '商品',
  },
  admin: {
    ...defaultCollection?.admin,
    group: '商品管理',
    defaultColumns: ['title', 'vendor', 'enableVariants', '_status', 'variants.variants'],
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'products',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'products',
        req,
      }),
    useAsTitle: 'title',
  },
  // 商家權限控制：Vendor 只能看到自己的商品
  access: {
    ...defaultCollection?.access,
    read: ({ req }) => {
      const user = req.user
      if (!user) return true // 公開瀏覽
      
      // Super Admin 可看全部
      if (user.roles?.includes('super-admin') || user.roles?.includes('admin')) {
        return true
      }
      
      // Vendor 只能看到自己的商品
      if (user.roles?.includes('vendor') && user.vendor) {
        return {
          vendor: {
            equals: typeof user.vendor === 'object' ? user.vendor.id : user.vendor,
          },
        }
      }
      
      return true // Customer 可看全部（已發布的）
    },
    create: ({ req }) => {
      const user = req.user
      if (!user) return false
      return Boolean(
        user.roles?.includes('super-admin') || 
        user.roles?.includes('admin') || 
        user.roles?.includes('vendor')
      )
    },
    update: ({ req }) => {
      const user = req.user
      if (!user) return false
      
      if (user.roles?.includes('super-admin') || user.roles?.includes('admin')) {
        return true
      }
      
      if (user.roles?.includes('vendor') && user.vendor) {
        return {
          vendor: {
            equals: typeof user.vendor === 'object' ? user.vendor.id : user.vendor,
          },
        }
      }
      
      return false
    },
    delete: ({ req }) => {
      const user = req.user
      if (!user) return false
      
      if (user.roles?.includes('super-admin') || user.roles?.includes('admin')) {
        return true
      }
      
      if (user.roles?.includes('vendor') && user.vendor) {
        return {
          vendor: {
            equals: typeof user.vendor === 'object' ? user.vendor.id : user.vendor,
          },
        }
      }
      
      return false
    },
  },
  defaultPopulate: {
    ...defaultCollection?.defaultPopulate,
    title: true,
    slug: true,
    variantOptions: true,
    variants: true,
    enableVariants: true,
    gallery: true,
    priceInUSD: true,
    inventory: true,
    meta: true,
    vendor: true,
  },
  // ===== 通知系統 Hooks =====
  hooks: {
    ...defaultCollection?.hooks,
    afterChange: [
      ...(defaultCollection?.hooks?.afterChange || []),
      priceDropDetectionHook,   // 降價偵測
      restockDetectionHook,     // 補貨偵測
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, label: '商品名稱' },
    // 商家關聯
    {
      name: 'vendor',
      type: 'relationship',
      relationTo: 'vendors',
      label: '所屬商家',
      required: true,
      admin: {
        position: 'sidebar',
        description: '此商品所屬的商家',
      },
      // 自動填入當前登入商家
      hooks: {
        beforeChange: [
          ({ req, value }) => {
            // 如果沒有值且用戶是 vendor，自動填入
            if (!value && req.user?.roles?.includes('vendor') && req.user?.vendor) {
              return typeof req.user.vendor === 'object' 
                ? req.user.vendor.id 
                : req.user.vendor
            }
            return value
          },
        ],
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'description',
              type: 'richText',
              label: '商品描述',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    HorizontalRuleFeature(),
                  ]
                },
              }),
              required: false,
            },
            {
              name: 'gallery',
              type: 'array',
              label: '商品圖片',
              minRows: 1,
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
                {
                  name: 'variantOption',
                  type: 'relationship',
                  relationTo: 'variantOptions',
                  admin: {
                    condition: (data) => {
                      return data?.enableVariants === true && data?.variantTypes?.length > 0
                    },
                  },
                  filterOptions: ({ data }) => {
                    if (data?.enableVariants && data?.variantTypes?.length) {
                      const variantTypeIDs = data.variantTypes.map((item: unknown) => {
                        if (typeof item === 'object' && item !== null && 'id' in item) {
                          return (item as { id: DefaultDocumentIDType }).id
                        }
                        return item
                      }) as DefaultDocumentIDType[]

                      if (variantTypeIDs.length === 0)
                        return {
                          variantType: {
                            in: [],
                          },
                        }

                      const query: Where = {
                        variantType: {
                          in: variantTypeIDs,
                        },
                      }

                      return query
                    }

                    return {
                      variantType: {
                        in: [],
                      },
                    }
                  },
                },
              ],
            },

            {
              name: 'layout',
              type: 'blocks',
              blocks: [CallToAction, Content, MediaBlock],
            },
          ],
          label: 'Content',
        },
        {
          fields: [
            ...defaultCollection.fields,
            {
              name: 'relatedProducts',
              type: 'relationship',
              label: '相關商品',
              filterOptions: ({ id }) => {
                if (id) {
                  return {
                    id: {
                      not_in: [id],
                    },
                  }
                }

                return {
                  id: {
                    exists: true,
                  },
                }
              },
              hasMany: true,
              relationTo: 'products',
            },
          ],
          label: 'Product Details',
        },
        // 爬蟲資料 Tab
        {
          label: '外部來源',
          description: '爬蟲同步資料',
          fields: [
            {
              name: 'externalSource',
              type: 'select',
              label: '來源平台',
              options: [
                { label: 'BEAMS', value: 'beams' },
                { label: 'ZOZO', value: 'zozo' },
                { label: 'Freak\'s Store', value: 'freaks' },
                { label: '手動建立', value: 'manual' },
              ],
              defaultValue: 'manual',
              admin: {
                description: '商品資料來源',
              },
            },
            {
              name: 'externalId',
              type: 'text',
              label: '外部商品 ID',
              index: true,
              admin: {
                description: '來源平台的商品編號',
              },
            },
            {
              name: 'externalUrl',
              type: 'text',
              label: '來源網址',
              admin: {
                description: '商品在來源平台的原始連結',
              },
            },
            {
              name: 'lastSyncedAt',
              type: 'date',
              label: '最後同步時間',
              admin: {
                readOnly: true,
                description: '爬蟲最後更新時間',
                date: {
                  displayFormat: 'yyyy-MM-dd HH:mm:ss',
                },
              },
            },
            {
              name: 'syncStatus',
              type: 'select',
              label: '同步狀態',
              options: [
                { label: '同步中', value: 'syncing' },
                { label: '已同步', value: 'synced' },
                { label: '同步失敗', value: 'failed' },
                { label: 'N/A', value: 'na' },
              ],
              defaultValue: 'na',
              admin: {
                position: 'sidebar',
              },
            },
          ],
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),

            MetaDescriptionField({}),
            PreviewField({
              hasGenerateFn: true,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'categories',
      type: 'relationship',
      label: '商品分類',
      admin: {
        position: 'sidebar',
        sortOptions: 'title',
      },
      hasMany: true,
      relationTo: 'categories',
    },
    slugField(),
  ],
})

