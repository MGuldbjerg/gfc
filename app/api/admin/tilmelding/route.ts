// Manually adds a player for the current season (admin only).
// Creates a freestanding profile (no login account) plus a season registration,
// so admin-added VIPs/guests appear in the assignment flow like any signup.

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@/auth'
import { execute, queryOne } from '@/lib/turso'
import { getUserByUsername } from '@/lib/sleeper'
import { CURRENT_SEASON } from '@/lib/leagues'

const VALID_TYPES = ['bestball', 'managed', 'chopped'] as const
const VIP_TYPER = ['amerikansk', 'dansk', 'none'] as const

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
  const sleeperUsername = typeof body.sleeperUsername === 'string' ? body.sleeperUsername.trim() : ''
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

  const profileId = randomUUID()
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
