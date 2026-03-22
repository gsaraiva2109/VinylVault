import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { join } from 'path'

async function main() {
  const client = postgres(process.env.DATABASE_URL!)
  const db = drizzle(client)
  await migrate(db, { migrationsFolder: join(__dirname, '../../drizzle') })
  console.log('[migrate] done')
  await client.end()
}

main().catch((err) => {
  console.error('[migrate] failed:', err)
  process.exit(1)
})
