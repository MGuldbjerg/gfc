// Test-endpoint: verificér at Sleeper API virker
// Besøg /api/sleeper/test i browseren

import { NextResponse } from 'next/server'
import { getLeague, getRosters, getUsers } from '@/lib/sleeper'

// BB1 fra 2026 som testliga
const TEST_LEAGUE_ID = '1256384368658632704'

export async function GET() {
  const [league, rosters, users] = await Promise.all([
    getLeague(TEST_LEAGUE_ID),
    getRosters(TEST_LEAGUE_ID),
    getUsers(TEST_LEAGUE_ID),
  ])

  if (!league) {
    return NextResponse.json({ ok: false, error: 'Kunne ikke hente liga' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    liga: {
      id: league.league_id,
      navn: league.name,
      sæson: league.season,
      status: league.status,
      holdantal: league.total_rosters,
    },
    rosters: rosters?.length ?? 0,
    brugere: users?.map(u => u.display_name) ?? [],
  })
}
