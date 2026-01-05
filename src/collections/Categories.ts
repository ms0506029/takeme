/**
 * Categories Collection
 * 
 * 商品分類管理：
 * - 支援階層分類（parent）
 * - 商家專屬分類（vendor）
 */
import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    read: () => true,
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
      
      // Vendor 只能更新自己的分類
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
      return Boolean(user.roles?.includes('super-admin') || user.roles?.includes('admin'))
    },
  },
  admin: {
    useAsTitle: 'title',
    group: '商品管理',
    defaultColumns: ['title', 'vendor', 'parent'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: '分類名稱',
      required: true,
    },
    // 商家關聯（可選，若為空則為全站分類）
    {
      name: 'vendor',
      type: 'relationship',
      relationTo: 'vendors',
      label: '所屬商家',
      admin: {
        position: 'sidebar',
        description: '留空為全站分類',
      },
    },
    // 父分類（階層結構）
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      label: '父分類',
      admin: {
        position: 'sidebar',
      },
      filterOptions: ({ id }) => {
        // 排除自己
        if (id) {
          return {
            id: {
              not_equals: id,
            },
          }
        }
        return true
      },
    },
    // 分類描述
    {
      name: 'description',
      type: 'textarea',
      label: '分類描述',
    },
    // 分類圖示
    {
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
      label: '分類圖示',
      admin: {
        position: 'sidebar',
      },
    },
    // 排序權重
    {
      name: 'sortOrder',
      type: 'number',
      label: '排序',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: '數字越小越前面',
      },
    },
    slugField({
      position: undefined,
    }),
  ],
}

