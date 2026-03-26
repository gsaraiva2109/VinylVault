import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import { authMiddleware } from './middleware/auth'
import vinylsRouter from './routes/vinyls'
import collectionRouter from './routes/collection'
import discogsRouter from './routes/discogs'
import { refreshStalePrices } from './services/discogs'
import { setupSwagger } from './swagger'
import { addClient, removeClient } from './sse/broadcaster'

const app = express()
setupSwagger(app)
const PORT = parseInt(process.env.PORT ?? '3001')

app.use(cors())
app.use(express.json())

// Health check (no auth)
app.get('/', (_req, res) => res.json({ service: 'vinyl-catalog-api', status: 'ok' }))
app.get('/health', (_req, res) => res.json({ ok: true }))

// Auth-protected API routes
app.use('/api', authMiddleware)
app.use('/api/vinyls', vinylsRouter)
app.use('/api/collection', collectionRouter)
app.use('/api/discogs', discogsRouter)

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
  console.log('[cron] starting nightly Discogs price refresh…')
  refreshStalePrices().catch((err) => console.error('[cron] price refresh error:', err))
})

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})
