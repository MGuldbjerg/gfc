// Creates or updates a profile in Turso. Does NOT create a season registration —
// that's a separate action at /api/saeson/tilmeld. Auth via Auth.js.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { execute, queryOne } from '@/lib/turso'
import { upsertKontakt } from '@/lib/brevo'
import { getUserByUsername } from '@/lib/sleeper'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
  }

  const { displayName, sleeperUsername, visSleeper, visBadges, nyhedsbrev } = await req.json()

  if (!displayName || !sleeperUsername) {
    return NextResponse.json({ error: 'Manglende felter' }, { status: 400 })
  }

  const sleeperUser = await getUserByUsername(sleeperUsername)
  if (!sleeperUser) {
    return NextResponse.json(
      { error: `Sleeper-brugernavnet "${sleeperUsername}" blev ikke fundet. Tjek stavning.` },
      { status: 400 }
    )
  }

  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM profiles WHERE username = ? AND id <> ?',
    [sleeperUsername, session.user.id]
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
        session.user.id,
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

  // Best-effort Brevo sync — only adds to the mailing list if nyhedsbrev is checked.
  upsertKontakt({
    email: session.user.email,
    displayName,
    sleeperUsername,
    sæson: 'profil',
    nyhedsbrev: !!nyhedsbrev,
  }).catch(err => console.error('Brevo-fejl:', err))

  return NextResponse.json({ ok: true })
}
