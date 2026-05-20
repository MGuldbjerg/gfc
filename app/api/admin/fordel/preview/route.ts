// Computes a league-assignment proposal without persisting — used for preview.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query } from '@/lib/turso'
import { beregnFordeling, type Deltager, type LeagueType, type Pin } from '@/lib/fordeling'
import { CURRENT_SEASON } from '@/lib/leagues'

const VALID_TYPES: LeagueType[] = ['bestball', 'managed', 'chopped']

type TilmeldingRow = {
  registration_id: string
  preferred_types: string
  profile_id: string
  display_name: string
  username: string
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const { ligaStørrelse = 12, pins = [] } = await req.json().catch(() => ({}))

  const tilmeldinger = await query<TilmeldingRow>(
    `SELECT r.id AS registration_id,
            r.preferred_types,
            p.id AS profile_id,
            p.display_name,
            p.username
       FROM registrations r
       JOIN profiles p ON p.id = r.profile_id
      WHERE r.season = ? AND r.status = 'registered'`,
    [CURRENT_SEASON]
  )

  if (tilmeldinger.length === 0) {
    return NextResponse.json({ ligaer: [], ikkeFordelbare: [] })
  }

  const deltagere: Deltager[] = tilmeldinger.map(t => ({
    profileId: t.profile_id,
    displayName: t.display_name,
    sleeperUsername: t.username,
    registrationId: t.registration_id,
    preferredTypes: parsePreferredTypes(t.preferred_types),
  }))

  const validPins: Pin[] = Array.isArray(pins)
    ? pins.filter((p: unknown): p is Pin =>
        typeof p === 'object' && p !== null &&
        typeof (p as Pin).profileId === 'string' &&
        typeof (p as Pin).ligaNavn === 'string'
      )
    : []

  const resultat = beregnFordeling(deltagere, ligaStørrelse, validPins)
  return NextResponse.json(resultat)
}

function parsePreferredTypes(raw: string | null): LeagueType[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is LeagueType => VALID_TYPES.includes(v))
  } catch {
    return []
  }
}
