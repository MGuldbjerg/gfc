// Returns profile data incl. privacy preferences for ProfilModal.

import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/turso'
import { hentProfilData } from '@/lib/profil'
import { beregnBadges } from '@/lib/badges'
import { listSæsoner, listAfsluttedeSæsoner, hentSingleWeekRekord, hentSæsonVinder } from '@/lib/historie'

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

  const afsluttedeSæsoner = await listAfsluttedeSæsoner()
  const leagueTypes = ['bestball', 'managed', 'chopped'] as const

  const [ugeRekorder, sæsonVindere] = await Promise.all([
    Promise.all(afsluttedeSæsoner.flatMap(s => leagueTypes.map(t => hentSingleWeekRekord(s, t)))),
    Promise.all(afsluttedeSæsoner.flatMap(s => leagueTypes.map(t => hentSæsonVinder(s, t)))),
  ])

  const erUgeRekordHolder = ugeRekorder.some(r => r?.username === profil.sleeperUsername)
  const erSæsonVinder = sæsonVindere.some(r => r?.username === profil.sleeperUsername)

  const badges = beregnBadges(profil.sæsoner, profil.sleeperUserId, {
    erUgeRekordHolder,
    erSæsonVinder,
    alleKendteSæsoner: await listSæsoner(),
  })

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
