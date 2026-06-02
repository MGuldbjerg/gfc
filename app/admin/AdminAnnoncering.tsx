'use client'

import { useRef, useState } from 'react'

type Status = 'idle' | 'sending' | 'sent' | 'error'
type View = 'edit' | 'preview'

export function AdminAnnoncering() {
  const [subject, setSubject]           = useState('')
  const [overskrift, setOverskrift]     = useState('')
  const [brødtekst, setBrødtekst]       = useState('')
  const [ctaLabel, setCtaLabel]         = useState('')
  const [ctaUrl, setCtaUrl]             = useState('')
  const [status, setStatus]             = useState<Status>('idle')
  const [fejl, setFejl]                 = useState('')
  const [view, setView]                 = useState<View>('edit')
  const [previewHtml, setPreviewHtml]   = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  const taRef = useRef<HTMLTextAreaElement>(null)

  function applyWrap(before: string, after: string, placeholder: string) {
    const ta = taRef.current
    if (!ta) return
    const s = ta.selectionStart
    const e = ta.selectionEnd
    const sel = brødtekst.slice(s, e) || placeholder
    const replacement = `${before}${sel}${after}`
    const next = brødtekst.slice(0, s) + replacement + brødtekst.slice(e)
    setBrødtekst(next)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(s + before.length, s + before.length + sel.length)
    }, 0)
  }

  function applyH2() {
    const ta = taRef.current
    if (!ta) return
    const pos = ta.selectionStart
    const lineStart = brødtekst.lastIndexOf('\n', pos - 1) + 1
    const next = brødtekst.slice(0, lineStart) + '## ' + brødtekst.slice(lineStart)
    setBrødtekst(next)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(pos + 3, pos + 3) }, 0)
  }

  function applyLink() {
    const ta = taRef.current
    if (!ta) return
    const s = ta.selectionStart
    const e = ta.selectionEnd
    const sel = brødtekst.slice(s, e) || 'linktekst'
    const replacement = `[${sel}](https://)`
    const next = brødtekst.slice(0, s) + replacement + brødtekst.slice(e)
    setBrødtekst(next)
    const urlStart = s + sel.length + 3
    setTimeout(() => { ta.focus(); ta.setSelectionRange(urlStart, urlStart + 8) }, 0)
  }

  async function loadPreview() {
    setPreviewLoading(true)
    try {
      const res = await fetch('/api/admin/annoncering/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overskrift, brødtekst, ctaLabel, ctaUrl }),
      })
      const data = await res.json()
      setPreviewHtml(data.html ?? '')
      setView('preview')
    } finally {
      setPreviewLoading(false)
    }
  }

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
    } catch (err) {
      setFejl(err instanceof Error ? err.message : 'Noget gik galt')
      setStatus('error')
    }
  }

  const klar = subject.trim() && overskrift.trim() && brødtekst.trim()

  if (status === 'sent') {
    return (
      <div className="form-card" style={{ maxWidth: 680 }}>
        <div className="form-card-title">Kampagne sendt</div>
        <p className="form-card-sub" style={{ marginTop: 8 }}>
          Brevo afsender mailen til nyhedsbrevslisten nu. Tjek Brevo-dashboardet for leveringsstatus.
        </p>
        <button
          className="btn ghost"
          style={{ marginTop: 20 }}
          onClick={() => {
            setStatus('idle'); setSubject(''); setOverskrift(''); setBrødtekst('')
            setCtaLabel(''); setCtaUrl(''); setView('edit')
          }}
        >
          Ny annoncering
        </button>
      </div>
    )
  }

  return (
    <div className="form-card" style={{ maxWidth: 680 }}>
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

        {/* Body with toolbar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="eyebrow">Brødtekst</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" className="fmt-btn" title="Fed tekst (markér ord først)" onClick={() => applyWrap('**', '**', 'fed tekst')}>
                <strong>B</strong>
              </button>
              <button type="button" className="fmt-btn" title="Overskrift på ny linje" onClick={applyH2}>
                H2
              </button>
              <button type="button" className="fmt-btn" title="Link (markér linktekst først)" onClick={applyLink}>
                ⎘ Link
              </button>
            </div>
          </div>

          {view === 'edit' ? (
            <textarea
              ref={taRef}
              className="gfc-input"
              rows={9}
              value={brødtekst}
              onChange={e => setBrødtekst(e.target.value)}
              placeholder={'Skriv din besked her.\n\nTom linje = nyt afsnit.\nBrug **fed**, ## overskrift, eller knapperne ovenfor.'}
              style={{ resize: 'vertical', lineHeight: 1.65, fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
          ) : (
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
              <iframe
                srcDoc={previewHtml}
                style={{ width: '100%', height: 520, border: 0, display: 'block' }}
                title="E-mail forhåndsvisning"
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`season-pill${view === 'edit' ? ' active' : ''}`}
              onClick={() => setView('edit')}
            >
              Rediger
            </button>
            <button
              type="button"
              className={`season-pill${view === 'preview' ? ' active' : ''}`}
              disabled={!overskrift.trim() || !brødtekst.trim() || previewLoading}
              onClick={loadPreview}
            >
              {previewLoading ? 'Henter…' : 'Forhåndsvis'}
            </button>
          </div>
        </div>

        {/* Optional CTA button */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>Knap i mailen (valgfri)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="eyebrow">Knaptekst</span>
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
