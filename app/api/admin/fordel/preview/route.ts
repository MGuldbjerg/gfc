// Computes a league-assignment proposal without persisting — used for preview.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query } from '@/lib/turso'
import { beregnFordeling, type Deltager, type LeagueType, type Pin } from '@/lib/fordeling'
import { hentAktuelSæson, hentSleeperIdForNavn } from '@/lib/seasonConfig'
import { getSeasonSettings, erSenTilmelding } from '@/lib/seasonSettings'

const VALID_TYPES: LeagueType[] = ['bestball', 'managed', 'chopped']

type TilmeldingRow = {
  registration_id: string
  preferred_types: string
  profile_id: string
  display_name: string
  username: string
  er_amerikansk_vip: number
  er_dansk_vip: number
  undgaa_amerikansk_vip: number
  created_at: string
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const { ligaStørrelse = 12, choppedStørrelse = 18, pins = [] } = await req.json().catch(() => ({}))

  const sæson = await hentAktuelSæson()

  const settings = await getSeasonSettings(sæson)

  const tilmeldinger = await query<TilmeldingRow>(
    `SELECT r.id AS registration_id,
            r.preferred_types,
            r.undgaa_amerikansk_vip,
            r.created_at,
            p.id AS profile_id,
            p.display_name,
            p.username,
            p.er_amerikansk_vip,
            p.er_dansk_vip
       FROM registrations r
       JOIN profiles p ON p.id = r.profile_id
      WHERE r.season = ? AND r.status = 'registered'`,
    [sæson]
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
    erAmerikanskVip: Boolean(t.er_amerikansk_vip),
    erDanskVip: Boolean(t.er_dansk_vip),
    undgaaAmerikanskVip: Boolean(t.undgaa_amerikansk_vip),
    senTilmelding: erSenTilmelding(t.created_at, settings?.signupDeadline ?? null),
  }))

  const validPins: Pin[] = Array.isArray(pins)
    ? pins.filter((p: unknown): p is Pin =>
        typeof p === 'object' && p !== null &&
        typeof (p as Pin).profileId === 'string' &&
        typeof (p as Pin).ligaNavn === 'string'
      )
    : []

  const resultat = beregnFordeling(deltagere, ligaStørrelse, validPins, choppedStørrelse)

  // Attach the Sleeper id when the league is known for this season — from
  // lib/leagues.ts or from the leagues entered in the admin "Sæson" tab. Stays
  // undefined when the Sleeper leagues have not been created yet; bekræft then
  // persists only the name.
  for (const liga of resultat.ligaer) {
    liga.sleeperId = await hentSleeperIdForNavn(sæson, liga.ligaNavn)
  }

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
