// 確保環境變數驗證在啟動時執行
import { env } from '@/lib/env'

import { mongooseAdapter } from '@payloadcms/db-mongodb'

import {
    BoldFeature,
    EXPERIMENTAL_TableFeature,
    IndentFeature,
    ItalicFeature,
    LinkFeature,
    OrderedListFeature,
    UnderlineFeature,
    UnorderedListFeature,
    lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { zhTw } from '@payloadcms/translations/languages/zhTw'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from '@/collections/Categories'
import { Media } from '@/collections/Media'
import { Pages } from '@/collections/Pages'
import { Promotions } from '@/collections/Promotions'
import { Users } from '@/collections/Users'
import { Vendors } from '@/collections/Vendors'
import { Footer } from '@/globals/Footer'
import { Header } from '@/globals/Header'
import { plugins } from './plugins'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeLogin` statement on line 15.
      beforeLogin: ['@/components/BeforeLogin#BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeDashboard` statement on line 15.
      beforeDashboard: ['@/components/BeforeDashboard#BeforeDashboard'],
    },
    user: Users.slug,
    dateFormat: 'yyyy-MM-dd HH:mm',
  },
  // 繁體中文介面設定 (UI)
  i18n: {
    supportedLanguages: { zhTw, en },
    fallbackLanguage: 'zh-TW',
  },
  // 多語言內容設定 (Data)
  localization: {
    locales: ['zh-TW', 'en'],
    defaultLocale: 'zh-TW',
  },
  collections: [Users, Vendors, Promotions, Pages, Categories, Media],
  db: mongooseAdapter({
    // 直接使用 process.env 以確保在 Runtime 時讀取（繞過 Next.js build-time 評估）
    // Zeabur 提供 MONGO_URI 或 MONGO_CONNECTION_STRING，本地開發使用 DATABASE_URL
    url: process.env.DATABASE_URL || process.env.MONGO_URI || process.env.MONGO_CONNECTION_STRING || '',
  }),
  editor: lexicalEditor({
    features: () => {
      return [
        UnderlineFeature(),
        BoldFeature(),
        ItalicFeature(),
        OrderedListFeature(),
        UnorderedListFeature(),
        LinkFeature({
          enabledCollections: ['pages'],
          fields: ({ defaultFields }) => {
            const defaultFieldsWithoutUrl = defaultFields.filter((field) => {
              if ('name' in field && field.name === 'url') return false
              return true
            })

            return [
              ...defaultFieldsWithoutUrl,
              {
                name: 'url',
                type: 'text',
                admin: {
                  condition: ({ linkType }) => linkType !== 'internal',
                },
                label: ({ t }) => t('fields:enterURL'),
                required: true,
              },
            ]
          },
        }),
        IndentFeature(),
        EXPERIMENTAL_TableFeature(),
      ]
    },
  }),
  //email: nodemailerAdapter(),
  endpoints: [],
  globals: [Header, Footer],
  plugins,
  secret: env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // Sharp is now an optional dependency -
  // if you want to resize images, crop, set focal point, etc.
  // make sure to install it and pass it to the config.
  // sharp,
})
