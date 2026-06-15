// Creates the season_settings table (if missing) and seeds the current season's
// row with the signup deadline + a random invite code. Idempotent: an existing
// row is left untouched so it never clobbers deadlines/codes set from the admin.
// Run with: node scripts/seed-season-settings.mjs
import { createClient } from '@libsql/client'
import { randomBytes } from 'node:crypto'

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
  process.exit(1)
}

const SEASON = '2026'
const DEADLINE = '2026-07-03T18:00:00+02:00' // Fri 3 July 18:00 Europe/Copenhagen (CEST)
const inviteCode = randomBytes(6).toString('hex')

const client = createClient({ url, authToken })

await client.execute(`
  CREATE TABLE IF NOT EXISTS season_settings (
    season          TEXT PRIMARY KEY,
    signup_deadline TEXT,
    invite_code     TEXT,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

const res = await client.execute({
  sql: `INSERT INTO season_settings (season, signup_deadline, invite_code)
        VALUES (?, ?, ?)
        ON CONFLICT(season) DO NOTHING`,
  args: [SEASON, DEADLINE, inviteCode],
})

if (res.rowsAffected > 0) {
  console.log(`Seeded season_settings for ${SEASON}:`)
  console.log(`  deadline:    ${DEADLINE}`)
  console.log(`  invite code: ${inviteCode}`)
  console.log(`  invite link: /saeson/tilmeld?invite=${inviteCode}`)
} else {
  const row = await client.execute({
    sql: 'SELECT signup_deadline, invite_code FROM season_settings WHERE season = ?',
    args: [SEASON],
  })
  console.log(`season_settings for ${SEASON} already exists — left untouched:`)
  console.log(`  deadline:    ${row.rows[0]?.signup_deadline}`)
  console.log(`  invite code: ${row.rows[0]?.invite_code}`)
}

console.log('\nDone.')
