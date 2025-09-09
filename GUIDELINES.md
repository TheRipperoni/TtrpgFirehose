# ttrpg-firehose – Development Guidelines

This document captures project-specific build, configuration, testing, and development notes to speed up work on this repository.

Audience: experienced Node/TypeScript developers.


## 1) Build and Configuration

- Runtime
    - Node.js >= 18 recommended (ESM support, node:test if you want it). The project uses ES Module semantics (tsconfig: module "nodenext", moduleResolution "node16").
    - SQLite write permissions required for the configured database file.
- Dependencies
    - Runtime deps: @skyware/jetstream, better-sqlite3, dotenv, express, kysely, multiformats, pino
    - Dev deps: typescript, jest (no ts-jest configured by default)
- Install
    - Install dependencies with: npm ci
- Running (dev)
    - Entry point: src/index.ts
    - Start script uses tsx to run TS without pre-compilation: npm start
- Building
    - npm run build runs tsc. Note: there is no outDir specified in tsconfig.json, so emit will be alongside source files. The normal flow is to use tsx in dev; consider configuring an outDir if you need build artifacts.

### Environment variables (src/index.ts, src/util/logger.ts)
- FEEDGEN_HOSTNAME: Hostname used to synthesize a did:web if FEEDGEN_SERVICE_DID is unset; default example.com
- FEEDGEN_SERVICE_DID: Explicit did for the service; default did:web:${FEEDGEN_HOSTNAME}
- FIREHOSE_SQLITE_LOCATION: Filesystem path to SQLite DB. Ensure the directory exists and is writable. Default /sqliteLocation/database
- FEEDGEN_SUBSCRIPTION_ENDPOINT: Jetstream/Firehose endpoint; default wss://bsky.network (see Jetstream note below)
- FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY: Milliseconds; default 3000
- LOG_LEVEL: pino log level (default info)
- LOG_DESTINATION: If set, logs go to this path plus a short randomized suffix and .log
- LOG_ENABLED: The current logger enables logging unconditionally (enabled=true); LOG_ENABLED is present but not enforced in code.

### Database
- src/db/index.ts uses better-sqlite3 and Kysely. createDb(location) receives FIREHOSE_SQLITE_LOCATION.
- Migrations live in src/db/migrations.ts. migrateToLatest() applies in-memory migration set on startup (called by FeedGenerator.start()).
- Tables created: post, sub_state, repo_like. Migration 002 adds Post.lang.

### Jetstream subscription (src/subscription.ts)
- Uses @skyware/jetstream to consume events for collections:
    - app.bsky.feed.post
    - app.bsky.feed.like
- onCreate handlers persist:
    - Certain post commands (accept/aceit, reject/rejeit, cancel; also one-letter variants) into post table, with reply threading info.
    - Likes on a specific subject (the labeler service DID hard-coded) into repo_like table.
- Important: The Jetstream constructor currently hardcodes endpoint: 'wss://jetstream2.us-west.bsky.network/subscribe' and ignores the endpoint passed to MyJetstream. If you need a different stream, update src/subscription.ts accordingly.

### Server skeleton state (src/server.ts)
- This file is WIP/partially implemented and likely will not compile/run as an HTTP server as-is:
    - The static create signature and FeedGenerator constructor args don’t match.
    - There is a stray app.use(server.xrpc/router) placeholder.
    - start() references this.cfg.port which is not in Config.
- src/index.ts calls FeedGenerator.create(...) and server.start(), so attempting to run the service without fixing server.ts/Config will likely fail. Plan to stabilize server.ts before deploying.


## 2) Testing

The repository includes Jest in devDependencies but is not configured for TypeScript tests out of the box (no ts-jest, no Babel transform). You have three straightforward options:

A) JavaScript tests with Jest (no extra setup)
- Works immediately after installing dev deps.
- Command: npm ci && npm test
- Place tests in:
    - tests/*.test.js
    - or __tests__/*.test.js
    - or any *.test.js file in the repo (Jest default discovery)
- Example test (JS):

  // tests/smoke.test.js
  describe('smoke', () => {
  test('basic arithmetic works', () => {
  expect(1 + 1).toBe(2)
  })
  })

B) TypeScript tests with Jest (requires ts-jest)
- Add: npm i -D ts-jest @types/jest
- Initialize: npx ts-jest config:init (creates jest.config.js)
- Ensure tsconfig for tests (tsconfig.tests.json) is referenced by ts-jest if you want custom settings.
- Then write tests as *.test.ts.

C) Zero-dependency smoke checks (Node built-in)
- For quick verification without installing Jest, you can use a tiny Node script with node:assert or the node:test module (Node 18+):

  // scripts/smoke-check.mjs
  import assert from 'node:assert'
  assert.strictEqual(1 + 1, 2)

  # Run:
  node scripts/smoke-check.mjs

We validated approach (C) during documentation: a script like the above executed successfully in this environment. Approach (A) will require installing Jest via npm ci before running npm test.

### Adding tests that touch the database
- Prefer using a temp SQLite file location for isolation (e.g., using tmpdir) and point FIREHOSE_SQLITE_LOCATION to it.
- migrateToLatest(db) applies the current migration set from src/db/migrations.ts. If your tests rely on new schema, add a new migration entry and re-run.
- Use better-sqlite3’s synchronous nature to keep test timing predictable.

### Adding tests that touch Jetstream
- Keep @skyware/jetstream usage behind an interface or inject a mock to avoid network dependencies in tests.
- For integration, consider running a local WebSocket test server or using recorded frames.


## 3) Additional Development Notes

- TypeScript configuration
    - strict and strictNullChecks are enabled. Keep nullability explicit (e.g., string | null fields in Post schema).
    - ESM (nodenext) is in use; prefer import/export over require/module.exports.
- Logging (pino)
    - LOG_DESTINATION enables file logging; code currently appends a short randomized suffix to the destination path, producing unique log files per process.
    - For deterministic log filenames in ops, consider adjusting src/util/logger.ts.
- Migrations
    - Add new migrations by extending the migrations object in src/db/migrations.ts with a new monotonically increasing key (e.g., '003'). Keep up/down symmetrical. migrateToLatest() applies all pending migrations.
- Database path
    - The default FIREHOSE_SQLITE_LOCATION is /sqliteLocation/database which is typically not present. Provide a writable path, e.g., ./data/firehose.db and ensure the directory exists.
- Jetstream endpoint
    - Be aware of the hardcoded endpoint in src/subscription.ts. If you expect FEEDGEN_SUBSCRIPTION_ENDPOINT to control the stream, update the constructor to use the provided endpoint.
- Stabilization tasks (recommended next)
    - Fix FeedGenerator API mismatches in src/server.ts, define a coherent Config (port, etc.), and remove placeholders like server.xrpc/router.
    - Decide whether the service should expose HTTP endpoints (express app is initialized but unused) and document the routes.
    - Add an outDir to tsconfig and possibly separate tsconfig for runtime vs. tests.


## 4) Quickstart (verified minimal flow)
- Without installing dev deps, you can verify the environment with the zero-dependency smoke check in Section 2C (we executed such a script successfully during this write-up).
- For full Jest testing, run:
    - npm ci
    - npm test
- For running the service (after stabilizing server.ts/Config):
    - Create a .env with the required vars or export them in your shell.
    - Ensure FIREHOSE_SQLITE_LOCATION points to a writable file path.
    - npm start

