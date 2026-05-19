// Called daily by GitHub Actions. Emails a digest of the last 24h of activity
// (new profiles + new season registrations) to ADMIN_EMAILS. Sends nothing if
// there were no signups — no noise on quiet days.

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/turso'

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
    `<h3 style="margin:24px 0 8px;color:#fff;font-size:16px;">${titel}</h3>${indhold}`

  const profilListe = profiler.length === 0
    ? '<p style="color:#94a3b8;margin:0;">Ingen.</p>'
    : `<ul style="margin:0;padding-left:18px;color:#e2e8f0;">` +
      profiler.map(p =>
        `<li>${escapeHtml(p.display_name)} (@${escapeHtml(p.username)})${p.email ? ` · ${escapeHtml(p.email)}` : ''}</li>`
      ).join('') +
      `</ul>`

  const tilmeldListe = tilmeldinger.length === 0
    ? '<p style="color:#94a3b8;margin:0;">Ingen.</p>'
    : `<ul style="margin:0;padding-left:18px;color:#e2e8f0;">` +
      tilmeldinger.map(t =>
        `<li>${escapeHtml(t.display_name)} → ${escapeHtml(t.season)} (${escapeHtml(rækker(t.preferred_types))})</li>`
      ).join('') +
      `</ul>`

  return `<!DOCTYPE html>
<html lang="da"><body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;max-width:600px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px;">
    <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600;">GFC — Daglig aktivitet</h1>
    <p style="margin:4px 0 0;color:#c7d2fe;font-size:13px;">Sidste 24 timer</p>
  </td></tr>
  <tr><td style="padding:24px;color:#e2e8f0;">
    ${sektion(`Nye profiler (${profiler.length})`, profilListe)}
    ${sektion(`Nye sæson-tilmeldinger (${tilmeldinger.length})`, tilmeldListe)}
    <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;">
      Se hele oversigten på
      <a href="https://gfc-seven.vercel.app/admin" style="color:#818cf8;">/admin</a>.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
