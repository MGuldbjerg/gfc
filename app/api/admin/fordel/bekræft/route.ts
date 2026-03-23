// Gemmer fordelingen i Supabase og sender liga-tildeling e-mails

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
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
      const { error } = await supabase
        .from('registrations')
        .update({
          assigned_league_name: liga.ligaNavn,
          status: 'assigned',
        })
        .eq('id', deltager.registrationId)

      if (error) {
        fejl.push(`${deltager.displayName}: ${error.message}`)
        continue
      }

      tildelt++

      // Hent e-mail fra Supabase Auth og send tildeling
      // (Brevo-afsendelse er ikke-blokerende — fejler stille hvis API-nøgle mangler)
      supabase.auth.admin?.getUserById(deltager.profileId)
        .then(({ data }) => {
          if (!data?.user?.email) return
          sendLigaTildeling({
            email: data.user.email,
            displayName: deltager.displayName,
            ligaNavn: liga.ligaNavn,
            sleeperLigaUrl: `https://sleeper.com/leagues`,
            sæson,
          }).catch(() => {}) // ignorér Brevo-fejl indtil API-nøgle er sat
        })
        .catch(() => {})
    }
  }

  return NextResponse.json({ ok: true, tildelt, fejl })
}
