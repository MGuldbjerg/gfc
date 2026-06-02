// Brevo e-mail og kontakthåndtering

import { SITE_URL } from './site-url'

const API_KEY = process.env.BREVO_API_KEY!
const BASE = 'https://api.brevo.com/v3'
const GFC_LIST_ID = Number(process.env.BREVO_LIST_ID ?? '2') // Standard GFC-deltagerliste

async function brevoFetch(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: object
) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: {
      'api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok && res.status !== 204) {
    const text = await res.text()
    console.error(`Brevo fejl [${res.status}] ${endpoint}:`, text)
  }

  return res
}

// Add the contact to the newsletter list (idempotent — Brevo upserts).
export async function tilføjTilNyhedsbrevsliste({ email }: { email: string }) {
  await brevoFetch('/contacts', 'POST', {
    email,
    listIds: [GFC_LIST_ID],
    updateEnabled: true,
  })
}

// Remove the contact from the newsletter list.
export async function fjernFraNyhedsbrevsliste({ email }: { email: string }) {
  await brevoFetch(`/contacts/lists/${GFC_LIST_ID}/contacts/remove`, 'POST', {
    emails: [email],
  })
}

// Tilføj eller opdater kontakt i Brevo — tilføjer kun til listen hvis nyhedsbrev=true.
export async function upsertKontakt({
  email,
  displayName,
  sleeperUsername,
  sæson,
  nyhedsbrev,
}: {
  email: string
  displayName: string
  sleeperUsername: string
  sæson: string
  nyhedsbrev: boolean
}) {
  await brevoFetch('/contacts', 'POST', {
    email,
    attributes: {
      FORNAVN: displayName,
      SLEEPER: sleeperUsername,
      SAESON: sæson,
    },
    ...(nyhedsbrev ? { listIds: [GFC_LIST_ID] } : {}),
    updateEnabled: true,
  })
}

// Send magic-link login mail via Brevo transactional API.
export async function sendMagicLinkMail({
  email,
  url,
}: {
  email: string
  url: string
}) {
  await brevoFetch('/smtp/email', 'POST', {
    to: [{ email }],
    sender: { name: 'Guldbjergs Fantasy Challenge', email: process.env.BREVO_SENDER_EMAIL },
    subject: 'Log ind på Guldbjergs Fantasy Challenge',
    htmlContent: magicLinkHtml({ url }),
  })
}

// Send velkomstmail til ny deltager
export async function sendVelkomstMail({
  email,
  displayName,
  sæson,
}: {
  email: string
  displayName: string
  sæson: string
}) {
  await brevoFetch('/smtp/email', 'POST', {
    to: [{ email, name: displayName }],
    sender: { name: 'Guldbjergs Fantasy Challenge', email: process.env.BREVO_SENDER_EMAIL },
    subject: `Velkommen til GFC ${sæson}! 🏈`,
    htmlContent: velkomstHtml({ displayName, sæson }),
  })
}

// Send liga-tildeling til deltager
export async function sendLigaTildeling({
  email,
  displayName,
  ligaNavn,
  sleeperLigaUrl,
  sæson,
}: {
  email: string
  displayName: string
  ligaNavn: string
  sleeperLigaUrl: string
  sæson: string
}) {
  await brevoFetch('/smtp/email', 'POST', {
    to: [{ email, name: displayName }],
    sender: { name: 'Guldbjergs Fantasy Challenge', email: process.env.BREVO_SENDER_EMAIL },
    subject: `Din GFC ${sæson}-liga er klar: ${ligaNavn} 🏈`,
    htmlContent: ligaTildelingHtml({ displayName, ligaNavn, sleeperLigaUrl, sæson }),
  })
}

// --- E-mail-skabeloner -------------------------------------------------------
// Light design matching the live site. Uses hex colors (oklch not supported in
// most email clients) and system fonts (web fonts often blocked).

const COLORS = {
  bg: '#faf8f5',      // warm bone
  panel: '#ffffff',
  ink: '#1f1d1a',
  muted: '#85807a',
  line: '#e5e2dd',
  accent: '#d63b1f',  // signal red
}

