// Kaldes af GitHub Actions hver tirsdag — henter friske data fra Sleeper, gemmer i
// leaderboard_cache og beder Next.js genindlæse siden.

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { computeLeaderboard, type LeaderboardType } from '@/lib/leaderboard'
import { execute } from '@/lib/turso'
import { CURRENT_SEASON } from '@/lib/leagues'

const TYPES: LeaderboardType[] = ['bestball', 'managed', 'chopped']

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`

  if (auth !== expected) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const results = await Promise.allSettled(
    TYPES.map(async (type) => {
      const data = await computeLeaderboard(type, CURRENT_SEASON)
      await execute(
        `INSERT INTO leaderboard_cache (id, season, league_type, data, fetched_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(season, league_type) DO UPDATE SET
           data = excluded.data,
           fetched_at = excluded.fetched_at`,
        [`${CURRENT_SEASON}-${type}`, CURRENT_SEASON, type, JSON.stringify(data)]
      )
      return type
    })
  )

  const fejl = results
    .filter((r) => r.status === 'rejected')
    .map((r) => (r as PromiseRejectedResult).reason?.message ?? String((r as PromiseRejectedResult).reason))

  revalidatePath('/leaderboard')
  revalidatePath('/historie')

  return NextResponse.json({
    ok: fejl.length === 0,
    opdateret: new Date().toISOString(),
    ...(fejl.length > 0 && { fejl }),
  })
}
