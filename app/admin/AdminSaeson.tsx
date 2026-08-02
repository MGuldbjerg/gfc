'use client'

import { useCallback, useEffect, useState } from 'react'

type LeagueType = 'bestball' | 'managed' | 'chopped'
type Liga = { ligaNavn: string; type: LeagueType; sleeperId: string }

type Data = {
  season: string
  signupDeadline: string | null
  inviteCode: string | null
  draftStart: string | null
  fordelingDato: string | null
  sæsonStart: string | null
  ligaer: Liga[]
  sæsoner: string[]
}

// datetime-local <-> absolute-instant helpers. The <input> works in the admin's
// local browser time; we store and compare absolute ISO instants. (Assumes the
// admin's browser clock is in Danish time — which it is.)
function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function TomLiga(): Liga {
  return { ligaNavn: '', type: 'bestball', sleeperId: '' }
}

export function AdminSaeson({ season }: { season: string }) {
  const [data, setData] = useState<Data | null>(null)
  const [deadlineLocal, setDeadlineLocal] = useState('')
  const [datoer, setDatoer] = useState({ draftStart: '', fordelingDato: '', sæsonStart: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [fejl, setFejl] = useState('')
  const [copied, setCopied] = useState(false)

  // Season turnover
  const [nySæson, setNySæson] = useState('')
  const [nyeLigaer, setNyeLigaer] = useState<Liga[]>([TomLiga()])
  const [gørAktuel, setGørAktuel] = useState(false)
  const [visSæsonskifte, setVisSæsonskifte] = useState(false)

  // Leaderboard refresh
  const [opdaterer, setOpdaterer] = useState(false)
  const [opdaterBesked, setOpdaterBesked] = useState('')

  const anvend = useCallback((d: Data) => {
    setData(d)
    setDeadlineLocal(isoToLocalInput(d.signupDeadline))
    setDatoer({
      draftStart: d.draftStart ?? '',
      fordelingDato: d.fordelingDato ?? '',
      sæsonStart: d.sæsonStart ?? '',
    })
  }, [])

  useEffect(() => {
    fetch('/api/admin/saeson')
      .then(r => r.json())
      .then(anvend)
      .catch(() => setFejl('Kunne ikke hente indstillinger.'))
      .finally(() => setLoading(false))
  }, [anvend])

  async function put(body: Record<string, unknown>, melding: string) {
    setSaving(true)
    setStatus('')
    setFejl('')
    try {
      const res = await fetch('/api/admin/saeson', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFejl(d.error ?? 'Noget gik galt.')
        return
      }
      anvend(d)
      setStatus(melding)
    } finally {
      setSaving(false)
    }
  }

  async function gemSæsonskifte() {
    setSaving(true)
    setStatus('')
    setFejl('')
    try {
      const res = await fetch('/api/admin/saeson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season: nySæson.trim(), ligaer: nyeLigaer, gørAktuel }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFejl(d.error ?? 'Noget gik galt.')
        return
      }
      anvend(d)
      setStatus(
        gørAktuel
          ? `${nySæson} er nu den aktuelle sæson. Genindlæs siden for at se den overalt.`
          : `Ligaer gemt for ${nySæson}. Sæt flueben i "Gør til aktuel sæson" når I skal spille den.`
      )
      setVisSæsonskifte(false)
    } finally {
      setSaving(false)
    }
  }

  async function opdaterNu() {
    setOpdaterer(true)
    setOpdaterBesked('')
    try {
      const res = await fetch('/api/admin/opdater', { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setOpdaterBesked(d.error ?? 'Kunne ikke opdatere.')
        return
      }
      const hold = (d.opdateret ?? []).reduce(
        (sum: number, r: { hold: number }) => sum + r.hold, 0
      )
      setOpdaterBesked(
        d.ok
          ? `Leaderboard opdateret for ${d.sæson} — ${hold} hold hentet fra Sleeper.`
          : `Delvist opdateret. ${(d.fejl ?? []).join(' · ')}`
      )
    } catch {
      setOpdaterBesked('Kunne ikke kontakte serveren.')
    } finally {
      setOpdaterer(false)
    }
  }

  const inviteLink =
    data?.inviteCode && typeof window !== 'undefined'
      ? `${window.location.origin}/saeson/tilmeld?invite=${data.inviteCode}`
      : ''

  async function copyLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <p className="eyebrow">Henter indstillinger…</p>

  return (
    <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 36 }}>
      {/* Deadline */}
      <div>
        <h3 style={{ fontSize: 16, marginBottom: 4 }}>Tilmeldingsfrist</h3>
        <p className="eyebrow" style={{ marginBottom: 12 }}>
          Når fristen er passeret, lukkes den offentlige tilmelding. Folk med invitationslinket kan stadig tilmelde sig.
          Lad feltet være tomt for at holde tilmeldingen åben.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="datetime-local"
            value={deadlineLocal}
            onChange={e => setDeadlineLocal(e.target.value)}
            className="gfc-input"
            style={{ padding: '10px 12px' }}
          />
          <button
            className="btn"
            disabled={saving}
            onClick={() => put({ signupDeadline: localInputToIso(deadlineLocal) }, 'Frist gemt.')}
          >
            Gem frist
          </button>
          {deadlineLocal && (
            <button
              className="btn ghost"
              disabled={saving}
              onClick={() => { setDeadlineLocal(''); put({ signupDeadline: null }, 'Tilmelding genåbnet.') }}
            >
              Ryd frist
            </button>
          )}
        </div>
      </div>

      {/* Nøgledatoer */}
      <div>
        <h3 style={{ fontSize: 16, marginBottom: 4 }}>Nøgledatoer</h3>
        <p className="eyebrow" style={{ marginBottom: 12 }}>
          Datoerne vises automatisk på forsiden og i teksterne, hvor pladsholderne{' '}
          <code>{'{draftstart}'}</code>, <code>{'{fordelingsdato}'}</code> og <code>{'{sæsonstart}'}</code>{' '}
          står. Ret dem her — så er de rettet alle steder.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          {([
            ['draftStart', 'Slow drafts starter'],
            ['fordelingDato', 'Ligafordeling'],
            ['sæsonStart', 'NFL-sæsonen starter'],
          ] as const).map(([felt, label]) => (
            <label key={felt} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="eyebrow" style={{ minWidth: 160 }}>{label}</span>
              <input
                type="date"
                className="gfc-input"
                style={{ padding: '9px 12px' }}
                value={datoer[felt]}
                onChange={e => setDatoer({ ...datoer, [felt]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <button
          className="btn"
          style={{ marginTop: 12 }}
          disabled={saving}
          onClick={() => put(datoer, 'Datoer gemt.')}
        >
          Gem datoer
        </button>
      </div>

      {/* Invite link */}
      <div>
        <h3 style={{ fontSize: 16, marginBottom: 4 }}>Invitationslink</h3>
        <p className="eyebrow" style={{ marginBottom: 12 }}>
          Send dette link til sene deltagere, så de kan tilmelde sig efter fristen. Generér et nyt for at gøre det gamle ugyldigt.
        </p>
        {data?.inviteCode ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <code
              style={{
                flex: 1, minWidth: 240, padding: '10px 12px',
                background: 'var(--bg-2)', border: '1px solid var(--line)',
                borderRadius: 'var(--r-sm)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {inviteLink}
            </code>
            <button className="btn" onClick={copyLink}>{copied ? 'Kopieret!' : 'Kopiér link'}</button>
            <button
              className="btn ghost"
              disabled={saving}
              onClick={() => put({ regenerateInvite: true }, 'Nyt invitationslink genereret.')}
            >
              Generér nyt
            </button>
          </div>
        ) : (
          <button
            className="btn"
            disabled={saving}
            onClick={() => put({ regenerateInvite: true }, 'Invitationslink genereret.')}
          >
            Generér invitationslink
          </button>
        )}
      </div>

      {/* Leaderboard-opdatering */}
      <div>
        <h3 style={{ fontSize: 16, marginBottom: 4 }}>Leaderboard-data</h3>
        <p className="eyebrow" style={{ marginBottom: 12 }}>
          Leaderboardet henter selv nye tal fra Sleeper hver tirsdag morgen. Tryk her, hvis du vil have de
          nyeste tal med det samme — fx lige efter en søndagsrunde.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn" disabled={opdaterer} onClick={opdaterNu}>
            {opdaterer ? 'Henter fra Sleeper…' : '↺ Opdater nu'}
          </button>
          {opdaterBesked && <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{opdaterBesked}</span>}
        </div>
      </div>

      {/* Sæsonskifte */}
      <div>
        <h3 style={{ fontSize: 16, marginBottom: 4 }}>Ny sæson</h3>
        <p className="eyebrow" style={{ marginBottom: 12 }}>
          Aktuel sæson: <strong>{data?.season ?? season}</strong>
          {data?.ligaer.length ? ` · ${data.ligaer.length} ligaer indtastet her` : ' · ligaer kommer fra koden'}
        </p>

        {!visSæsonskifte ? (
          <button className="btn ghost" onClick={() => { setVisSæsonskifte(true); setNySæson(''); setNyeLigaer([TomLiga()]) }}>
            + Opret ny sæson
          </button>
        ) : (
          <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: 16 }}>
            <p className="eyebrow" style={{ marginBottom: 14 }}>
              Opret ligaerne i Sleeper først. Åbn hver liga, kopiér det lange tal fra adressen
              (<code>sleeper.com/leagues/<strong>1388639623651012608</strong></code>) og indsæt det her.
              Kald ligaerne BB1, BB2… (bestball), M1, M2… (managed), C1, C2… (chopped).
            </p>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span className="eyebrow" style={{ minWidth: 80 }}>Sæson</span>
              <input
                className="gfc-input"
                style={{ padding: '9px 12px', maxWidth: 120 }}
                placeholder="2027"
                value={nySæson}
                onChange={e => setNySæson(e.target.value)}
              />
            </label>

            <div style={{ display: 'grid', gap: 8 }}>
              {nyeLigaer.map((liga, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    className="gfc-input"
                    style={{ padding: '9px 12px', width: 90 }}
                    placeholder="BB1"
                    value={liga.ligaNavn}
                    onChange={e => {
                      const kopi = [...nyeLigaer]
                      kopi[i] = { ...liga, ligaNavn: e.target.value }
                      setNyeLigaer(kopi)
                    }}
                  />
                  <select
                    className="gfc-input"
                    style={{ padding: '9px 12px', width: 130 }}
                    value={liga.type}
                    onChange={e => {
                      const kopi = [...nyeLigaer]
                      kopi[i] = { ...liga, type: e.target.value as LeagueType }
                      setNyeLigaer(kopi)
                    }}
                  >
                    <option value="bestball">Bestball</option>
                    <option value="managed">Managed</option>
                    <option value="chopped">Chopped</option>
                  </select>
                  <input
                    className="gfc-input"
                    style={{ padding: '9px 12px', flex: 1, minWidth: 200 }}
                    placeholder="Sleeper-ID fra liga-URL'en"
                    value={liga.sleeperId}
                    onChange={e => {
                      const kopi = [...nyeLigaer]
                      kopi[i] = { ...liga, sleeperId: e.target.value }
                      setNyeLigaer(kopi)
                    }}
                  />
                  {nyeLigaer.length > 1 && (
                    <button
                      className="btn ghost"
                      style={{ padding: '8px 12px' }}
                      onClick={() => setNyeLigaer(nyeLigaer.filter((_, j) => j !== i))}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              className="btn ghost"
              style={{ marginTop: 10 }}
              onClick={() => setNyeLigaer([...nyeLigaer, TomLiga()])}
            >
              + Tilføj liga
            </button>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 13 }}>
              <input type="checkbox" checked={gørAktuel} onChange={e => setGørAktuel(e.target.checked)} />
              Gør {nySæson || 'sæsonen'} til aktuel sæson med det samme
            </label>
            {gørAktuel && (
              <p className="eyebrow" style={{ color: 'var(--accent)', marginTop: 6 }}>
                Hele sitet skifter til denne sæson: tilmelding, leaderboard, forside og fordeling.
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn" disabled={saving || !nySæson.trim()} onClick={gemSæsonskifte}>
                {saving ? 'Gemmer…' : 'Gem sæson'}
              </button>
              <button className="btn ghost" onClick={() => setVisSæsonskifte(false)}>Annullér</button>
            </div>
          </div>
        )}
      </div>

      {status && <p className="eyebrow" style={{ color: 'var(--pos)' }}>✓ {status}</p>}
      {fejl && <p className="eyebrow" style={{ color: 'var(--accent)' }}>{fejl}</p>}
    </div>
  )
}
