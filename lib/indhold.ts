// Editable site content, resolved from the database with the files in
// content/ as the fallback.
//
// Two kinds of content, same override model as lib/seasonConfig:
//   - Markdown pages  — content/sider/*.md, overridden per slug by side_indhold.
//   - Structured text — content/tekst.ts, overridden per dot-path by tekst_override.
// Deleting a row always restores exactly what the file says, so an edit made in
// the admin UI can never permanently break a page.
//
// Server-only: content/tekst.ts itself stays importable from client components,
// this module is not.

import { cache } from 'react'
import { query, queryOne, execute } from './turso'
import { loadSide, listSlugs } from './sider'
import { tekst } from '@/content/tekst'
import { getSeasonSettings } from './seasonSettings'
import { hentAktuelSæson } from './seasonConfig'

// ── Pladsholdere ────────────────────────────────────────────────────────────

export type Pladsholdere = Record<string, string>

// Formats an ISO instant as Danish wall-clock time: "3. juli kl. 18:00".
function formatDeadline(iso: string | null): string {
  if (!iso) return 'endnu ikke fastsat'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'endnu ikke fastsat'
  const dato = d.toLocaleDateString('da-DK', {
    timeZone: 'Europe/Copenhagen', day: 'numeric', month: 'long',
  })
  const tid = d
    .toLocaleTimeString('da-DK', {
      timeZone: 'Europe/Copenhagen', hour: '2-digit', minute: '2-digit',
    })
    .replace('.', ':') // da-DK renders "18.00"; the site writes times with a colon
  return `${dato} kl. ${tid}`
}

