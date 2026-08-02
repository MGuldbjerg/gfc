import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAdminEmails } from '@/auth.config'
import { hentAktuelSæson } from '@/lib/seasonConfig'
import { fetchState } from '@/lib/sleeper'
import { byggUgeresume } from '@/lib/ugeresume'

export const dynamic = 'force-dynamic'

// Genererer et skabelonbaseret ugeresumé (Facebook-tekst + nyhedsmail-tekst)
// ud fra live Sleeper-data. Admin-only. ?week=N — udelades den, foreslås den
// aktuelle NFL-uge fra Sleeper.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email || !getAdminEmails().includes(session.user.email)) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 403 })
  }

  const weekParam = req.nextUrl.searchParams.get('week')
  let week = weekParam ? parseInt(weekParam, 10) : NaN
  if (!Number.isFinite(week)) {
    const state = await fetchState('nfl')
    week = state?.week ?? 1
  }
  week = Math.min(17, Math.max(1, week))

  const resultat = await byggUgeresume(await hentAktuelSæson(), week)
  return NextResponse.json(resultat)
}
