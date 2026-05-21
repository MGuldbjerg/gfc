// Creates or updates the current-season registration for the logged-in user.
// DELETE removes the registration entirely (cancel signup).

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@/auth'
import { execute, queryOne } from '@/lib/turso'
import { sendVelkomstMail } from '@/lib/brevo'
import { CURRENT_SEASON } from '@/lib/leagues'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
  }

  const { valgteRækker } = await req.json()
  if (!Array.isArray(valgteRækker) || valgteRækker.length === 0) {
    return NextResponse.json({ error: 'Vælg mindst én række' }, { status: 400 })
  }

  const profile = await queryOne<{ display_name: string }>(
    'SELECT display_name FROM profiles WHERE id = ?',
    [session.user.id]
  )
  if (!profile) {
    return NextResponse.json({ error: 'Du skal oprette en profil først.' }, { status: 400 })
  }

  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM registrations WHERE profile_id = ? AND season = ?',
    [session.user.id, CURRENT_SEASON]
  )

  await execute(
    `INSERT INTO registrations (id, profile_id, season, preferred_types, status)
     VALUES (?, ?, ?, ?, 'registered')
     ON CONFLICT(profile_id, season) DO UPDATE SET
       preferred_types = excluded.preferred_types,
       status = 'registered'`,
    [randomUUID(), session.user.id, CURRENT_SEASON, JSON.stringify(valgteRækker)]
  )

  // Only send welcome mail on first registration, not on updates.
  if (!existing) {
    sendVelkomstMail({
      email: session.user.email,
      displayName: profile.display_name,
      sæson: CURRENT_SEASON,
    }).catch(err => console.error('Brevo-fejl:', err))
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
  }

  await execute(
    'DELETE FROM registrations WHERE profile_id = ? AND season = ?',
    [session.user.id, CURRENT_SEASON]
  )

  return NextResponse.json({ ok: true })
}
