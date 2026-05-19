// Computes a league-assignment proposal without persisting — used for preview.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { query } from '@/lib/turso'
import { beregnFordeling, type Deltager, type LeagueType } from '@/lib/fordeling'

const VALID_TYPES: LeagueType[] = ['bestball', 'managed', 'chopped']
import { CURRENT_SEASON } from '@/lib/leagues'

type TilmeldingRow = {
  registration_id: string
  preferred_types: string
  profile_id: string
  display_name: string
  username: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })

  const { ligaStørrelse = 12 } = await req.json().catch(() => ({}))

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

  const resultat = beregnFordeling(deltagere, ligaStørrelse)
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
