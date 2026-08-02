// Henter og sammensætter profildata fra Sleeper API på tværs af sæsoner

import {
  getUserByUsername,
  getRosters,
  getMatchups,
  getDrafts,
} from './sleeper'
import { hentAlleLigaer } from './seasonConfig'
import type { GFCLeague } from '@/types/sleeper'

export interface UgeScore {
  uge: number
  point: number
}

export interface UgeRang {
  uge: number
  rang: number   // 1 = highest scorer that week in the league
  antalHold: number
}

export interface SæsonData {
  sæson: string
  ligaNavn: string
  leagueType: GFCLeague['leagueType']
  totalPoint: number
  wins?: number
  losses?: number
  weeklyScores: UgeScore[]
  weeklyRangs: UgeRang[]
  højesteSingleScore: number
  højesteSingleScoreUge: number
  rangPlacering: number | null   // rangplacering i ligaen
  antalHold: number
}

export interface ProfilData {
  displayName: string | null
  sleeperUsername: string
  sleeperUserId: string
  sleeperAvatar: string | null
  sæsoner: SæsonData[]
}

// Slå brugernavn op og hent all GFC-data
export async function hentProfilData(sleeperUsername: string): Promise<ProfilData | null> {
  const sleeperUser = await getUserByUsername(sleeperUsername)
  if (!sleeperUser) return null

  const sæsoner: SæsonData[] = []

  // Gennemgå alle kendte GFC-ligaer og find dem brugeren deltog i
  await Promise.all(
    (await hentAlleLigaer()).map(async (liga) => {
      const sæsonData = await hentLigaData(liga, sleeperUser.user_id)
      if (sæsonData) sæsoner.push(sæsonData)
    })
  )

  // Sorter sæsoner nyeste først
  sæsoner.sort((a, b) => b.sæson.localeCompare(a.sæson))

  return {
    displayName: sleeperUser.display_name,
    sleeperUsername: sleeperUser.username,
    sleeperUserId: sleeperUser.user_id,
    sleeperAvatar: sleeperUser.avatar ?? null,
    sæsoner,
  }
}

async function hentLigaData(
  liga: GFCLeague,
  userId: string
): Promise<SæsonData | null> {
  const rosters = await getRosters(liga.sleeperId)
  if (!rosters) return null

  // Find brugerens roster
  const roster = rosters.find(r => r.owner_id === userId)
  if (!roster) return null

  // Hent ugescorer for uge 1-17
  const weeklyScores: UgeScore[] = []
  const weeklyRangs: UgeRang[] = []
  for (let uge = 1; uge <= 17; uge++) {
    const matchups = await getMatchups(liga.sleeperId, uge)
    const matchup = matchups?.find(m => m.roster_id === roster.roster_id)
    if (matchup && matchup.points > 0) {
      weeklyScores.push({ uge, point: matchup.points })
      const allPoints = (matchups ?? []).map(m => m.points).filter(p => p > 0)
      const rang = allPoints.filter(p => p > matchup.points).length + 1
      weeklyRangs.push({ uge, rang, antalHold: allPoints.length })
    }
    await new Promise(r => setTimeout(r, 50)) // rate-limiting
  }

  const totalPoint = weeklyScores.reduce((s, w) => s + w.point, 0)
  const højeste = weeklyScores.reduce(
    (best, w) => w.point > best.point ? w : best,
    { uge: 0, point: 0 }
  )

  // Beregn rangplacering i ligaen (sorteret efter point for bestball, wins+point for managed)
  const rangPlacering = beregnRang(rosters, roster.roster_id, liga.leagueType)

  return {
    sæson: liga.season,
    ligaNavn: liga.name,
    leagueType: liga.leagueType,
    totalPoint: liga.leagueType === 'bestball' ? totalPoint : (
      (roster.settings.fpts ?? 0) + (roster.settings.fpts_decimal ?? 0) / 100
    ),
    wins: roster.settings.wins,
    losses: roster.settings.losses,
    weeklyScores,
    weeklyRangs,
    højesteSingleScore: højeste.point,
    højesteSingleScoreUge: højeste.uge,
    rangPlacering,
    antalHold: rosters.length,
  }
}

function beregnRang(
  rosters: Awaited<ReturnType<typeof getRosters>>,
  rosterIdSelf: number,
  type: GFCLeague['leagueType']
): number | null {
  if (!rosters) return null

  const sorteret = [...rosters].sort((a, b) => {
    if (type === 'managed') {
      const wDiff = (b.settings.wins ?? 0) - (a.settings.wins ?? 0)
      if (wDiff !== 0) return wDiff
    }
    const ptA = (a.settings.fpts ?? 0) + (a.settings.fpts_decimal ?? 0) / 100
    const ptB = (b.settings.fpts ?? 0) + (b.settings.fpts_decimal ?? 0) / 100
    return ptB - ptA
  })

  const idx = sorteret.findIndex(r => r.roster_id === rosterIdSelf)
  return idx === -1 ? null : idx + 1
}
