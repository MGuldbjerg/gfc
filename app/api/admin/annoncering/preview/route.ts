import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAdminEmails } from '@/auth.config'
import { buildAnnonceringsHtml } from '@/lib/brevo'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email || !getAdminEmails().includes(session.user.email)) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 403 })
  }

  const { overskrift, brødtekst, ctaLabel, ctaUrl } = await req.json()

  const cta =
    ctaLabel?.trim() && ctaUrl?.trim()
      ? { label: ctaLabel.trim(), url: ctaUrl.trim() }
      : undefined

  const html = buildAnnonceringsHtml({
    overskrift: overskrift ?? '',
    brødtekst: brødtekst ?? '',
    cta,
  })

  return NextResponse.json({ html })
}
