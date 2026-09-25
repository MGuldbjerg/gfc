#!/usr/bin/env node
// Bytter et kortlivet bruger-token til et langtidsholdbart SIDE-token, der ikke udløber.
//
// Sådan gør du:
//   1. developers.facebook.com → din app → Graph API Explorer
//   2. Vælg appen, tryk "Generate Access Token", godkend disse tilladelser:
//        pages_show_list, pages_manage_posts, pages_read_engagement
//   3. Kopiér det token (det holder kun ~1 time) og kør:
//
//   node scripts/facebook-token.mjs <APP_ID> <APP_SECRET> <KORTLIVET_BRUGER_TOKEN>
//
// Ud kommer Side-ID + Side-token, som sættes i Vercel som
// FACEBOOK_PAGE_ID og FACEBOOK_PAGE_ACCESS_TOKEN.

const GRAPH = 'https://graph.facebook.com/v25.0'

const [appId, appSecret, kortToken] = process.argv.slice(2)

if (!appId || !appSecret || !kortToken) {
  console.error('Brug: node scripts/facebook-token.mjs <APP_ID> <APP_SECRET> <KORTLIVET_BRUGER_TOKEN>')
  process.exit(1)
}

async function hent(sti) {
  const svar = await fetch(`${GRAPH}${sti}`)
  const data = await svar.json()
  if (!svar.ok) {
    throw new Error(data?.error?.message ?? `Facebook svarede ${svar.status}`)
  }
  return data
}

// 1) Kortlivet bruger-token → langtidsholdbart bruger-token (~60 dage)
const langt = await hent(
  `/oauth/access_token?grant_type=fb_exchange_token` +
  `&client_id=${encodeURIComponent(appId)}` +
  `&client_secret=${encodeURIComponent(appSecret)}` +
  `&fb_exchange_token=${encodeURIComponent(kortToken)}`
)

// 2) Side-tokens udledt af et langtidsholdbart bruger-token udløber ikke.
const sider = await hent(`/me/accounts?access_token=${encodeURIComponent(langt.access_token)}`)

if (!sider.data?.length) {
  console.error('Ingen sider fundet på kontoen. Har du givet pages_show_list og valgt siden?')
  process.exit(1)
}

console.log('\nFundne sider:\n')
for (const side of sider.data) {
  console.log(`  ${side.name}`)
  console.log(`    FACEBOOK_PAGE_ID=${side.id}`)
  console.log(`    FACEBOOK_PAGE_ACCESS_TOKEN=${side.access_token}\n`)
}

// 3) Bekræft at token'et faktisk ikke udløber.
const info = await hent(
  `/debug_token?input_token=${encodeURIComponent(sider.data[0].access_token)}` +
  `&access_token=${encodeURIComponent(langt.access_token)}`
)
const udloeber = info.data?.expires_at
console.log(
  udloeber === 0 || udloeber === undefined
    ? '✓ Side-token udløber ikke.'
    : `⚠ Side-token udløber ${new Date(udloeber * 1000).toLocaleString('da-DK')} — tjek at bruger-token'et var langtidsholdbart.`
)