// Formats a plain 'YYYY-MM-DD' as "4. juli". Parsed as UTC noon so the date
// never slips a day across the Danish timezone offset.
function formatDato(dato: string | null): string {
  if (!dato) return 'endnu ikke fastsat'
  const d = new Date(`${dato}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return 'endnu ikke fastsat'
  return d.toLocaleDateString('da-DK', {
    timeZone: 'Europe/Copenhagen', day: 'numeric', month: 'long',
  })
}

// Every {placeholder} the site understands, for the current season.
export const hentPladsholdere = cache(async (): Promise<Pladsholdere> => {
  const sæson = await hentAktuelSæson()
  let s: Awaited<ReturnType<typeof getSeasonSettings>> = null
  try {
    s = await getSeasonSettings(sæson)
  } catch {
    // Settings row missing or table not migrated — placeholders still resolve
    // to their "endnu ikke fastsat" fallbacks rather than taking the page down.
  }
  return {
    'sæson': sæson,
    'deadline': formatDeadline(s?.signupDeadline ?? null),
    'draftstart': formatDato(s?.draftStart ?? null),
    'fordelingsdato': formatDato(s?.fordelingDato ?? null),
    'sæsonstart': formatDato(s?.sæsonStart ?? null),
  }
})

export function indsætPladsholdere(tekst: string, værdier: Pladsholdere): string {
  let ud = tekst
  for (const [nøgle, værdi] of Object.entries(værdier)) {
    if (!ud.includes(`{${nøgle}}`)) continue
    ud = ud.split(`{${nøgle}}`).join(værdi)
  }
  return ud
}

// ── Markdown-sider ──────────────────────────────────────────────────────────

export interface Side {
  slug: string
  title: string
  body: string
  fraDatabase: boolean
  iMenu: boolean
  sortOrder: number
}

type SideRow = {
  slug: string
  title: string
  body: string
  i_menu: number
  sort_order: number
}

async function dbSider(): Promise<SideRow[]> {
  try {
    return await query<SideRow>(
      'SELECT slug, title, body, i_menu, sort_order FROM side_indhold'
    )
  } catch {
    return []
  }
}

// One page, DB first and the shipped file as fallback. Placeholders are already
// substituted in `body` and `title`.
export async function hentSide(slug: string): Promise<Side | null> {
  const [rows, værdier] = await Promise.all([
    (async () => {
      try {
        return await queryOne<SideRow>(
          'SELECT slug, title, body, i_menu, sort_order FROM side_indhold WHERE slug = ?',
          [slug]
        )
      } catch {
        return null
      }
    })(),
    hentPladsholdere(),
  ])

  if (rows) {
    return {
      slug,
      title: indsætPladsholdere(rows.title, værdier),
      body: indsætPladsholdere(rows.body, værdier),
      fraDatabase: true,
      iMenu: rows.i_menu === 1,
      sortOrder: rows.sort_order,
    }
  }

  const fil = loadSide(slug)
  if (!fil) return null
  return {
    slug,
    title: indsætPladsholdere(fil.title, værdier),
    body: indsætPladsholdere(fil.body, værdier),
    fraDatabase: false,
    iMenu: false,
    sortOrder: 100,
  }
}

// Every page slug the site can serve — shipped files plus admin-created pages.
export async function hentAlleSlugs(): Promise<string[]> {
  const rows = await dbSider()
  return [...new Set([...listSlugs(), ...rows.map(r => r.slug)])]
}

// Admin listing: raw (unsubstituted) text, so the editor shows the placeholders
// rather than the values they currently resolve to.
export async function hentSiderTilAdmin(): Promise<
  { slug: string; title: string; body: string; fraDatabase: boolean; iMenu: boolean; harFil: boolean }[]
> {
  const rows = await dbSider()
  const dbMap = new Map(rows.map(r => [r.slug, r]))
  const filSlugs = listSlugs()
  const alle = [...new Set([...filSlugs, ...rows.map(r => r.slug)])].sort()

  return alle.map(slug => {
    const row = dbMap.get(slug)
    const fil = loadSide(slug)
    return {
      slug,
      title: row?.title ?? fil?.title ?? slug,
      body: row?.body ?? fil?.body ?? '',
      fraDatabase: !!row,
      iMenu: row ? row.i_menu === 1 : false,
      harFil: !!fil,
    }
  })
}

export async function gemSide(
  slug: string,
  felter: { title: string; body: string; iMenu: boolean }
): Promise<void> {
  await execute(
    `INSERT INTO side_indhold (slug, title, body, i_menu, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(slug) DO UPDATE SET
       title = excluded.title,
       body = excluded.body,
       i_menu = excluded.i_menu,
       updated_at = datetime('now')`,
    [slug, felter.title, felter.body, felter.iMenu ? 1 : 0]
  )
}

// Drops the override. A page that also exists as a file reverts to the file; a
// page that only existed in the DB disappears from the site.
export async function nulstilSide(slug: string): Promise<void> {
  await execute('DELETE FROM side_indhold WHERE slug = ?', [slug])
}

// ── Struktureret tekst (content/tekst.ts) ───────────────────────────────────

type TekstTræ = typeof tekst

// 'landing.tidslinje.1.tid' → the string at that path. Arrays are addressed by
// index, so every editable string has one stable key.
function fladgør(node: unknown, sti: string[] = [], ud: Record<string, string> = {}) {
  if (typeof node === 'string') {
    ud[sti.join('.')] = node
    return ud
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => fladgør(v, [...sti, String(i)], ud))
    return ud
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) fladgør(v, [...sti, k], ud)
  }
  return ud
}

function sætISti(mål: Record<string, unknown>, sti: string, værdi: string) {
  const dele = sti.split('.')
  let node: Record<string, unknown> = mål
  for (let i = 0; i < dele.length - 1; i++) {
    const næste = node[dele[i]]
    if (næste === null || typeof næste !== 'object') return // path no longer exists
    node = næste as Record<string, unknown>
  }
  node[dele[dele.length - 1]] = værdi
}

async function hentOverrides(): Promise<Record<string, string>> {
  try {
    const rows = await query<{ key: string; value: string }>(
      'SELECT key, value FROM tekst_override'
    )
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  } catch {
    return {}
  }
}

// The site's structured text with admin overrides applied and every
// placeholder already resolved. Server components use this instead of
// importing `tekst` directly.
export const hentTekst = cache(async (): Promise<TekstTræ> => {
  const [overrides, værdier] = await Promise.all([hentOverrides(), hentPladsholdere()])

  const træ = structuredClone(tekst) as unknown as Record<string, unknown>
  for (const [sti, værdi] of Object.entries(overrides)) sætISti(træ, sti, værdi)

  // Substitute after overriding, so admin-written text can use placeholders too.
  const flad = fladgør(træ)
  for (const [sti, værdi] of Object.entries(flad)) {
    const substitueret = indsætPladsholdere(værdi, værdier)
    if (substitueret !== værdi) sætISti(træ, sti, substitueret)
  }

  return træ as unknown as TekstTræ
})

// Only the strings that are actually rendered somewhere. content/tekst.ts still
// carries keys nothing reads (the signup form has its own text in the JSX), and
// offering those in the admin UI would be a field that silently does nothing.
//
// Consumers: app/page.tsx (landing.*) and components/Nav.tsx (nav.*). Add a key
// here when one of those starts reading it.
const REDIGERBARE_TEKSTER = [
  'nav.leaderboard',
  'nav.historie',
  'nav.draftstatistik',
  'nav.regler',
  'nav.faq',
  'nav.tilmeldCta',
  'landing.primaerCta',
  'landing.sekundaerCta',
  'landing.raekkerTitel',
  'landing.raekkerUndertitel',
  'landing.tidslinjeTitel',
  'landing.finalCtaTekst',
  'landing.finalCta',
]

// A key like 'landing.tidslinje.0.tid' is editable when its parent list is.
const REDIGERBARE_LISTER = ['landing.hojdepunkter.', 'landing.tidslinje.']

function erRedigerbar(key: string): boolean {
  return (
    REDIGERBARE_TEKSTER.includes(key) ||
    REDIGERBARE_LISTER.some(præfiks => key.startsWith(præfiks))
  )
}

// Admin listing for the text editor: every editable string with its shipped
// default and the current (possibly overridden) value.
export async function hentTekstTilAdmin(): Promise<
  { key: string; standard: string; værdi: string; ændret: boolean }[]
> {
  const overrides = await hentOverrides()
  const standarder = fladgør(tekst)
  return Object.entries(standarder)
    .filter(([key]) => erRedigerbar(key))
    .map(([key, standard]) => ({
      key,
      standard,
      værdi: overrides[key] ?? standard,
      ændret: key in overrides,
    }))
}

export async function gemTekst(key: string, værdi: string): Promise<void> {
  await execute(
    `INSERT INTO tekst_override (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, værdi]
  )
}

export async function nulstilTekst(key: string): Promise<void> {
  await execute('DELETE FROM tekst_override WHERE key = ?', [key])
}
