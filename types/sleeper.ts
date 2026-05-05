export type LeaderboardEntry = {
  rank: number
  username: string
  displayName: string
  leagueType: 'bestball' | 'managed'
  totalPoints: number
  wins?: number
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[]
}
