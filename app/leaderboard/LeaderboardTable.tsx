'use client'

import Link from 'next/link'
import type { LeaderboardEntry } from '@/types/sleeper'

function rankClass(rank: number) {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return ''
}

export default function LeaderboardTable({
  entries,
  type,
}: {
  entries: LeaderboardEntry[]
  type: 'bestball' | 'managed' | 'chopped'
}) {
  if (entries.length === 0) return null

  return (
    <table className="tbl">
      <thead>
        <tr>
          <th className="c">#</th>
          <th>Hold</th>
          {type === 'managed' && <th className="c">W</th>}
          <th className="r">Point</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(entry => {
          const rc = rankClass(entry.rank)
          return (
            <tr key={`${entry.leagueType}-${entry.username}`}>
              <td className={`rank ${rc}`}>
                {rc && <span className="rmark" aria-hidden />}
                {rc ? '' : entry.rank}
              </td>
              <td className="name">
                <Link href={`/profil/${entry.username}`}>
                  {entry.displayName}
                </Link>
              </td>
              {type === 'managed' && (
                <td className="c">{entry.wins ?? 0}</td>
              )}
              <td className="pts">{entry.totalPoints.toFixed(1)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
