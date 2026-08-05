export const CURRENT_SEASON = '2026'

export type LeagueType = 'bestball' | 'managed' | 'chopped'

// Champion determination format per (season, leagueType).
// Default for everything not listed: 'pooled-playoff' (top 3 per Sleeper-league
// go to a pooled GFC playoff weeks 15–17 — bottom 5 out each week, last 5 play
// for the title on the highest week-17 score).
// 'aggregate-points' = winner is simply the highest aggregate scorer across
// all 17 weeks (used for 2025 bestball).
export type SeasonFormat = 'pooled-playoff' | 'aggregate-points'

const FORMAT_OVERRIDES: Record<string, SeasonFormat> = {
  '2025-bestball': 'aggregate-points',
}

export function formatFor(season: string, leagueType: LeagueType): SeasonFormat {
  return FORMAT_OVERRIDES[`${season}-${leagueType}`] ?? 'pooled-playoff'
}

export interface League {
  season: string
  leagueType: LeagueType
  name: string
  sleeperId: string
}

// 2024 Sleeper Liga-ID'er
const LEAGUES_2024 = {
  M1: '1121180960650878976',
  M2: '1121183078015148032',
  M3: '1121184019300851712',
  M4: '1121184998146592768',
  M5: '1121216960743854080',
  BB1: '1120810376901357568',
  BB2: '1120810934857052160',
  BB3: '1120811327129350144',
  BB4: '1120811543077212160',
  BB5: '1120811771759091712',
}

// 2025 Sleeper Liga-ID'er
const LEAGUES_2025 = {
  M1: '1256387533722365952',
  M2: '1256388144274604032',
  M3: '1256388355424268288',
  M4: '1256388555077324800',
  M5: '1256388811772936192',
  BB1: '1256384368658632704',
  BB2: '1256385813147566080',
  BB3: '1256386180920901632',
  BB4: '1256386439235518464',
  BB5: '1256386762435997696',
  BB6: '1256387182386499584',
}

// 2026 Sleeper Liga-ID'er (Sleeper-navne: "GFC26 - BB1" osv.)
// Første sæson med chopped-rækken (18 hold pr. liga).
const LEAGUES_2026 = {
  M1: '1388645201504899072',
  M2: '1388645767886958592',
  M3: '1388647185700110336',
  M4: '1388647458459897856',
  M5: '1388647864976052224',
  BB1: '1388639623651012608',
  BB2: '1388642137897181184',
  BB3: '1388642591716708352',
  BB4: '1388644086415630336',
  BB5: '1388644771966230528',
  // Oprettet efter den oprindelige fordeling for at få plads til sene
  // tilmeldinger og folk, der ønskede bestball uden at få en plads.
  BB6: '1390729818009530368',
  C1: '1388648202772701184',
  C2: '1388649123527282688',
  C3: '1388650186703663104',
}

// Maps a fordeling short name ("BB1", "M2", "C1") to the Sleeper league id for
// a given season. Returns undefined when no league exists yet (e.g. summer,
// before the season's Sleeper leagues have been created).
export function sleeperIdForLigaNavn(season: string, ligaNavn: string): string | undefined {
  const prefix = ligaNavn.match(/^[A-Z]+/)?.[0]
  const num = ligaNavn.match(/\d+$/)?.[0]
  if (!prefix || !num) return undefined
  const type: LeagueType | null =
    prefix === 'BB' ? 'bestball' : prefix === 'M' ? 'managed' : prefix === 'C' ? 'chopped' : null
  if (!type) return undefined
  const expectedName = `${type === 'bestball' ? 'Bestball' : type === 'managed' ? 'Managed' : 'Chopped'} ${num}`
  return ALL_LEAGUES.find(
    (l) => l.season === season && l.leagueType === type && l.name === expectedName
  )?.sleeperId
}

const TYPE_PRÆFIKS: Record<LeagueType, string> = { bestball: 'BB', managed: 'M', chopped: 'C' }
const TYPE_RÆKKEFØLGE: Record<LeagueType, number> = { bestball: 0, managed: 1, chopped: 2 }

// "Bestball 3" → "BB3". The short name is what the fordeling, league_assignments
// and the admin UI all speak in.
export function navnForLiga(l: League): string {
  return `${TYPE_PRÆFIKS[l.leagueType]}${l.name.match(/\d+$/)?.[0] ?? ''}`
}

// Short-name view of a league list, ordered the way the fordeling shows them.
// Takes the list as an argument rather than reading ALL_LEAGUES directly, so
// callers can pass the DB-merged list from lib/seasonConfig.
export function ligaOversigt(
  ligaer: League[]
): { ligaNavn: string; type: LeagueType; sleeperId: string }[] {
  return ligaer
    .map(l => ({ ligaNavn: navnForLiga(l), type: l.leagueType, sleeperId: l.sleeperId }))
    .sort((a, b) =>
      TYPE_RÆKKEFØLGE[a.type] - TYPE_RÆKKEFØLGE[b.type] ||
      a.ligaNavn.localeCompare(b.ligaNavn, undefined, { numeric: true })
    )
}

