// Reconstructs a previously confirmed allocation from league_assignments, so
// admins can revisit "who's in what league" after the fact — including for
// past seasons — without redrawing anything.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query } from '@/lib/turso'
import type { Deltager, LeagueType, LigaForslag } from '@/lib/fordeling'
import { CURRENT_SEASON } from '@/lib/leagues'

const VALID_TYPES: LeagueType[] = ['bestball', 'managed', 'chopped']

type AssignmentRow = {
  liga_navn: string
  league_type: string
  sleeper_league_id: string | null
  profile_id: string
  display_name: string
  username: string
  er_amerikansk_vip: number
  er_dansk_vip: number
  registration_id: string
  preferred_types: string | null
  undgaa_amerikansk_vip: number
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const season = req.nextUrl.searchParams.get('season') || CURRENT_SEASON

  const seasonRows = await query<{ season: string }>(
    'SELECT DISTINCT season FROM league_assignments ORDER BY season DESC'
  )
  const seasons = seasonRows.map(r => r.season)

  const rows = await query<AssignmentRow>(
    `SELECT la.liga_navn, la.league_type, la.sleeper_league_id,
            p.id AS profile_id, p.display_name, p.username,
            p.er_amerikansk_vip, p.er_dansk_vip,
            r.id AS registration_id, r.preferred_types, r.undgaa_amerikansk_vip
       FROM league_assignments la
       JOIN profiles p ON p.id = la.profile_id
       JOIN registrations r ON r.id = la.registration_id
      WHERE la.season = ?
      ORDER BY la.liga_navn, p.display_name`,
    [season]
  )

  const ligaMap = new Map<string, LigaForslag>()
  for (const row of rows) {
    if (!ligaMap.has(row.liga_navn)) {
      ligaMap.set(row.liga_navn, {
        ligaNavn: row.liga_navn,
        type: (VALID_TYPES.includes(row.league_type as LeagueType) ? row.league_type : 'bestball') as LeagueType,
        deltagere: [],
        sleeperId: row.sleeper_league_id ?? undefined,
      })
    }
    const deltager: Deltager = {
      profileId: row.profile_id,
      displayName: row.display_name,
      sleeperUsername: row.username,
      registrationId: row.registration_id,
      preferredTypes: parsePreferredTypes(row.preferred_types),
      erAmerikanskVip: Boolean(row.er_amerikansk_vip),
      erDanskVip: Boolean(row.er_dansk_vip),
      undgaaAmerikanskVip: Boolean(row.undgaa_amerikansk_vip),
    }
    ligaMap.get(row.liga_navn)!.deltagere.push(deltager)
  }

  const typeOrder: Record<LeagueType, number> = { bestball: 0, managed: 1, chopped: 2 }
  const ligaer = [...ligaMap.values()].sort((a, b) => {
    const td = typeOrder[a.type] - typeOrder[b.type]
    return td !== 0 ? td : a.ligaNavn.localeCompare(b.ligaNavn, undefined, { numeric: true })
  })

  return NextResponse.json({ season, seasons, ligaer })
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
