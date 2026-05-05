'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { DraftStatistics, ADPStats } from '@/lib/draft-stats'

export default function DraftStatisticsPage() {
  const [stats, setStats] = useState<DraftStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDraftStats() {
      try {
        setLoading(true)
        setError(null)

        // Call API endpoint
        const res = await fetch('/api/draft-statistics')
        if (!res.ok) throw new Error('Kunne ikke hente draft-statistik')

        const data = await res.json()
        setStats(data)
      } catch (err) {
        console.error('Failed to load draft stats:', err)
        setError('Kunne ikke indlæse draft-statistik. Drafts er muligvis ikke færdige endnu.')
      } finally {
        setLoading(false)
      }
    }

    loadDraftStats()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500">Indlæser draft-statistik...</div>
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

  if (!stats) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500">Ingen data tilgængelig</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Tilbage
          </Link>
          <h1 className="text-4xl font-bold mt-4 mb-2">📊 Draft-statistik</h1>
          <p className="text-gray-400">ADP, udsving, og drafttendenser på tværs af ligaer</p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top ADP */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">📈 Højeste ADP (mest valgt)</h2>
            <StatisticsTable stats={stats.topADP} columns={['playerName', 'adp', 'picks']} />
          </section>

          {/* Biggest Swings */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">⚡ Største udsving</h2>
            <StatisticsTable
              stats={stats.adpSwings}
              columns={['playerName', 'minPick', 'maxPick', 'variance']}
            />
          </section>

          {/* Most Consistent */}
          <section className="lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">✅ Mest konsistente picks</h2>
            <StatisticsTable
              stats={stats.mostConsistent}
              columns={['playerName', 'adp', 'minPick', 'maxPick']}
            />
          </section>
        </div>

        <p className="text-center text-gray-700 text-xs mt-10">
          Data fra Sleeper Draft API · Opdateret efter draftets afslutning
        </p>
      </div>
    </main>
  )
}

interface TableProps {
  stats: ADPStats[]
  columns: Array<'playerName' | 'adp' | 'picks' | 'minPick' | 'maxPick' | 'variance'>
}

function StatisticsTable({ stats, columns }: TableProps) {
  if (stats.length === 0) {
    return <p className="text-gray-600 text-sm">Ingen data tilgængelig</p>
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-800">
            {columns.includes('playerName') && <th className="text-left px-4 py-3">Spiller</th>}
            {columns.includes('adp') && <th className="text-right px-4 py-3">ADP</th>}
            {columns.includes('picks') && <th className="text-right px-4 py-3">Picks</th>}
            {columns.includes('minPick') && <th className="text-right px-4 py-3">Min</th>}
            {columns.includes('maxPick') && <th className="text-right px-4 py-3">Max</th>}
            {columns.includes('variance') && <th className="text-right px-4 py-3">Udsving</th>}
          </tr>
        </thead>
        <tbody>
          {stats.slice(0, 20).map((stat, idx) => (
            <tr key={stat.playerId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              {columns.includes('playerName') && (
                <td className="px-4 py-3">
                  <div className="font-medium">{stat.playerName}</div>
                </td>
              )}
              {columns.includes('adp') && (
                <td className="px-4 py-3 text-right font-mono text-indigo-400">
                  {stat.adp.toFixed(1)}
                </td>
              )}
              {columns.includes('picks') && (
                <td className="px-4 py-3 text-right font-mono">{stat.picks}</td>
              )}
              {columns.includes('minPick') && (
                <td className="px-4 py-3 text-right font-mono text-green-400">{stat.minPick}</td>
              )}
              {columns.includes('maxPick') && (
                <td className="px-4 py-3 text-right font-mono text-red-400">{stat.maxPick}</td>
              )}
              {columns.includes('variance') && (
                <td className="px-4 py-3 text-right font-mono text-orange-400">{stat.variance}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
