// Admin-only: read and update the current season's signup settings
// (deadline + invite code). The invite code bypasses the deadline for late entrants.

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { auth } from '@/auth'
import { CURRENT_SEASON } from '@/lib/leagues'
import { getSeasonSettings, upsertSeasonSettings } from '@/lib/seasonSettings'

export async function GET() {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }
  const settings = await getSeasonSettings(CURRENT_SEASON)
  return NextResponse.json({
    season: CURRENT_SEASON,
    signupDeadline: settings?.signupDeadline ?? null,
    inviteCode: settings?.inviteCode ?? null,
  })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  const fields: { signupDeadline?: string | null; inviteCode?: string } = {}

  // Deadline: an ISO string sets it, null clears it (reopens signups),
  // undefined leaves it unchanged.
  if ('signupDeadline' in body) {
    const v = body.signupDeadline
    if (v === null) {
      fields.signupDeadline = null
    } else if (typeof v === 'string') {
      const d = new Date(v)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Ugyldig dato' }, { status: 400 })
      }
      fields.signupDeadline = d.toISOString()
    }
  }

  // Generate a fresh invite code on request (invalidates any old link).
  if (body.regenerateInvite === true) {
    fields.inviteCode = randomBytes(6).toString('hex')
  }

  await upsertSeasonSettings(CURRENT_SEASON, fields)

  const settings = await getSeasonSettings(CURRENT_SEASON)
  return NextResponse.json({
    season: CURRENT_SEASON,
    signupDeadline: settings?.signupDeadline ?? null,
    inviteCode: settings?.inviteCode ?? null,
  })
}
