import type { LeaderboardEntry, LeaderboardResult } from '@/types/sleeper'
import { fetchRosters, fetchUsers } from './sleeper'
import { ALL_LEAGUES } from './leagues'

export type LeaderboardType = 'bestball' | 'managed' | 'chopped'

/**
 * Compute leaderboard for a given type and season by aggregating Sleeper API data
 */
export async function computeLeaderboard(
  type: LeaderboardType,
  season: string
): Promise<LeaderboardResult> {
  try {
    // Find all leagues for this season and type
    const leaguesToFetch = ALL_LEAGUES.filter(
      (l) => l.season === season && l.leagueType === type && l.sleeperId
    )

    if (leaguesToFetch.length === 0) {
      console.warn(`No leagues found for ${type} ${season}`)
      return { entries: [], weeklyHighscores: [] }
    }

    // Fetch data from all leagues in parallel
    const allRosters: Array<{ leagueId: string; rosters: any[]; users: Record<string, any> }> = await Promise.all(
      leaguesToFetch.map(async (league) => {
        try {
          const [rosters, users] = await Promise.all([
            fetchRosters(league.sleeperId),
            fetchUsers(league.sleeperId),
          ])
          return { leagueId: league.sleeperId, rosters, users }
        } catch (error) {
          console.error(`Failed to fetch data for league ${league.sleeperId}:`, error)
          return { leagueId: league.sleeperId, rosters: [], users: {} }
        }
      })
    )

    // Aggregate data: collect entries by user and sum their points/wins
    const userMap = new Map<string, LeaderboardEntry>()

    for (const { rosters, users } of allRosters) {
      for (const roster of rosters) {
        const owner = users[roster.owner_id]
        if (!owner) continue

        const key = owner.username
        const fpts = roster.settings?.fpts ?? 0
        const fptsDec = roster.settings?.fpts_decimal ?? 0
        const totalPoints = fpts + fptsDec / 100
        const wins = roster.settings?.wins ?? 0

        if (!userMap.has(key)) {
          userMap.set(key, {
            rank: 0, // Will be assigned after sorting
            username: owner.username,
            displayName: owner.display_name || owner.username,
            leagueType: type,
            totalPoints,
            wins: type === 'managed' ? wins : undefined,
          })
        } else {
          const entry = userMap.get(key)!
          entry.totalPoints += totalPoints
          if (type === 'managed' && entry.wins !== undefined) {
            entry.wins += wins
          }
        }
      }
    }

    // Convert to array and sort
    const entries = Array.from(userMap.values())

    if (type === 'managed') {
      entries.sort((a, b) => {
        if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0)
        return b.totalPoints - a.totalPoints
      })
    } else {
      entries.sort((a, b) => b.totalPoints - a.totalPoints)
    }

    // Assign ranks
    entries.forEach((entry, idx) => {
      entry.rank = idx + 1
    })

    return { entries, weeklyHighscores: [] }
  } catch (error) {
    console.error(`Error computing leaderboard for ${type} ${season}:`, error)
    return { entries: [], weeklyHighscores: [] }
  }
}
