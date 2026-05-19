// Sleeper API smoke-test endpoint. Visit /api/sleeper/test in the browser.

import { NextResponse } from 'next/server'
import { fetchLeague, fetchRosters, fetchUsers } from '@/lib/sleeper'

// 2025 BB1 — a known-good public league.
const TEST_LEAGUE_ID = '1256384368658632704'

export async function GET() {
  const [league, rosters, users] = await Promise.all([
    fetchLeague(TEST_LEAGUE_ID),
    fetchRosters(TEST_LEAGUE_ID),
    fetchUsers(TEST_LEAGUE_ID),
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
    brugere: Object.values(users ?? {}).map(u => u.display_name),
  })
}
