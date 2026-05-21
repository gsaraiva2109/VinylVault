import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { join } from 'path'
import { logger } from '../logger'

const log = logger.child({ module: 'migrate' })

async function main() {
  if (!process.env.DATABASE_URL) {
    log.fatal('DATABASE_URL environment variable is required')
    process.exit(1)
  }
  const client = postgres(process.env.DATABASE_URL)
  const db = drizzle(client)
  await migrate(db, { migrationsFolder: join(__dirname, '../../drizzle') })
  log.info('migrations done')
  await client.end()
}

main().catch((err) => {
  log.error({ err }, 'migration failed')
  process.exit(1)
})
