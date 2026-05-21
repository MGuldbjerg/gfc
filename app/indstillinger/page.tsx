'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function IndstillingerPage() {
  const [visSleeper, setVisSleeper] = useState(true)
  const [visBadges, setVisBadges] = useState(true)
  const [nyhedsbrev, setNyhedsbrev] = useState(true)
  const [loading, setLoading] = useState(true)
  const [gemmer, setGemmer] = useState(false)
  const [besked, setBesked] = useState('')

  useEffect(() => {
    async function hentPræferencer() {
      const res = await fetch('/api/profil/præferencer')
      if (res.status === 401) {
        window.location.href = '/log-ind?retur=/indstillinger'
        return
      }
      if (res.ok) {
        const data = await res.json()
        setVisSleeper(data.visSleeper ?? true)
        setVisBadges(data.visBadges ?? true)
        setNyhedsbrev(data.nyhedsbrev ?? true)
      }
      setLoading(false)
    }
    hentPræferencer()
  }, [])

  async function gemIndstillinger() {
    setGemmer(true)
    setBesked('')
    const res = await fetch('/api/profil/præferencer', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visSleeper, visBadges, nyhedsbrev }),
    })
    setGemmer(false)
    if (res.ok) {
      setBesked('Indstillinger gemt.')
    } else {
      const data = await res.json().catch(() => ({}))
      setBesked(data.error ?? 'Noget gik galt. Prøv igen.')
    }
  }

  if (loading) {
    return (
      <div className="form-page">
        <p className="eyebrow">Indlæser…</p>
      </div>
    )
  }

  const indstillinger = [
    { id: 'visSleeper', checked: visSleeper, onChange: setVisSleeper, label: 'Vis Sleeper-brugernavn', desc: 'Dit Sleeper-brugernavn vises på din offentlige profil' },
    { id: 'visBadges',  checked: visBadges,  onChange: setVisBadges,  label: 'Vis badges',             desc: 'Din badge-hylde vises på din offentlige profil' },
    { id: 'nyhedsbrev', checked: nyhedsbrev, onChange: setNyhedsbrev, label: 'Nyhedsbrev',              desc: 'Modtag ugentlige highlights, præmier m.m. fra GFC' },
  ]

  return (
    <div className="gfc-app">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="page-head" style={{ paddingBottom: 24 }}>
          <Link href="/min-side" className="eyebrow" style={{ color: 'var(--muted)', display: 'inline-block', marginBottom: 20 }}>
            ← Tilbage
          </Link>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>Indstillinger</h1>
        </div>

        <div className="lb-col" style={{ marginBottom: 80 }}>
          <div className="lb-col-head">
            <span className="lb-col-name" style={{ fontSize: 16 }}>Privatlivspræferencer</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {indstillinger.map(({ id, checked, onChange, label, desc }) => (
              <label key={id} className="gfc-toggle">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => onChange(e.target.checked)}
                />
                <div>
                  <div className="tgl-label">{label}</div>
                  <div className="tgl-desc">{desc}</div>
                </div>
              </label>
            ))}
          </div>

          <button
            onClick={gemIndstillinger}
            disabled={gemmer}
            className="btn"
            style={{ width: '100%', justifyContent: 'center', opacity: gemmer ? 0.6 : 1 }}
          >
            {gemmer ? 'Gemmer…' : 'Gem indstillinger'}
          </button>

          {besked && (
            <p className="eyebrow" style={{ marginTop: 14, textAlign: 'center', color: besked.includes('gemt') ? 'var(--pos)' : 'var(--accent)' }}>
              {besked}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
