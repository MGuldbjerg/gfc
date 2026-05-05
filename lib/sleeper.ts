/**
 * Sleeper API client for fetching league and user data
 */

const SLEEPER_BASE_URL = 'https://api.sleeper.app/v1'

export interface SleeperUser {
  user_id: string
  username: string
  display_name: string
}

export interface SleeperRoster {
  roster_id: number
  owner_id: string
  players: string[] | null
  settings: {
    wins?: number
    losses?: number
    ties?: number
    fpts?: number
    fpts_decimal?: number
    fpts_for?: number
    fpts_for_decimal?: number
    fpts_against?: number
    fpts_against_decimal?: number
  }
}

export async function fetchLeague(leagueId: string) {
  const res = await fetch(`${SLEEPER_BASE_URL}/league/${leagueId}`)
  if (!res.ok) throw new Error(`Sleeper API error: ${res.status}`)
  return res.json()
}

export async function fetchRosters(leagueId: string): Promise<SleeperRoster[]> {
  const res = await fetch(`${SLEEPER_BASE_URL}/league/${leagueId}/rosters`)
  if (!res.ok) throw new Error(`Sleeper API error: ${res.status}`)
  return res.json()
}

export async function fetchUsers(leagueId: string): Promise<Record<string, SleeperUser>> {
  const res = await fetch(`${SLEEPER_BASE_URL}/league/${leagueId}/users`)
  if (!res.ok) throw new Error(`Sleeper API error: ${res.status}`)
  const users = await res.json()

  // Convert array to object keyed by user_id
  const userMap: Record<string, SleeperUser> = {}
  if (Array.isArray(users)) {
    users.forEach((u: SleeperUser) => {
      userMap[u.user_id] = u
    })
  } else {
    return users
  }

  return userMap
}

export async function fetchMatchups(leagueId: string, week: number) {
  const res = await fetch(`${SLEEPER_BASE_URL}/league/${leagueId}/matchups/${week}`)
  if (!res.ok) throw new Error(`Sleeper API error: ${res.status}`)
  return res.json()
}

export async function fetchDraft(leagueId: string) {
  const res = await fetch(`${SLEEPER_BASE_URL}/league/${leagueId}/draft`)
  if (!res.ok) throw new Error(`Sleeper API error: ${res.status}`)
  return res.json()
}

export async function fetchDraftPicks(draftId: string) {
  const res = await fetch(`${SLEEPER_BASE_URL}/draft/${draftId}/picks`)
  if (!res.ok) throw new Error(`Sleeper API error: ${res.status}`)
  return res.json()
}
