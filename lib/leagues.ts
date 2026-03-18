// Konfiguration af alle GFC-ligaer på tværs af sæsoner

import type { GFCLeague } from '@/types/sleeper'

// 2026-sæsonen — TODO: Mikkel indsætter liga-ID'er når de er oprettet i Sleeper
const LEAGUES_2026: GFCLeague[] = [
  // Indsæt 2026 Sleeper liga-ID'er her når de er oprettet
  // { id: 'M1', name: 'M1', sleeperId: 'XXXX', type: 'managed', season: '2026' },
]

// 2025-sæsonen (fra eksisterende app.R — verificeret via API, status: complete)
const LEAGUES_2025: GFCLeague[] = [
  // Managed
  { id: 'M1_2025', name: 'M1', sleeperId: '1256387533722365952', type: 'managed', season: '2025' },
  { id: 'M2_2025', name: 'M2', sleeperId: '1256388144274604032', type: 'managed', season: '2025' },
  { id: 'M3_2025', name: 'M3', sleeperId: '1256388355424268288', type: 'managed', season: '2025' },
  { id: 'M4_2025', name: 'M4', sleeperId: '1256388555077324800', type: 'managed', season: '2025' },
  { id: 'M5_2025', name: 'M5', sleeperId: '1256388811772936192', type: 'managed', season: '2025' },
  // Bestball
  { id: 'BB1_2025', name: 'BB1', sleeperId: '1256384368658632704', type: 'bestball', season: '2025' },
  { id: 'BB2_2025', name: 'BB2', sleeperId: '1256385813147566080', type: 'bestball', season: '2025' },
  { id: 'BB3_2025', name: 'BB3', sleeperId: '1256386180920901632', type: 'bestball', season: '2025' },
  { id: 'BB4_2025', name: 'BB4', sleeperId: '1256386439235518464', type: 'bestball', season: '2025' },
  { id: 'BB5_2025', name: 'BB5', sleeperId: '1256386762435997696', type: 'bestball', season: '2025' },
  { id: 'BB6_2025', name: 'BB6', sleeperId: '1256387182386499584', type: 'bestball', season: '2025' },
]

// 2024-sæsonen — TODO: Mikkel indsætter liga-ID'er
const LEAGUES_2024: GFCLeague[] = [
  // Indsæt Sleeper liga-ID'er her når de er fundet
  // { id: 'M1_2024', name: 'M1', sleeperId: 'XXXX', type: 'managed', season: '2024' },
]

export const ALL_LEAGUES: GFCLeague[] = [
  ...LEAGUES_2026,
  ...LEAGUES_2025,
  ...LEAGUES_2024,
]

export function getLeaguesBySeason(season: string): GFCLeague[] {
  return ALL_LEAGUES.filter(l => l.season === season)
}

export function getLeaguesByType(type: GFCLeague['type'], season?: string): GFCLeague[] {
  return ALL_LEAGUES.filter(
    l => l.type === type && (season ? l.season === season : true)
  )
}

export const CURRENT_SEASON = '2025' // Opdateres til '2026' når ny sæson oprettes
export const PLAYOFF_START_WEEK = 15
export const REGULAR_SEASON_WEEKS = 14
