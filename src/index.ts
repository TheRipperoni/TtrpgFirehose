import dotenv from 'dotenv'
import FeedGenerator from './server'
import { logger } from './util/logger'

const run = async () => {
  dotenv.config()
  const hostname = maybeStr(process.env.FEEDGEN_HOSTNAME) ?? 'example.com'
  const serviceDid =
    maybeStr(process.env.FEEDGEN_SERVICE_DID) ?? `did:web:${hostname}`
  const server = FeedGenerator.create({
    sqliteLocation: maybeStr(process.env.FIREHOSE_SQLITE_LOCATION) ?? '/sqliteLocation/database',
    subscriptionEndpoint:
      maybeStr(process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT) ??
      'wss://bsky.network',
    subscriptionReconnectDelay:
      maybeInt(process.env.FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY) ?? 3000,
    serviceDid,
  })
  await server.start()
  await new Promise(f => setTimeout(f, 3000))
  logger.info('Jetstream Service Started')
}

const maybeStr = (val?: string) => {
  if (!val) return undefined
  return val
}

const maybeInt = (val?: string) => {
  if (!val) return undefined
  const int = parseInt(val, 10)
  if (isNaN(int)) return undefined
  return int
}

run()
