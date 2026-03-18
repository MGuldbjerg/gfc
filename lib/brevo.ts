// Brevo e-mail og kontakthåndtering

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

// Tilføj eller opdater kontakt i Brevo
export async function upsertKontakt({
  email,
  displayName,
  sleeperUsername,
  sæson,
}: {
  email: string
  displayName: string
  sleeperUsername: string
  sæson: string
}) {
  await brevoFetch('/contacts', 'POST', {
    email,
    attributes: {
      FORNAVN: displayName,
      SLEEPER: sleeperUsername,
      SAESON: sæson,
    },
    listIds: [GFC_LIST_ID],
    updateEnabled: true, // opdater hvis kontakten allerede findes
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

function baseLayout(indhold: string) {
  return `<!DOCTYPE html>
<html lang="da">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center;">
            <p style="margin:0;font-size:32px;">🏈</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">Guldbjergs Fantasy Challenge</h1>
          </td>
        </tr>
        <tr><td style="padding:32px;color:#e2e8f0;">${indhold}</td></tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #334155;text-align:center;">
            <a href="https://gfc-seven.vercel.app" style="color:#818cf8;font-size:12px;text-decoration:none;">gfc-seven.vercel.app</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function velkomstHtml({ displayName, sæson }: { displayName: string; sæson: string }) {
  return baseLayout(`
    <h2 style="margin:0 0 16px;color:#fff;font-size:20px;">Hej ${displayName}!</h2>
    <p style="margin:0 0 12px;line-height:1.6;">Du er nu tilmeldt <strong>GFC ${sæson}</strong> — Danmarks største fantasy football-konkurrence.</p>
    <p style="margin:0 0 12px;line-height:1.6;">Du vil modtage en ny mail, når du er blevet tildelt en liga og drafts nærmer sig.</p>
    <p style="margin:0 0 24px;line-height:1.6;">Følg med på leaderboardet, efterhånden som sæsonen skrider frem.</p>
    <table cellpadding="0" cellspacing="0"><tr><td>
      <a href="https://gfc-seven.vercel.app/leaderboard"
         style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
        Se leaderboard
      </a>
    </td></tr></table>
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
  return baseLayout(`
    <h2 style="margin:0 0 16px;color:#fff;font-size:20px;">Hej ${displayName}!</h2>
    <p style="margin:0 0 12px;line-height:1.6;">Du er nu tildelt din liga i <strong>GFC ${sæson}</strong>:</p>
    <div style="background:#0f172a;border-radius:8px;padding:20px;margin:0 0 24px;text-align:center;">
      <p style="margin:0;font-size:28px;font-weight:700;color:#818cf8;">${ligaNavn}</p>
    </div>
    <p style="margin:0 0 24px;line-height:1.6;">Klik på knappen nedenfor for at gå til din liga på Sleeper og gøre dig klar til draft.</p>
    <table cellpadding="0" cellspacing="0"><tr><td>
      <a href="${sleeperLigaUrl}"
         style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
        Gå til min liga på Sleeper
      </a>
    </td></tr></table>
  `)
}
