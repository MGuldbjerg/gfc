/**
 * Sleeper API client for fetching league and user data
 */

const SLEEPER_BASE_URL = 'https://api.sleeper.app/v1'

export interface SleeperUser {
  user_id: string
  username: string
  display_name: string
  avatar?: string | null
}

export interface SleeperRoster {
  roster_id: number
  owner_id: string
  co_owners?: string[] | null
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

export interface SleeperState {
  week: number
  season: string
  season_type: string
  leg: number
}

// Current NFL state (season, week). Used to suggest a default week for the
// weekly-summary generator. Returns null on any failure — callers fall back.
export async function fetchState(sport = 'nfl'): Promise<SleeperState | null> {
  const res = await fetch(`${SLEEPER_BASE_URL}/state/${sport}`, { next: { revalidate: 3600 } })
  if (!res.ok) return null
  return res.json().catch(() => null)
}

export async function getUserByUsername(username: string): Promise<SleeperUser | null> {
  const res = await fetch(`${SLEEPER_BASE_URL}/user/${encodeURIComponent(username)}`)
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  if (!data || typeof data !== 'object' || !('user_id' in data)) return null
  return data as SleeperUser
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

export interface SleeperMatchup {
  roster_id: number
  matchup_id: number | null
  points: number
  starters: string[]
  players: string[]
}

export async function fetchMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]> {
  const res = await fetch(`${SLEEPER_BASE_URL}/league/${leagueId}/matchups/${week}`)
  if (!res.ok) throw new Error(`Sleeper API error: ${res.status}`)
  return res.json()
}

// Sleeper returns an array of drafts (most leagues have one, but the endpoint
// is plural). We surface the most recently created one for compatibility with
// callers that expect a single draft object.
export async function fetchDraft(leagueId: string): Promise<{ draft_id: string } | null> {
  const res = await fetch(`${SLEEPER_BASE_URL}/league/${leagueId}/drafts`)
  if (!res.ok) throw new Error(`Sleeper API error: ${res.status}`)
  const drafts = await res.json()
  if (!Array.isArray(drafts) || drafts.length === 0) return null
  // Sort by `created` desc (epoch ms), then pick the first.
  drafts.sort((a, b) => (b?.created ?? 0) - (a?.created ?? 0))
  return drafts[0]
}

export async function fetchDraftPicks(draftId: string) {
  const res = await fetch(`${SLEEPER_BASE_URL}/draft/${draftId}/picks`)
  if (!res.ok) throw new Error(`Sleeper API error: ${res.status}`)
  return res.json()
}

export interface SleeperPlayer {
  player_id: string
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
  position?: string | null
  team?: string | null
}

// Fetch the full NFL player dictionary. ~5MB — Next.js fetch cache holds it
// for a day so day-to-day pages are fast.
export async function fetchPlayers(): Promise<Record<string, SleeperPlayer>> {
  const res = await fetch(`${SLEEPER_BASE_URL}/players/nfl`, {
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error(`Sleeper API error: ${res.status}`)
  return res.json()
}

export function playerLabel(p: SleeperPlayer | undefined, fallback: string): string {
  if (!p) return fallback
  const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ')
  const pos = p.position ? ` (${p.position}${p.team ? ' ' + p.team : ''})` : p.team ? ` (${p.team})` : ''
  return name ? `${name}${pos}` : fallback
}

// Legacy aliases — older code uses get* names. Keep both to avoid churn.
export const getLeague = fetchLeague
export const getRosters = fetchRosters
export const getUsers = fetchUsers
export const getMatchups = fetchMatchups
export const getDrafts = fetchDraft
export const getDraftPicks = fetchDraftPicks
