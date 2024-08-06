import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { Database } from './db'
import { did } from './agent'
import { Post, RepoLike } from './db/schema'
import { logger} from './util/logger'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  constructor(db: Database, service: string) {
    super(db, service)
  }

  async handleEvent(evt: RepoEvent) {
    try {
      if (!isCommit(evt)) {
        return
      }
      const ops = await getOpsByType(evt)

      const likesToCreate: RepoLike[] = ops.likes.creates.filter((create) => {
          if (create.record.subject.uri.includes(did)) {
            return true
          }
        })
        .map((create) => {
          return {
            uri: create.uri,
            cid: create.cid,
            author: create.author,
            indexedAt: new Date().toISOString(),
            status: 0,
          }
        })

      const postsToCreate: Post[] = ops.posts.creates
        .filter((create) => {
          const text = create.record.text.toLowerCase()
          return text.startsWith('@bskyttrpg.bsky.social')
            || text.startsWith('accept')
            || text === 'a'
            || text.startsWith('reject')
            || text === 'r'
            || text.startsWith('cancel')
            || text === 'c'
        })
        .map((create) => {
          if (!create.record.reply?.root) {
            return {
              author: create.author,
              text: create.record.text,
              uri: create.uri,
              cid: create.cid,
              rootUri: create.uri,
              rootCid: create.cid,
              parentUri: create.record.reply?.parent.uri ?? null,
              parentCid: create.record.reply?.parent.cid ?? null,
              status: 0,
              indexedAt: new Date().toISOString(),
            }
          } else {
            return {
              author: create.author,
              text: create.record.text,
              uri: create.uri,
              cid: create.cid,
              rootUri: create.record.reply.root.uri,
              rootCid: create.record.reply.root.cid,
              parentUri: create.record.reply?.parent.uri ?? null,
              parentCid: create.record.reply?.parent.cid ?? null,
              status: 0,
              indexedAt: new Date().toISOString(),
            }
          }
        })

      if (likesToCreate.length > 0) {
        await this.db
          .insertInto('repo_like')
          .values(likesToCreate)
          .onConflict((oc) => oc.doNothing())
          .execute()
      }
      if (postsToCreate.length > 0) {
        await this.db
          .insertInto('post')
          .values(postsToCreate)
          .onConflict((oc) => oc.doNothing())
          .execute()
      }
    } catch(e) {
      logger.error(`Error in firehose: ${e}`)
    }
  }
}
