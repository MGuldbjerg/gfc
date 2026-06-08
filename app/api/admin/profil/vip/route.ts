// Sets the VIP tag on a profile. Admin only.
// A profile is at most one VIP type — 'amerikansk', 'dansk' or 'none' —
// so the two flags are mutually exclusive (enforced here).

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { execute } from '@/lib/turso'

const VIP_TYPER = ['amerikansk', 'dansk', 'none'] as const
type VipType = (typeof VIP_TYPER)[number]

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const { profileId, vip } = await req.json()
  if (!profileId || !VIP_TYPER.includes(vip as VipType)) {
    return NextResponse.json({ error: 'Manglende parametre' }, { status: 400 })
  }

  await execute(
    'UPDATE profiles SET er_amerikansk_vip = ?, er_dansk_vip = ?, updated_at = datetime(\'now\') WHERE id = ?',
    [vip === 'amerikansk' ? 1 : 0, vip === 'dansk' ? 1 : 0, profileId]
  )

  return NextResponse.json({ ok: true })
}
