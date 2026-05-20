// Returns the list of registered (not yet assigned) participants for the current season.
// Used by the admin assignment page to populate the VIP-pin dropdown.

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query } from '@/lib/turso'
import { CURRENT_SEASON } from '@/lib/leagues'

type DeltagerRow = {
  profile_id: string
  display_name: string
  username: string
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const rows = await query<DeltagerRow>(
    `SELECT p.id AS profile_id, p.display_name, p.username
       FROM registrations r
       JOIN profiles p ON p.id = r.profile_id
      WHERE r.season = ?
      ORDER BY p.display_name`,
    [CURRENT_SEASON]
  )

  return NextResponse.json({ deltagere: rows })
}
