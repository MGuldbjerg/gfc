export type LeagueType = 'bestball' | 'managed'

export interface League {
  season: string
  leagueType: LeagueType
  name: string
  sleeperId: string
}

// 2024 Sleeper Liga-ID'er
const LEAGUES_2024 = {
  M1: '1121180960650878976',
  M2: '1121183078015148032',
  M3: '1121184019300851712',
  M4: '1121184998146592768',
  M5: '1121216960743854080',
  BB1: '1120810376901357568',
  BB2: '1120810934857052160',
  BB3: '1120811327129350144',
  BB4: '1120811543077212160',
  BB5: '1120811771759091712',
}

// 2025 Sleeper Liga-ID'er
const LEAGUES_2025 = {
  M1: '1256387533722365952',
  M2: '1256388144274604032',
  M3: '1256388355424268288',
  M4: '1256388555077324800',
  M5: '1256388811772936192',
  BB1: '1256384368658632704',
  BB2: '1256385813147566080',
  BB3: '1256386180920901632',
  BB4: '1256386439235518464',
  BB5: '1256386762435997696',
  BB6: '1256387182386499584',
}

export const ALL_LEAGUES: League[] = [
  // 2024
  { season: '2024', leagueType: 'managed', name: 'Managed 1', sleeperId: LEAGUES_2024.M1 },
  { season: '2024', leagueType: 'managed', name: 'Managed 2', sleeperId: LEAGUES_2024.M2 },
  { season: '2024', leagueType: 'managed', name: 'Managed 3', sleeperId: LEAGUES_2024.M3 },
  { season: '2024', leagueType: 'managed', name: 'Managed 4', sleeperId: LEAGUES_2024.M4 },
  { season: '2024', leagueType: 'managed', name: 'Managed 5', sleeperId: LEAGUES_2024.M5 },
  { season: '2024', leagueType: 'bestball', name: 'Bestball 1', sleeperId: LEAGUES_2024.BB1 },
  { season: '2024', leagueType: 'bestball', name: 'Bestball 2', sleeperId: LEAGUES_2024.BB2 },
  { season: '2024', leagueType: 'bestball', name: 'Bestball 3', sleeperId: LEAGUES_2024.BB3 },
  { season: '2024', leagueType: 'bestball', name: 'Bestball 4', sleeperId: LEAGUES_2024.BB4 },
  { season: '2024', leagueType: 'bestball', name: 'Bestball 5', sleeperId: LEAGUES_2024.BB5 },
  // 2025
  { season: '2025', leagueType: 'managed', name: 'Managed 1', sleeperId: LEAGUES_2025.M1 },
  { season: '2025', leagueType: 'managed', name: 'Managed 2', sleeperId: LEAGUES_2025.M2 },
  { season: '2025', leagueType: 'managed', name: 'Managed 3', sleeperId: LEAGUES_2025.M3 },
  { season: '2025', leagueType: 'managed', name: 'Managed 4', sleeperId: LEAGUES_2025.M4 },
  { season: '2025', leagueType: 'managed', name: 'Managed 5', sleeperId: LEAGUES_2025.M5 },
  { season: '2025', leagueType: 'bestball', name: 'Bestball 1', sleeperId: LEAGUES_2025.BB1 },
  { season: '2025', leagueType: 'bestball', name: 'Bestball 2', sleeperId: LEAGUES_2025.BB2 },
  { season: '2025', leagueType: 'bestball', name: 'Bestball 3', sleeperId: LEAGUES_2025.BB3 },
  { season: '2025', leagueType: 'bestball', name: 'Bestball 4', sleeperId: LEAGUES_2025.BB4 },
  { season: '2025', leagueType: 'bestball', name: 'Bestball 5', sleeperId: LEAGUES_2025.BB5 },
  { season: '2025', leagueType: 'bestball', name: 'Bestball 6', sleeperId: LEAGUES_2025.BB6 },
]
