// Migration for the self-service admin features (side-editor, season switch,
// nøgledatoer). Safe to run repeatedly: every statement is either
// IF NOT EXISTS or tolerates "duplicate column name".
//
// Run with: node scripts/migrate-selvbetjening.mjs

import { createClient } from '@libsql/client'

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
if (!url || !authToken) {
  console.error('Mangler TURSO_DATABASE_URL eller TURSO_AUTH_TOKEN')
  process.exit(1)
}

const client = createClient({ url, authToken })

const nyeTabeller = [
  `CREATE TABLE IF NOT EXISTS app_settings (
     key TEXT PRIMARY KEY,
     value TEXT,
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE TABLE IF NOT EXISTS season_leagues (
     id TEXT PRIMARY KEY,
     season TEXT NOT NULL,
     liga_navn TEXT NOT NULL,
     league_type TEXT NOT NULL,
     sleeper_id TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     UNIQUE(season, liga_navn)
   )`,
  `CREATE TABLE IF NOT EXISTS side_indhold (
     slug TEXT PRIMARY KEY,
     title TEXT NOT NULL,
     body TEXT NOT NULL,
     i_menu INTEGER NOT NULL DEFAULT 0,
     sort_order INTEGER NOT NULL DEFAULT 100,
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE TABLE IF NOT EXISTS tekst_override (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL,
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE INDEX IF NOT EXISTS idx_season_leagues_season ON season_leagues(season)`,
]

// season_settings predates the nøgledatoer, so the columns are added in place.
const nyeKolonner = [
  `ALTER TABLE season_settings ADD COLUMN draft_start TEXT`,
  `ALTER TABLE season_settings ADD COLUMN fordeling_dato TEXT`,
  `ALTER TABLE season_settings ADD COLUMN saeson_start TEXT`,
]

for (const stmt of nyeTabeller) {
  await client.execute(stmt)
  console.log(`  ok: ${stmt.split('\n')[0].trim().slice(0, 70)}`)
}

for (const stmt of nyeKolonner) {
  try {
    await client.execute(stmt)
    console.log(`  ok: ${stmt}`)
  } catch (err) {
    if (/duplicate column name/i.test(err.message)) {
      console.log(`  findes allerede: ${stmt}`)
    } else {
      console.error(`  FEJLEDE: ${stmt}\n  ${err.message}`)
      process.exit(1)
    }
  }
}

console.log('\nFærdig.')
