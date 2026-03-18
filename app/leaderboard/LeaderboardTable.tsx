'use client'

import type { LeaderboardEntry } from '@/types/sleeper'

const RANK_STYLE: Record<number, string> = {
  1: 'text-yellow-400 font-bold',
  2: 'text-gray-300 font-bold',
  3: 'text-amber-600 font-bold',
}

const RANK_MEDAL: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
}

export default function LeaderboardTable({
  entries,
  type,
}: {
  entries: LeaderboardEntry[]
  type: 'bestball' | 'managed' | 'chopped'
}) {
  if (entries.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 text-gray-600 text-sm text-center">
        Ingen data endnu
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-800">
            <th className="text-center px-3 py-2 w-10">#</th>
            <th className="text-left px-3 py-2">Hold</th>
            <th className="text-left px-3 py-2">Liga</th>
            {type === 'managed' && (
              <th className="text-center px-3 py-2">W</th>
            )}
            <th className="text-right px-3 py-2">Point</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={`${entry.league}-${entry.username}`}
              className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
            >
              <td className={`text-center px-3 py-2 ${RANK_STYLE[entry.rank] ?? 'text-gray-500'}`}>
                {RANK_MEDAL[entry.rank] ?? entry.rank}
              </td>
              <td className="px-3 py-2 font-medium">{entry.displayName}</td>
              <td className="px-3 py-2 text-gray-500 text-xs">{entry.league}</td>
              {type === 'managed' && (
                <td className="px-3 py-2 text-center text-gray-400">{entry.wins ?? 0}</td>
              )}
              <td className="px-3 py-2 text-right font-mono text-green-400">
                {entry.totalPoints.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
