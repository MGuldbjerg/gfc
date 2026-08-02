// Creates or updates the current-season registration for the logged-in user.
// DELETE removes the registration entirely (cancel signup).

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@/auth'
import { execute, queryOne } from '@/lib/turso'
import { sendVelkomstMail } from '@/lib/brevo'
import { hentAktuelSæson } from '@/lib/seasonConfig'
import { evaluateSignupGate } from '@/lib/seasonSettings'

export async function POST(req: NextRequest) {
  const sæson = await hentAktuelSæson()
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
  }

  const body = await req.json()
  const { valgteRækker, undgaaAmerikanskVip = false, invite = null } = body
  if (!Array.isArray(valgteRækker) || valgteRækker.length === 0) {
    return NextResponse.json({ error: 'Vælg mindst én række' }, { status: 400 })
  }

  // Signup deadline gate. Existing registrants can still update their picks
  // after the deadline; only brand-new registrations are blocked.
  const existingReg = await queryOne<{ id: string }>(
    'SELECT id FROM registrations WHERE profile_id = ? AND season = ?',
    [session.user.id, sæson]
  )
  if (!existingReg) {
    const gate = await evaluateSignupGate(sæson, typeof invite === 'string' ? invite : null)
    if (!gate.allowed) {
      return NextResponse.json(
        { error: 'Tilmeldingen er lukket. Kontakt Mikkel hvis du gerne vil med.' },
        { status: 403 }
      )
    }
  }

  const profile = await queryOne<{ display_name: string }>(
    'SELECT display_name FROM profiles WHERE id = ?',
    [session.user.id]
  )
  if (!profile) {
    return NextResponse.json({ error: 'Du skal oprette en profil først.' }, { status: 400 })
  }

  await execute(
    `INSERT INTO registrations (id, profile_id, season, preferred_types, status, undgaa_amerikansk_vip)
     VALUES (?, ?, ?, ?, 'registered', ?)
     ON CONFLICT(profile_id, season) DO UPDATE SET
       preferred_types = excluded.preferred_types,
       status = 'registered',
       undgaa_amerikansk_vip = excluded.undgaa_amerikansk_vip`,
    [randomUUID(), session.user.id, sæson, JSON.stringify(valgteRækker), undgaaAmerikanskVip ? 1 : 0]
  )

  // Only send welcome mail on first registration, not on updates.
  if (!existingReg) {
    sendVelkomstMail({
      email: session.user.email,
      displayName: profile.display_name,
      sæson: sæson,
    }).catch(err => console.error('Brevo-fejl:', err))
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const sæson = await hentAktuelSæson()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
  }

  await execute(
    'DELETE FROM registrations WHERE profile_id = ? AND season = ?',
    [session.user.id, sæson]
  )

  return NextResponse.json({ ok: true })
}
