'use client'

import { useEffect, useState } from 'react'

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

export function AdminSaeson({ season }: { season: string }) {
  const [deadlineLocal, setDeadlineLocal] = useState('')
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/admin/saeson')
      .then(r => r.json())
      .then(data => {
        setDeadlineLocal(isoToLocalInput(data.signupDeadline))
        setInviteCode(data.inviteCode)
      })
      .catch(() => setStatus('Kunne ikke hente indstillinger.'))
      .finally(() => setLoading(false))
  }, [])

  async function put(body: Record<string, unknown>, melding: string) {
    setSaving(true)
    setStatus('')
    try {
      const res = await fetch('/api/admin/saeson', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus(data.error ?? 'Noget gik galt.')
        return
      }
      setDeadlineLocal(isoToLocalInput(data.signupDeadline))
      setInviteCode(data.inviteCode)
      setStatus(melding)
    } finally {
      setSaving(false)
    }
  }

  const inviteLink =
    inviteCode && typeof window !== 'undefined'
      ? `${window.location.origin}/saeson/tilmeld?invite=${inviteCode}`
      : ''

  async function copyLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <p className="eyebrow">Henter indstillinger…</p>

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 32 }}>
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

      {/* Invite link */}
      <div>
        <h3 style={{ fontSize: 16, marginBottom: 4 }}>Invitationslink</h3>
        <p className="eyebrow" style={{ marginBottom: 12 }}>
          Send dette link til sene deltagere, så de kan tilmelde sig efter fristen. Generér et nyt for at gøre det gamle ugyldigt.
        </p>
        {inviteCode ? (
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

      {status && <p className="eyebrow" style={{ color: 'var(--ink)' }}>{status}</p>}
    </div>
  )
}
