// Opretter profil i Supabase, tilmelding og synkroniserer til Brevo

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { upsertKontakt, sendVelkomstMail } from '@/lib/brevo'
import { getUserByUsername } from '@/lib/sleeper'

export async function POST(req: NextRequest) {
  const { email, displayName, sleeperUsername, valgteRækker, sæson } = await req.json()

  if (!email || !displayName || !sleeperUsername || !sæson) {
    return NextResponse.json({ error: 'Manglende felter' }, { status: 400 })
  }

  // Verificér at Sleeper-brugernavn eksisterer
  const sleeperUser = await getUserByUsername(sleeperUsername)
  if (!sleeperUser) {
    return NextResponse.json(
      { error: `Sleeper-brugernavnet "${sleeperUsername}" blev ikke fundet. Tjek stavning.` },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
  }

  // Opret profil
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    username: sleeperUsername,
    display_name: displayName,
    sleeper_user_id: sleeperUser.user_id,
  })

  if (profileError) {
    if (profileError.code === '23505') {
      return NextResponse.json(
        { error: 'Det Sleeper-brugernavn er allerede registreret.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Kunne ikke oprette profil' }, { status: 500 })
  }

  // Opret tilmelding
  await supabase.from('registrations').upsert({
    profile_id: user.id,
    season: sæson,
    preferred_types: valgteRækker,
    status: 'registered',
  })

  // Sync til Brevo og send velkomstmail (ikke blokerende)
  Promise.all([
    upsertKontakt({ email, displayName, sleeperUsername, sæson }),
    sendVelkomstMail({ email, displayName, sæson }),
  ]).catch(err => console.error('Brevo-fejl:', err))

  return NextResponse.json({ ok: true })
}
