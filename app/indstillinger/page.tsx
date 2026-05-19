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
      setBesked('Indstillinger gemt!')
    } else {
      const data = await res.json().catch(() => ({}))
      setBesked(data.error ?? 'Noget gik galt. Prøv igen.')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500">Indlæser...</div>
      </main>
    )
  }

  const indstillinger = [
    {
      id: 'visSleeper',
      checked: visSleeper,
      onChange: setVisSleeper,
      label: 'Vis Sleeper-brugernavn',
      desc: 'Dit Sleeper-brugernavn vises på din offentlige profil',
    },
    {
      id: 'visBadges',
      checked: visBadges,
      onChange: setVisBadges,
      label: 'Vis badges',
      desc: 'Din badge-hylde vises på din offentlige profil',
    },
    {
      id: 'nyhedsbrev',
      checked: nyhedsbrev,
      onChange: setNyhedsbrev,
      label: 'Nyhedsbrev',
      desc: 'Modtag ugentlige highlights, præmier m.m. fra GFC',
    },
  ]

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-md mx-auto">
        <Link href="/min-side" className="text-gray-500 hover:text-white text-sm transition-colors">
          ← Tilbage
        </Link>

        <h1 className="text-2xl font-bold mt-6 mb-8">Indstillinger</h1>

        <div className="bg-gray-900 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider">Privatlivspræferencer</h2>

          {indstillinger.map(({ id, checked, onChange, label, desc }) => (
            <label
              key={id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                ${checked ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 hover:border-gray-600'}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                className="mt-0.5 accent-indigo-500"
              />
              <div>
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
              </div>
            </label>
          ))}

          <button
            onClick={gemIndstillinger}
            disabled={gemmer}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors mt-2"
          >
            {gemmer ? 'Gemmer...' : 'Gem indstillinger'}
          </button>

          {besked && (
            <p className={`text-sm text-center ${besked.includes('gemt') ? 'text-green-400' : 'text-red-400'}`}>
              {besked}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
