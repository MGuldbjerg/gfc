import type { LeaderboardEntry, LeaderboardResult, WeeklyHighscore } from '@/types/sleeper'
import { fetchRosters, fetchUsers, fetchMatchups } from './sleeper'
import { hentAlleLigaer } from './seasonConfig'

export type LeaderboardType = 'bestball' | 'managed' | 'chopped'

const ALL_WEEKS = Array.from({ length: 17 }, (_, i) => i + 1)

type WeekScore = { displayName: string; league: string; week: number; points: number }

export async function computeLeaderboard(
  type: LeaderboardType,
  season: string
): Promise<LeaderboardResult> {
  try {
    const leaguesToFetch = (await hentAlleLigaer()).filter(
      (l) => l.season === season && l.leagueType === type && l.sleeperId
    )

    if (leaguesToFetch.length === 0) {
      console.warn(`No leagues found for ${type} ${season}`)
      return { entries: [], weeklyHighscores: [] }
    }

    const perLeague = await Promise.all(
      leaguesToFetch.map(async (league) => {
        try {
          const [rosters, users] = await Promise.all([
            fetchRosters(league.sleeperId),
            fetchUsers(league.sleeperId),
          ])

          const rosterOwner = new Map<number, string>()
          for (const r of rosters) rosterOwner.set(r.roster_id, r.owner_id)

          const weekScoresNested = await Promise.all(
            ALL_WEEKS.map(async (week) => {
              try {
                const matchups = await fetchMatchups(league.sleeperId, week)
                return matchups.flatMap<WeekScore>((m) => {
                  const ownerId = rosterOwner.get(m.roster_id)
                  const u = ownerId ? users[ownerId] : null
                  if (!u) return []
                  const displayName = u.display_name || u.username || u.user_id
                  return [{ displayName, league: league.name, week, points: m.points ?? 0 }]
                })
              } catch {
                return []
              }
            })
          )

          return { league, rosters, users, weekScores: weekScoresNested.flat() }
        } catch (error) {
          console.error(`Failed to fetch data for league ${league.sleeperId}:`, error)
          return { league, rosters: [], users: {} as Record<string, { user_id: string; username?: string; display_name?: string }>, weekScores: [] as WeekScore[] }
        }
      })
    )

    // Aggregate season-total entries.
    // The Sleeper /league/{id}/users endpoint does NOT return `username`, so
    // we key by `user_id` (always present).
    const userMap = new Map<string, LeaderboardEntry>()

    for (const { rosters, users } of perLeague) {
      for (const roster of rosters) {
        const owner = users[roster.owner_id]
        if (!owner || !owner.user_id) continue

        const key = owner.user_id
        const displayName = owner.display_name || owner.username || owner.user_id
        const usernameSlug = owner.username || owner.display_name || owner.user_id

        const fpts = roster.settings?.fpts ?? 0
        const fptsDec = roster.settings?.fpts_decimal ?? 0
        const totalPoints = fpts + fptsDec / 100
        const wins = roster.settings?.wins ?? 0

        if (!userMap.has(key)) {
          userMap.set(key, {
            rank: 0,
            username: usernameSlug,
            displayName,
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

    const entries = Array.from(userMap.values())

    if (type === 'managed') {
      entries.sort((a, b) => {
        if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0)
        return b.totalPoints - a.totalPoints
      })
    } else {
      entries.sort((a, b) => b.totalPoints - a.totalPoints)
    }

    entries.forEach((entry, idx) => {
      entry.rank = idx + 1
    })

    // Weekly highscores: top score per week across all leagues of this type.
    // Season highscore: single highest weekly score across all weeks (includes
    // playoff weeks — the single-week prize covers the whole season).
    const allWeekScores: WeekScore[] = perLeague.flatMap((p) => p.weekScores)
    const perWeekTop = new Map<number, WeekScore>()
    for (const s of allWeekScores) {
      if (s.points <= 0) continue
      const cur = perWeekTop.get(s.week)
      if (!cur || s.points > cur.points) perWeekTop.set(s.week, s)
    }
    const weeklyHighscores: WeeklyHighscore[] = [...perWeekTop.values()].sort(
      (a, b) => a.week - b.week
    )
    const seasonHighscore = weeklyHighscores.reduce<WeeklyHighscore | undefined>(
      (best, s) => (!best || s.points > best.points ? s : best),
      undefined
    )

    return { entries, weeklyHighscores, seasonHighscore }
  } catch (error) {
    console.error(`Error computing leaderboard for ${type} ${season}:`, error)
    return { entries: [], weeklyHighscores: [] }
  }
}
