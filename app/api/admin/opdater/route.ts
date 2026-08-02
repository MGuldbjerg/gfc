// Admin-only "Opdater nu": does exactly what the Tuesday cron does, on demand.
// Same work as /api/revalidate, but gated on an admin session instead of
// CRON_SECRET so it can be triggered from a button in the admin UI.

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { computeLeaderboard, type LeaderboardType } from '@/lib/leaderboard'
import { execute } from '@/lib/turso'
import { hentAktuelSæson } from '@/lib/seasonConfig'

const TYPES: LeaderboardType[] = ['bestball', 'managed', 'chopped']

export async function POST() {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const sæson = await hentAktuelSæson()

  const resultater = await Promise.allSettled(
    TYPES.map(async type => {
      const data = await computeLeaderboard(type, sæson)
      await execute(
        `INSERT INTO leaderboard_cache (id, season, league_type, data, fetched_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(season, league_type) DO UPDATE SET
           data = excluded.data,
           fetched_at = excluded.fetched_at`,
        [`${sæson}-${type}`, sæson, type, JSON.stringify(data)]
      )
      return { type, hold: data.entries.length }
    })
  )

  const fejl = resultater
    .filter(r => r.status === 'rejected')
    .map(r => (r as PromiseRejectedResult).reason?.message ?? String((r as PromiseRejectedResult).reason))

  const opdateret = resultater.flatMap(r =>
    r.status === 'fulfilled' ? [r.value] : []
  )

  revalidatePath('/leaderboard')
  revalidatePath('/historie')
  revalidatePath('/')

  return NextResponse.json({
    ok: fejl.length === 0,
    sæson,
    opdateret,
    tidspunkt: new Date().toISOString(),
    ...(fejl.length > 0 && { fejl }),
  })
}
