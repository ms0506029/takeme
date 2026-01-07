import { getPayload } from 'payload'
import config from './src/payload.config'

async function checkScripts() {
  const payload = await getPayload({ config })
  const scripts = await payload.findGlobal({
    slug: 'trackingScripts',
  })
  console.log('--- Tracking Scripts Settings ---')
  console.log(JSON.stringify(scripts, null, 2))
  process.exit(0)
}

checkScripts()
