// Badge-definitioner og auto-tildeling fra Sleeper-data

export type BadgeType =
  | 'og'
  | 'champ'
  | 'liga_vinder'
  | 'peak'
  | 'raketstart'
  | 'ugens_bomber'
  | 'konsistent_konge'
  | 'clutch'
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
    beskrivelse: 'Vundet GFC-sæsonkonkurrencen inkl. slutspil',
    farve: 'bg-gradient-to-br from-yellow-500 to-yellow-700',
  },
  liga_vinder: {
    id: 'liga_vinder',
    emoji: '🥇',
    navn: 'W',
    beskrivelse: 'Vundet sin Sleeper-liga i grundspillet',
    farve: 'bg-gradient-to-br from-emerald-500 to-teal-700',
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
    emoji: '📈',
    navn: 'Stabil streak',
    beskrivelse: 'Aldrig i bundhalvdelen i mere end 2 uger på en hel sæson',
    farve: 'bg-gradient-to-br from-yellow-500 to-amber-600',
  },
  clutch: {
    id: 'clutch',
    emoji: '🎯',
    navn: 'Clutch',
    beskrivelse: 'Vandt en managed-kamp med under 3 point',
    farve: 'bg-gradient-to-br from-green-600 to-emerald-600',
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
  opts?: { erUgeRekordHolder?: boolean; erSæsonVinder?: boolean }
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

  // Champ — won the season-long GFC contest incl. playoffs (passed from caller)
  if (opts?.erSæsonVinder) earned.add('champ')

  for (const s of sæsoner) {
    // W — won their individual Sleeper league in the regular season
    if (s.rangPlacering === 1) earned.add('liga_vinder')

    // Konsistent kong — bottom half in at most 2 weeks across the season
    if (s.weeklyRangs.length >= 10) {
      const bundUger = s.weeklyRangs.filter(w => w.rang > Math.floor(w.antalHold / 2))
      if (bundUger.length <= 2) earned.add('konsistent_konge')
    }
  }

  return [...earned]
}
