// Historic data aggregation across seasons.
// All heavy work happens server-side; the /historie page wraps the result
// in Next.js's per-route revalidate cache.

import { computeLeaderboard, type LeaderboardType } from './leaderboard'
import { ALL_LEAGUES, CURRENT_SEASON } from './leagues'
import type { LeaderboardResult } from '@/types/sleeper'

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
