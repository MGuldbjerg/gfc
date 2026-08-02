// Skabelonbaseret ugeresumé-generator — INGEN AI-tokens.
//
// Bygger en færdig "ugen er i hus"-opdatering ud fra live Sleeper-data:
//   • Ugens topscorer pr. række
//   • Evt. ny sæsonrekord
//   • Stillingen i toppen pr. række
//
// Tonalitet: altid positiv. Kun topresultater vises — aldrig dårlige scores.
// Output i to formater: markdown (til nyhedsmail) og ren tekst (til Facebook).

import { computeLeaderboard, type LeaderboardType } from './leaderboard'
import type { LeaderboardEntry, WeeklyHighscore } from '@/types/sleeper'
import { hentAlleLigaer } from './seasonConfig'
import { SITE_URL } from './site-url'

const TYPE_ORDER: LeaderboardType[] = ['bestball', 'managed', 'chopped']

const TYPE_LABEL: Record<LeaderboardType, string> = {
  bestball: 'Bestball',
  managed: 'Managed',
  chopped: 'Chopped',
}

const TYPE_EMOJI: Record<LeaderboardType, string> = {
  bestball: '🎯',
  managed: '⚙️',
  chopped: '🔪',
}

export interface UgeresumeResultat {
  season: string
  week: number
  harData: boolean
  subject: string    // e-mail-emne
  overskrift: string // overskrift i mail/opslag
  brødtekst: string  // markdown — kan indsættes direkte i E-mail-fanen
  facebook: string   // ren tekst — klar til copy-paste i Facebook-gruppen
}

// Dansk talformat med komma og én decimal (point).
function pointFmt(n: number): string {
  return n.toLocaleString('da-DK', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function standingsLinje(e: LeaderboardEntry, i: number, type: LeaderboardType): string {
  const plads = `${i + 1}.`
  if (type === 'managed' && e.wins !== undefined) {
    return `${plads} ${e.displayName} — ${e.wins} sejre, ${pointFmt(e.totalPoints)} point`
  }
  return `${plads} ${e.displayName} — ${pointFmt(e.totalPoints)} point`
}

export async function byggUgeresume(season: string, week: number): Promise<UgeresumeResultat> {
  // Kun rækker der faktisk har ligaer denne sæson.
  const alleLigaer = await hentAlleLigaer()
  const aktiveTyper = TYPE_ORDER.filter(type =>
    alleLigaer.some(l => l.season === season && l.leagueType === type && l.sleeperId)
  )

  const perType = await Promise.all(
    aktiveTyper.map(async type => ({ type, data: await computeLeaderboard(type, season) }))
  )

  // Ugens topscorer pr. række for den valgte uge.
  const ugensTop = perType
    .map(({ type, data }) => {
      const hs = data.weeklyHighscores?.find(w => w.week === week && w.points > 0)
      return hs ? { type, hs } : null
    })
    .filter((x): x is { type: LeaderboardType; hs: WeeklyHighscore } => x !== null)

  // Ny sæsonrekord: ugens topscore er (også) sæsonens højeste for den række.
  const rekorder = ugensTop.filter(({ type, hs }) => {
    const sh = perType.find(p => p.type === type)?.data.seasonHighscore
    return !!sh && sh.week === week && Math.abs(sh.points - hs.points) < 0.001
  })

  const stillinger = perType.map(({ type, data }) => ({ type, top: data.entries.slice(0, 3) }))

  const harData = ugensTop.length > 0 || stillinger.some(s => s.top.length > 0)

  const overskrift = `Uge ${week} er i hus`
  const subject = `GFC — ${overskrift}`

  if (!harData) {
    const tom = `Der er endnu ingen kampdata for uge ${week}. Prøv igen når ugens kampe er spillet — data opdateres tirsdage.`
    return { season, week, harData, subject, overskrift, brødtekst: tom, facebook: tom }
  }

  // ── Markdown (nyhedsmail) ────────────────────────────────────────────────
  const md: string[] = []

  if (ugensTop.length > 0) {
    md.push('## Ugens topscorere', '')
    for (const { type, hs } of ugensTop) {
      md.push(`${TYPE_EMOJI[type]} **${TYPE_LABEL[type]}** — ${hs.displayName} (${hs.league}) med **${pointFmt(hs.points)}** point`)
    }
    md.push('')
  }

  if (rekorder.length > 0) {
    md.push('## Ny sæsonrekord', '')
    for (const { type, hs } of rekorder) {
      md.push(`🔥 ${hs.displayName} satte ugens største brag med **${pointFmt(hs.points)}** point — sæsonens højeste indtil videre i ${TYPE_LABEL[type]}!`)
    }
    md.push('')
  }

  const stillingMedData = stillinger.filter(s => s.top.length > 0)
  if (stillingMedData.length > 0) {
    md.push('## Stillingen i toppen', '')
    for (const { type, top } of stillingMedData) {
      md.push(`**${TYPE_LABEL[type]}**`)
      top.forEach((e, i) => md.push(standingsLinje(e, i, type)))
      md.push('')
    }
  }

  md.push(`[Se hele leaderboardet](${SITE_URL}/leaderboard)`)

  // ── Ren tekst (Facebook) ─────────────────────────────────────────────────
  const fb: string[] = [`🏈 GFC — Uge ${week} er i hus!`, '']

  if (ugensTop.length > 0) {
    fb.push('⭐ Ugens topscorere')
    for (const { type, hs } of ugensTop) {
      fb.push(`${TYPE_EMOJI[type]} ${TYPE_LABEL[type]}: ${hs.displayName} – ${pointFmt(hs.points)} point (${hs.league})`)
    }
    fb.push('')
  }

  if (rekorder.length > 0) {
    fb.push('🔥 Ny sæsonrekord')
    for (const { type, hs } of rekorder) {
      fb.push(`${hs.displayName} med ${pointFmt(hs.points)} point i ${TYPE_LABEL[type]}!`)
    }
    fb.push('')
  }

  if (stillingMedData.length > 0) {
    fb.push('📊 Stillingen i toppen')
    for (const { type, top } of stillingMedData) {
      fb.push(`${TYPE_LABEL[type]}:`)
      top.forEach((e, i) => fb.push(standingsLinje(e, i, type)))
      fb.push('')
    }
  }

  fb.push(`Se hele leaderboardet på ${SITE_URL.replace(/^https?:\/\//, '')} 🔗`)

  return {
    season,
    week,
    harData,
    subject,
    overskrift,
    brødtekst: md.join('\n'),
    facebook: fb.join('\n').trim(),
  }
}
