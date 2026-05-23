// Called daily by GitHub Actions. Emails a digest of the last 24h of activity
// (new profiles + new season registrations) to ADMIN_EMAILS. Sends nothing if
// there were no signups — no noise on quiet days.

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/turso'
import { emailBaseLayout, EMAIL_COLORS } from '@/lib/brevo'
import { SITE_URL } from '@/lib/site-url'

const BREVO_BASE = 'https://api.brevo.com/v3'

type NyProfilRow = {
  display_name: string
  username: string
  email: string | null
  created_at: string
}

type NyTilmeldingRow = {
  display_name: string
  username: string
  season: string
  preferred_types: string | null
  created_at: string
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (auth !== expected) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 })
  }

  const nyeProfiler = await query<NyProfilRow>(`
    SELECT p.display_name, p.username, u.email, p.created_at
      FROM profiles p
 LEFT JOIN authjs_user u ON u.id = p.id
     WHERE p.created_at > datetime('now', '-1 day')
     ORDER BY p.created_at DESC
  `)

  const nyeTilmeldinger = await query<NyTilmeldingRow>(`
    SELECT p.display_name, p.username, r.season, r.preferred_types, r.created_at
      FROM registrations r
      JOIN profiles p ON p.id = r.profile_id
     WHERE r.created_at > datetime('now', '-1 day')
     ORDER BY r.created_at DESC
  `)

  const total = nyeProfiler.length + nyeTilmeldinger.length
  if (total === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: 'no activity' })
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  if (adminEmails.length === 0) {
    return NextResponse.json({ ok: false, error: 'No ADMIN_EMAILS configured' })
  }

  const subject = `GFC: ${total} ny${total === 1 ? '' : 'e'} hændelse${total === 1 ? '' : 'r'} sidste 24t`
  const htmlContent = buildDigestHtml(nyeProfiler, nyeTilmeldinger)

  const res = await fetch(`${BREVO_BASE}/smtp/email`, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: adminEmails.map(email => ({ email })),
      sender: {
        name: 'Guldbjergs Fantasy Challenge',
        email: process.env.BREVO_SENDER_EMAIL,
      },
      subject,
      htmlContent,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('Brevo digest failed:', res.status, text)
    return NextResponse.json({ ok: false, error: text }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    nyeProfiler: nyeProfiler.length,
    nyeTilmeldinger: nyeTilmeldinger.length,
  })
}

function buildDigestHtml(profiler: NyProfilRow[], tilmeldinger: NyTilmeldingRow[]): string {
  const rækker = (raw: string | null) => {
    if (!raw) return '—'
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.join(', ') : '—'
    } catch {
      return '—'
    }
  }

  const sektion = (titel: string, indhold: string) =>
    `<h3 style="margin:24px 0 10px;color:${EMAIL_COLORS.ink};font-size:13px;letter-spacing:0.06em;text-transform:uppercase;font-weight:600;">${titel}</h3>${indhold}`

  const profilListe = profiler.length === 0
    ? `<p style="color:${EMAIL_COLORS.muted};margin:0;font-size:14px;">Ingen.</p>`
    : `<ul style="margin:0;padding-left:18px;color:${EMAIL_COLORS.ink};font-size:14px;line-height:1.7;">` +
      profiler.map(p =>
        `<li>${escapeHtml(p.display_name)} <span style="color:${EMAIL_COLORS.muted};">(@${escapeHtml(p.username)})${p.email ? ` · ${escapeHtml(p.email)}` : ''}</span></li>`
      ).join('') +
      `</ul>`

  const tilmeldListe = tilmeldinger.length === 0
    ? `<p style="color:${EMAIL_COLORS.muted};margin:0;font-size:14px;">Ingen.</p>`
    : `<ul style="margin:0;padding-left:18px;color:${EMAIL_COLORS.ink};font-size:14px;line-height:1.7;">` +
      tilmeldinger.map(t =>
        `<li>${escapeHtml(t.display_name)} → ${escapeHtml(t.season)} <span style="color:${EMAIL_COLORS.muted};">(${escapeHtml(rækker(t.preferred_types))})</span></li>`
      ).join('') +
      `</ul>`

  return emailBaseLayout(`
    <h2 style="margin:16px 0 4px;color:${EMAIL_COLORS.ink};font-size:22px;font-weight:700;letter-spacing:-0.02em;">Daglig aktivitet</h2>
    <p style="margin:0 0 4px;font-size:13px;color:${EMAIL_COLORS.muted};">Sidste 24 timer</p>
    ${sektion(`Nye profiler (${profiler.length})`, profilListe)}
    ${sektion(`Nye sæson-tilmeldinger (${tilmeldinger.length})`, tilmeldListe)}
    <p style="margin:28px 0 0;color:${EMAIL_COLORS.muted};font-size:13px;">
      Se hele oversigten på
      <a href="${SITE_URL}/admin" style="color:${EMAIL_COLORS.accent};text-decoration:none;font-weight:600;">/admin</a>.
    </p>
  `)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
