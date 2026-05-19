export type LeaderboardEntry = {
  rank: number
  username: string
  displayName: string
  leagueType: 'bestball' | 'managed' | 'chopped'
  totalPoints: number
  wins?: number
}

export interface WeeklyHighscore {
  displayName: string
  league: string
  week: number
  points: number
}

export interface SeasonHighscore {
  displayName: string
  league: string
  week: number
  points: number
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[]
  weeklyHighscores: WeeklyHighscore[]
  seasonHighscore?: SeasonHighscore
}

export interface GFCLeague {
  season: string
  leagueType: 'bestball' | 'managed' | 'chopped'
  name: string
  sleeperId: string
}
