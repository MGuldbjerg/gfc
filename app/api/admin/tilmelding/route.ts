// Manually adds a player for the current season (admin only).
// Creates a profile plus a season registration, so admin-added VIPs/guests
// appear in the assignment flow like any signup.
//
// If an email is supplied the profile is tied to an Auth.js user with the same
// id (profiles.id === authjs_user.id), which is what makes magic-link login —
// and the league-assignment mails — work for the player. Without an email the
// profile stays freestanding and the player cannot log in.

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@/auth'
import { execute, queryOne } from '@/lib/turso'
import { getUserByUsername } from '@/lib/sleeper'
import { CURRENT_SEASON } from '@/lib/leagues'

const VALID_TYPES = ['bestball', 'managed', 'chopped'] as const
const VIP_TYPER = ['amerikansk', 'dansk', 'none'] as const

// Auth.js lowercases the identifier before looking up the user, so emails are
// stored lowercase to keep the login lookup exact.
const EMAIL_MØNSTER = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
  const sleeperUsername = typeof body.sleeperUsername === 'string' ? body.sleeperUsername.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const vip = VIP_TYPER.includes(body.vip) ? body.vip : 'none'
  const undgaaAmerikanskVip = Boolean(body.undgaaAmerikanskVip)
  const preferredTypes = Array.isArray(body.preferredTypes)
    ? body.preferredTypes.filter((t: unknown): t is string => VALID_TYPES.includes(t as never))
    : []

  if (!displayName) {
    return NextResponse.json({ error: 'Angiv et visningsnavn' }, { status: 400 })
  }
  if (!sleeperUsername) {
    return NextResponse.json({ error: 'Angiv et Sleeper-brugernavn' }, { status: 400 })
  }
  if (email && !EMAIL_MØNSTER.test(email)) {
    return NextResponse.json({ error: 'E-mailadressen ser ikke gyldig ud.' }, { status: 400 })
  }

  // Sleeper username is required and must exist (same rule as the edit flow).
  const sleeperUser = await getUserByUsername(sleeperUsername)
  if (!sleeperUser) {
    return NextResponse.json(
      { error: `Sleeper-brugernavnet "${sleeperUsername}" blev ikke fundet.` },
      { status: 400 }
    )
  }

  const taken = await queryOne<{ id: string }>(
    'SELECT id FROM profiles WHERE username = ?',
    [sleeperUsername]
  )
  if (taken) {
    return NextResponse.json(
      { error: 'Det Sleeper-brugernavn er allerede registreret.' },
      { status: 409 }
    )
  }

  // Resolve the profile id: an existing Auth.js user keeps its id, a new email
  // gets a fresh login account, and no email means a freestanding profile.
  let profileId: string = randomUUID()
  if (email) {
    const authUser = await queryOne<{ id: string }>(
      'SELECT id FROM authjs_user WHERE email = ?',
      [email]
    )
    if (authUser) {
      const harProfil = await queryOne<{ display_name: string }>(
        'SELECT display_name FROM profiles WHERE id = ?',
        [authUser.id]
      )
      if (harProfil) {
        return NextResponse.json(
          { error: `${email} har allerede en profil ("${harProfil.display_name}").` },
          { status: 409 }
        )
      }
      profileId = authUser.id
    } else {
      await execute(
        'INSERT INTO authjs_user (id, email, name) VALUES (?, ?, ?)',
        [profileId, email, displayName]
      )
    }
  }

  const registrationId = randomUUID()

  await execute(
    `INSERT INTO profiles (id, username, display_name, sleeper_user_id, er_amerikansk_vip, er_dansk_vip)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      profileId,
      sleeperUsername,
      displayName,
      sleeperUser.user_id,
      vip === 'amerikansk' ? 1 : 0,
      vip === 'dansk' ? 1 : 0,
    ]
  )

  await execute(
    `INSERT INTO registrations (id, profile_id, season, preferred_types, status, undgaa_amerikansk_vip)
     VALUES (?, ?, ?, ?, 'registered', ?)`,
    [registrationId, profileId, CURRENT_SEASON, JSON.stringify(preferredTypes), undgaaAmerikanskVip ? 1 : 0]
  )

  return NextResponse.json({ ok: true, profileId, registrationId })
}
