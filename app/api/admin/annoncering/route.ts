import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAdminEmails } from '@/auth.config'
import { opretOgSendKampagne } from '@/lib/brevo'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email || !getAdminEmails().includes(session.user.email)) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 403 })
  }

  const { subject, overskrift, brødtekst, ctaLabel, ctaUrl } = await req.json()

  if (!subject?.trim() || !overskrift?.trim() || !brødtekst?.trim()) {
    return NextResponse.json({ error: 'Subject, overskrift og brødtekst er påkrævet' }, { status: 400 })
  }

  const cta =
    ctaLabel?.trim() && ctaUrl?.trim()
      ? { label: ctaLabel.trim(), url: ctaUrl.trim() }
      : undefined

  const { kampagneId } = await opretOgSendKampagne({
    subject: subject.trim(),
    overskrift: overskrift.trim(),
    brødtekst: brødtekst.trim(),
    cta,
  })

  return NextResponse.json({ ok: true, kampagneId })
}
