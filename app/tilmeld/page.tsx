'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { CURRENT_SEASON } from '@/lib/leagues'
import { tekst, t } from '@/content/tekst'

type Trin = 'konto' | 'profil' | 'bekræft'

const tx = tekst.tilmeld

export default function TilmeldPage() {
  const [trin, setTrin] = useState<Trin>('konto')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [sleeperUsername, setSleeperUsername] = useState('')
  const [valgteRækker, setValgteRækker] = useState<string[]>(['bestball', 'managed'])
  const [visSleeper, setVisSleeper] = useState(true)
  const [visBadges, setVisBadges] = useState(true)
  const [nyhedsbrev, setNyhedsbrev] = useState(true)
  const [fejl, setFejl] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function opretKonto(e: React.FormEvent) {
    e.preventDefault()
    setFejl('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })

    setLoading(false)
    if (error) {
      setFejl(error.message === 'User already registered'
        ? 'Der findes allerede en konto med denne e-mail.'
        : error.message)
      return
    }

    setTrin('profil')
  }

  async function gemProfil(e: React.FormEvent) {
    e.preventDefault()
    setFejl('')
    setLoading(true)

    const res = await fetch('/api/profil/opret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        displayName,
        sleeperUsername,
        valgteRækker,
        sæson: CURRENT_SEASON,
        visSleeper,
        visBadges,
        nyhedsbrev,
      }),
    })

    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setFejl(data.error ?? 'Noget gik galt. Prøv igen.')
      return
    }

    setTrin('bekræft')
  }

  function toggleRække(type: string) {
    setValgteRækker(prev =>
      prev.includes(type) ? prev.filter(r => r !== type) : [...prev, type]
    )
  }

  const privatlivState: Record<string, { checked: boolean; set: (v: boolean) => void }> = {
    visSleeper: { checked: visSleeper, set: setVisSleeper },
    visBadges: { checked: visBadges, set: setVisBadges },
    nyhedsbrev: { checked: nyhedsbrev, set: setNyhedsbrev },
  }

  if (trin === 'bekræft') {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-2xl font-bold text-white mb-3">{tx.bekraeftTitel}</h1>
          <p className="text-gray-400 leading-relaxed">
            {t(tx.bekraeftTekst, { email })}
          </p>
          <p className="text-gray-600 text-sm mt-4">{tx.bekraeftSpam}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🏈</div>
          <h1 className="text-2xl font-bold text-white">{t(tx.titel)}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {trin === 'konto' ? tx.trinKonto : tx.trinProfil}
          </p>
        </div>

        {/* Trin-indikator */}
        <div className="flex items-center gap-2 mb-8">
          {['konto', 'profil'].map((step, i) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                ${trin === step ? 'bg-indigo-600 text-white' :
                  (trin === 'profil' && step === 'konto') ? 'bg-green-600 text-white' :
                  'bg-gray-800 text-gray-500'}`}>
                {trin === 'profil' && step === 'konto' ? '✓' : i + 1}
              </div>
              <span className={`text-xs ${trin === step ? 'text-white' : 'text-gray-600'}`}>
                {step === 'konto' ? 'Konto' : 'Profil'}
              </span>
              {i === 0 && <div className="flex-1 h-px bg-gray-800" />}
            </div>
          ))}
        </div>

        {fejl && (
          <div className="bg-red-900/40 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
            {fejl}
          </div>
        )}

        {/* Trin 1: Konto */}
        {trin === 'konto' && (
          <form onSubmit={opretKonto} className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">{tx.emailLabel}</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500"
                placeholder={tx.emailPlaceholder}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">{tx.kodeLabel}</label>
              <input
                type="password" required minLength={8} value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500"
                placeholder={tx.kodePlaceholder}
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors mt-2"
            >
              {loading ? tx.knapOpretterKonto : tx.knapFortsaet}
            </button>
          </form>
        )}

        {/* Trin 2: Profil */}
        {trin === 'profil' && (
          <form onSubmit={gemProfil} className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">{tx.navnLabel}</label>
              <input
                type="text" required value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500"
                placeholder={tx.navnPlaceholder}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">{tx.sleeperLabel}</label>
              <input
                type="text" required value={sleeperUsername}
                onChange={e => setSleeperUsername(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500"
                placeholder={tx.sleeperPlaceholder}
              />
              <p className="text-gray-600 text-xs mt-1">{tx.sleeperHint}</p>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">{tx.raekkerLabel}</label>
              <div className="flex flex-col gap-2">
                {tx.raekker.map(({ id, label, desc }) => (
                  <label key={id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${valgteRækker.includes(id)
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-gray-700 hover:border-gray-600'}`}>
                    <input
                      type="checkbox" checked={valgteRækker.includes(id)}
                      onChange={() => toggleRække(id)}
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
            <div>
              <label className="text-sm text-gray-400 mb-2 block">{tx.privatlivLabel}</label>
              <div className="flex flex-col gap-2">
                {tx.privatliv.map(({ id, label, desc }) => {
                  const state = privatlivState[id]
                  return (
                    <label key={id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                        ${state.checked ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 hover:border-gray-600'}`}>
                      <input
                        type="checkbox" checked={state.checked}
                        onChange={e => state.set(e.target.checked)}
                        className="mt-0.5 accent-indigo-500"
                      />
                      <div>
                        <p className="text-white text-sm font-medium">{label}</p>
                        <p className="text-gray-500 text-xs">{desc}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <button
              type="submit" disabled={loading || valgteRækker.length === 0}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors mt-2"
            >
              {loading ? tx.knapGemmer : tx.knapTilmeld}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
