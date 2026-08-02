'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { CURRENT_SEASON } from '@/lib/leagues'
import type { FordelingsResultat, LigaForslag, LeagueType, Pin } from '@/lib/fordeling'

type DeltagerOption = {
  profile_id: string
  display_name: string
  username: string
  er_amerikansk_vip?: boolean
}

const TJEK_TYPES: LeagueType[] = ['bestball', 'managed', 'chopped']
const TJEK_TYPE_LABELS: Record<LeagueType, string> = {
  bestball: 'Bestball',
  managed: 'Managed',
  chopped: 'Chopped',
}

type TjekRow = {
  profileId: string
  displayName: string
  sleeperUsername: string
  wanted: LeagueType[]
  got: LeagueType[]
}

// Ønsket-vs-tildelt sanity check: catches the case where two equally flexible
// people (same number of wanted types) end up with very different outcomes —
// e.g. one gets all 3 wanted leagues while another only gets 1. Computed
// entirely from the preview result already in memory, so it updates with
// every "Træk ny fordeling" for free.
function FordelingsTjek({ resultat }: { resultat: FordelingsResultat }) {
  const [visFuldt, setVisFuldt] = useState(false)

  const rows = useMemo<TjekRow[]>(() => {
    const map = new Map<string, TjekRow>()

    for (const liga of resultat.ligaer) {
      for (const d of liga.deltagere) {
        if (d.preferredTypes.length === 0) continue
        let row = map.get(d.profileId)
        if (!row) {
          row = {
            profileId: d.profileId,
            displayName: d.displayName,
            sleeperUsername: d.sleeperUsername,
            wanted: d.preferredTypes,
            got: [],
          }
          map.set(d.profileId, row)
        }
        if (!row.got.includes(liga.type)) row.got.push(liga.type)
      }
    }

    for (const d of resultat.ikkeFordelbare) {
      if (d.preferredTypes.length === 0) continue
      if (!map.has(d.profileId)) {
        map.set(d.profileId, {
          profileId: d.profileId,
          displayName: d.displayName,
          sleeperUsername: d.sleeperUsername,
          wanted: d.preferredTypes,
          got: [],
        })
      }
    }

    return [...map.values()]
  }, [resultat])

  if (rows.length === 0) return null

  const fuldt = rows.filter(r => r.got.length === r.wanted.length).length
  const delvist = rows.filter(r => r.got.length > 0 && r.got.length < r.wanted.length).length
  const ingen = rows.filter(r => r.got.length === 0).length

  const tiers = [...new Set(rows.map(r => r.wanted.length))].sort((a, b) => b - a)

  return (
    <div className={`lb-col${visFuldt ? ' show-satisfied' : ''}`}>
      <div className="tjek-head">
        <span className="lb-col-name" style={{ fontSize: 18 }}>Fordelingstjek</span>
      </div>
      <p className="tjek-sub">
        Ønsket vs. tildelt pr. deltager, grupperet efter hvor mange typer de ønskede — så et
        &quot;ønskede 3, fik 1&quot; springer i øjnene, hvis andre i samme gruppe fik 3 ud af 3.
      </p>

      <div className="tjek-stats">
        <div className="tjek-stat ok"><div className="n">{fuldt}</div><div className="l">fik alt de ønskede</div></div>
        <div className="tjek-stat warn"><div className="n">{delvist}</div><div className="l">fik nogle, ikke alle</div></div>
        <div className="tjek-stat bad"><div className="n">{ingen}</div><div className="l">fik ingen liga</div></div>
      </div>

      <div className="tjek-toolbar">
        <label className="tjek-toggle">
          <input type="checkbox" checked={visFuldt} onChange={e => setVisFuldt(e.target.checked)} />
          Vis også fuldt tilfredsstillede ({fuldt})
        </label>
        <span className="eyebrow">Sorteret: værst placeret først i hver gruppe</span>
      </div>

      {tiers.map(n => {
        const tierRows = [...rows]
          .filter(r => r.wanted.length === n)
          .sort((a, b) => a.got.length - b.got.length || a.displayName.localeCompare(b.displayName))
        const gotCounts = tierRows.map(r => r.got.length)
        const snit = gotCounts.reduce((s, x) => s + x, 0) / tierRows.length
        const min = Math.min(...gotCounts)
        const max = Math.max(...gotCounts)
        const stortSpring = max - min >= 2

        return (
          <div className="tjek-tier" key={n}>
            <div className="tjek-tier-head">
              <span className="tjek-tier-name">Ønskede {n} {n === 1 ? 'type' : 'typer'}</span>
              <span className="tjek-tier-meta">
                {tierRows.length} deltagere · snit tildelt <b>{snit.toFixed(1).replace('.', ',')}</b>/{n} · spredning {min}–{max}
                {stortSpring && <span className="spread-flag"> ⚠ stor spredning</span>}
              </span>
            </div>
            <table className="tjek-table">
              <thead>
                <tr>
                  <th>Deltager</th><th>Ønsket</th><th>Tildelt</th>
                  <th className="num">Score</th><th>Status</th><th>Mangler</th>
                </tr>
              </thead>
              <tbody>
                {tierRows.map(r => {
                  const fuldtTilfreds = r.got.length === r.wanted.length
                  const status = fuldtTilfreds ? 'ok' : r.got.length === 0 ? 'bad' : 'warn'
                  const statusLabel = fuldtTilfreds ? 'Fuldt' : r.got.length === 0 ? 'Ingen liga' : 'Delvist'
                  const missing = r.wanted.filter(t => !r.got.includes(t))
                  return (
                    <tr key={r.profileId} className={fuldtTilfreds ? 'tjek-satisfied' : undefined}>
                      <td>
                        <span className="tjek-name">{r.displayName}</span>
                        <span className="tjek-uname">@{r.sleeperUsername}</span>
                      </td>
                      <td>
                        <span className="tjek-dots">
                          {r.wanted.map(t => <span key={t} className={`tjek-dot ${t}`} />)}
                        </span>
                      </td>
                      <td>
                        <span className="tjek-dots">
                          {r.wanted.map(t => (
                            <span key={t} className={`tjek-dot ${t} ${r.got.includes(t) ? 'filled' : 'hollow'}`} />
                          ))}
                        </span>
                      </td>
                      <td className="num">
                        <span className={`tjek-frac ${status}`}>{r.got.length}/{r.wanted.length}</span>
                      </td>
                      <td><span className={`tjek-pill ${status}`}>{statusLabel}</span></td>
                      <td className="tjek-miss">
                        {missing.length > 0 ? (
                          <>
                            Mangler{' '}
                            {missing.map((t, i) => (
                              <span key={t}>{i > 0 && ', '}<b>{TJEK_TYPE_LABELS[t]}</b></span>
                            ))}
                          </>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

      <div className="tjek-legend">
        <span className="swatch"><span className="tjek-dot filled bestball" style={{ width: 9, height: 9 }} /> Fyldt = tildelt</span>
        <span className="swatch"><span className="tjek-dot hollow bestball" style={{ width: 9, height: 9 }} /> Tom = ønsket, ikke fået</span>
        {TJEK_TYPES.map(t => (
          <span className="swatch" key={t}>
            <span className={`tjek-dot filled ${t}`} style={{ width: 9, height: 9 }} /> {TJEK_TYPE_LABELS[t]}
          </span>
        ))}
      </div>
    </div>
  )
}

type HistorikData = { season: string; seasons: string[]; ligaer: LigaForslag[]; aktuelSæson: string }

function LigaGrid({ ligaer }: { ligaer: LigaForslag[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
      {ligaer.map((liga: LigaForslag) => (
        <div key={liga.ligaNavn} className="lb-col">
          <div className="lb-col-head">
            <span className="lb-col-name" style={{ fontSize: 18 }}>{liga.ligaNavn}</span>
            <span className={`type-badge ${liga.type}`}>{liga.type}</span>
            <KopierKnap tekst={liga.deltagere.map(d => d.sleeperUsername).join('\n')} />
          </div>
          <p className="eyebrow" style={{ marginBottom: 12 }}>{liga.deltagere.length} hold</p>
          <ol>
            {liga.deltagere.map((d, i) => (
              <li key={d.profileId} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 13.5, padding: '5px 0',
                borderBottom: '1px solid var(--line-2)',
              }}>
                <span className="eyebrow" style={{ width: 20 }}>{i + 1}.</span>
                <span style={{ flex: 1, fontWeight: 500, color: 'var(--ink)' }}>{d.displayName}</span>
                {d.erAmerikanskVip && (
                  <span title="Amerikansk VIP" style={{ fontSize: 13 }}>🇺🇸</span>
                )}
                {d.erDanskVip && (
                  <span title="Dansk VIP" style={{ fontSize: 13 }}>🇩🇰</span>
                )}
                {d.pinned && (
                  <span title="VIP-pin" style={{ color: 'var(--accent)', fontSize: 11 }}>★</span>
                )}
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{d.sleeperUsername}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}

type ManuelDeltager = {
  profileId: string
  displayName: string
  sleeperUsername: string
  email: string | null
  harTilmelding: boolean
  status: string | null
  preferredTypes: LeagueType[]
  ligaer: string[]
}

type ManuelLiga = { ligaNavn: string; type: LeagueType; sleeperId: string; antal: number }

// Nominal league sizes — only used to show "12/12" next to a league so the
// admin can see where there is room before placing someone.
const STANDARD_STØRRELSE: Record<LeagueType, number> = { bestball: 12, managed: 12, chopped: 18 }

// Hand-places a participant in one or more leagues. Exists for late entrants:
// someone who signed up after the deadline never picked a row, so they hold no
// registration and the automatic fordeling cannot see them at all.
function ManuelTildeling({ season, onÆndret }: { season: string; onÆndret: () => void }) {
  const [åben, setÅben] = useState(false)
  const [data, setData] = useState<{ deltagere: ManuelDeltager[]; ligaer: ManuelLiga[] } | null>(null)
  const [valgtProfil, setValgtProfil] = useState('')
  const [valgteLigaer, setValgteLigaer] = useState<string[]>([])
  const [sendMail, setSendMail] = useState(true)
  const [gemmer, setGemmer] = useState(false)
  const [besked, setBesked] = useState('')
  const [fejl, setFejl] = useState('')

  const hentData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/fordel/manuel?season=${encodeURIComponent(season)}`)
      if (!res.ok) return
      setData(await res.json())
    } catch {
      /* stille — panelet virker igen ved næste åbning */
    }
  }, [season])

  useEffect(() => {
    if (åben) hentData()
  }, [åben, hentData])

  const valgt = data?.deltagere.find(d => d.profileId === valgtProfil) ?? null

  function toggleLiga(navn: string) {
    setValgteLigaer(prev => (prev.includes(navn) ? prev.filter(n => n !== navn) : [...prev, navn]))
  }

  async function tildel() {
    if (!valgt || valgteLigaer.length === 0) return
    setGemmer(true)
    setFejl('')
    setBesked('')
    try {
      const res = await fetch('/api/admin/fordel/manuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: valgt.profileId, season, ligaNavne: valgteLigaer, sendMail }),
      })
      const svar = await res.json()
      if (!res.ok) throw new Error(svar.error ?? 'Ukendt fejl')

      const dele = [
        svar.tilføjet.length > 0
          ? `${valgt.displayName} tildelt ${svar.tilføjet.join(', ')}`
          : `${valgt.displayName} var allerede i de valgte ligaer`,
      ]
      if (svar.oprettedeTilmelding) dele.push('tilmelding oprettet')
      if (svar.mailSendt > 0) dele.push(`${svar.mailSendt} mail sendt`)
      setBesked(`${dele.join(' · ')}.`)
      setValgteLigaer([])
      await hentData()
      onÆndret()
    } catch (e) {
      setFejl(e instanceof Error ? e.message : 'Noget gik galt')
    } finally {
      setGemmer(false)
    }
  }

  async function fjern(profileId: string, ligaNavn: string) {
    setGemmer(true)
    setFejl('')
    setBesked('')
    try {
      const res = await fetch('/api/admin/fordel/manuel', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, ligaNavn, season }),
      })
      const svar = await res.json()
      if (!res.ok) throw new Error(svar.error ?? 'Ukendt fejl')
      setBesked(`Fjernet fra ${ligaNavn}.`)
      await hentData()
      onÆndret()
    } catch (e) {
      setFejl(e instanceof Error ? e.message : 'Noget gik galt')
    } finally {
      setGemmer(false)
    }
  }

  const udenTilmelding = data?.deltagere.filter(d => !d.harTilmelding) ?? []
  const utildelte = data?.deltagere.filter(d => d.harTilmelding && d.ligaer.length === 0) ?? []

  return (
    <div className="lb-col" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setÅben(o => !o)} className="btn ghost">
          {åben ? '✕ Luk' : '+ Manuel tildeling'}
        </button>
        <span className="eyebrow">
          Placér en deltager i en liga i hånden — fx en sen tilmelding, der aldrig nåede at vælge række.
        </span>
      </div>

      {åben && !data && <p className="eyebrow" style={{ marginTop: 16 }}>Indlæser…</p>}

      {åben && data && (
        <div style={{ marginTop: 16 }}>
          {(udenTilmelding.length > 0 || utildelte.length > 0) && (
            <p className="eyebrow" style={{ marginBottom: 12 }}>
              {udenTilmelding.length > 0 && (
                <>{udenTilmelding.length} med profil uden tilmelding til {season}
                  {' '}({udenTilmelding.slice(0, 4).map(d => d.displayName).join(', ')}
                  {udenTilmelding.length > 4 && ' m.fl.'}). </>
              )}
              {utildelte.length > 0 && <>{utildelte.length} tilmeldt uden liga.</>}
            </p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 280 }}>
              <span className="eyebrow">Deltager</span>
              <select
                className="gfc-input"
                value={valgtProfil}
                onChange={e => { setValgtProfil(e.target.value); setValgteLigaer([]); setBesked('') }}
              >
                <option value="">Vælg deltager…</option>
                {data.deltagere.map(d => (
                  <option key={d.profileId} value={d.profileId}>
                    {d.displayName} (@{d.sleeperUsername})
                    {!d.harTilmelding ? ' — ingen tilmelding' : d.ligaer.length === 0 ? ' — ingen liga' : ` — ${d.ligaer.join(', ')}`}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, height: 38 }}>
              <input type="checkbox" checked={sendMail} onChange={e => setSendMail(e.target.checked)} />
              Send ligabesked på mail
            </label>
          </div>

          {valgt && (
            <div style={{ marginTop: 16 }}>
              {!valgt.email && (
                <p className="eyebrow" style={{ color: 'var(--accent)', marginBottom: 10 }}>
                  {valgt.displayName} har ingen login-mail — der kan ikke sendes ligabesked.
                  Tilføj en e-mail under Tilmeldinger.
                </p>
              )}

              {valgt.ligaer.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span className="eyebrow">Nuværende ligaer</span>
                  {valgt.ligaer.map(navn => (
                    <span key={navn} className="type-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {navn}
                      <button
                        onClick={() => fjern(valgt.profileId, navn)}
                        disabled={gemmer}
                        title={`Fjern fra ${navn}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, fontSize: 12 }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <span className="eyebrow">Tildel liga</span>
              <div className="manuel-liga-grid">
                {data.ligaer.map(liga => {
                  const iForvejen = valgt.ligaer.includes(liga.ligaNavn)
                  const kapacitet = STANDARD_STØRRELSE[liga.type]
                  const fuld = liga.antal >= kapacitet
                  return (
                    <label
                      key={liga.ligaNavn}
                      className={`manuel-liga${iForvejen ? ' i-forvejen' : ''}`}
                      title={iForvejen ? 'Allerede i denne liga' : fuld ? 'Ligaen er fuld — tildeling overfylder den' : undefined}
                    >
                      <input
                        type="checkbox"
                        disabled={iForvejen}
                        checked={iForvejen || valgteLigaer.includes(liga.ligaNavn)}
                        onChange={() => toggleLiga(liga.ligaNavn)}
                      />
                      <span className={`type-badge ${liga.type}`}>{liga.ligaNavn}</span>
                      <span className={`mono manuel-liga-antal${fuld ? ' fuld' : ''}`}>
                        {liga.antal}/{kapacitet}
                      </span>
                    </label>
                  )
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
                <button className="btn" disabled={gemmer || valgteLigaer.length === 0} onClick={tildel}>
                  {gemmer ? 'Gemmer…' : `Tildel ${valgteLigaer.length > 0 ? valgteLigaer.join(', ') : 'liga'}`}
                </button>
                {besked && <span style={{ color: 'var(--pos)', fontSize: 13 }}>✓ {besked}</span>}
                {fejl && <span style={{ color: 'var(--accent)', fontSize: 13 }}>{fejl}</span>}
              </div>
            </div>
          )}

          <p className="eyebrow" style={{ marginTop: 16, color: 'var(--muted)' }}>
            Mangler personen helt? Opret profilen under Tilmeldinger → “Tilføj deltager manuelt”.
            Bemærk: en ny fordeling under “Ny fordeling” overskriver hele sæsonen, også manuelle tildelinger.
          </p>
        </div>
      )}
    </div>
  )
}

// Read-only view of whatever is currently confirmed in the DB for a season —
// revisitable any time, independent of the draft/preview tool below, and
// still available after CURRENT_SEASON moves on (via the season picker).
function AktuelFordeling({
  historik, loading, onSkiftSæson, gemtBesked, onÆndret,
}: {
  historik: HistorikData | null
  loading: boolean
  onSkiftSæson: (season: string) => void
  gemtBesked: string
  onÆndret: () => void
}) {
  const season = historik?.season ?? CURRENT_SEASON // CURRENT_SEASON = fallback indtil historikken er hentet
  const seasons = historik?.seasons.length ? historik.seasons : [CURRENT_SEASON]

  return (
    <>
      {gemtBesked && (
        <div style={{
          background: 'color-mix(in oklch, var(--pos) 10%, var(--bg))',
          border: '1px solid color-mix(in oklch, var(--pos) 30%, transparent)',
          borderRadius: 'var(--r)',
          padding: '14px 20px',
          marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ color: 'var(--pos)', fontWeight: 700 }}>✓</span>
          <span style={{ color: 'var(--ink-2)', fontSize: 14 }}>{gemtBesked}</span>
        </div>
      )}

      <div className="lb-col" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label className="gfc-label">Sæson</label>
        <select
          value={season}
          onChange={e => onSkiftSæson(e.target.value)}
          className="gfc-input"
          style={{ width: 120 }}
        >
          {seasons.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <ManuelTildeling season={season} onÆndret={onÆndret} />

      {loading ? (
        <div className="lb-col" style={{ textAlign: 'center', padding: 48 }}>
          <p className="eyebrow">Indlæser…</p>
        </div>
      ) : !historik || historik.ligaer.length === 0 ? (
        <div className="lb-col" style={{ textAlign: 'center', padding: 48 }}>
          <p className="eyebrow">Ingen bekræftet fordeling endnu for {season}.</p>
        </div>
      ) : (
        <>
          <LigaGrid ligaer={historik.ligaer} />
          <FordelingsTjek resultat={{ ligaer: historik.ligaer, ikkeFordelbare: [] }} />
        </>
      )}
    </>
  )
}

function KopierKnap({ tekst }: { tekst: string }) {
  const [kopieret, setKopieret] = useState(false)
  function kopier() {
    navigator.clipboard.writeText(tekst).then(() => {
      setKopieret(true)
      setTimeout(() => setKopieret(false), 2000)
    })
  }
  return (
    <button
      onClick={kopier}
      className="fmt-btn"
      title="Kopiér Sleeper-brugernavne"
      style={{ marginLeft: 'auto' }}
    >
      {kopieret ? '✓ Kopieret' : '⎘ Kopier'}
    </button>
  )
}

export default function FordelPage() {
  const [ligaStørrelse, setLigaStørrelse] = useState(12)
  const [choppedStørrelse, setChoppedStørrelse] = useState(18)
  const [resultat, setResultat] = useState<FordelingsResultat | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  const [deltagere, setDeltagere] = useState<DeltagerOption[]>([])
  const [pins, setPins] = useState<Pin[]>([])
  const [nyPin, setNyPin] = useState<{ profileId: string; ligaNavn: string }>({
    profileId: '',
    ligaNavn: '',
  })

  // null = admin hasn't picked a tab yet — default it once the historik fetch
  // resolves (confirmed leagues exist → "Aktuel fordeling", otherwise → "Ny
  // fordeling"), without setting state as a side effect of the fetch itself.
  const [visningValg, setVisningValg] = useState<'aktuel' | 'ny' | null>(null)
  const [historik, setHistorik] = useState<HistorikData | null>(null)
  // Which season the preview/bekræft flow writes to. Comes from the server with
  // the historik payload; CURRENT_SEASON is only the fallback until that lands.
  const aktuelSæson = historik?.aktuelSæson ?? CURRENT_SEASON
  const [historikLoading, setHistorikLoading] = useState(true)
  const [gemtBesked, setGemtBesked] = useState('')

  const visning: 'aktuel' | 'ny' =
    visningValg ?? (!historikLoading && historik && historik.ligaer.length > 0 ? 'aktuel' : 'ny')
  const setVisning = setVisningValg

  async function hentHistorik(season: string) {
    try {
      const res = await fetch(`/api/admin/fordel/historik?season=${encodeURIComponent(season)}`)
      if (!res.ok) return
      const data: HistorikData = await res.json()
      setHistorik(data)
      return data
    } finally {
      setHistorikLoading(false)
    }
  }

  useEffect(() => {
    fetch('/api/admin/fordel/deltagere')
      .then(r => r.json())
      .then(data => setDeltagere(data.deltagere ?? []))
      .catch(() => {})

    fetch('/api/admin/fordel/historik')
      .then(r => r.json())
      .then((data: HistorikData) => {
        setHistorik(data)
        setHistorikLoading(false)
      })
      .catch(() => setHistorikLoading(false))
  }, [])

  function tilføjPin() {
    if (!nyPin.profileId || !nyPin.ligaNavn.trim()) return
    const ligaNavn = nyPin.ligaNavn.trim().toUpperCase()
    if (pins.some(p => p.profileId === nyPin.profileId)) return
    setPins(prev => [...prev, { profileId: nyPin.profileId, ligaNavn }])
    setNyPin({ profileId: '', ligaNavn: '' })
  }

  function fjernPin(profileId: string) {
    setPins(prev => prev.filter(p => p.profileId !== profileId))
  }

  function displayForPin(profileId: string) {
    return deltagere.find(d => d.profile_id === profileId)?.display_name ?? profileId
  }

  async function beregnForslag() {
    setLoading(true)
    setResultat(null)
    setStatus('')
    const res = await fetch('/api/admin/fordel/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ligaStørrelse, choppedStørrelse, pins }),
    })
    const data = await res.json()
    setResultat(data)
    setLoading(false)
  }

  async function bekræftFordeling() {
    if (!resultat) return
    setLoading(true)
    setStatus('')
    try {
      const res = await fetch('/api/admin/fordel/bekraeft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ligaer: resultat.ligaer, sæson: aktuelSæson }),
      })
      if (!res.ok) {
        setStatus(`Noget gik galt (${res.status}). Prøv igen.`)
        return
      }
      const data = await res.json()
      if (data.ok) {
        setGemtBesked(`${data.tildelt} deltagere tildelt ligaer.${data.fejl?.length ? ` ${data.fejl.length} fejl.` : ''}`)
        await hentHistorik(aktuelSæson)
        setVisning('aktuel')
      } else {
        setStatus('Noget gik galt. Prøv igen.')
      }
    } catch {
      setStatus('Kunne ikke kontakte serveren. Tjek din forbindelse og prøv igen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 32 }}>
        <div className="kicker-strip">
          <span className="dash" />
          <span className="eyebrow">Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <h1>Ligafordeling — {aktuelSæson}</h1>
          <Link href="/admin" className="eyebrow" style={{ color: 'var(--muted)' }}>← Admin</Link>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setVisning('aktuel')}
          className={visning === 'aktuel' ? 'btn' : 'btn ghost'}
        >
          Aktuel fordeling
        </button>
        <button
          onClick={() => setVisning('ny')}
          className={visning === 'ny' ? 'btn' : 'btn ghost'}
        >
          Ny fordeling
        </button>
      </div>

      {visning === 'aktuel' && (
        <AktuelFordeling
          historik={historik}
          loading={historikLoading}
          onSkiftSæson={hentHistorik}
          gemtBesked={gemtBesked}
          onÆndret={() => hentHistorik(historik?.season ?? aktuelSæson)}
        />
      )}

      {visning === 'ny' && (
        <>
      {/* Settings */}
      <div className="lb-col" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <label className="gfc-label">Hold per liga (BB/Managed)</label>
          <input
            type="number" min={8} max={20} value={ligaStørrelse}
            onChange={e => setLigaStørrelse(Number(e.target.value))}
            className="gfc-input"
            style={{ width: 96 }}
          />
        </div>
        <div>
          <label className="gfc-label">Hold per liga (Chopped)</label>
          <input
            type="number" min={10} max={30} value={choppedStørrelse}
            onChange={e => setChoppedStørrelse(Number(e.target.value))}
            className="gfc-input"
            style={{ width: 96 }}
          />
        </div>
        <button
          onClick={beregnForslag}
          disabled={loading}
          className="btn"
          style={loading ? { opacity: 0.5 } : undefined}
        >
          {loading ? 'Beregner…' : resultat ? 'Træk ny fordeling' : 'Beregn fordeling'}
          {!loading && <span className="arrow" aria-hidden />}
        </button>
        <p className="eyebrow" style={{ maxWidth: 360 }}>
          Deltagere kan spille i flere ligaer. Prioritetsrækkefølgen afgør hvem der kommer med, når en type er overtegnet.
        </p>
      </div>

      {/* VIP pins */}
      <div className="lb-col" style={{ marginBottom: 16 }}>
        <div className="lb-col-head">
          <span className="lb-col-name" style={{ fontSize: 18 }}>VIP-pins</span>
          <span className="eyebrow">valgfrit</span>
        </div>
        <p className="eyebrow" style={{ marginBottom: 16 }}>
          Fastlås specifikke deltagere til en bestemt liga. Pins respekteres altid — resten fordeles tilfældigt.
        </p>

        {pins.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {pins.map(pin => (
              <div key={pin.profileId} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--bg-2)', border: '1px solid var(--line)',
                borderRadius: 'var(--r-sm)', padding: '10px 14px',
              }}>
                <span style={{ flex: 1, fontWeight: 500, color: 'var(--ink)', fontSize: 14 }}>
                  {displayForPin(pin.profileId)}
                </span>
                <span className="eyebrow">→</span>
                <span className="mono" style={{ color: 'var(--accent)', fontSize: 13, width: 48, textAlign: 'center' }}>
                  {pin.ligaNavn}
                </span>
                <button
                  onClick={() => fjernPin(pin.profileId)}
                  aria-label="Fjern pin"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: '0 4px' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="gfc-label">Deltager</label>
            <select
              value={nyPin.profileId}
              onChange={e => setNyPin(p => ({ ...p, profileId: e.target.value }))}
              className="gfc-input"
            >
              <option value="">Vælg deltager…</option>
              {deltagere
                .filter(d => !pins.some(p => p.profileId === d.profile_id))
                .map(d => (
                  <option key={d.profile_id} value={d.profile_id}>
                    {d.display_name} ({d.username})
                  </option>
                ))}
            </select>
          </div>
          <div style={{ width: 110 }}>
            <label className="gfc-label">Liga</label>
            <input
              type="text"
              placeholder="BB1, M2…"
              value={nyPin.ligaNavn}
              onChange={e => setNyPin(p => ({ ...p, ligaNavn: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), tilføjPin())}
              className="gfc-input mono"
            />
          </div>
          <button
            onClick={tilføjPin}
            disabled={!nyPin.profileId || !nyPin.ligaNavn.trim()}
            className="btn ghost"
            style={{ opacity: (!nyPin.profileId || !nyPin.ligaNavn.trim()) ? 0.4 : 1 }}
          >
            + Tilføj pin
          </button>
        </div>
      </div>

      {/* Result */}
      {resultat && (
        <>
          {resultat.ligaer.length === 0 ? (
            <div className="lb-col" style={{ textAlign: 'center', padding: 48 }}>
              <p className="eyebrow">Ingen tilmeldinger at fordele endnu.</p>
            </div>
          ) : (
            <>
              <LigaGrid ligaer={resultat.ligaer} />

              {resultat.ikkeFordelbare.length > 0 && (
                <div style={{
                  background: 'color-mix(in oklch, oklch(80% 0.15 80) 20%, var(--bg))',
                  border: '1px solid color-mix(in oklch, oklch(65% 0.15 80) 35%, transparent)',
                  borderRadius: 'var(--r)',
                  padding: '20px 24px',
                  marginBottom: 16,
                }}>
                  <p className="eyebrow" style={{ marginBottom: 12 }}>
                    {resultat.ikkeFordelbare.length} ikke tildelt
                  </p>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 12 }}>
                    Disse deltagere har ingen præferencer og er ikke tildelt en liga.
                  </p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {resultat.ikkeFordelbare.map(d => (
                      <li key={d.profileId} style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>
                        {d.displayName}{' '}
                        <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                          ({d.sleeperUsername})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <FordelingsTjek resultat={resultat} />

              <div className="lb-col" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 80 }}>
                <div>
                  <p style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 15 }}>
                    {new Set(resultat.ligaer.flatMap(l => l.deltagere.map(d => d.profileId))).size} unikke deltagere
                    {' · '}{resultat.ligaer.reduce((s, l) => s + l.deltagere.length, 0)} ligapladser
                    {' · '}{resultat.ligaer.length} ligaer
                    {pins.length > 0 && (
                      <span style={{ color: 'var(--accent)', marginLeft: 8 }}>
                        · {pins.length} VIP-pin{pins.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                  <p className="eyebrow" style={{ marginTop: 6 }}>
                    Ikke tilfreds? Klik &quot;Træk ny fordeling&quot; for en ny tilfældig fordeling.
                  </p>
                  {status && (
                    <p style={{ color: 'var(--accent)', fontSize: 13, marginTop: 8 }}>{status}</p>
                  )}
                </div>
                <button
                  onClick={bekræftFordeling}
                  disabled={loading}
                  className="btn"
                  style={loading ? { opacity: 0.5 } : { background: 'var(--pos)' }}
                >
                  {loading ? 'Gemmer…' : 'Bekræft og gem fordeling'}
                  {!loading && <span className="arrow" aria-hidden />}
                </button>
              </div>
            </>
          )}
        </>
      )}
        </>
      )}
    </>
  )
}
