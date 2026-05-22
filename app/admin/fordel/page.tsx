'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CURRENT_SEASON } from '@/lib/leagues'
import type { FordelingsResultat, LigaForslag, Pin } from '@/lib/fordeling'

type DeltagerOption = {
  profile_id: string
  display_name: string
  username: string
  er_amerikansk_vip?: boolean
}

export default function FordelPage() {
  const [ligaStørrelse, setLigaStørrelse] = useState(12)
  const [choppedStørrelse, setChoppedStørrelse] = useState(18)
  const [resultat, setResultat] = useState<FordelingsResultat | null>(null)
  const [loading, setLoading] = useState(false)
  const [bekræftet, setBekræftet] = useState(false)
  const [status, setStatus] = useState('')

  const [deltagere, setDeltagere] = useState<DeltagerOption[]>([])
  const [pins, setPins] = useState<Pin[]>([])
  const [nyPin, setNyPin] = useState<{ profileId: string; ligaNavn: string }>({
    profileId: '',
    ligaNavn: '',
  })

  useEffect(() => {
    fetch('/api/admin/fordel/deltagere')
      .then(r => r.json())
      .then(data => setDeltagere(data.deltagere ?? []))
      .catch(() => {})
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
    const res = await fetch('/api/admin/fordel/bekræft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ligaer: resultat.ligaer, sæson: CURRENT_SEASON }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      setBekræftet(true)
      setStatus(`${data.tildelt} deltagere tildelt ligaer.${data.fejl?.length ? ` ${data.fejl.length} fejl.` : ''}`)
    } else {
      setStatus('Noget gik galt. Prøv igen.')
    }
  }

  if (bekræftet) {
    return (
      <div className="form-page">
        <div className="form-card" style={{ textAlign: 'center' }}>
          <div className="kicker-strip" style={{ justifyContent: 'center', marginBottom: 20 }}>
            <span className="dash" />
            <span className="eyebrow">Fordeling gennemført</span>
          </div>
          <h2 className="form-card-title">Ligaer oprettet</h2>
          <p className="form-card-sub">{status}</p>
          <Link href="/admin" className="btn" style={{ marginTop: 8 }}>
            Tilbage til admin
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 32 }}>
        <div className="kicker-strip">
          <span className="dash" />
          <span className="eyebrow">Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <h1>Ligafordeling — {CURRENT_SEASON}</h1>
          <Link href="/admin" className="eyebrow" style={{ color: 'var(--muted)' }}>← Admin</Link>
        </div>
      </div>

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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                {resultat.ligaer.map((liga: LigaForslag) => (
                  <div key={liga.ligaNavn} className="lb-col">
                    <div className="lb-col-head">
                      <span className="lb-col-name" style={{ fontSize: 18 }}>{liga.ligaNavn}</span>
                      <span className={`type-badge ${liga.type}`}>{liga.type}</span>
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
                    Ikke tilfreds? Klik "Træk ny fordeling" for en ny tilfældig fordeling.
                  </p>
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
  )
}
