// GET — fetch the current user's privacy preferences.
// PATCH — update them and sync the newsletter subscription with Brevo.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { execute, queryOne } from '@/lib/turso'
import { tilføjTilNyhedsbrevsliste, fjernFraNyhedsbrevsliste } from '@/lib/brevo'

type PræferenceRow = {
  vis_sleeper_username: number
  vis_badges: number
  nyhedsbrev: number
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
  }

  const row = await queryOne<PræferenceRow>(
    'SELECT vis_sleeper_username, vis_badges, nyhedsbrev FROM profiles WHERE id = ?',
    [session.user.id]
  )

  if (!row) {
    return NextResponse.json({ error: 'Profil ikke fundet' }, { status: 404 })
  }

  return NextResponse.json({
    visSleeper: row.vis_sleeper_username === 1,
    visBadges: row.vis_badges === 1,
    nyhedsbrev: row.nyhedsbrev === 1,
  })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
  }

  const { visSleeper, visBadges, nyhedsbrev } = await req.json()

  const nuværende = await queryOne<{ nyhedsbrev: number }>(
    'SELECT nyhedsbrev FROM profiles WHERE id = ?',
    [session.user.id]
  )

  try {
    await execute(
      `UPDATE profiles
         SET vis_sleeper_username = ?,
             vis_badges = ?,
             nyhedsbrev = ?,
             updated_at = datetime('now')
       WHERE id = ?`,
      [
        visSleeper === false ? 0 : 1,
        visBadges === false ? 0 : 1,
        nyhedsbrev ? 1 : 0,
        session.user.id,
      ]
    )
  } catch (err) {
    console.error('Update preferences failed:', err)
    return NextResponse.json({ error: 'Kunne ikke gemme indstillinger' }, { status: 500 })
  }

  const previous = nuværende?.nyhedsbrev === 1
  if (session.user.email && previous !== !!nyhedsbrev) {
    const email = session.user.email
    const action = nyhedsbrev ? tilføjTilNyhedsbrevsliste({ email }) : fjernFraNyhedsbrevsliste({ email })
    action.catch(err => console.error('Brevo-fejl:', err))
  }

  return NextResponse.json({ ok: true })
}
