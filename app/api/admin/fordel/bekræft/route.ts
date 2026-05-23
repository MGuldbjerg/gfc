// Persists the league assignment and sends notification emails.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { execute, queryOne } from '@/lib/turso'
import { sendLigaTildeling } from '@/lib/brevo'
import type { LigaForslag } from '@/lib/fordeling'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const { ligaer, sæson }: { ligaer: LigaForslag[]; sæson: string } = await req.json()

  let tildelt = 0
  const fejl: string[] = []

  for (const liga of ligaer) {
    const sleeperLigaUrl = liga.sleeperId
      ? `https://sleeper.com/leagues/${liga.sleeperId}`
      : 'https://sleeper.com/leagues'

    for (const deltager of liga.deltagere) {
      try {
        await execute(
          `UPDATE registrations
             SET assigned_league_name = ?,
                 assigned_league_id   = ?,
                 status               = 'assigned'
           WHERE id = ?`,
          [liga.ligaNavn, liga.sleeperId ?? null, deltager.registrationId]
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        fejl.push(`${deltager.displayName}: ${msg}`)
        continue
      }

      tildelt++

      // Best-effort notification — non-blocking. Log failures so silent
      // breakage in Brevo is visible in Vercel logs.
      ;(async () => {
        const userRow = await queryOne<{ email: string }>(
          'SELECT email FROM authjs_user WHERE id = ?',
          [deltager.profileId]
        )
        if (!userRow?.email) return
        await sendLigaTildeling({
          email: userRow.email,
          displayName: deltager.displayName,
          ligaNavn: liga.ligaNavn,
          sleeperLigaUrl,
          sæson,
        })
      })().catch((err) => {
        console.error(`sendLigaTildeling failed for ${deltager.displayName}:`, err)
      })
    }
  }

  return NextResponse.json({ ok: true, tildelt, fejl })
}
