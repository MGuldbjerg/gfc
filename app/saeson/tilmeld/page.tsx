'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CURRENT_SEASON } from '@/lib/leagues'

const RÆKKER = [
  { id: 'bestball', label: 'Bestball', desc: 'Automatiske startere — sat-og-glem' },
  { id: 'managed',  label: 'Managed',  desc: 'Klassisk fantasy — sæt dit hold hver uge' },
  { id: 'chopped',  label: 'Chopped',  desc: 'Guillotine-format — én ryger ud om ugen' },
]

const PRIORITET_LABEL = ['1. prioritet', '2. prioritet', '3. prioritet']

export default function SaesonTilmeldPage() {
  const router = useRouter()
  const [prioritet, setPrioritet] = useState<string[]>(['bestball', 'managed'])
  const [fejl, setFejl] = useState('')
  const [loading, setLoading] = useState(false)

  function toggle(id: string) {
    setPrioritet(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  function flyt(id: string, retning: -1 | 1) {
    setPrioritet(prev => {
      const idx = prev.indexOf(id)
      const nyIdx = idx + retning
      if (nyIdx < 0 || nyIdx >= prev.length) return prev
      const næste = [...prev]
      ;[næste[idx], næste[nyIdx]] = [næste[nyIdx], næste[idx]]
      return næste
    })
  }

  async function tilmeld(e: React.FormEvent) {
    e.preventDefault()
    setFejl('')
    setLoading(true)
    const res = await fetch('/api/saeson/tilmeld', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valgteRækker: prioritet }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setFejl(data.error ?? 'Noget gik galt. Prøv igen.')
      return
    }
    router.push('/min-side')
    router.refresh()
  }

  return (
    <div className="form-page" style={{ alignItems: 'flex-start', paddingTop: 60 }}>
      <div className="form-card" style={{ maxWidth: 480 }}>
        <div className="kicker-strip" style={{ marginBottom: 20 }}>
          <span className="dash" />
          <span className="eyebrow">Tilmelding</span>
        </div>
        <h1 className="form-card-title">GFC {CURRENT_SEASON}</h1>
        <p className="form-card-sub">
          Vælg de rækker du vil spille og sæt dem i rækkefølge. Vi fordeler dig efter din 1. prioritet hvis muligt.
        </p>

        {fejl && <p className="form-error" style={{ marginBottom: 16 }}>{fejl}</p>}

        <form onSubmit={tilmeld} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RÆKKER.map(({ id, label, desc }) => {
              const prio = prioritet.indexOf(id)
              const valgt = prio !== -1
              return (
                <div
                  key={id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    background: valgt ? 'var(--bg-2)' : 'var(--panel)',
                    border: `1px solid ${valgt ? 'color-mix(in oklch, var(--ink) 25%, var(--line))' : 'var(--line)'}`,
                    borderRadius: 'var(--r-sm)',
                    transition: 'border-color .2s, background .2s',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    style={{
                      width: 32, height: 32, flexShrink: 0,
                      borderRadius: '50%',
                      background: valgt ? 'var(--ink)' : 'var(--bg-2)',
                      color: valgt ? 'var(--bg)' : 'var(--muted)',
                      border: `1px solid ${valgt ? 'var(--ink)' : 'var(--line)'}`,
                      fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background .2s, color .2s',
                    }}
                    aria-label={valgt ? `Fjern ${label}` : `Tilføj ${label}`}
                  >
                    {valgt ? prio + 1 : '+'}
                  </button>

                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => toggle(id)}>
                    <p style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink)' }}>{label}</p>
                    <p className="eyebrow" style={{ marginTop: 2 }}>{desc}</p>
                    {valgt && (
                      <p className="eyebrow" style={{ marginTop: 4, color: 'var(--ink-2)' }}>{PRIORITET_LABEL[prio]}</p>
                    )}
                  </div>

                  {valgt && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button
                        type="button" onClick={() => flyt(id, -1)} disabled={prio === 0}
                        style={{ background: 'none', border: 'none', cursor: prio === 0 ? 'default' : 'pointer', color: 'var(--muted)', opacity: prio === 0 ? 0.2 : 1, fontSize: 11, padding: '2px 4px' }}
                        aria-label="Flyt op i prioritet"
                      >▲</button>
                      <button
                        type="button" onClick={() => flyt(id, 1)} disabled={prio === prioritet.length - 1}
                        style={{ background: 'none', border: 'none', cursor: prio === prioritet.length - 1 ? 'default' : 'pointer', color: 'var(--muted)', opacity: prio === prioritet.length - 1 ? 0.2 : 1, fontSize: 11, padding: '2px 4px' }}
                        aria-label="Flyt ned i prioritet"
                      >▼</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button
            type="submit"
            disabled={loading || prioritet.length === 0}
            className="btn"
            style={{ justifyContent: 'center', opacity: (loading || prioritet.length === 0) ? 0.5 : 1, marginTop: 4 }}
          >
            {loading ? 'Gemmer…' : `Tilmeld mig GFC ${CURRENT_SEASON}`}
            {!loading && <span className="arrow" aria-hidden />}
          </button>

          <p className="eyebrow" style={{ textAlign: 'center' }}>
            Du kan altid ændre dine præferencer eller framelde dig fra din side.
          </p>
        </form>
      </div>
    </div>
  )
}