function emailBaseLayout(indhold: string, domæneVisning = 'fantasychallenge.dk') {
  return `<!DOCTYPE html>
<html lang="da">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.ink};">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:48px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:${COLORS.panel};border:1px solid ${COLORS.line};border-radius:14px;max-width:560px;width:100%;">
        <tr>
          <td style="padding:32px 36px 8px;">
            <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${COLORS.muted};font-weight:600;">— Guldbjergs Fantasy Challenge</p>
          </td>
        </tr>
        <tr><td style="padding:8px 36px 32px;color:${COLORS.ink};line-height:1.6;">${indhold}</td></tr>
        <tr>
          <td style="padding:18px 36px;border-top:1px solid ${COLORS.line};text-align:center;">
            <a href="${SITE_URL}" style="color:${COLORS.muted};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;font-weight:600;">${domæneVisning}</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function emailButton(href: string, label: string) {
  return `<table cellpadding="0" cellspacing="0" role="presentation"><tr><td>
    <a href="${href}" style="display:inline-block;background:${COLORS.ink};color:${COLORS.bg};text-decoration:none;padding:13px 26px;border-radius:999px;font-weight:600;font-size:14px;letter-spacing:-0.005em;">
      ${label}
    </a>
  </td></tr></table>`
}

function magicLinkHtml({ url }: { url: string }) {
  return emailBaseLayout(`
    <h2 style="margin:16px 0 14px;color:${COLORS.ink};font-size:24px;font-weight:700;letter-spacing:-0.02em;">Klik for at logge ind</h2>
    <p style="margin:0 0 24px;font-size:15px;">Tryk på knappen nedenfor for at logge ind på Guldbjergs Fantasy Challenge. Linket virker i 24 timer.</p>
    ${emailButton(url, 'Log ind →')}
    <p style="margin:28px 0 0;font-size:13px;color:${COLORS.muted};">Hvis du ikke har bedt om at logge ind, kan du bare ignorere denne mail.</p>
  `)
}

function velkomstHtml({ displayName, sæson }: { displayName: string; sæson: string }) {
  return emailBaseLayout(`
    <h2 style="margin:16px 0 14px;color:${COLORS.ink};font-size:24px;font-weight:700;letter-spacing:-0.02em;">Hej ${displayName}</h2>
    <p style="margin:0 0 14px;font-size:15px;">Du er nu tilmeldt <strong>GFC ${sæson}</strong> — Danmarks største fantasy football-konkurrence.</p>
    <p style="margin:0 0 14px;font-size:15px;">Du vil modtage en ny mail, når du er blevet tildelt en liga og drafts nærmer sig.</p>
    <p style="margin:0 0 24px;font-size:15px;">Følg med på leaderboardet, efterhånden som sæsonen skrider frem.</p>
    ${emailButton(`${SITE_URL}/leaderboard`, 'Se leaderboard →')}
  `)
}

function ligaTildelingHtml({
  displayName,
  ligaNavn,
  sleeperLigaUrl,
  sæson,
}: {
  displayName: string
  ligaNavn: string
  sleeperLigaUrl: string
  sæson: string
}) {
  return emailBaseLayout(`
    <h2 style="margin:16px 0 14px;color:${COLORS.ink};font-size:24px;font-weight:700;letter-spacing:-0.02em;">Hej ${displayName}</h2>
    <p style="margin:0 0 18px;font-size:15px;">Du er nu tildelt din liga i <strong>GFC ${sæson}</strong>:</p>
    <div style="background:${COLORS.bg};border:1px solid ${COLORS.line};border-radius:10px;padding:24px;margin:0 0 24px;text-align:center;">
      <p style="margin:0;font-size:32px;font-weight:700;color:${COLORS.accent};letter-spacing:-0.02em;font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;">${ligaNavn}</p>
    </div>
    <p style="margin:0 0 24px;font-size:15px;">Klik på knappen nedenfor for at gå til din liga på Sleeper og gøre dig klar til draft.</p>
    ${emailButton(sleeperLigaUrl, 'Gå til min liga på Sleeper →')}
  `)
}

function annonceringsHtml({
  overskrift,
  brødtekst,
  cta,
}: {
  overskrift: string
  brødtekst: string
  cta?: { label: string; url: string }
}) {
  // Replace newlines with <br> so plain textarea input renders correctly.
  const bodyHtml = brødtekst
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => `<p style="margin:0 0 14px;font-size:15px;">${l}</p>`)
    .join('\n')

  return emailBaseLayout(`
    <h2 style="margin:16px 0 20px;color:${COLORS.ink};font-size:26px;font-weight:700;letter-spacing:-0.025em;line-height:1.2;">${overskrift}</h2>
    ${bodyHtml}
    ${cta ? `<div style="margin-top:24px;">${emailButton(cta.url, cta.label)}</div>` : ''}
  `)
}

// Send an announcement campaign to the GFC newsletter list via Brevo's
// campaign API (handles unsubscribe links automatically — correct for list sends).
export async function opretOgSendKampagne({
  subject,
  overskrift,
  brødtekst,
  cta,
}: {
  subject: string
  overskrift: string
  brødtekst: string
  cta?: { label: string; url: string }
}) {
  // 1. Create the campaign.
  const createRes = await brevoFetch('/emailCampaigns', 'POST', {
    name: `GFC — ${subject} (${new Date().toISOString().slice(0, 10)})`,
    subject,
    sender: {
      name: 'Guldbjergs Fantasy Challenge',
      email: process.env.BREVO_SENDER_EMAIL,
    },
    type: 'classic',
    htmlContent: annonceringsHtml({ overskrift, brødtekst, cta }),
    recipients: { listIds: [GFC_LIST_ID] },
  })

  if (!createRes.ok) {
    throw new Error(`Brevo kampagne-oprettelse fejlede: ${createRes.status}`)
  }

  const { id } = await createRes.json() as { id: number }

  // 2. Send immediately.
  const sendRes = await brevoFetch(`/emailCampaigns/${id}/sendNow`, 'POST')
  if (!sendRes.ok && sendRes.status !== 204) {
    throw new Error(`Brevo kampagne-afsendelse fejlede: ${sendRes.status}`)
  }

  return { kampagneId: id }
}

// Exported for reuse by other server-side mail (e.g. admin daily digest).
export { emailBaseLayout, COLORS as EMAIL_COLORS, emailButton }
