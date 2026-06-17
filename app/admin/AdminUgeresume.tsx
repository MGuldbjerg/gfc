'use client'

import { useState } from 'react'

interface Resultat {
  season: string
  week: number
  harData: boolean
  subject: string
  overskrift: string
  brødtekst: string
  facebook: string
}

type Status = 'idle' | 'loading' | 'done' | 'error'

export function AdminUgeresume() {
  const [week, setWeek]       = useState('')      // tom = lad serveren foreslå ugen
  const [status, setStatus]   = useState<Status>('idle')
  const [fejl, setFejl]       = useState('')
  const [res, setRes]         = useState<Resultat | null>(null)
  const [kopieret, setKopieret] = useState<'facebook' | 'email' | null>(null)

  async function generer() {
    setStatus('loading')
    setFejl('')
    setKopieret(null)
    try {
      const q = week.trim() ? `?week=${encodeURIComponent(week.trim())}` : ''
      const r = await fetch(`/api/admin/ugeresume${q}`)
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? 'Kunne ikke generere resumé')
      setRes(data)
      setWeek(String(data.week))
      setStatus('done')
    } catch (err) {
      setFejl(err instanceof Error ? err.message : 'Noget gik galt')
      setStatus('error')
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
              <button className="fmt-btn" onClick={() => kopier(res.facebook, 'facebook')}>
                {kopieret === 'facebook' ? '✓ Kopieret' : '⎘ Kopiér'}
              </button>
            </div>
            <textarea
              className="gfc-input"
              readOnly
              rows={12}
              value={res.facebook}
              style={{ resize: 'vertical', lineHeight: 1.6, fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
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