// Code-only view, for the few places that must not touch the database.
export function ligaerForSæson(season: string) {
  return ligaOversigt(ALL_LEAGUES.filter(l => l.season === season))
}

export const ALL_LEAGUES: League[] = [
  // 2024
  { season: '2024', leagueType: 'managed', name: 'Managed 1', sleeperId: LEAGUES_2024.M1 },
  { season: '2024', leagueType: 'managed', name: 'Managed 2', sleeperId: LEAGUES_2024.M2 },
  { season: '2024', leagueType: 'managed', name: 'Managed 3', sleeperId: LEAGUES_2024.M3 },
  { season: '2024', leagueType: 'managed', name: 'Managed 4', sleeperId: LEAGUES_2024.M4 },
  { season: '2024', leagueType: 'managed', name: 'Managed 5', sleeperId: LEAGUES_2024.M5 },
  { season: '2024', leagueType: 'bestball', name: 'Bestball 1', sleeperId: LEAGUES_2024.BB1 },
  { season: '2024', leagueType: 'bestball', name: 'Bestball 2', sleeperId: LEAGUES_2024.BB2 },
  { season: '2024', leagueType: 'bestball', name: 'Bestball 3', sleeperId: LEAGUES_2024.BB3 },
  { season: '2024', leagueType: 'bestball', name: 'Bestball 4', sleeperId: LEAGUES_2024.BB4 },
  { season: '2024', leagueType: 'bestball', name: 'Bestball 5', sleeperId: LEAGUES_2024.BB5 },
  // 2025
  { season: '2025', leagueType: 'managed', name: 'Managed 1', sleeperId: LEAGUES_2025.M1 },
  { season: '2025', leagueType: 'managed', name: 'Managed 2', sleeperId: LEAGUES_2025.M2 },
  { season: '2025', leagueType: 'managed', name: 'Managed 3', sleeperId: LEAGUES_2025.M3 },
  { season: '2025', leagueType: 'managed', name: 'Managed 4', sleeperId: LEAGUES_2025.M4 },
  { season: '2025', leagueType: 'managed', name: 'Managed 5', sleeperId: LEAGUES_2025.M5 },
  { season: '2025', leagueType: 'bestball', name: 'Bestball 1', sleeperId: LEAGUES_2025.BB1 },
  { season: '2025', leagueType: 'bestball', name: 'Bestball 2', sleeperId: LEAGUES_2025.BB2 },
  { season: '2025', leagueType: 'bestball', name: 'Bestball 3', sleeperId: LEAGUES_2025.BB3 },
  { season: '2025', leagueType: 'bestball', name: 'Bestball 4', sleeperId: LEAGUES_2025.BB4 },
  { season: '2025', leagueType: 'bestball', name: 'Bestball 5', sleeperId: LEAGUES_2025.BB5 },
  { season: '2025', leagueType: 'bestball', name: 'Bestball 6', sleeperId: LEAGUES_2025.BB6 },
  // 2026
  { season: '2026', leagueType: 'managed', name: 'Managed 1', sleeperId: LEAGUES_2026.M1 },
  { season: '2026', leagueType: 'managed', name: 'Managed 2', sleeperId: LEAGUES_2026.M2 },
  { season: '2026', leagueType: 'managed', name: 'Managed 3', sleeperId: LEAGUES_2026.M3 },
  { season: '2026', leagueType: 'managed', name: 'Managed 4', sleeperId: LEAGUES_2026.M4 },
  { season: '2026', leagueType: 'managed', name: 'Managed 5', sleeperId: LEAGUES_2026.M5 },
  { season: '2026', leagueType: 'bestball', name: 'Bestball 1', sleeperId: LEAGUES_2026.BB1 },
  { season: '2026', leagueType: 'bestball', name: 'Bestball 2', sleeperId: LEAGUES_2026.BB2 },
  { season: '2026', leagueType: 'bestball', name: 'Bestball 3', sleeperId: LEAGUES_2026.BB3 },
  { season: '2026', leagueType: 'bestball', name: 'Bestball 4', sleeperId: LEAGUES_2026.BB4 },
  { season: '2026', leagueType: 'bestball', name: 'Bestball 5', sleeperId: LEAGUES_2026.BB5 },
  { season: '2026', leagueType: 'bestball', name: 'Bestball 6', sleeperId: LEAGUES_2026.BB6 },
  { season: '2026', leagueType: 'chopped', name: 'Chopped 1', sleeperId: LEAGUES_2026.C1 },
  { season: '2026', leagueType: 'chopped', name: 'Chopped 2', sleeperId: LEAGUES_2026.C2 },
  { season: '2026', leagueType: 'chopped', name: 'Chopped 3', sleeperId: LEAGUES_2026.C3 },
]
