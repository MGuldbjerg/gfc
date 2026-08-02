// Manual league assignment (admin only).
//
// The automatic fordeling only ever sees people who hold a registration for the
// season, so a late entrant who never got through /saeson/tilmeld — because the
// deadline had closed — is invisible to it and to the Tilmeldinger list. This
// route places any profile into specific leagues by hand, creating the missing
// registration on the way, and removes single placements again.
//
// Note: /api/admin/fordel/bekraeft rewrites the whole season, so a full re-run
// of the fordeling replaces manual placements too. The admin UI says so.

import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { execute, query, queryOne } from '@/lib/turso'
import { sendLigaTildeling } from '@/lib/brevo'
import { CURRENT_SEASON, ligaerForSæson, type LeagueType } from '@/lib/leagues'

const VALID_TYPES: LeagueType[] = ['bestball', 'managed', 'chopped']

type KandidatRow = {
  profile_id: string
  display_name: string
  username: string
  email: string | null
  registration_id: string | null
  preferred_types: string | null
  status: string | null
}

// Everyone with a profile, whether or not they hold a registration this season,
// plus their current placements and the occupancy of every league.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const season = req.nextUrl.searchParams.get('season') || CURRENT_SEASON

  const [kandidater, placeringer] = await Promise.all([
    query<KandidatRow>(
      `SELECT p.id AS profile_id, p.display_name, p.username, u.email,
              r.id AS registration_id, r.preferred_types, r.status
         FROM profiles p
         LEFT JOIN authjs_user u ON u.id = p.id
         LEFT JOIN registrations r ON r.profile_id = p.id AND r.season = ?
        ORDER BY p.display_name COLLATE NOCASE`,
      [season]
    ),
    query<{ profile_id: string; liga_navn: string }>(
      'SELECT profile_id, liga_navn FROM league_assignments WHERE season = ?',
      [season]
    ),
  ])

  const ligaerPrProfil = new Map<string, string[]>()
  for (const rad of placeringer) {
    const liste = ligaerPrProfil.get(rad.profile_id) ?? []
    liste.push(rad.liga_navn)
    ligaerPrProfil.set(rad.profile_id, liste)
  }

  const antalPrLiga = new Map<string, number>()
  for (const rad of placeringer) {
    antalPrLiga.set(rad.liga_navn, (antalPrLiga.get(rad.liga_navn) ?? 0) + 1)
  }

  return NextResponse.json({
    season,
    deltagere: kandidater.map(k => ({
      profileId: k.profile_id,
      displayName: k.display_name,
      sleeperUsername: k.username,
      email: k.email,
      harTilmelding: !!k.registration_id,
      status: k.status,
      preferredTypes: parseTypes(k.preferred_types),
      ligaer: (ligaerPrProfil.get(k.profile_id) ?? []).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      ),
    })),
    ligaer: ligaerForSæson(season).map(l => ({
      ...l,
      antal: antalPrLiga.get(l.ligaNavn) ?? 0,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const profileId = typeof body.profileId === 'string' ? body.profileId : ''
  const season = typeof body.season === 'string' && body.season ? body.season : CURRENT_SEASON
  const sendMail = body.sendMail !== false
  const ønskede: string[] = Array.isArray(body.ligaNavne)
    ? body.ligaNavne.filter((n: unknown): n is string => typeof n === 'string')
    : []

  if (!profileId) {
    return NextResponse.json({ error: 'Vælg en deltager' }, { status: 400 })
  }
  if (ønskede.length === 0) {
    return NextResponse.json({ error: 'Vælg mindst én liga' }, { status: 400 })
  }

  const profil = await queryOne<{ id: string; display_name: string }>(
    'SELECT id, display_name FROM profiles WHERE id = ?',
    [profileId]
  )
  if (!profil) {
    return NextResponse.json({ error: 'Deltageren har ingen profil' }, { status: 404 })
  }

  const sæsonLigaer = ligaerForSæson(season)
  const valgte = ønskede.map(navn => sæsonLigaer.find(l => l.ligaNavn === navn)).filter(l => !!l)
  if (valgte.length !== ønskede.length) {
    return NextResponse.json(
      { error: `Ukendt liga for ${season}. Gyldige: ${sæsonLigaer.map(l => l.ligaNavn).join(', ')}` },
      { status: 400 }
    )
  }

  // A late entrant has no registration for the season — create one so the
  // person shows up in Tilmeldinger, on /min-side and in every later fordeling.
  let reg = await queryOne<{ id: string; preferred_types: string | null }>(
    'SELECT id, preferred_types FROM registrations WHERE profile_id = ? AND season = ?',
    [profileId, season]
  )
  const oprettedeTilmelding = !reg
  if (!reg) {
    const id = randomUUID()
    // Without a stated preference, the leagues the admin just picked are the
    // honest record of what this person plays.
    const typer = [...new Set(valgte.map(l => l.type))]
    await execute(
      `INSERT INTO registrations (id, profile_id, season, preferred_types, status)
       VALUES (?, ?, ?, ?, 'assigned')`,
      [id, profileId, season, JSON.stringify(typer)]
    )
    reg = { id, preferred_types: JSON.stringify(typer) }
  }

  const eksisterende = await query<{ liga_navn: string }>(
    'SELECT liga_navn FROM league_assignments WHERE registration_id = ?',
    [reg.id]
  )
  const alleredeI = new Set(eksisterende.map(r => r.liga_navn))

  const tilføjet: string[] = []
  for (const liga of valgte) {
    if (alleredeI.has(liga.ligaNavn)) continue
    await execute(
      `INSERT INTO league_assignments
         (id, registration_id, profile_id, season, liga_navn, league_type, sleeper_league_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), reg.id, profileId, season, liga.ligaNavn, liga.type, liga.sleeperId ?? null]
    )
    tilføjet.push(liga.ligaNavn)
  }

  const sidste = valgte[valgte.length - 1]
  await execute(
    `UPDATE registrations
        SET assigned_league_name = ?, assigned_league_id = ?, status = 'assigned'
      WHERE id = ?`,
    [sidste.ligaNavn, sidste.sleeperId ?? null, reg.id]
  )

  // Mail is best-effort and only for the leagues actually added, so re-saving
  // an unchanged placement never spams the participant.
  let mailSendt = 0
  if (sendMail && tilføjet.length > 0) {
    const bruger = await queryOne<{ email: string }>(
      'SELECT email FROM authjs_user WHERE id = ?',
      [profileId]
    )
    if (bruger?.email) {
      for (const navn of tilføjet) {
        const liga = valgte.find(l => l.ligaNavn === navn)!
        try {
          await sendLigaTildeling({
            email: bruger.email,
            displayName: profil.display_name,
            ligaNavn: liga.ligaNavn,
            sleeperLigaUrl: liga.sleeperId
              ? `https://sleeper.com/leagues/${liga.sleeperId}`
              : 'https://sleeper.com/leagues',
            sæson: season,
          })
          mailSendt++
        } catch (err) {
          console.error(`sendLigaTildeling failed for ${profil.display_name}:`, err)
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    tilføjet,
    oprettedeTilmelding,
    mailSendt,
  })
}

// Removes a single placement. Frees a seat when a league is full, and undoes a
// mistake without touching the rest of the season.
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const profileId = typeof body.profileId === 'string' ? body.profileId : ''
  const ligaNavn = typeof body.ligaNavn === 'string' ? body.ligaNavn : ''
  const season = typeof body.season === 'string' && body.season ? body.season : CURRENT_SEASON

  if (!profileId || !ligaNavn) {
    return NextResponse.json({ error: 'Mangler deltager eller liga' }, { status: 400 })
  }

  await execute(
    'DELETE FROM league_assignments WHERE profile_id = ? AND season = ? AND liga_navn = ?',
    [profileId, season, ligaNavn]
  )

  // Back to 'registered' once the last placement is gone, so the person is
  // still a participant — just without a league.
  const rest = await query<{ liga_navn: string; sleeper_league_id: string | null }>(
    'SELECT liga_navn, sleeper_league_id FROM league_assignments WHERE profile_id = ? AND season = ?',
    [profileId, season]
  )
  if (rest.length === 0) {
    await execute(
      `UPDATE registrations
          SET assigned_league_name = NULL, assigned_league_id = NULL, status = 'registered'
        WHERE profile_id = ? AND season = ?`,
      [profileId, season]
    )
  } else {
    const sidste = rest[rest.length - 1]
    await execute(
      `UPDATE registrations
          SET assigned_league_name = ?, assigned_league_id = ?
        WHERE profile_id = ? AND season = ?`,
      [sidste.liga_navn, sidste.sleeper_league_id, profileId, season]
    )
  }

  return NextResponse.json({ ok: true, tilbage: rest.map(r => r.liga_navn) })
}

function parseTypes(raw: string | null): LeagueType[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is LeagueType => VALID_TYPES.includes(v))
  } catch {
    return []
  }
}
