// Returns profile data incl. privacy preferences for ProfilModal.

import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/turso'
import { hentProfilData } from '@/lib/profil'
import { beregnBadges } from '@/lib/badges'

export const revalidate = 3600

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ brugernavn: string }> }
) {
  const { brugernavn } = await params
  const username = decodeURIComponent(brugernavn)

  // Profiles are publicly readable — no auth needed.
  const præferencer = await queryOne<{ vis_sleeper_username: number; vis_badges: number }>(
    'SELECT vis_sleeper_username, vis_badges FROM profiles WHERE username = ?',
    [username]
  )

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
    vis_sleeper_username: præferencer ? præferencer.vis_sleeper_username === 1 : true,
    vis_badges: præferencer ? præferencer.vis_badges === 1 : true,
  })
}
