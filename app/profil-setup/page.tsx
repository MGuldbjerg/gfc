'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; displayName: string; username: string; avatar: string | null }
  | { status: 'not-found' }
  | { status: 'error' }

export default function ProfilSetupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [sleeperUsername, setSleeperUsername] = useState('')
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' })
  const [visSleeper, setVisSleeper] = useState(true)
  const [visBadges, setVisBadges] = useState(true)
  const [nyhedsbrev, setNyhedsbrev] = useState(true)
  const [fejl, setFejl] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const trimmed = sleeperUsername.trim()
    if (trimmed.length < 3) { setLookup({ status: 'idle' }); return }

    setLookup({ status: 'loading' })
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sleeper/user/${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        if (!res.ok) { setLookup({ status: 'error' }); return }
        const data = await res.json()
        if (data.found) {
          setLookup({ status: 'found', displayName: data.displayName, username: data.username, avatar: data.avatar })
        } else {
          setLookup({ status: 'not-found' })
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        setLookup({ status: 'error' })
      }
    }, 400)

    return () => { controller.abort(); clearTimeout(timer) }
  }, [sleeperUsername])

  async function gemProfil(e: React.FormEvent) {
    e.preventDefault()
    setFejl('')
    setLoading(true)
    const res = await fetch('/api/profil/opret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, sleeperUsername, visSleeper, visBadges, nyhedsbrev }),
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

  const privatliv = [
    { id: 'visSleeper', checked: visSleeper, set: setVisSleeper, label: 'Vis Sleeper-brugernavn på min profil', desc: 'Andre kan se hvilket Sleeper-brugernavn dit hold tilhører.' },
    { id: 'visBadges',  checked: visBadges,  set: setVisBadges,  label: 'Vis mine badges', desc: 'OG-mærket og andre badges vises på din offentlige profil.' },
    { id: 'nyhedsbrev', checked: nyhedsbrev, set: setNyhedsbrev, label: 'Send mig nyhedsbrev', desc: 'Ugentlige highlights og opdateringer i indbakken.' },
  ]

  const sleeperOK = lookup.status === 'found'

  return (
    <div className="form-page" style={{ alignItems: 'flex-start', paddingTop: 60 }}>
      <div className="form-card" style={{ maxWidth: 500 }}>
        <div className="kicker-strip" style={{ marginBottom: 20 }}>
          <span className="dash" />
          <span className="eyebrow">Kom i gang</span>
        </div>
        <h1 className="form-card-title">Opret din profil</h1>
        <p className="form-card-sub">Det her udfylder du kun én gang.</p>

        {fejl && <p className="form-error" style={{ marginBottom: 16 }}>{fejl}</p>}

        <form onSubmit={gemProfil} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="gfc-label" htmlFor="displayName">Dit navn (vises på leaderboard)</label>
            <input
              id="displayName" type="text" required value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="gfc-input"
              placeholder="fx Thomas Hansen"
            />
          </div>

          <div>
            <label className="gfc-label" htmlFor="sleeper">Sleeper-brugernavn</label>
            <input
              id="sleeper" type="text" required value={sleeperUsername}
              onChange={e => setSleeperUsername(e.target.value)}
              className="gfc-input"
              placeholder="dit sleeper-brugernavn"
              autoComplete="off" spellCheck={false}
            />
            <SleeperFeedback state={lookup} />
          </div>

          <div>
            <label className="gfc-label">Privatliv og kommunikation</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {privatliv.map(({ id, checked, set, label, desc }) => (
                <label key={id} className="gfc-toggle">
                  <input type="checkbox" checked={checked} onChange={e => set(e.target.checked)} />
                  <div>
                    <div className="tgl-label">{label}</div>
                    <div className="tgl-desc">{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !sleeperOK}
            className="btn"
            style={{ justifyContent: 'center', opacity: (loading || !sleeperOK) ? 0.5 : 1, marginTop: 4 }}
          >
            {loading ? 'Gemmer…' : sleeperOK ? 'Gem profil' : 'Find dit Sleeper-brugernavn først'}
          </button>
        </form>
      </div>
    </div>
  )
}

function SleeperFeedback({ state }: { state: LookupState }) {
  if (state.status === 'idle') {
    return <p className="eyebrow" style={{ marginTop: 8 }}>Find det i Sleeper-appen under din profil.</p>
  }

  if (state.status === 'loading') {
    return (
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
          border: '2px solid var(--line)', borderTopColor: 'var(--ink)',
          animation: 'spin 0.7s linear infinite',
        }} />
        <span className="eyebrow">Tjekker Sleeper…</span>
      </div>
    )
  }

  if (state.status === 'found') {
    const avatarUrl = state.avatar ? `https://sleepercdn.com/avatars/thumbs/${state.avatar}` : null
    return (
      <div style={{
        marginTop: 10, display: 'flex', alignItems: 'center', gap: 12,
        background: 'color-mix(in oklch, var(--pos) 10%, var(--bg))',
        border: '1px solid color-mix(in oklch, var(--pos) 30%, transparent)',
        borderRadius: 'var(--r-sm)', padding: '10px 14px',
      }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-2)' }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
            {state.displayName[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--pos)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{state.displayName}</p>
          <p className="eyebrow" style={{ color: 'var(--pos)', marginTop: 2 }}>@{state.username}</p>
        </div>
        <span style={{ color: 'var(--pos)', fontSize: 18, fontWeight: 700 }}>✓</span>
      </div>
    )
  }

  if (state.status === 'not-found') {
    return <p className="eyebrow" style={{ marginTop: 8, color: 'var(--accent)' }}>Brugernavnet blev ikke fundet på Sleeper. Tjek stavning.</p>
  }

  return <p className="eyebrow" style={{ marginTop: 8, color: 'oklch(65% 0.15 80)' }}>Kunne ikke kontakte Sleeper lige nu. Prøv igen.</p>
}
