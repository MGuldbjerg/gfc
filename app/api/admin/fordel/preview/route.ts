// Beregner fordelingsforslag uden at gemme — bruges til preview

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { beregnFordeling, type Deltager } from '@/lib/fordeling'
import { CURRENT_SEASON } from '@/lib/leagues'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })

  const { ligaStørrelse = 12 } = await req.json().catch(() => ({}))

  const { data: tilmeldinger } = await supabase
    .from('registrations')
    .select('id, preferred_types, profiles(id, display_name, username)')
    .eq('season', CURRENT_SEASON)
    .eq('status', 'registered') // kun ikke-tildelte

  if (!tilmeldinger || tilmeldinger.length === 0) {
    return NextResponse.json({ ligaer: [], ikkeFordelbare: [] })
  }

  const deltagere: Deltager[] = tilmeldinger.flatMap(t => {
    const profil = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
    if (!profil) return []
    return [{
      profileId: profil.id,
      displayName: profil.display_name,
      sleeperUsername: profil.username,
      registrationId: t.id,
      preferredTypes: t.preferred_types ?? [],
    }]
  })

  const resultat = beregnFordeling(deltagere, ligaStørrelse)
  return NextResponse.json(resultat)
}
