// Persists the league assignment and sends notification emails.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { execute } from '@/lib/turso'
import { sendLigaTildeling } from '@/lib/brevo'
import type { LigaForslag } from '@/lib/fordeling'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })

  const { ligaer, sæson }: { ligaer: LigaForslag[]; sæson: string } = await req.json()

  let tildelt = 0
  const fejl: string[] = []

  for (const liga of ligaer) {
    for (const deltager of liga.deltagere) {
      try {
        await execute(
          `UPDATE registrations
             SET assigned_league_name = ?,
                 status = 'assigned'
           WHERE id = ?`,
          [liga.ligaNavn, deltager.registrationId]
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        fejl.push(`${deltager.displayName}: ${msg}`)
        continue
      }

      tildelt++

      // Brevo notification — non-blocking, silent on failure.
      supabase.auth.admin?.getUserById(deltager.profileId)
        .then(({ data }) => {
          if (!data?.user?.email) return
          sendLigaTildeling({
            email: data.user.email,
            displayName: deltager.displayName,
            ligaNavn: liga.ligaNavn,
            sleeperLigaUrl: 'https://sleeper.com/leagues',
            sæson,
          }).catch(() => {})
        })
        .catch(() => {})
    }
  }

  return NextResponse.json({ ok: true, tildelt, fejl })
}
