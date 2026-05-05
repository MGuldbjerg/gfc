import { fetchDraft, fetchDraftPicks, fetchRosters, fetchUsers } from './sleeper'
import { ALL_LEAGUES } from './leagues'

export interface ADPStats {
  playerId: string
  playerName: string
  adp: number // Average Draft Position (1-based)
  minPick: number
  maxPick: number
  variance: number
  picks: number // How many times drafted
}

export interface DraftStatistics {
  topADP: ADPStats[]
  adpSwings: ADPStats[] // Largest variance
  mostConsistent: ADPStats[]
  adpManagedVsbestball: {
    managed: ADPStats[]
    bestball: ADPStats[]
  }
}

/**
 * Calculate Average Draft Position (ADP) and related statistics
 */
export async function calculateDraftStatistics(season: string): Promise<DraftStatistics> {
  const picksByPlayer = new Map<string, { picks: number[]; playerName: string }>()

  // Fetch draft data from all leagues
  const leaguesToFetch = ALL_LEAGUES.filter((l) => l.season === season && l.sleeperId)

  await Promise.all(
    leaguesToFetch.map(async (league) => {
      try {
        const draft = await fetchDraft(league.sleeperId)
        if (!draft || !draft.draft_id) return

        const picks = await fetchDraftPicks(draft.draft_id)
        const rosters = await fetchRosters(league.sleeperId)
        const users = await fetchUsers(league.sleeperId)

        // Create a map of roster_id -> player_id
        const rosterPlayerMap = new Map<number, string>()
        rosters.forEach((roster) => {
          rosterPlayerMap.set(roster.roster_id, users[roster.owner_id]?.user_id || '')
        })

        // Process picks
        for (const pick of picks) {
          if (!pick.player_id) continue

          // Try to get player name from pick metadata
          const playerName = pick.player_id || `Player ${pick.player_id}`
          const pickPosition = pick.pick_no || 0

          if (!picksByPlayer.has(pick.player_id)) {
            picksByPlayer.set(pick.player_id, { picks: [], playerName })
          }

          const data = picksByPlayer.get(pick.player_id)!
          data.picks.push(pickPosition)
        }
      } catch (error) {
        console.error(`Failed to fetch draft stats for league ${league.sleeperId}:`, error)
      }
    })
  )

  // Calculate ADP for each player
  const adpList: ADPStats[] = Array.from(picksByPlayer.entries()).map(([playerId, data]) => {
    const picks = data.picks.sort((a, b) => a - b)
    const adp = picks.reduce((sum, p) => sum + p, 0) / picks.length
    const minPick = Math.min(...picks)
    const maxPick = Math.max(...picks)
    const variance = maxPick - minPick

    return {
      playerId,
      playerName: data.playerName,
      adp,
      minPick,
      maxPick,
      variance,
      picks: picks.length,
    }
  })

  // Sort by ADP
  adpList.sort((a, b) => a.adp - b.adp)

  return {
    topADP: adpList.slice(0, 20),
    adpSwings: [...adpList].sort((a, b) => b.variance - a.variance).slice(0, 20),
    mostConsistent: [...adpList]
      .filter((p) => p.picks >= 3) // Only players drafted 3+ times
      .sort((a, b) => a.variance - b.variance)
      .slice(0, 20),
    adpManagedVsbestball: {
      managed: [],
      bestball: [],
    },
  }
}
