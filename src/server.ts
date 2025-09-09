import http from 'http'
import events from 'events'
import express from 'express'
import { createDb, Database, migrateToLatest } from './db'
import { Config } from './config'
import { MyJetstream } from './subscription'

export class FeedGenerator {
  public app: express.Application
  public server?: http.Server
  public db: Database
  public jetstream: MyJetstream
  public cfg: Config

  constructor(
    app: express.Application,
    db: Database,
    jetstream: MyJetstream,
    cfg: Config,
  ) {
    this.app = app
    this.db = db
    this.jetstream = jetstream
    this.cfg = cfg
  }

  static create(cfg: Config) {
    const app = express()
    const db = createDb(cfg.sqliteLocation)
    const firehose = new MyJetstream(db, cfg.subscriptionEndpoint)
    return new FeedGenerator(app, db, firehose, cfg)
  }

  async start() {
    await migrateToLatest(this.db)
    this.jetstream.start()
    this.server = this.app.listen(this.cfg.port)
    await events.once(this.server, 'listening')
    return this.server
  }
}

export default FeedGenerator
