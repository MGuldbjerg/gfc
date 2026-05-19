import {
  fetchDraft,
  fetchDraftPicks,
  fetchPlayers,
  playerLabel,
  type SleeperPlayer,
} from './sleeper'
import { ALL_LEAGUES, type LeagueType } from './leagues'

export interface ADPStats {
  playerId: string
  playerName: string
  position: string | null
  adp: number          // Average draft position (1-based, overall pick number)
  minPick: number
  maxPick: number
  variance: number     // maxPick - minPick
  picks: number        // How many leagues drafted this player
}

export interface DraftStatistics {
  topADP: ADPStats[]
  adpSwings: ADPStats[]
  mostConsistent: ADPStats[]
  perFormat: {
    managed: ADPStats[]
    bestball: ADPStats[]
  }
}

export async function calculateDraftStatistics(season: string): Promise<DraftStatistics> {
  const leagues = ALL_LEAGUES.filter(l => l.season === season && l.sleeperId)
  if (leagues.length === 0) {
    return emptyStats()
  }

  // Fetch the players dictionary once (cached) plus all draft picks in parallel.
  const [players, draftsPerLeague] = await Promise.all([
    fetchPlayers().catch(() => ({} as Record<string, SleeperPlayer>)),
    Promise.all(
      leagues.map(async league => {
        try {
          const draft = await fetchDraft(league.sleeperId)
          if (!draft?.draft_id) return { league, picks: [] as Pick[] }
          const picks = (await fetchDraftPicks(draft.draft_id)) as Pick[]
          return { league, picks }
        } catch {
          return { league, picks: [] as Pick[] }
        }
      })
    ),
  ])

  const overall = collectPicks(draftsPerLeague, players)
  const managedOnly = collectPicks(
    draftsPerLeague.filter(d => d.league.leagueType === 'managed'),
    players,
  )
  const bestballOnly = collectPicks(
    draftsPerLeague.filter(d => d.league.leagueType === 'bestball'),
    players,
  )

  return {
    topADP: [...overall].sort((a, b) => a.adp - b.adp).slice(0, 25),
    adpSwings: [...overall]
      .filter(p => p.picks >= 2)
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 25),
    mostConsistent: [...overall]
      .filter(p => p.picks >= 3)
      .sort((a, b) => a.variance - b.variance)
      .slice(0, 25),
    perFormat: {
      managed: managedOnly.sort((a, b) => a.adp - b.adp).slice(0, 25),
      bestball: bestballOnly.sort((a, b) => a.adp - b.adp).slice(0, 25),
    },
  }
}

interface Pick {
  player_id?: string | null
  pick_no?: number | null
}

interface DraftBundle {
  league: { leagueType: LeagueType }
  picks: Pick[]
}

function collectPicks(
  drafts: DraftBundle[],
  players: Record<string, SleeperPlayer>,
): ADPStats[] {
  const byPlayer = new Map<string, number[]>()

  for (const { picks } of drafts) {
    for (const pick of picks) {
      if (!pick.player_id || !pick.pick_no) continue
      const list = byPlayer.get(pick.player_id) ?? []
      list.push(pick.pick_no)
      byPlayer.set(pick.player_id, list)
    }
  }

  return Array.from(byPlayer.entries()).map(([playerId, picks]) => {
    const sum = picks.reduce((a, b) => a + b, 0)
    return {
      playerId,
      playerName: playerLabel(players[playerId], `Spiller ${playerId}`),
      position: players[playerId]?.position ?? null,
      adp: sum / picks.length,
      minPick: Math.min(...picks),
      maxPick: Math.max(...picks),
      variance: Math.max(...picks) - Math.min(...picks),
      picks: picks.length,
    }
  })
}

function emptyStats(): DraftStatistics {
  return {
    topADP: [],
    adpSwings: [],
    mostConsistent: [],
    perFormat: { managed: [], bestball: [] },
  }
}
