// Historic data aggregation across seasons.
// All heavy work happens server-side; the /historie page wraps the result
// in Next.js's per-route revalidate cache.

import { computeLeaderboard, type LeaderboardType } from './leaderboard'
import { ALL_LEAGUES, CURRENT_SEASON, formatFor, type LeagueType, type SeasonFormat } from './leagues'
import { fetchMatchups, fetchRosters, fetchUsers } from './sleeper'
import type { LeaderboardResult } from '@/types/sleeper'

const REGULAR_SEASON_WEEKS = Array.from({ length: 14 }, (_, i) => i + 1)
const PLAYOFF_WEEKS = [15, 16, 17] as const

export type Sæson = string

// All seasons we have league data for, newest first.
export function listSæsoner(): Sæson[] {
  const all = Array.from(new Set(ALL_LEAGUES.map(l => l.season)))
  return all.sort().reverse()
}

// Seasons that are complete (excludes the current/upcoming season).
export function listAfsluttedeSæsoner(): Sæson[] {
  return listSæsoner().filter(s => s < CURRENT_SEASON)
}

export interface SæsonOversigt {
  season: Sæson
  bestball: LeaderboardResult
  managed: LeaderboardResult
  chopped: LeaderboardResult
}

export async function hentSæsonOversigt(season: Sæson): Promise<SæsonOversigt> {
  const [bestball, managed, chopped] = await Promise.all([
    computeLeaderboard('bestball', season),
    computeLeaderboard('managed', season),
    computeLeaderboard('chopped', season),
  ])
  return { season, bestball, managed, chopped }
}

export interface AllTimeEntry {
  username: string
  displayName: string
  totalPoints: number
  totalWins: number
  seasonsPlayed: number
  bedsteSæson: { season: Sæson; points: number; wins: number } | null
  gennemsnitPerSæson: number
}

export interface AllTimeOversigt {
  type: LeaderboardType
  entries: AllTimeEntry[]
}

export async function hentAllTimeOversigt(type: LeaderboardType): Promise<AllTimeOversigt> {
  const sæsoner = listAfsluttedeSæsoner()
  if (sæsoner.length === 0) return { type, entries: [] }

  const resultater = await Promise.all(
    sæsoner.map(async season => {
      const result = await computeLeaderboard(type, season)
      return { season, result }
    })
  )

  const userMap = new Map<string, AllTimeEntry>()

  for (const { season, result } of resultater) {
    for (const entry of result.entries) {
      const eksisterende = userMap.get(entry.username) ?? {
        username: entry.username,
        displayName: entry.displayName,
        totalPoints: 0,
        totalWins: 0,
        seasonsPlayed: 0,
        bedsteSæson: null,
        gennemsnitPerSæson: 0,
      }

      eksisterende.totalPoints += entry.totalPoints
      eksisterende.totalWins += entry.wins ?? 0
      eksisterende.seasonsPlayed += 1

      if (!eksisterende.bedsteSæson || entry.totalPoints > eksisterende.bedsteSæson.points) {
        eksisterende.bedsteSæson = {
          season,
          points: entry.totalPoints,
          wins: entry.wins ?? 0,
        }
      }

      userMap.set(entry.username, eksisterende)
    }
  }

  const entries: AllTimeEntry[] = Array.from(userMap.values()).map(e => ({
    ...e,
    gennemsnitPerSæson: e.seasonsPlayed > 0 ? e.totalPoints / e.seasonsPlayed : 0,
  }))

  if (type === 'managed') {
    entries.sort((a, b) => {
      if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins
      return b.totalPoints - a.totalPoints
    })
  } else {
    entries.sort((a, b) => b.totalPoints - a.totalPoints)
  }

  return { type, entries }
}

// --- Weekly score helpers ---------------------------------------------------

export interface UgeScore {
  userId: string
  displayName: string
  username: string
  leagueName: string
  leagueId: string
  rosterId: number
  week: number
  points: number
}

// Fetch every (roster, week, points) tuple for all sub-leagues of one
// (season, type) combo. Underlying fetches are cached by Next.js's fetch
// cache so multiple consumers in the same render dedupe automatically.
export async function hentUgentligeScorer(
  season: Sæson,
  type: LeagueType,
  weeks: readonly number[] = [...REGULAR_SEASON_WEEKS, ...PLAYOFF_WEEKS],
): Promise<UgeScore[]> {
  const leagues = ALL_LEAGUES.filter(
    l => l.season === season && l.leagueType === type && l.sleeperId
  )
  if (leagues.length === 0) return []

  const perLeague = await Promise.all(
    leagues.map(async league => {
      const [rosters, users] = await Promise.all([
        fetchRosters(league.sleeperId),
        fetchUsers(league.sleeperId),
      ])
      const rosterToOwner = new Map<number, string>()
      for (const r of rosters) rosterToOwner.set(r.roster_id, r.owner_id)

      const perWeek = await Promise.all(
        weeks.map(async week => {
          try {
            const matchups = await fetchMatchups(league.sleeperId, week)
            return matchups.flatMap<UgeScore>(m => {
              const ownerId = rosterToOwner.get(m.roster_id)
              if (!ownerId) return []
              const u = users[ownerId]
              if (!u) return []
              return [{
                userId: u.user_id,
                displayName: u.display_name || u.username || u.user_id,
                username: u.username || u.display_name || u.user_id,
                leagueName: league.name,
                leagueId: league.sleeperId,
                rosterId: m.roster_id,
                week,
                points: m.points ?? 0,
              }]
            })
          } catch {
            return []
          }
        })
      )
      return perWeek.flat()
    })
  )

  return perLeague.flat()
}

