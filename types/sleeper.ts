// Sleeper API-typer

export interface SleeperLeague {
  league_id: string
  name: string
  season: string
  status: string
  sport: string
  total_rosters: number
  settings: {
    playoff_week_start: number
    [key: string]: unknown
  }
}

export interface SleeperUser {
  user_id: string
  display_name: string
  username: string
  avatar?: string
}

export interface SleeperRoster {
  roster_id: number
  owner_id: string
  league_id: string
  settings: {
    wins: number
    losses: number
    fpts: number
    fpts_decimal?: number
    [key: string]: unknown
  }
  metadata?: {
    team_name?: string
    [key: string]: unknown
  }
}

export interface SleeperMatchup {
  roster_id: number
  matchup_id: number | null
  points: number
  players?: string[]
  starters?: string[]
}

export interface SleeperDraftPick {
  round: number
  roster_id: number
  player_id: string
  picked_by: string
  pick_no: number
  metadata: {
    first_name: string
    last_name: string
    position: string
    team: string
    [key: string]: unknown
  }
}

export interface SleeperDraft {
  draft_id: string
  league_id: string
  type: string
  status: string
  season: string
  settings: {
    rounds: number
    teams: number
    [key: string]: unknown
  }
}

// Interne typer til platformen

export type LeagueType = 'bestball' | 'managed' | 'chopped'

export interface GFCLeague {
  id: string
  name: string // fx "BB1", "M3"
  sleeperId: string
  type: LeagueType
  season: string // fx "2026"
}

export interface LeaderboardEntry {
  rank: number
  username: string
  displayName: string
  league: string
  leagueType: LeagueType
  totalPoints: number
  wins?: number
  losses?: number
  weeklyScores: Record<number, number> // uge -> point
  highestWeeklyScore: number
  highestWeeklyScoreWeek: number
}

export interface WeeklyHighscore {
  username: string
  displayName: string
  league: string
  leagueType: LeagueType
  week: number
  points: number
}

export interface DraftADP {
  playerId: string
  playerName: string
  position: string
  nflTeam: string
  picks: number[] // pick-numre på tværs af ligaer
  adp: number
  adpManaged?: number
  adpBestball?: number
  minPick: number
  maxPick: number
  spread: number // max - min
}
