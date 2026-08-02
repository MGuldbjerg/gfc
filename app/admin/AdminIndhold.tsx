'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Side = {
  slug: string
  title: string
  body: string
  fraDatabase: boolean
  iMenu: boolean
  harFil: boolean
}

type Tekst = { key: string; standard: string; værdi: string; ændret: boolean }

type Data = { sider: Side[]; tekster: Tekst[]; pladsholdere: Record<string, string> }

// The dot-paths in content/tekst.ts grouped into something readable. Anything
// not listed falls into "Andet", so a new key in the file still shows up.
const GRUPPER: { præfiks: string; navn: string }[] = [
  { præfiks: 'landing.', navn: 'Forsiden' },
  { præfiks: 'nav.', navn: 'Menuen' },
  { præfiks: 'tilmeld.', navn: 'Tilmeldingsformularen' },
]

function gruppeFor(key: string) {
  return GRUPPER.find(g => key.startsWith(g.præfiks))?.navn ?? 'Andet'
}

export function AdminIndhold() {
  const [data, setData] = useState<Data | null>(null)
  const [fane, setFane] = useState<'sider' | 'tekst'>('sider')
  const [valgtSlug, setValgtSlug] = useState('')
  const [udkast, setUdkast] = useState<{ title: string; body: string; iMenu: boolean } | null>(null)
  const [nySide, setNySide] = useState(false)
  const [nySlug, setNySlug] = useState('')
  const [gemmer, setGemmer] = useState(false)
  const [besked, setBesked] = useState('')
  const [fejl, setFejl] = useState('')

  const hent = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/indhold')
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      setFejl('Kunne ikke hente indholdet.')
    }
  }, [])

  useEffect(() => { hent() }, [hent])

  const valgt = data?.sider.find(s => s.slug === valgtSlug) ?? null

  function vælgSide(slug: string) {
    const side = data?.sider.find(s => s.slug === slug)
    setValgtSlug(slug)
    setNySide(false)
    setBesked('')
    setFejl('')
    setUdkast(side ? { title: side.title, body: side.body, iMenu: side.iMenu } : null)
  }

  function startNySide() {
    setNySide(true)
    setValgtSlug('')
    setNySlug('')
    setBesked('')
    setFejl('')
    setUdkast({ title: '', body: '', iMenu: true })
  }

  async function gemSide() {
    if (!udkast) return
    const slug = nySide ? nySlug.trim().toLowerCase() : valgtSlug
    setGemmer(true)
    setBesked('')
    setFejl('')
    try {
      const res = await fetch('/api/admin/indhold', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slags: 'side', slug, ...udkast }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setFejl(d.error ?? 'Noget gik galt.'); return }
      await hent()
      setNySide(false)
      setValgtSlug(slug)
      setBesked(`Gemt. Siden er live på /${slug} inden for et minut.`)
    } finally {
      setGemmer(false)
    }
  }

  async function nulstilSide() {
    if (!valgt) return
    const spørgsmål = valgt.harFil
      ? `Sæt "${valgt.title}" tilbage til den oprindelige tekst?`
      : `Slet siden "${valgt.title}" helt? Den findes kun her.`
    if (!confirm(spørgsmål)) return

    setGemmer(true)
    setBesked('')
    setFejl('')
    try {
      const res = await fetch('/api/admin/indhold', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slags: 'side', slug: valgt.slug }),
      })
      if (!res.ok) { setFejl('Noget gik galt.'); return }
      await hent()
      if (valgt.harFil) {
        setBesked('Sat tilbage til den oprindelige tekst.')
        vælgSide(valgt.slug)
      } else {
        setBesked('Siden er slettet.')
        setValgtSlug('')
        setUdkast(null)
      }
    } finally {
      setGemmer(false)
    }
  }

  const ændret =
    !!valgt && !!udkast &&
    (udkast.title !== valgt.title || udkast.body !== valgt.body || udkast.iMenu !== valgt.iMenu)

  return (
    <div>
      <div className="season-pills" style={{ marginBottom: 24 }}>
        <button className={`season-pill${fane === 'sider' ? ' active' : ''}`} onClick={() => setFane('sider')}>
          Sider
        </button>
        <button className={`season-pill${fane === 'tekst' ? ' active' : ''}`} onClick={() => setFane('tekst')}>
          Forside og menu
        </button>
      </div>

      {data && (
        <p className="eyebrow" style={{ marginBottom: 20 }}>
          Pladsholdere du kan skrive i teksten:{' '}
          {Object.entries(data.pladsholdere).map(([k, v], i) => (
            <span key={k}>
              {i > 0 && ' · '}
              <code>{`{${k}}`}</code> → {v}
            </span>
          ))}
        </p>
      )}

      {!data && !fejl && <p className="eyebrow">Indlæser…</p>}

      {fane === 'sider' && data && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 220, flex: '0 0 220px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              {data.sider.map(s => (
                <button
                  key={s.slug}
                  onClick={() => vælgSide(s.slug)}
                  className={`season-pill${valgtSlug === s.slug ? ' active' : ''}`}
                  style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                >
                  /{s.slug}
                  {s.fraDatabase && <span style={{ marginLeft: 6, fontSize: 10, opacity: .7 }}>redigeret</span>}
                </button>
              ))}
            </div>
            <button className="btn ghost" style={{ width: '100%' }} onClick={startNySide}>
              + Ny side
            </button>
          </div>

          <div style={{ flex: 1, minWidth: 320 }}>
            {!udkast && <p className="eyebrow">Vælg en side til venstre — eller opret en ny.</p>}

            {udkast && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {nySide && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span className="eyebrow">Adresse (URL)</span>
                    <input
                      className="gfc-input"
                      style={{ padding: '10px 12px' }}
                      placeholder="praemier"
                      value={nySlug}
                      onChange={e => setNySlug(e.target.value)}
                    />
                    <span className="eyebrow">
                      Siden bliver til {typeof window !== 'undefined' ? window.location.origin : ''}/
                      {nySlug.trim().toLowerCase() || '…'}
                    </span>
                  </label>
                )}

                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span className="eyebrow">Overskrift</span>
                  <input
                    className="gfc-input"
                    style={{ padding: '10px 12px' }}
                    value={udkast.title}
                    onChange={e => setUdkast({ ...udkast, title: e.target.value })}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span className="eyebrow">Tekst</span>
                  <textarea
                    className="gfc-input"
                    style={{ padding: '12px', minHeight: 380, fontFamily: 'var(--font-mono, monospace)', fontSize: 13, lineHeight: 1.6 }}
                    value={udkast.body}
                    onChange={e => setUdkast({ ...udkast, body: e.target.value })}
                  />
                  <span className="eyebrow">
                    Skriv som i en mail. <code>## Overskrift</code> giver en underoverskrift,{' '}
                    <code>- punkt</code> giver en punktopstilling, <code>**fed**</code> giver fed tekst.
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={udkast.iMenu}
                    onChange={e => setUdkast({ ...udkast, iMenu: e.target.checked })}
                  />
                  Vis i menuen
                  {valgt && !valgt.fraDatabase && (
                    <span className="eyebrow" style={{ marginLeft: 6 }}>
                      (denne side står allerede fast i menuen)
                    </span>
                  )}
                </label>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    className="btn"
                    disabled={gemmer || (nySide ? !nySlug.trim() : !ændret)}
                    onClick={gemSide}
                  >
                    {gemmer ? 'Gemmer…' : nySide ? 'Opret side' : 'Gem ændringer'}
                  </button>
                  {valgt?.fraDatabase && (
                    <button className="btn ghost" disabled={gemmer} onClick={nulstilSide}>
                      {valgt.harFil ? 'Fortryd alle ændringer' : 'Slet siden'}
                    </button>
                  )}
                  {valgt && (
                    <a className="eyebrow" href={`/${valgt.slug}`} target="_blank" rel="noreferrer">
                      Se siden ↗
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {fane === 'tekst' && data && <TekstListe tekster={data.tekster} onGemt={hent} />}

      {besked && <p className="eyebrow" style={{ color: 'var(--pos)', marginTop: 16 }}>✓ {besked}</p>}
      {fejl && <p className="eyebrow" style={{ color: 'var(--accent)', marginTop: 16 }}>{fejl}</p>}
    </div>
  )
}

