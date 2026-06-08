// Apply Turso schema. Run with: node scripts/apply-schema.mjs
import { createClient } from '@libsql/client'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
  process.exit(1)
}

const client = createClient({ url, authToken })

const sql = readFileSync(join(__dirname, '..', 'db', 'schema.sql'), 'utf8')

const stripped = sql
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n')

const statements = stripped
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0)

console.log(`Applying ${statements.length} statements to ${url} ...`)
for (const stmt of statements) {
  try {
    await client.execute(stmt)
    const first = stmt.split('\n')[0].slice(0, 80)
    console.log(`  ok: ${first}`)
  } catch (err) {
    console.error(`  FAILED: ${stmt.slice(0, 120)}`)
    console.error(`  ${err.message}`)
    process.exit(1)
  }
}

const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
console.log('\nTables in DB:')
for (const row of tables.rows) console.log(`  - ${row.name}`)

console.log('\nDone.')
