// Creates a profile + registration in Turso and syncs the contact to Brevo.
// Auth still lives in Supabase — only data storage moved to Turso.

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase-server'
import { execute, queryOne } from '@/lib/turso'
import { upsertKontakt, sendVelkomstMail } from '@/lib/brevo'
import { getUserByUsername } from '@/lib/sleeper'

export async function POST(req: NextRequest) {
  const { email, displayName, sleeperUsername, valgteRækker, sæson, visSleeper, visBadges, nyhedsbrev } = await req.json()

  if (!email || !displayName || !sleeperUsername || !sæson) {
    return NextResponse.json({ error: 'Manglende felter' }, { status: 400 })
  }

  const sleeperUser = await getUserByUsername(sleeperUsername)
  if (!sleeperUser) {
    return NextResponse.json(
      { error: `Sleeper-brugernavnet "${sleeperUsername}" blev ikke fundet. Tjek stavning.` },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
  }

  // Reject if another user already owns this Sleeper username.
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM profiles WHERE username = ? AND id <> ?',
    [sleeperUsername, user.id]
  )
  if (existing) {
    return NextResponse.json(
      { error: 'Det Sleeper-brugernavn er allerede registreret.' },
      { status: 409 }
    )
  }

  try {
    await execute(
      `INSERT INTO profiles (id, username, display_name, sleeper_user_id, vis_sleeper_username, vis_badges, nyhedsbrev)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         username = excluded.username,
         display_name = excluded.display_name,
         sleeper_user_id = excluded.sleeper_user_id,
         vis_sleeper_username = excluded.vis_sleeper_username,
         vis_badges = excluded.vis_badges,
         nyhedsbrev = excluded.nyhedsbrev,
         updated_at = datetime('now')`,
      [
        user.id,
        sleeperUsername,
        displayName,
        sleeperUser.user_id,
        visSleeper === false ? 0 : 1,
        visBadges === false ? 0 : 1,
        nyhedsbrev ? 1 : 0,
      ]
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('profiles.username')) {
      return NextResponse.json(
        { error: 'Det Sleeper-brugernavn er allerede registreret.' },
        { status: 409 }
      )
    }
    console.error('Profile insert failed:', err)
    return NextResponse.json({ error: 'Kunne ikke oprette profil' }, { status: 500 })
  }

  await execute(
    `INSERT INTO registrations (id, profile_id, season, preferred_types, status)
     VALUES (?, ?, ?, ?, 'registered')
     ON CONFLICT(profile_id, season) DO UPDATE SET
       preferred_types = excluded.preferred_types,
       status = 'registered'`,
    [randomUUID(), user.id, sæson, JSON.stringify(valgteRækker ?? [])]
  )

  // Best-effort Brevo sync — never blocks registration.
  Promise.all([
    upsertKontakt({ email, displayName, sleeperUsername, sæson }),
    sendVelkomstMail({ email, displayName, sæson }),
  ]).catch(err => console.error('Brevo-fejl:', err))

  return NextResponse.json({ ok: true })
}
