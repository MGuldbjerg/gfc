// Reconciles one Sleeper league's membership into league_assignments.
//
// Use when a league was changed in Sleeper outside the site — a league created
// after the fordeling, or people moved by hand. Sleeper is the truth; this
// script makes the database agree with it for that one league.
//
// It never sends mail, and it only ever adds. Removing someone stays a manual
// decision in /admin/fordel.
//
// Dry run (default — prints what it would do, changes nothing):
//   node scripts/synk-liga-fra-sleeper.mjs 2026 BB6 1390729818009530368
// Commit:
//   node scripts/synk-liga-fra-sleeper.mjs 2026 BB6 1390729818009530368 --commit

import { createClient } from '@libsql/client'
import { randomUUID } from 'node:crypto'

const [, , season, ligaNavn, sleeperId, ...flag] = process.argv
const commit = flag.includes('--commit')

if (!season || !ligaNavn || !sleeperId) {
  console.error('Brug: node scripts/synk-liga-fra-sleeper.mjs <sæson> <ligaNavn> <sleeperId> [--commit]')
  process.exit(1)
}

const type =
  ligaNavn.startsWith('BB') ? 'bestball' :
  ligaNavn.startsWith('C') ? 'chopped' :
  ligaNavn.startsWith('M') ? 'managed' : null
if (!type) {
  console.error(`Kan ikke udlede rækken af "${ligaNavn}" — brug BB1, M2, C1 osv.`)
  process.exit(1)
}

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
if (!url || !authToken) {
  console.error('Mangler TURSO_DATABASE_URL eller TURSO_AUTH_TOKEN')
  process.exit(1)
}
const db = createClient({ url, authToken })

const hent = async u => {
  const r = await fetch(u)
  return r.ok ? r.json() : null
}

const [rosters, users] = await Promise.all([
  hent(`https://api.sleeper.app/v1/league/${sleeperId}/rosters`),
  hent(`https://api.sleeper.app/v1/league/${sleeperId}/users`),
])
if (!rosters || !users) {
  console.error('Kunne ikke hente ligaen fra Sleeper — tjek ID\'et.')
  process.exit(1)
}

const brugerePrId = Object.fromEntries(users.map(u => [u.user_id, u]))

const profiler = await db.execute('SELECT id, username, display_name, sleeper_user_id FROM profiles')
const prSleeperId = new Map(
  profiler.rows.filter(r => r.sleeper_user_id).map(r => [String(r.sleeper_user_id), r])
)
const prBrugernavn = new Map(profiler.rows.map(r => [String(r.username).toLowerCase(), r]))

const eksisterende = await db.execute({
  sql: 'SELECT profile_id FROM league_assignments WHERE season = ? AND liga_navn = ?',
  args: [season, ligaNavn],
})
const alleredeI = new Set(eksisterende.rows.map(r => String(r.profile_id)))

const tilføjes = []
const uændret = []
const ukendte = []

for (const r of rosters) {
  const ejerId = r.owner_id
  if (!ejerId) continue
  const u = brugerePrId[ejerId]
  const visningsnavn = u?.display_name || u?.username || ejerId

  const profil =
    prSleeperId.get(String(ejerId)) ??
    prBrugernavn.get(String(u?.username ?? '').toLowerCase()) ??
    prBrugernavn.get(String(u?.display_name ?? '').toLowerCase())

  if (!profil) { ukendte.push(visningsnavn); continue }
  if (alleredeI.has(String(profil.id))) { uændret.push(visningsnavn); continue }
  tilføjes.push({ profil, visningsnavn })
}

console.log(`\n${ligaNavn} (${season}) — ${rosters.length} hold i Sleeper\n`)
console.log(`  allerede i databasen : ${uændret.length}`)
console.log(`  tilføjes             : ${tilføjes.length}`)
console.log(`  uden GFC-profil      : ${ukendte.length}`)

if (tilføjes.length) {
  console.log('\nTilføjes:')
  for (const t of tilføjes) console.log(`  + ${t.visningsnavn}  (${t.profil.display_name})`)
}
if (ukendte.length) {
  console.log('\nUden GFC-profil — de tælles med på leaderboardet (det kommer fra Sleeper),')
  console.log('men de har ingen profil på sitet. Opret dem i /admin → Tilmeldinger, hvis de skal have en:')
  for (const n of ukendte) console.log(`  ? ${n}`)
}

if (!commit) {
  console.log('\nTørkørsel — intet er ændret. Kør igen med --commit for at gemme.')
  process.exit(0)
}

for (const { profil, visningsnavn } of tilføjes) {
  // A person placed straight into a league in Sleeper may never have completed a
  // registration — create one so they show up in Tilmeldinger and on /min-side.
  let reg = await db.execute({
    sql: 'SELECT id FROM registrations WHERE profile_id = ? AND season = ?',
    args: [profil.id, season],
  })
  let regId = reg.rows[0]?.id
  if (!regId) {
    regId = randomUUID()
    await db.execute({
      sql: `INSERT INTO registrations (id, profile_id, season, preferred_types, status)
            VALUES (?, ?, ?, ?, 'assigned')`,
      args: [regId, profil.id, season, JSON.stringify([type])],
    })
    console.log(`  tilmelding oprettet for ${visningsnavn}`)
  }

  await db.execute({
    sql: `INSERT INTO league_assignments
            (id, registration_id, profile_id, season, liga_navn, league_type, sleeper_league_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(registration_id, liga_navn) DO NOTHING`,
    args: [randomUUID(), regId, profil.id, season, ligaNavn, type, sleeperId],
  })

  await db.execute({
    sql: `UPDATE registrations
             SET assigned_league_name = ?, assigned_league_id = ?, status = 'assigned'
           WHERE id = ?`,
    args: [ligaNavn, sleeperId, regId],
  })
  console.log(`  ✓ ${visningsnavn} → ${ligaNavn}`)
}

console.log('\nFærdig.')
