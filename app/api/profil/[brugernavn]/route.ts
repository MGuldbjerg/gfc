// Returnerer profildata inkl. privatlivspræferencer til ProfilModal

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { hentProfilData } from '@/lib/profil'
import { beregnBadges } from '@/lib/badges'

export const revalidate = 3600

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ brugernavn: string }> }
) {
  const { brugernavn } = await params
  const username = decodeURIComponent(brugernavn)

  // Hent præferencer fra Supabase (profiler er offentligt læsbare)
  const supabase = await createClient()
  const { data: præferencer } = await supabase
    .from('profiles')
    .select('vis_sleeper_username, vis_badges')
    .eq('username', username)
    .single()

  // Hent Sleeper-data (alle ligaer brugeren har deltaget i)
  const profil = await hentProfilData(username)
  if (!profil) {
    return NextResponse.json({ error: 'Profil ikke fundet' }, { status: 404 })
  }

  const badges = beregnBadges(profil.sæsoner, profil.sleeperUserId)

  return NextResponse.json({
    displayName: profil.displayName,
    sleeperUsername: profil.sleeperUsername,
    sleeperAvatar: profil.sleeperAvatar,
    sæsoner: profil.sæsoner,
    badges,
    vis_sleeper_username: præferencer?.vis_sleeper_username ?? true,
    vis_badges: præferencer?.vis_badges ?? true,
  })
}