// Every editable string from content/tekst.ts, one row each. Saving is per
// string, so a mistake in one place can be reset without touching the rest.
function TekstListe({ tekster, onGemt }: { tekster: Tekst[]; onGemt: () => Promise<void> }) {
  const [udkast, setUdkast] = useState<Record<string, string>>({})
  const [gemmer, setGemmer] = useState('')

  const grupperet = useMemo(() => {
    const map = new Map<string, Tekst[]>()
    for (const t of tekster) {
      const g = gruppeFor(t.key)
      map.set(g, [...(map.get(g) ?? []), t])
    }
    return [...map.entries()]
  }, [tekster])

  async function gem(t: Tekst) {
    setGemmer(t.key)
    try {
      await fetch('/api/admin/indhold', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slags: 'tekst', key: t.key, værdi: udkast[t.key] ?? t.værdi }),
      })
      await onGemt()
      setUdkast(u => { const n = { ...u }; delete n[t.key]; return n })
    } finally {
      setGemmer('')
    }
  }

  async function nulstil(t: Tekst) {
    setGemmer(t.key)
    try {
      await fetch('/api/admin/indhold', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slags: 'tekst', key: t.key }),
      })
      await onGemt()
      setUdkast(u => { const n = { ...u }; delete n[t.key]; return n })
    } finally {
      setGemmer('')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {grupperet.map(([gruppe, rækker]) => (
        <div key={gruppe}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>{gruppe}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rækker.map(t => {
              const værdi = udkast[t.key] ?? t.værdi
              const ændret = værdi !== t.værdi
              const lang = t.standard.length > 70
              return (
                <div key={t.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <code className="eyebrow" style={{ minWidth: 190, paddingTop: 10, fontSize: 11 }}>
                    {t.key}
                  </code>
                  {lang ? (
                    <textarea
                      className="gfc-input"
                      style={{ flex: 1, minWidth: 260, padding: '9px 12px', minHeight: 72, fontSize: 13 }}
                      value={værdi}
                      onChange={e => setUdkast({ ...udkast, [t.key]: e.target.value })}
                    />
                  ) : (
                    <input
                      className="gfc-input"
                      style={{ flex: 1, minWidth: 260, padding: '9px 12px', fontSize: 13 }}
                      value={værdi}
                      onChange={e => setUdkast({ ...udkast, [t.key]: e.target.value })}
                    />
                  )}
                  <button className="btn" disabled={!ændret || gemmer === t.key} onClick={() => gem(t)}>
                    {gemmer === t.key ? '…' : 'Gem'}
                  </button>
                  {t.ændret && (
                    <button
                      className="btn ghost"
                      disabled={gemmer === t.key}
                      title="Sæt tilbage til den oprindelige tekst"
                      onClick={() => nulstil(t)}
                    >
                      Fortryd
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
