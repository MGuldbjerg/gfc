import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAdminEmails } from '@/auth.config'
import { hentAktuelSæson } from '@/lib/seasonConfig'
import { byggUgeresume } from '@/lib/ugeresume'
import { slaaOpPaaSiden, tjekSideAdgang, type OpslagsTilstand } from '@/lib/facebook'

export const dynamic = 'force-dynamic'

const TILSTANDE: OpslagsTilstand[] = ['udgiv', 'planlaeg', 'kladde']

async function erAdmin() {
  const session = await auth()
  return Boolean(session?.user?.email && getAdminEmails().includes(session.user.email))
}

// Status på Facebook-forbindelsen — bruges af admin-UI'et til at vise om
// token'et virker, uden at slå noget op.
export async function GET() {
  if (!(await erAdmin())) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 403 })
  }
  return NextResponse.json(await tjekSideAdgang())
}

// Slår ugeresuméet op på GFC's Facebook-side.
// Body: { tekst?, week?, tilstand?, planlaegMinutter? }
//   tekst    — hvis den er med, slås præcis den tekst op (redigeret i admin).
//   week     — ellers genereres teksten for den uge.
//   tilstand — 'udgiv' (standard), 'planlaeg' eller 'kladde'.
export async function POST(req: NextRequest) {
  if (!(await erAdmin())) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    tekst?: string
    week?: number
    tilstand?: string
    planlaegMinutter?: number
  }

  const tilstand: OpslagsTilstand = TILSTANDE.includes(body.tilstand as OpslagsTilstand)
    ? (body.tilstand as OpslagsTilstand)
    : 'udgiv'

  let tekst = body.tekst?.trim()

  if (!tekst) {
    const week = Number(body.week)
    if (!Number.isFinite(week)) {
      return NextResponse.json({ error: 'Angiv enten tekst eller uge' }, { status: 400 })
    }
    const resume = await byggUgeresume(await hentAktuelSæson(), Math.min(17, Math.max(1, week)))
    if (!resume.harData) {
      return NextResponse.json(
        { error: `Ingen kampdata for uge ${resume.week} endnu — intet at slå op.` },
        { status: 400 }
      )
    }
    tekst = resume.facebook
  }

  try {
    const resultat = await slaaOpPaaSiden(tekst, tilstand, body.planlaegMinutter)
    return NextResponse.json(resultat)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Kunne ikke slå op på Facebook' },
      { status: 502 }
    )
  }
}
