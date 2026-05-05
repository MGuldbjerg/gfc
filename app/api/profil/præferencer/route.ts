// PATCH — opdater privatlivspræferencer for logget bruger

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { tilføjTilNyhedsbrevsliste, fjernFraNyhedsbrevsliste } from '@/lib/brevo'

export async function PATCH(req: NextRequest) {
  const { visSleeper, visBadges, nyhedsbrev } = await req.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
  }

  // Hent nuværende nyhedsbrev-status for at vide om den ændres
  const { data: nuværende } = await supabase
    .from('profiles')
    .select('nyhedsbrev')
    .eq('id', user.id)
    .single()

  const { error } = await supabase
    .from('profiles')
    .update({
      vis_sleeper_username: visSleeper ?? true,
      vis_badges: visBadges ?? true,
      nyhedsbrev: nyhedsbrev ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Kunne ikke gemme indstillinger' }, { status: 500 })
  }

  // Synk med Brevo-liste hvis nyhedsbrev-status ændres
  if (user.email && nuværende && nuværende.nyhedsbrev !== nyhedsbrev) {
    const email = user.email
    if (nyhedsbrev) {
      tilføjTilNyhedsbrevsliste({ email }).catch(err => console.error('Brevo-fejl:', err))
    } else {
      fjernFraNyhedsbrevsliste({ email }).catch(err => console.error('Brevo-fejl:', err))
    }
  }

  return NextResponse.json({ ok: true })
}