// Highest single-week score from the regular season (weeks 1–14). Playoff
// weeks are excluded so it's a meaningful comparison across all rosters.
export interface UgeRekord {
  userId: string
  displayName: string
  username: string
  leagueName: string
  week: number
  points: number
}

export async function hentSingleWeekRekord(
  season: Sæson,
  type: LeagueType,
): Promise<UgeRekord | null> {
  const scores = await hentUgentligeScorer(season, type, REGULAR_SEASON_WEEKS)
  if (scores.length === 0) return null
  const top = scores.reduce((best, s) => (s.points > best.points ? s : best))
  return {
    userId: top.userId,
    displayName: top.displayName,
    username: top.username,
    leagueName: top.leagueName,
    week: top.week,
    points: top.points,
  }
}

// --- Season winner ----------------------------------------------------------

export interface SæsonVinder {
  userId: string
  displayName: string
  username: string
  points: number          // championship-deciding score
  format: SeasonFormat
  beskrivelse: string
}

export async function hentSæsonVinder(
  season: Sæson,
  type: LeagueType,
): Promise<SæsonVinder | null> {
  const format = formatFor(season, type)

  if (format === 'aggregate-points') {
    const lb = await computeLeaderboard(type, season)
    const top = lb.entries[0]
    if (!top) return null
    // We don't have user_id in LeaderboardEntry — use the slug.
    return {
      userId: top.username,
      displayName: top.displayName,
      username: top.username,
      points: top.totalPoints,
      format,
      beskrivelse: 'Højeste samlede score over 17 uger',
    }
  }

  // Pooled playoff: top 3 per Sleeper-league seed; weeks 15→16→17 elimination.
  const leagues = ALL_LEAGUES.filter(
    l => l.season === season && l.leagueType === type && l.sleeperId
  )
  if (leagues.length === 0) return null

  type PlayoffTeam = {
    leagueId: string
    rosterId: number
    userId: string
    displayName: string
    username: string
    week15: number
    week16: number
    week17: number
  }

  const playoffWeekScores = await hentUgentligeScorer(season, type, PLAYOFF_WEEKS)
  const scoreLookup = new Map<string, UgeScore>()
  for (const s of playoffWeekScores) {
    scoreLookup.set(`${s.leagueId}:${s.rosterId}:${s.week}`, s)
  }

  const seedede: PlayoffTeam[] = []
  for (const league of leagues) {
    const [rosters, users] = await Promise.all([
      fetchRosters(league.sleeperId),
      fetchUsers(league.sleeperId),
    ])

    const sorted = [...rosters].sort((a, b) => {
      const aW = a.settings?.wins ?? 0
      const bW = b.settings?.wins ?? 0
      if (bW !== aW) return bW - aW
      const aP = (a.settings?.fpts ?? 0) + (a.settings?.fpts_decimal ?? 0) / 100
      const bP = (b.settings?.fpts ?? 0) + (b.settings?.fpts_decimal ?? 0) / 100
      return bP - aP
    })

    for (const r of sorted.slice(0, 3)) {
      const user = users[r.owner_id]
      if (!user) continue
      const scoreFor = (week: number) =>
        scoreLookup.get(`${league.sleeperId}:${r.roster_id}:${week}`)?.points ?? 0
      seedede.push({
        leagueId: league.sleeperId,
        rosterId: r.roster_id,
        userId: user.user_id,
        displayName: user.display_name || user.username || user.user_id,
        username: user.username || user.display_name || user.user_id,
        week15: scoreFor(15),
        week16: scoreFor(16),
        week17: scoreFor(17),
      })
    }
  }

  if (seedede.length === 0) return null

  // Some weeks may not have data yet for in-progress seasons. Treat 0 as
  // "no data" — but if NO playoff data at all, there's no winner.
  const harPlayoffData = seedede.some(t => t.week15 > 0 || t.week16 > 0 || t.week17 > 0)
  if (!harPlayoffData) return null

  const after15 = [...seedede].sort((a, b) => b.week15 - a.week15).slice(0, 10)
  const after16 = [...after15].sort((a, b) => b.week16 - a.week16).slice(0, 5)
  const vinder = [...after16].sort((a, b) => b.week17 - a.week17)[0]
  if (!vinder) return null

  return {
    userId: vinder.userId,
    displayName: vinder.displayName,
    username: vinder.username,
    points: vinder.week17,
    format,
    beskrivelse: 'Vinder af GFC slutspil (3-2-1 elimination)',
  }
}

// Top single-season performances across all seasons, sorted by points.
export interface SæsonRekord {
  username: string
  displayName: string
  season: Sæson
  type: LeaderboardType
  points: number
  wins: number
}

export async function hentBedsteSæsonRekorder(maxPerType = 10): Promise<SæsonRekord[]> {
  const sæsoner = listAfsluttedeSæsoner()
  const types: LeaderboardType[] = ['bestball', 'managed', 'chopped']
  const alle: SæsonRekord[] = []

  for (const type of types) {
    for (const season of sæsoner) {
      const result = await computeLeaderboard(type, season)
      for (const e of result.entries) {
        alle.push({
          username: e.username,
          displayName: e.displayName,
          season,
          type,
          points: e.totalPoints,
          wins: e.wins ?? 0,
        })
      }
    }
  }

  // Take top N per type, then merge.
  const samletByType = new Map<LeaderboardType, SæsonRekord[]>()
  for (const type of types) {
    const sorted = alle
      .filter(e => e.type === type)
      .sort((a, b) => b.points - a.points)
      .slice(0, maxPerType)
    samletByType.set(type, sorted)
  }

  return [
    ...(samletByType.get('bestball') ?? []),
    ...(samletByType.get('managed') ?? []),
    ...(samletByType.get('chopped') ?? []),
  ]
}
