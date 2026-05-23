import 'dotenv/config'
import { join } from 'path'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cron from 'node-cron'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { authMiddleware } from './middleware/auth'
import vinylsRouter from './routes/vinyls'
import collectionRouter from './routes/collection'
import discogsRouter from './routes/discogs'
import spotifyRouter from './routes/spotify'
import aiRouter from './routes/ai'
import { refreshStalePrices } from './services/discogs'
import { setupSwagger } from './swagger'
import { addClient, removeClient } from './sse/broadcaster'
import { getSpotifyToken } from './routes/spotify'
import { logger } from './logger'
import { requestIdMiddleware } from './middleware/request-id'

const log = logger.child({ module: 'server' })

// Validate required env vars before starting
const AUTH_ENABLED = process.env.AUTH_ENABLED !== 'false'
if (AUTH_ENABLED) {
  const required = ['OIDC_JWKS_URL', 'OIDC_ISSUER'] as const
  for (const key of required) {
    if (!process.env[key]) {
      log.error(`Missing required env var: ${key}`)
      process.exit(1)
    }
  }
}

const app = express()
const PORT = parseInt(process.env.PORT ?? '3001')

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) ?? []
app.set('trust proxy', 1)
app.use(helmet())
app.use(compression({ threshold: 1024 }))
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : false,
  credentials: true,
}))

app.use(express.json({ limit: '5mb' }))
app.use(requestIdMiddleware)

// Health check (no auth)
app.get('/', (_req, res) => res.json({ service: 'vinyl-vault-api', status: 'ok' }))
app.get('/health', (_req, res) => res.json({ ok: true }))

// Swagger docs — protected behind auth in production
if (process.env.NODE_ENV !== 'production') {
  setupSwagger(app)
}

// Auth-protected API routes
app.use('/api', authMiddleware)
if (process.env.NODE_ENV === 'production') {
  setupSwagger(app)
}
app.use('/api/vinyls', vinylsRouter)
app.use('/api/collection', collectionRouter)
app.use('/api/discogs', discogsRouter)
app.use('/api/spotify', spotifyRouter)
app.use('/api', aiRouter)

// Server-Sent Events endpoint for real-time collection sync
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const client = { res }
  addClient(client)

  // Keep-alive heartbeat every 30s to prevent proxy timeouts
  const heartbeat = setInterval(() => {
    try { res.write(':ping\n\n') } catch { /* client gone */ }
  }, 30_000)

  req.on('close', () => {
    clearInterval(heartbeat)
    removeClient(client)
  })
})

// Daily price refresh cron (3am) — only runs when DISCOGS_TOKEN is set
cron.schedule('0 3 * * *', () => {
  if (!process.env.DISCOGS_TOKEN) return
  log.info('starting nightly Discogs price refresh')
  refreshStalePrices().catch((err) => log.error({ err }, 'cron price refresh error'))
})

async function main() {
  if (!process.env.DATABASE_URL) {
    log.fatal('DATABASE_URL environment variable is required')
    process.exit(1)
  }

  // Validate encryption key at startup so it fails early, not lazily on first use
  if (process.env.ENCRYPTION_KEY) {
    if (process.env.ENCRYPTION_KEY.length !== 64) {
      log.fatal('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
      process.exit(1)
    }
  }

  const migrationClient = postgres(process.env.DATABASE_URL)
  try {
    log.info('running migrations')
    await migrate(drizzle(migrationClient), {
      migrationsFolder: join(__dirname, '../drizzle'),
    })
    log.info('migrations done')
  } catch (err) {
    log.error({ err }, 'migration failed')
    process.exit(1)
  } finally {
    await migrationClient.end()
  }

  app.listen(PORT, '0.0.0.0', () => {
    log.info({ port: PORT }, 'listening')
  })

  // Warm up Spotify token cache so first search isn't delayed
  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    getSpotifyToken().catch(() => {})
  }
}

main()
