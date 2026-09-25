'use client'

import { useEffect, useState } from 'react'

interface Resultat {
  season: string
  week: number
  harData: boolean
  subject: string
  overskrift: string
  brødtekst: string
  facebook: string
}

interface SideStatus {
  konfigureret: boolean
  ok: boolean
  sideId?: string
  sideNavn?: string
  fejl?: string
}

interface OpslagsResultat {
  id: string
  tilstand: 'udgiv' | 'planlaeg' | 'kladde'
  permalink: string
  planlagtTil?: string
}

type Status = 'idle' | 'loading' | 'done' | 'error'
type Tilstand = 'kladde' | 'planlaeg' | 'udgiv'

const TILSTAND_TEKST: Record<Tilstand, string> = {
  kladde: 'Gem som kladde på siden — du udgiver selv med ét klik i Meta Business Suite.',
  planlaeg: 'Planlæg om 60 minutter — kan nås at rettes eller aflyses inden da.',
  udgiv: 'Udgiv straks på GFC-siden. Opslaget er offentligt med det samme.',
}

export function AdminUgeresume() {
  const [week, setWeek]       = useState('')      // tom = lad serveren foreslå ugen
  const [status, setStatus]   = useState<Status>('idle')
  const [fejl, setFejl]       = useState('')
  const [res, setRes]         = useState<Resultat | null>(null)
  const [fbTekst, setFbTekst] = useState('')      // redigerbar — det er DEN tekst der slås op
  const [kopieret, setKopieret] = useState<'facebook' | 'email' | null>(null)

  const [side, setSide]           = useState<SideStatus | null>(null)
  const [tilstand, setTilstand]   = useState<Tilstand>('udgiv')
  const [slaarOp, setSlaarOp]     = useState(false)
  const [opslag, setOpslag]       = useState<OpslagsResultat | null>(null)
  const [opslagsFejl, setOpslagsFejl] = useState('')

  // Hent Facebook-forbindelsens status én gang, så et udløbet token opdages med det samme.
  useEffect(() => {
    fetch('/api/admin/opslag/facebook')
      .then(r => r.json())
      .then(setSide)
      .catch(() => setSide({ konfigureret: false, ok: false, fejl: 'Kunne ikke kontakte serveren' }))
  }, [])

  async function generer() {
    setStatus('loading')
    setFejl('')
    setKopieret(null)
    setOpslag(null)
    setOpslagsFejl('')
    try {
      const q = week.trim() ? `?week=${encodeURIComponent(week.trim())}` : ''
      const r = await fetch(`/api/admin/ugeresume${q}`)
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? 'Kunne ikke generere resumé')
      setRes(data)
      setFbTekst(data.facebook)
      setWeek(String(data.week))
      setStatus('done')
    } catch (err) {
      setFejl(err instanceof Error ? err.message : 'Noget gik galt')
      setStatus('error')
    }
  }

  async function slaaOp() {
    if (tilstand === 'udgiv' && !confirm('Udgiv opslaget offentligt på GFC-siden nu?')) return

    setSlaarOp(true)
    setOpslag(null)
    setOpslagsFejl('')
    try {
      const r = await fetch('/api/admin/opslag/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tekst: fbTekst, tilstand, planlaegMinutter: 60 }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? 'Kunne ikke slå op')
      setOpslag(data)
    } catch (err) {
      setOpslagsFejl(err instanceof Error ? err.message : 'Noget gik galt')
    } finally {
      setSlaarOp(false)
    }
  }

  async function kopier(tekst: string, hvilken: 'facebook' | 'email') {
    try {
      await navigator.clipboard.writeText(tekst)
      setKopieret(hvilken)
      setTimeout(() => setKopieret(null), 2000)
    } catch {
      setFejl('Kunne ikke kopiere — markér teksten og kopiér manuelt.')
    }
  }

  return (
    <div className="form-card" style={{ maxWidth: 680 }}>
      <div className="form-card-title">Ugeresumé</div>
      <p className="form-card-sub" style={{ marginTop: 4 }}>
        Genererer ugens opdatering automatisk ud fra leaderboardet — klar til Facebook og nyhedsmail.
        Ingen tekst skrives i hånden.
      </p>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 24 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="eyebrow">Uge</span>
          <input
            className="gfc-input"
            style={{ width: 110 }}
            type="number"
            min={1}
            max={17}
            value={week}
            onChange={e => setWeek(e.target.value)}
            placeholder="Auto"
          />
        </label>
        <button className="btn" onClick={generer} disabled={status === 'loading'}>
          {status === 'loading' ? 'Genererer…' : 'Generér'}
          {status !== 'loading' && <span className="arrow" aria-hidden />}
        </button>
      </div>

      {status === 'error' && (
        <p style={{ color: 'var(--accent)', fontSize: 13, marginTop: 16 }}>{fejl}</p>
      )}

      {res && status === 'done' && (
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {!res.harData && (
            <p className="form-card-sub" style={{ color: 'var(--accent)' }}>
              Ingen kampdata for uge {res.week} endnu — prøv igen når ugens kampe er spillet (data opdateres tirsdage).
            </p>
          )}

          {/* Facebook */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="eyebrow">Facebook-opslag</span>
              <button className="fmt-btn" onClick={() => kopier(fbTekst, 'facebook')}>
                {kopieret === 'facebook' ? '✓ Kopieret' : '⎘ Kopiér'}
              </button>
            </div>
            <textarea
              className="gfc-input"
              rows={12}
              value={fbTekst}
              onChange={e => setFbTekst(e.target.value)}
              style={{ resize: 'vertical', lineHeight: 1.6, fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />

            {/* Slå direkte op på siden */}
            <div style={{ borderTop: '1px dashed var(--line)', paddingTop: 16, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="eyebrow">Slå op på GFC-siden</span>

              {side && !side.konfigureret && (
                <p className="form-card-sub" style={{ margin: 0 }}>
                  Ikke sat op endnu — tilføj <code>FACEBOOK_PAGE_ID</code> og{' '}
                  <code>FACEBOOK_PAGE_ACCESS_TOKEN</code> i Vercel. Indtil da: kopiér teksten ind manuelt.
                </p>
              )}
              {side?.konfigureret && !side.ok && (
                <p className="form-card-sub" style={{ margin: 0, color: 'var(--accent)' }}>
                  Facebook-forbindelsen svarer ikke: {side.fejl}
                </p>
              )}
              {side?.ok && (
                <p className="form-card-sub" style={{ margin: 0 }}>
                  Forbundet til <strong>{side.sideNavn ?? side.sideId}</strong>.
                  Facebook-<em>gruppen</em> skal stadig have teksten manuelt — Meta lukkede for gruppe-opslag via API i 2024.
                </p>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="eyebrow">Hvordan</span>
                  <select
                    className="gfc-input"
                    value={tilstand}
                    onChange={e => setTilstand(e.target.value as Tilstand)}
                    style={{ width: 220 }}
                  >
                    <option value="udgiv">Udgiv nu</option>
                    <option value="planlaeg">Planlæg om 60 min.</option>
                    <option value="kladde">Kladde (du udgiver selv)</option>
                  </select>
                </label>
                <button
                  className="btn"
                  onClick={slaaOp}
                  disabled={slaarOp || !side?.ok || !fbTekst.trim()}
                >
                  {slaarOp ? 'Sender…' : 'Slå op'}
                  {!slaarOp && <span className="arrow" aria-hidden />}
                </button>
              </div>

              <p className="form-card-sub" style={{ margin: 0 }}>{TILSTAND_TEKST[tilstand]}</p>

              {opslagsFejl && (
                <p style={{ color: 'var(--accent)', fontSize: 13, margin: 0 }}>{opslagsFejl}</p>
              )}
              {opslag && (
                <p className="form-card-sub" style={{ margin: 0 }}>
                  ✓ {opslag.tilstand === 'udgiv' ? 'Udgivet' : opslag.tilstand === 'planlaeg' ? 'Planlagt' : 'Gemt som kladde'}
                  {opslag.planlagtTil && ` til ${new Date(opslag.planlagtTil).toLocaleString('da-DK')}`}
                  {' — '}
                  <a href={opslag.permalink} target="_blank" rel="noopener noreferrer">se opslaget</a>
                </p>
              )}
            </div>
          </div>

          {/* E-mail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="eyebrow">Nyhedsmail-tekst</span>
              <button className="fmt-btn" onClick={() => kopier(res.brødtekst, 'email')}>
                {kopieret === 'email' ? '✓ Kopieret' : '⎘ Kopiér brødtekst'}
              </button>
            </div>
            <p className="form-card-sub" style={{ margin: 0 }}>
              Emne: <strong>{res.subject}</strong> · Overskrift: <strong>{res.overskrift}</strong>
            </p>
            <textarea
              className="gfc-input"
              readOnly
              rows={12}
              value={res.brødtekst}
              style={{ resize: 'vertical', lineHeight: 1.6, fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
            <p className="form-card-sub" style={{ margin: 0 }}>
              Indsæt brødteksten i <strong>E-mail</strong>-fanen for at forhåndsvise og sende som nyhedsbrev.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
