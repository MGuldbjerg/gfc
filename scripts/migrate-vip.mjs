// Adds er_amerikansk_vip to profiles and undgaa_amerikansk_vip to registrations.
// Run with: node scripts/migrate-vip.mjs
import { createClient } from '@libsql/client'

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
  process.exit(1)
}

const client = createClient({ url, authToken })

const migrations = [
  `ALTER TABLE profiles ADD COLUMN er_amerikansk_vip INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE registrations ADD COLUMN undgaa_amerikansk_vip INTEGER NOT NULL DEFAULT 0`,
]

for (const sql of migrations) {
  try {
    await client.execute(sql)
    console.log(`ok: ${sql}`)
  } catch (err) {
    if (err.message?.includes('duplicate column')) {
      console.log(`skip (already exists): ${sql}`)
    } else {
      console.error(`FAILED: ${sql}\n  ${err.message}`)
      process.exit(1)
    }
  }
}

console.log('\nMigration done.')
