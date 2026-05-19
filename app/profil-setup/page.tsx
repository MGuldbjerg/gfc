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

  // Debounced Sleeper-lookup. Cancels in-flight requests on each keystroke.
  useEffect(() => {
    const trimmed = sleeperUsername.trim()
    if (trimmed.length < 3) {
      setLookup({ status: 'idle' })
      return
    }

    setLookup({ status: 'loading' })
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sleeper/user/${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        })
        if (!res.ok) {
          setLookup({ status: 'error' })
          return
        }
        const data = await res.json()
        if (data.found) {
          setLookup({
            status: 'found',
            displayName: data.displayName,
            username: data.username,
            avatar: data.avatar,
          })
        } else {
          setLookup({ status: 'not-found' })
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        setLookup({ status: 'error' })
      }
    }, 400)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
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
    {
      id: 'visSleeper', checked: visSleeper, set: setVisSleeper,
      label: 'Vis Sleeper-brugernavn på min profil',
      desc: 'Andre kan se hvilket Sleeper-brugernavn dit hold tilhører.',
    },
    {
      id: 'visBadges', checked: visBadges, set: setVisBadges,
      label: 'Vis mine badges',
      desc: 'OG-mærket og andre badges vises på din offentlige profil.',
    },
    {
      id: 'nyhedsbrev', checked: nyhedsbrev, set: setNyhedsbrev,
      label: 'Send mig nyhedsbrev',
      desc: 'Ugentlige highlights og opdateringer i indbakken.',
    },
  ]

  const sleeperOK = lookup.status === 'found'

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">👤</div>
          <h1 className="text-2xl font-bold text-white">Opret din profil</h1>
          <p className="text-gray-500 text-sm mt-1">Det her udfylder du kun én gang.</p>
        </div>

        {fejl && (
          <div className="bg-red-900/40 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
            {fejl}
          </div>
        )}

        <form onSubmit={gemProfil} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Dit navn (vises på leaderboard)</label>
            <input
              type="text" required value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500"
              placeholder="fx Thomas Hansen"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Sleeper-brugernavn</label>
            <input
              type="text" required value={sleeperUsername}
              onChange={e => setSleeperUsername(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500"
              placeholder="dit sleeper-brugernavn"
              autoComplete="off"
              spellCheck={false}
            />
            <SleeperFeedback state={lookup} />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Privatliv og kommunikation</label>
            <div className="flex flex-col gap-2">
              {privatliv.map(({ id, checked, set, label, desc }) => (
                <label key={id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                    ${checked ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 hover:border-gray-600'}`}>
                  <input
                    type="checkbox" checked={checked}
                    onChange={e => set(e.target.checked)}
                    className="mt-0.5 accent-indigo-500"
                  />
                  <div>
                    <p className="text-white text-sm font-medium">{label}</p>
                    <p className="text-gray-500 text-xs">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit" disabled={loading || !sleeperOK}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors mt-2"
          >
            {loading ? 'Gemmer...' : sleeperOK ? 'Gem profil' : 'Find dit Sleeper-brugernavn først'}
          </button>
        </form>
      </div>
    </main>
  )
}

function SleeperFeedback({ state }: { state: LookupState }) {
  if (state.status === 'idle') {
    return (
      <p className="text-gray-600 text-xs mt-1">
        Find det i Sleeper-appen under din profil.
      </p>
    )
  }

  if (state.status === 'loading') {
    return (
      <div className="mt-2 flex items-center gap-2 text-gray-500 text-sm">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-gray-600 border-t-indigo-400 animate-spin" />
        Tjekker Sleeper...
      </div>
    )
  }

  if (state.status === 'found') {
    const avatarUrl = state.avatar
      ? `https://sleepercdn.com/avatars/thumbs/${state.avatar}`
      : null
    return (
      <div className="mt-2 flex items-center gap-3 bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full bg-gray-800" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-gray-500">
            {state.displayName[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-green-300 text-sm font-medium truncate">{state.displayName}</p>
          <p className="text-green-400/70 text-xs truncate">@{state.username}</p>
        </div>
        <span className="text-green-400 text-lg">✓</span>
      </div>
    )
  }

  if (state.status === 'not-found') {
    return (
      <p className="text-red-400 text-xs mt-2">
        Brugernavnet blev ikke fundet på Sleeper. Tjek stavning.
      </p>
    )
  }

  return (
    <p className="text-yellow-400 text-xs mt-2">
      Kunne ikke kontakte Sleeper lige nu. Prøv igen.
    </p>
  )
}
