// Sleeper API-klient

import type {
  SleeperLeague,
  SleeperUser,
  SleeperRoster,
  SleeperMatchup,
  SleeperDraft,
  SleeperDraftPick,
} from '@/types/sleeper'

const BASE = 'https://api.sleeper.app/v1'

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchSleeper<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${endpoint}`, {
      next: { revalidate: 3600 }, // cache 1 time
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

export async function getLeague(leagueId: string): Promise<SleeperLeague | null> {
  return fetchSleeper<SleeperLeague>(`/league/${leagueId}`)
}

export async function getRosters(leagueId: string): Promise<SleeperRoster[] | null> {
  return fetchSleeper<SleeperRoster[]>(`/league/${leagueId}/rosters`)
}

export async function getUsers(leagueId: string): Promise<SleeperUser[] | null> {
  return fetchSleeper<SleeperUser[]>(`/league/${leagueId}/users`)
}

export async function getMatchups(
  leagueId: string,
  week: number
): Promise<SleeperMatchup[] | null> {
  return fetchSleeper<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`)
}

export async function getDrafts(leagueId: string): Promise<SleeperDraft[] | null> {
  return fetchSleeper<SleeperDraft[]>(`/league/${leagueId}/drafts`)
}

export async function getDraftPicks(draftId: string): Promise<SleeperDraftPick[] | null> {
  return fetchSleeper<SleeperDraftPick[]>(`/draft/${draftId}/picks`)
}

export async function getUserByUsername(username: string): Promise<SleeperUser | null> {
  return fetchSleeper<SleeperUser>(`/user/${username}`)
}

// Hent alle matchup-data for uge 1-17 med rate-limiting
export async function getAllMatchups(
  leagueId: string,
  maxWeek = 17
): Promise<Record<number, SleeperMatchup[]>> {
  const result: Record<number, SleeperMatchup[]> = {}

  for (let week = 1; week <= maxWeek; week++) {
    const matchups = await getMatchups(leagueId, week)
    if (matchups && matchups.length > 0 && matchups.some(m => m.points > 0)) {
      result[week] = matchups
    }
    await sleep(100) // rate-limiting
  }

  return result
}

// Byg roster_id → username-mapping for en liga
export async function buildUserMap(
  leagueId: string
): Promise<Record<number, { username: string; displayName: string }>> {
  const [rosters, users] = await Promise.all([
    getRosters(leagueId),
    getUsers(leagueId),
  ])

  if (!rosters || !users) return {}

  const userById: Record<string, SleeperUser> = {}
  for (const user of users) {
    userById[user.user_id] = user
  }

  const map: Record<number, { username: string; displayName: string }> = {}
  for (const roster of rosters) {
    const user = userById[roster.owner_id]
    if (user) {
      map[roster.roster_id] = {
        username: user.username,
        displayName: user.display_name,
      }
    }
  }

  return map
}
