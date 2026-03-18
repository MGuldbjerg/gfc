// Kaldes af GitHub Actions hver tirsdag — tvinger Next.js til at genindlæse leaderboard-data

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`

  if (auth !== expected) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  revalidatePath('/leaderboard')

  return NextResponse.json({
    ok: true,
    opdateret: new Date().toISOString(),
  })
}
