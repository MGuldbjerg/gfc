// Beregning af leaderboard-data fra Sleeper API

import { getAllMatchups, buildUserMap, getRosters } from './sleeper'
import { getLeaguesByType, REGULAR_SEASON_WEEKS } from './leagues'
import type { GFCLeague, LeaderboardEntry, WeeklyHighscore } from '@/types/sleeper'

export interface LeaderboardResult {
  entries: LeaderboardEntry[]
  weeklyHighscores: WeeklyHighscore[]
  seasonHighscore: WeeklyHighscore | null
}

async function processLeague(league: GFCLeague): Promise<{
  entries: LeaderboardEntry[]
  weeklyScores: WeeklyHighscore[]
} | null> {
  const [userMap, rosters, matchupsByWeek] = await Promise.all([
    buildUserMap(league.sleeperId),
    getRosters(league.sleeperId),
    getAllMatchups(league.sleeperId, REGULAR_SEASON_WEEKS),
  ])

  if (!rosters) return null

  // Byg entry per roster
  const entryMap: Record<number, LeaderboardEntry> = {}

  for (const roster of rosters) {
    const user = userMap[roster.roster_id]
    if (!user) continue

    entryMap[roster.roster_id] = {
      rank: 0,
      username: user.username,
      displayName: user.displayName,
      league: league.name,
      leagueType: league.type,
      totalPoints: (roster.settings.fpts ?? 0) + (roster.settings.fpts_decimal ?? 0) / 100,
      wins: roster.settings.wins ?? 0,
      losses: roster.settings.losses ?? 0,
      weeklyScores: {},
      highestWeeklyScore: 0,
      highestWeeklyScoreWeek: 0,
    }
  }

  // Fyld ugescorer ind
  const weeklyScores: WeeklyHighscore[] = []

  for (const [weekStr, matchups] of Object.entries(matchupsByWeek)) {
    const week = Number(weekStr)
    for (const matchup of matchups) {
      const entry = entryMap[matchup.roster_id]
      if (!entry || matchup.points === 0) continue

      entry.weeklyScores[week] = matchup.points

      if (matchup.points > entry.highestWeeklyScore) {
        entry.highestWeeklyScore = matchup.points
        entry.highestWeeklyScoreWeek = week
      }

      weeklyScores.push({
        username: entry.username,
        displayName: entry.displayName,
        league: league.name,
        leagueType: league.type,
        week,
        points: matchup.points,
      })
    }
  }

  return {
    entries: Object.values(entryMap),
    weeklyScores,
  }
}

export async function computeLeaderboard(
  type: GFCLeague['type'],
  season: string
): Promise<LeaderboardResult> {
  const leagues = getLeaguesByType(type, season)

  const results = await Promise.all(leagues.map(processLeague))

  const allEntries: LeaderboardEntry[] = []
  const allWeeklyScores: WeeklyHighscore[] = []

  for (const result of results) {
    if (!result) continue
    allEntries.push(...result.entries)
    allWeeklyScores.push(...result.weeklyScores)
  }

  // Sorter: managed = wins først, derefter point; bestball = point
  allEntries.sort((a, b) => {
    if (type === 'managed') {
      if ((b.wins ?? 0) !== (a.wins ?? 0)) return (b.wins ?? 0) - (a.wins ?? 0)
    }
    return b.totalPoints - a.totalPoints
  })

  // Sæt rang
  allEntries.forEach((e, i) => { e.rank = i + 1 })

  // Top 5 ugescorer
  const topWeekly = [...allWeeklyScores]
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)

  // Sæsonens højeste score (præmie)
  const seasonHighscore = topWeekly[0] ?? null

  return {
    entries: allEntries.slice(0, 20),
    weeklyHighscores: topWeekly,
    seasonHighscore,
  }
}
