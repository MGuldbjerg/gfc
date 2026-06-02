// One-off sync: aligns the Brevo mailing list with the nyhedsbrev flag in Turso.
// Run with: node scripts/sync-brevo-nyhedsbrev.mjs
//
// Requires env vars: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, BREVO_API_KEY, BREVO_LIST_ID

import { createClient } from '@libsql/client'

const TURSO_URL   = process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN
const BREVO_KEY   = process.env.BREVO_API_KEY
const LIST_ID     = Number(process.env.BREVO_LIST_ID ?? '2')
const BREVO_BASE  = 'https://api.brevo.com/v3'

if (!TURSO_URL || !TURSO_TOKEN || !BREVO_KEY) {
  console.error('Missing env vars: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, BREVO_API_KEY')
  process.exit(1)
}

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

async function brevo(endpoint, method, body) {
  const res = await fetch(`${BREVO_BASE}${endpoint}`, {
    method,
    headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok && res.status !== 204) {
    const text = await res.text()
    throw new Error(`Brevo ${method} ${endpoint} → ${res.status}: ${text}`)
  }
  return res.status === 204 ? null : res.json()
}

// Fetch all contacts currently on the Brevo list (paginated).
async function fetchBrevoListEmails() {
  const emails = new Set()
  let offset = 0
  const limit = 500
  while (true) {
    const data = await brevo(`/contacts/lists/${LIST_ID}/contacts?limit=${limit}&offset=${offset}`, 'GET')
    for (const c of data.contacts ?? []) {
      if (c.email) emails.add(c.email.toLowerCase())
    }
    if ((data.contacts?.length ?? 0) < limit) break
    offset += limit
  }
  return emails
}

// Fetch all profiles with their auth email from Turso.
async function fetchTursoProfiles() {
  const result = await db.execute({
    sql: `SELECT p.nyhedsbrev, u.email
          FROM profiles p
          JOIN authjs_user u ON u.id = p.id
          WHERE u.email IS NOT NULL`,
    args: [],
  })
  return result.rows.map(r => ({
    email: String(r.email).toLowerCase(),
    nyhedsbrev: Number(r.nyhedsbrev) === 1,
  }))
}

async function main() {
  console.log('Henter data fra Turso og Brevo...')

  const [profiles, brevoEmails] = await Promise.all([
    fetchTursoProfiles(),
    fetchBrevoListEmails(),
  ])

  console.log(`Turso: ${profiles.length} profiler — Brevo liste: ${brevoEmails.size} kontakter`)

  const shouldBeOn  = new Set(profiles.filter(p => p.nyhedsbrev).map(p => p.email))
  const shouldBeOff = new Set(profiles.filter(p => !p.nyhedsbrev).map(p => p.email))

  const toAdd    = [...shouldBeOn].filter(e => !brevoEmails.has(e))
  const toRemove = [...shouldBeOff].filter(e => brevoEmails.has(e))

  console.log(`Tilføjer: ${toAdd.length}  |  Fjerner: ${toRemove.length}`)

  // Add subscribers (Brevo upserts, so safe to re-add existing).
  for (const email of toAdd) {
    await brevo('/contacts', 'POST', { email, listIds: [LIST_ID], updateEnabled: true })
    console.log(`  + ${email}`)
  }

  // Remove non-subscribers who ended up on the list.
  if (toRemove.length > 0) {
    await brevo(`/contacts/lists/${LIST_ID}/contacts/remove`, 'POST', { emails: toRemove })
    for (const email of toRemove) console.log(`  - ${email}`)
  }

  console.log('Sync færdig.')
}

main().catch(err => { console.error(err); process.exit(1) })
