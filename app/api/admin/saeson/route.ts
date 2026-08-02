// Admin-only: everything about the current season that used to require a code
// deploy — signup deadline, invite code, the three nøgledatoer, which Sleeper
// leagues the season has, and which season is the current one.

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { auth } from '@/auth'
import {
  hentAktuelSæson,
  hentKendteSæsoner,
  hentSæsonLigaer,
  gemSæsonLigaer,
  sætAktuelSæson,
  type LigaInput,
} from '@/lib/seasonConfig'
import { getSeasonSettings, upsertSeasonSettings } from '@/lib/seasonSettings'
import { type LeagueType } from '@/lib/leagues'

const GYLDIGE_TYPER: LeagueType[] = ['bestball', 'managed', 'chopped']

async function svar(sæson: string) {
  const [settings, ligaer, sæsoner] = await Promise.all([
    getSeasonSettings(sæson),
    hentSæsonLigaer(sæson),
    hentKendteSæsoner(),
  ])
  return NextResponse.json({
    season: sæson,
    signupDeadline: settings?.signupDeadline ?? null,
    inviteCode: settings?.inviteCode ?? null,
    draftStart: settings?.draftStart ?? null,
    fordelingDato: settings?.fordelingDato ?? null,
    sæsonStart: settings?.sæsonStart ?? null,
    ligaer,
    sæsoner,
  })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }
  return svar(await hentAktuelSæson())
}

// Accepts a plain 'YYYY-MM-DD'. Empty string clears the date.
function læsDato(v: unknown): string | null | undefined {
  if (v === null || v === '') return null
  if (typeof v !== 'string') return undefined
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const sæson = await hentAktuelSæson()
  const body = await req.json().catch(() => ({}))

  const fields: {
    signupDeadline?: string | null
    inviteCode?: string
    draftStart?: string | null
    fordelingDato?: string | null
    sæsonStart?: string | null
  } = {}

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

  for (const felt of ['draftStart', 'fordelingDato', 'sæsonStart'] as const) {
    if (!(felt in body)) continue
    const v = læsDato(body[felt])
    if (v === undefined) {
      return NextResponse.json(
        { error: `Ugyldig dato for ${felt} — brug formatet ÅÅÅÅ-MM-DD` },
        { status: 400 }
      )
    }
    fields[felt] = v
  }

  // Generate a fresh invite code on request (invalidates any old link).
  if (body.regenerateInvite === true) {
    fields.inviteCode = randomBytes(6).toString('hex')
  }

  await upsertSeasonSettings(sæson, fields)
  return svar(sæson)
}

// Season turnover: register the new season's Sleeper leagues and, optionally,
// make it the current season. Kept separate from PUT because it rewrites which
// season the whole site is looking at.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const season = typeof body.season === 'string' ? body.season.trim() : ''
  if (!/^\d{4}$/.test(season)) {
    return NextResponse.json({ error: 'Sæson skal være et årstal, fx 2027' }, { status: 400 })
  }

  const rå: unknown[] = Array.isArray(body.ligaer) ? body.ligaer : []
  const ligaer: LigaInput[] = []
  const set = new Set<string>()

  for (const r of rå) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const ligaNavn = typeof o.ligaNavn === 'string' ? o.ligaNavn.trim().toUpperCase() : ''
    const type = typeof o.type === 'string' ? (o.type as LeagueType) : null
    const sleeperId = typeof o.sleeperId === 'string' ? o.sleeperId.trim() : ''

    // An empty row is how the form says "unused slot" — skip it silently.
    if (!ligaNavn && !sleeperId) continue

    if (!/^(BB|M|C)\d+$/.test(ligaNavn)) {
      return NextResponse.json(
        { error: `Ugyldigt liganavn "${ligaNavn}". Brug BB1, M2, C1 osv.` },
        { status: 400 }
      )
    }
    if (!type || !GYLDIGE_TYPER.includes(type)) {
      return NextResponse.json({ error: `Ugyldig række for ${ligaNavn}` }, { status: 400 })
    }
    if (!/^\d{5,}$/.test(sleeperId)) {
      return NextResponse.json(
        { error: `${ligaNavn}: Sleeper-ID skal være det lange tal fra liga-URL'en` },
        { status: 400 }
      )
    }
    if (set.has(ligaNavn)) {
      return NextResponse.json({ error: `${ligaNavn} er med to gange` }, { status: 400 })
    }
    set.add(ligaNavn)
    ligaer.push({ ligaNavn, type, sleeperId })
  }

  if (ligaer.length === 0) {
    return NextResponse.json({ error: 'Tilføj mindst én liga' }, { status: 400 })
  }

  await gemSæsonLigaer(season, ligaer)

  const skiftTil = body.gørAktuel === true
  if (skiftTil) await sætAktuelSæson(season)

  return svar(skiftTil ? season : await hentAktuelSæson())
}
