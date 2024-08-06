import { BskyAgent } from '@atproto/api'
import 'dotenv/config'

export const did = 'did:plc:hysbs7znfgxyb4tsvetzo4sk'

BskyAgent.configure({
  appLabelers: [did],
})