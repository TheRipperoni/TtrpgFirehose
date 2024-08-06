import http from 'http'
import { createDb, Database, migrateToLatest } from './db'
import { FirehoseSubscription } from './subscription'
import { Config } from './config'

export class FeedGenerator {
  public server?: http.Server
  public db: Database
  public firehose: FirehoseSubscription
  public cfg: Config

  constructor(
    db: Database,
    firehose: FirehoseSubscription,
    cfg: Config,
  ) {
    this.db = db
    this.firehose = firehose
    this.cfg = cfg
  }

  static create(cfg: Config) {
    const db = createDb(cfg.sqliteLocation)
    const firehose = new FirehoseSubscription(db, cfg.subscriptionEndpoint)
    return new FeedGenerator(db, firehose, cfg)
  }

  async start() {
    await migrateToLatest(this.db)
    this.firehose.run(this.cfg.subscriptionReconnectDelay)
    return this.server
  }
}

export default FeedGenerator
