// Badge-definitioner og auto-tildeling fra Sleeper-data

export type BadgeType =
  | 'og'
  | 'champ'
  | 'peak'
  | 'raketstart'
  | 'ugens_bomber'
  | 'konsistent_konge'
  | 'clutch'
  | 'saesontop3'
  | 'saeson_veteran'
  | 'alltid_top20'

export interface BadgeDef {
  id: BadgeType
  emoji: string
  navn: string
  beskrivelse: string
  farve: string // Tailwind bg-klasse
}

export const BADGES: Record<BadgeType, BadgeDef> = {
  champ: {
    id: 'champ',
    emoji: '🏅',
    navn: 'Champ',
    beskrivelse: 'Vundet en sæsong-lang GFC-liga',
    farve: 'bg-gradient-to-br from-yellow-500 to-yellow-700',
  },
  peak: {
    id: 'peak',
    emoji: '⚡',
    navn: 'Peak',
    beskrivelse: 'Højeste enkelt-uge score i en GFC-liga nogensinde',
    farve: 'bg-gradient-to-br from-sky-500 to-blue-700',
  },
  og: {
    id: 'og',
    emoji: '🔥',
    navn: 'OG',
    beskrivelse: 'Deltaget i alle GFC-sæsoner fra starten',
    farve: 'bg-gradient-to-br from-yellow-600 to-orange-600',
  },
  raketstart: {
    id: 'raketstart',
    emoji: '🚀',
    navn: 'Raketstart',
    beskrivelse: 'Højeste score i uge 1',
    farve: 'bg-gradient-to-br from-blue-600 to-cyan-600',
  },
  ugens_bomber: {
    id: 'ugens_bomber',
    emoji: '💣',
    navn: 'Ugens bomber',
    beskrivelse: 'Højeste score i en enkelt uge',
    farve: 'bg-gradient-to-br from-red-600 to-pink-600',
  },
  konsistent_konge: {
    id: 'konsistent_konge',
    emoji: '👑',
    navn: 'Konsistent kong',
    beskrivelse: 'Top 3 i sin liga i 5 eller flere uger i træk',
    farve: 'bg-gradient-to-br from-yellow-500 to-amber-600',
  },
  clutch: {
    id: 'clutch',
    emoji: '🎯',
    navn: 'Clutch',
    beskrivelse: 'Vandt en managed-kamp med under 3 point',
    farve: 'bg-gradient-to-br from-green-600 to-emerald-600',
  },
  saesontop3: {
    id: 'saesontop3',
    emoji: '🏆',
    navn: 'Top 3',
    beskrivelse: 'Sluttede top 3 i sin liga',
    farve: 'bg-gradient-to-br from-indigo-600 to-purple-600',
  },
  saeson_veteran: {
    id: 'saeson_veteran',
    emoji: '⭐',
    navn: 'Veteran',
    beskrivelse: 'Deltaget i 2 eller flere GFC-sæsoner',
    farve: 'bg-gradient-to-br from-slate-500 to-slate-600',
  },
  alltid_top20: {
    id: 'alltid_top20',
    emoji: '📊',
    navn: 'All-time top 20',
    beskrivelse: 'Placeret i all-time top 20 på tværs af alle sæsoner',
    farve: 'bg-gradient-to-br from-violet-600 to-indigo-600',
  },
}

// Hvilke badges en bruger har optjent baseret på deres sæsondata
import type { SæsonData } from './profil'
import { ALL_LEAGUES } from './leagues'

export function beregnBadges(
  sæsoner: SæsonData[],
  sleeperUserId: string,
  opts?: { erUgeRekordHolder?: boolean }
): BadgeType[] {
  const earned = new Set<BadgeType>()

  const sæsonÅr = [...new Set(sæsoner.map(s => s.sæson))]
  const alleKendteSæsoner = [...new Set(ALL_LEAGUES.map(l => l.season))]

  // OG — deltaget i alle sæsoner
  const harAlleSæsoner = alleKendteSæsoner.every(år => sæsonÅr.includes(år))
  if (harAlleSæsoner && alleKendteSæsoner.length >= 2) earned.add('og')

  // Veteran — 2+ sæsoner
  if (sæsonÅr.length >= 2) earned.add('saeson_veteran')

  // Peak — all-time single-week record holder in any league (cross-player, passed from caller)
  if (opts?.erUgeRekordHolder) earned.add('peak')

  for (const s of sæsoner) {
    // Champ — vandt sin liga
    if (s.rangPlacering === 1) earned.add('champ')

    // Top 3 i liga
    if (s.rangPlacering !== null && s.rangPlacering <= 3) earned.add('saesontop3')

    // Konsistent kong — top 3 i liga i 5+ uger i træk (approximation via højeste scores)
    if (s.weeklyScores.length >= 5) {
      const topScorePerUge = s.weeklyScores.filter(w => w.point > 0)
      // Simpel check: gennemsnitsplacering baseret på om de er høje scorere
      const høje = topScorePerUge.filter(w => w.point >= s.totalPoint / s.weeklyScores.length * 1.1)
      if (høje.length >= 5) earned.add('konsistent_konge')
    }
  }

  return [...earned]
}
