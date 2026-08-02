// Season + league configuration, resolved from the database with the constants
// in lib/leagues.ts as the fallback.
//
// Why this file exists separately from lib/leagues.ts: that file is imported by
// client components, so it must stay free of database imports. Everything here
// is server-only.
//
// The model throughout is code-default + DB-override:
//   - CURRENT_SEASON is the shipped default; app_settings.current_season wins.
//   - ALL_LEAGUES holds the historical seasons; season_leagues rows are merged
//     on top and win on a (season, liga_navn) clash.
// That way a new season can be started from the admin UI, and deleting the DB
// rows always restores exactly what the code says.

import { cache } from 'react'
import { randomUUID } from 'node:crypto'
import { query, queryOne, execute } from './turso'
import {
  ALL_LEAGUES,
  CURRENT_SEASON,
  ligaOversigt,
  navnForLiga,
  type League,
  type LeagueType,
} from './leagues'

// Per-request memoisation: a page that asks for the season five times pays for
// one query, but an admin change is still visible on the very next request.
export const hentAktuelSæson = cache(async (): Promise<string> => {
  try {
    const row = await queryOne<{ value: string | null }>(
      "SELECT value FROM app_settings WHERE key = 'current_season'"
    )
    return row?.value?.trim() || CURRENT_SEASON
  } catch {
    // A missing table (schema not yet migrated) must not take the site down.
    return CURRENT_SEASON
  }
})

export const hentAlleLigaer = cache(async (): Promise<League[]> => {
  let rækker: { season: string; liga_navn: string; league_type: string; sleeper_id: string }[] = []
  try {
    rækker = await query(
      'SELECT season, liga_navn, league_type, sleeper_id FROM season_leagues'
    )
  } catch {
    return ALL_LEAGUES
  }
  if (rækker.length === 0) return ALL_LEAGUES

  // Keyed by season + short name so a DB row replaces the code row for the same
  // league rather than producing a duplicate.
  const merged = new Map<string, League>()
  for (const l of ALL_LEAGUES) {
    merged.set(`${l.season}:${navnForLiga(l)}`, l)
  }
  for (const r of rækker) {
    const type = r.league_type as LeagueType
    const nummer = r.liga_navn.match(/\d+$/)?.[0] ?? ''
    const langtNavn =
      type === 'bestball' ? `Bestball ${nummer}`
      : type === 'managed' ? `Managed ${nummer}`
      : `Chopped ${nummer}`
    merged.set(`${r.season}:${r.liga_navn}`, {
      season: r.season,
      leagueType: type,
      name: langtNavn,
      sleeperId: r.sleeper_id,
    })
  }
  return [...merged.values()]
})

export async function hentLigaerForSæson(season: string): Promise<League[]> {
  return (await hentAlleLigaer()).filter(l => l.season === season)
}

// Every season the site knows about, newest first — code and DB combined.
export async function hentKendteSæsoner(): Promise<string[]> {
  const ligaer = await hentAlleLigaer()
  return [...new Set(ligaer.map(l => l.season))].sort((a, b) => b.localeCompare(a))
}

// Short-name view ("BB1", "M2") of a season's leagues, DB rows included. This
// is the DB-aware counterpart to ligaerForSæson in lib/leagues.ts.
export async function hentLigaOversigt(season: string) {
  return ligaOversigt(await hentLigaerForSæson(season))
}

export async function hentSleeperIdForNavn(
  season: string,
  ligaNavn: string
): Promise<string | undefined> {
  return (await hentLigaOversigt(season)).find(l => l.ligaNavn === ligaNavn)?.sleeperId
}

export async function sætAktuelSæson(season: string): Promise<void> {
  await execute(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('current_season', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [season]
  )
}

export interface LigaInput {
  ligaNavn: string
  type: LeagueType
  sleeperId: string
}

// Replaces the DB-defined leagues for one season. Full replace rather than
// merge, so removing a league from the admin form actually removes it.
export async function gemSæsonLigaer(season: string, ligaer: LigaInput[]): Promise<void> {
  await execute('DELETE FROM season_leagues WHERE season = ?', [season])
  for (const l of ligaer) {
    await execute(
      `INSERT INTO season_leagues (id, season, liga_navn, league_type, sleeper_id)
       VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), season, l.ligaNavn, l.type, l.sleeperId]
    )
  }
}

// The leagues stored in the DB for a season, in admin-form order.
export async function hentSæsonLigaer(season: string): Promise<LigaInput[]> {
  const rækker = await query<{ liga_navn: string; league_type: string; sleeper_id: string }>(
    'SELECT liga_navn, league_type, sleeper_id FROM season_leagues WHERE season = ? ORDER BY liga_navn',
    [season]
  )
  return rækker.map(r => ({
    ligaNavn: r.liga_navn,
    type: r.league_type as LeagueType,
    sleeperId: r.sleeper_id,
  }))
}
