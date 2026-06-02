'use client'

import { useState } from 'react'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export function AdminAnnoncering() {
  const [subject, setSubject]       = useState('')
  const [overskrift, setOverskrift] = useState('')
  const [brødtekst, setBrødtekst]   = useState('')
  const [ctaLabel, setCtaLabel]     = useState('')
  const [ctaUrl, setCtaUrl]         = useState('')
  const [status, setStatus]         = useState<Status>('idle')
  const [fejl, setFejl]             = useState('')

  async function send() {
    setStatus('sending')
    setFejl('')
    try {
      const res = await fetch('/api/admin/annoncering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, overskrift, brødtekst, ctaLabel, ctaUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Ukendt fejl')
      setStatus('sent')
    } catch (e) {
      setFejl(e instanceof Error ? e.message : 'Noget gik galt')
      setStatus('error')
    }
  }

  const klar = subject.trim() && overskrift.trim() && brødtekst.trim()

  if (status === 'sent') {
    return (
      <div className="form-card" style={{ maxWidth: 600 }}>
        <div className="form-card-title">Kampagne sendt</div>
        <p className="form-card-sub" style={{ marginTop: 8 }}>
          Brevo afsender mailen til nyhedsbrevslisten nu. Tjek Brevo-dashboardet for leveringsstatus.
        </p>
        <button className="btn ghost" style={{ marginTop: 20 }} onClick={() => {
          setStatus('idle'); setSubject(''); setOverskrift(''); setBrødtekst(''); setCtaLabel(''); setCtaUrl('')
        }}>
          Ny annoncering
        </button>
      </div>
    )
  }

  return (
    <div className="form-card" style={{ maxWidth: 600 }}>
      <div className="form-card-title">Send annoncering</div>
      <p className="form-card-sub" style={{ marginTop: 4 }}>
        Sendes til alle på nyhedsbrevslisten via Brevo.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="eyebrow">Emnefeltet (subject)</span>
          <input
            className="gfc-input"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="f.eks. GFC 2026 — Sæsonen er i gang"
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="eyebrow">Overskrift i mailen</span>
          <input
            className="gfc-input"
            value={overskrift}
            onChange={e => setOverskrift(e.target.value)}
            placeholder="f.eks. Drafts åbner om to uger"
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="eyebrow">Brødtekst</span>
          <textarea
            className="gfc-input"
            rows={6}
            value={brødtekst}
            onChange={e => setBrødtekst(e.target.value)}
            placeholder="Skriv din besked her. Hvert linjeskift bliver til et nyt afsnit."
            style={{ resize: 'vertical', lineHeight: 1.6 }}
          />
        </label>

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>Knap (valgfri)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="eyebrow">Knapetekst</span>
              <input
                className="gfc-input"
                value={ctaLabel}
                onChange={e => setCtaLabel(e.target.value)}
                placeholder="f.eks. Se leaderboard →"
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="eyebrow">URL</span>
              <input
                className="gfc-input"
                value={ctaUrl}
                onChange={e => setCtaUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>
          </div>
        </div>

        {status === 'error' && (
          <p style={{ color: 'var(--accent)', fontSize: 13, margin: 0 }}>{fejl}</p>
        )}

        <button
          className="btn"
          disabled={!klar || status === 'sending'}
          onClick={send}
          style={{ alignSelf: 'flex-start' }}
        >
          {status === 'sending' ? 'Sender…' : 'Send til nyhedsbrevslisten'}
          {status !== 'sending' && <span className="arrow" aria-hidden />}
        </button>
      </div>
    </div>
  )
}
