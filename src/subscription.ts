import { Database } from './db'
import { Post, RepoLike } from './db/schema'
import { Jetstream } from '@skyware/jetstream'

export class MyJetstream {
  public jetstream

  constructor(
    public db: Database,
    endpoint: string) {
    this.jetstream = new Jetstream({
      wantedCollections: ['app.bsky.feed.post', 'app.bsky.feed.like'],
      endpoint: endpoint,
    })
    this.jetstream.onCreate('app.bsky.feed.post', async (event) => {
      const text = event.commit.record.text.toLowerCase()
      if (text.startsWith('@bskyttrpg.bsky.social')
        || text.startsWith('accept')
        || text.startsWith('aceit') //TODO
        || text === 'a'
        || text.startsWith('reject')
        || text.startsWith('rejeit') //TODO
        || text === 'r'
        || text.startsWith('cancel')
        || text === 'c') {
        const postsToCreate: Post[] = []
        if (!event.commit.record.reply?.root) {
          postsToCreate.push({
            author: event.did,
            text: event.commit.record.text,
            uri: 'at://' + event.did + "/app.bsky.feed.post/" + event.commit.rkey,
            lang: event.commit.record.langs?.at(0) ?? null,
            cid: event.commit.cid,
            rootUri: 'at://' + event.did + "/app.bsky.feed.post/" + event.commit.rkey,
            rootCid: event.commit.cid,
            parentUri: `at://${event.commit.record.reply?.parent.uri}` ?? null,
            parentCid: event.commit.record.reply?.parent.cid ?? null,
            status: 0,
            indexedAt: new Date().toISOString(),
          })
        } else {
          postsToCreate.push({
            author: event.did,
            text: event.commit.record.text,
            uri: 'at://' + event.did + "/app.bsky.feed.post/" + event.commit.rkey,
            cid: event.commit.cid,
            lang: event.commit.record.langs?.at(0) ?? null,
            rootUri: event.commit.record.reply.root.uri,
            rootCid: event.commit.record.reply.root.cid,
            parentUri: event.commit.record.reply?.parent.uri ?? null,
            parentCid: event.commit.record.reply?.parent.cid ?? null,
            status: 0,
            indexedAt: new Date().toISOString(),
          })
        }
        if (postsToCreate.length > 0) {
          await this.db
            .insertInto('post')
            .values(postsToCreate)
            .onConflict((oc) => oc.doNothing())
            .execute()
        }
      }
    })

    this.jetstream.onCreate('app.bsky.feed.like', async (event) => {
      if (event.commit.record.subject.uri == 'at://did:plc:hysbs7znfgxyb4tsvetzo4sk/app.bsky.labeler.service/self') {
        const likesToCreate: RepoLike[] = []
        likesToCreate.push({
          uri: 'at://' + event.did + "/app.bsky.feed.like/" + event.commit.rkey,
          cid: event.commit.cid,
          author: event.did,
          indexedAt: new Date().toISOString(),
          status: 0,
        })
        if (likesToCreate.length > 0) {
          await this.db
            .insertInto('repo_like')
            .values(likesToCreate)
            .onConflict((oc) => oc.doNothing())
            .execute()
        }
      }
    })
  }

  start() {
    this.jetstream.start()
  }
}
