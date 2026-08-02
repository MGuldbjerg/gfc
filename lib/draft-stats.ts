import {
  fetchDraft,
  fetchDraftPicks,
  fetchPlayers,
  playerLabel,
  type SleeperPlayer,
} from './sleeper'
import { type LeagueType } from './leagues'
import { hentAlleLigaer } from './seasonConfig'

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

// Live status per Sleeper draft. Slow drafts run for weeks, so a season can be
// half-drafted for a long stretch — the page shows this next to the ADP tables
// so thin numbers are read in context.
export interface DraftProgress {
  name: string
  leagueType: LeagueType
  status: DraftStatus
  picksMade: number
  totalPicks: number
}

export type DraftStatus = 'ikke-startet' | 'i-gang' | 'pause' | 'afsluttet'

export interface DraftStatistics {
  topADP: ADPStats[]
  adpSwings: ADPStats[]
  mostConsistent: ADPStats[]
  perFormat: {
    managed: ADPStats[]
    bestball: ADPStats[]
    chopped: ADPStats[]
  }
  progress: DraftProgress[]
  /** True while at least one draft in the season is unfinished. */
  igangværende: boolean
}

export async function calculateDraftStatistics(season: string): Promise<DraftStatistics> {
  const leagues = (await hentAlleLigaer()).filter(l => l.season === season && l.sleeperId)
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
          if (!draft?.draft_id) return { league, picks: [] as Pick[], draft: null }
          const picks = (await fetchDraftPicks(draft.draft_id)) as Pick[]
          return { league, picks, draft }
        } catch {
          return { league, picks: [] as Pick[], draft: null }
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
  const choppedOnly = collectPicks(
    draftsPerLeague.filter(d => d.league.leagueType === 'chopped'),
    players,
  )

  const progress: DraftProgress[] = draftsPerLeague.map(({ league, picks, draft }) => {
    const picksMade = picks.filter(p => p.player_id).length
    const rounds = draft?.settings?.rounds ?? 0
    const teams = draft?.settings?.teams ?? 0
    return {
      name: league.name,
      leagueType: league.leagueType,
      status: draftStatus(draft?.status, picksMade),
      picksMade,
      totalPicks: rounds * teams,
    }
  })

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
      chopped: choppedOnly.sort((a, b) => a.adp - b.adp).slice(0, 25),
    },
    progress,
    igangværende: progress.some(p => p.status !== 'afsluttet'),
  }
}

// Sleeper reports 'paused' both for a commissioner pause and for the nightly
// pause window of a slow draft, so a paused draft with picks on the board is
// still under way — only 'complete' ends it.
function draftStatus(raw: string | null | undefined, picksMade: number): DraftStatus {
  if (raw === 'complete') return 'afsluttet'
  if (raw === 'paused') return picksMade > 0 ? 'pause' : 'ikke-startet'
  if (raw === 'drafting') return 'i-gang'
  return picksMade > 0 ? 'i-gang' : 'ikke-startet'
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
    perFormat: { managed: [], bestball: [], chopped: [] },
    progress: [],
    igangværende: false,
  }
}
