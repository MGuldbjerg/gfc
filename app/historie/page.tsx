'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { computeLeaderboard } from '@/lib/leaderboard'
import { ALL_LEAGUES } from '@/lib/leagues'
import type { LeaderboardEntry, LeaderboardResult } from '@/types/sleeper'

type AggregatedEntry = LeaderboardEntry & {
  seasons: Set<string>
  allTimePoints: number
  allTimeWins: number
  appearances: number
}

export default function HistoriePage() {
  const [bestballData, setBestballData] = useState<AggregatedEntry[] | null>(null)
  const [managedData, setManagedData] = useState<AggregatedEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadHistoricalData() {
      try {
        setLoading(true)
        setError(null)

        // Get all unique seasons from leagues
        const seasons = Array.from(
          new Set(ALL_LEAGUES.map(l => l.season))
        ).sort().reverse()

        // Load data for both types across all seasons
        const [bestballResults, managedResults] = await Promise.all([
          Promise.all(
            seasons.map(season =>
              computeLeaderboard('bestball', season).catch(() => null)
            )
          ),
          Promise.all(
            seasons.map(season =>
              computeLeaderboard('managed', season).catch(() => null)
            )
          ),
        ])

        // Aggregate bestball data
        const bestballAgg = aggregateLeaderboards(
          bestballResults.filter((r): r is LeaderboardResult => r !== null),
          'bestball'
        )

        // Aggregate managed data
        const managedAgg = aggregateLeaderboards(
          managedResults.filter((r): r is LeaderboardResult => r !== null),
          'managed'
        )

        setBestballData(bestballAgg)
        setManagedData(managedAgg)
      } catch (err) {
        console.error('Failed to load historical data:', err)
        setError('Kunne ikke indlæse historiske data. Prøv igen senere.')
      } finally {
        setLoading(false)
      }
    }

    loadHistoricalData()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500">Indlæser historiske data...</div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            ← Aktuel sæson
          </Link>
          <h1 className="text-4xl font-bold mt-4 mb-2">📚 Historie</h1>
          <p className="text-gray-400">
            All-time leaderboards – bedste resultater på tværs af alle sæsoner
          </p>
        </div>

        {/* Two columns: Bestball and Managed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bestball */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">🎯 Bestball</h2>
            {bestballData && bestballData.length > 0 ? (
              <LeaderboardTable entries={bestballData} type="bestball" />
            ) : (
              <p className="text-gray-600">Ingen data tilgængelig</p>
            )}
          </section>

          {/* Managed */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">⚙️ Managed</h2>
            {managedData && managedData.length > 0 ? (
              <LeaderboardTable entries={managedData} type="managed" />
            ) : (
              <p className="text-gray-600">Ingen data tilgængelig</p>
            )}
          </section>
        </div>

        <p className="text-center text-gray-700 text-xs mt-10">
          Data fra Sleeper API · Pointene er aggregeret på tværs af sæsoner
        </p>
      </div>
    </main>
  )
}

function LeaderboardTable({
  entries,
  type,
}: {
  entries: AggregatedEntry[]
  type: 'bestball' | 'managed'
}) {
  if (entries.length === 0) {
    return <p className="text-gray-600 text-sm">Ingen deltagere</p>
  }

  const topEntries = entries.slice(0, 20)

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-800">
            <th className="text-left px-4 py-3">Plac.</th>
            <th className="text-left px-4 py-3">Hold</th>
            <th className="text-center px-4 py-3">Sæsoner</th>
            {type === 'managed' ? (
              <th className="text-right px-4 py-3">Vindinger</th>
            ) : null}
            <th className="text-right px-4 py-3">Point</th>
          </tr>
        </thead>
        <tbody>
          {topEntries.map((entry) => (
            <tr key={`${entry.username}-${entry.leagueType}`} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="px-4 py-3 font-bold text-indigo-400 w-10">{entry.rank}</td>
              <td className="px-4 py-3">
                <div className="font-medium">{entry.displayName}</div>
                <div className="text-gray-500 text-xs">{entry.username}</div>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="bg-gray-800 px-2 py-1 rounded text-xs">
                  {Array.from(entry.seasons).sort().join(', ')}
                </span>
              </td>
              {type === 'managed' ? (
                <td className="px-4 py-3 text-right font-mono">
                  {entry.allTimeWins}
                </td>
              ) : null}
              <td className="px-4 py-3 text-right font-mono text-green-400">
                {entry.allTimePoints.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Aggregate leaderboard entries across multiple seasons
 */
function aggregateLeaderboards(
  results: LeaderboardResult[],
  type: 'bestball' | 'managed'
): AggregatedEntry[] {
  const aggregated = new Map<string, AggregatedEntry>()

  for (const result of results) {
    for (const entry of result.entries) {
      const key = entry.username // Use username as unique key

      if (!aggregated.has(key)) {
        aggregated.set(key, {
          ...entry,
          seasons: new Set([entry.leagueType === type ? result.entries[0]?.league?.split(' ')[0] ?? '2024' : '2024']),
          allTimePoints: 0,
          allTimeWins: 0,
          appearances: 0,
        })
      }

      const agg = aggregated.get(key)!
      agg.allTimePoints += entry.totalPoints
      agg.allTimeWins += entry.wins ?? 0
      agg.appearances += 1

      // Try to extract season from league name or use other method
      // For now, seasons are added from league metadata if available
    }
  }

  // Convert to array and sort
  const arr = Array.from(aggregated.values())

  arr.sort((a, b) => {
    if (type === 'managed') {
      if (b.allTimeWins !== a.allTimeWins) return b.allTimeWins - a.allTimeWins
    }
    return b.allTimePoints - a.allTimePoints
  })

  // Assign ranks
  arr.forEach((entry, idx) => {
    entry.rank = idx + 1
  })

  return arr
}
