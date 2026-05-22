// Toggles er_amerikansk_vip on a profile. Admin only.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { execute } from '@/lib/turso'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const { profileId, erAmerikanskVip } = await req.json()
  if (!profileId || typeof erAmerikanskVip !== 'boolean') {
    return NextResponse.json({ error: 'Manglende parametre' }, { status: 400 })
  }

  await execute(
    'UPDATE profiles SET er_amerikansk_vip = ? WHERE id = ?',
    [erAmerikanskVip ? 1 : 0, profileId]
  )

  return NextResponse.json({ ok: true })
}
