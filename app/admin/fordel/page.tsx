'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CURRENT_SEASON } from '@/lib/leagues'
import type { FordelingsResultat, LigaForslag, Pin } from '@/lib/fordeling'

const TYPEBADGE: Record<string, string> = {
  bestball: 'bg-indigo-900/60 text-indigo-300 border-indigo-700/50',
  managed:  'bg-blue-900/60 text-blue-300 border-blue-700/50',
  chopped:  'bg-purple-900/60 text-purple-300 border-purple-700/50',
}

type DeltagerOption = {
  profile_id: string
  display_name: string
  username: string
}

export default function FordelPage() {
  const [ligaStørrelse, setLigaStørrelse] = useState(12)
  const [resultat, setResultat] = useState<FordelingsResultat | null>(null)
  const [loading, setLoading] = useState(false)
  const [bekræftet, setBekræftet] = useState(false)
  const [status, setStatus] = useState('')

  // VIP pins
  const [deltagere, setDeltagere] = useState<DeltagerOption[]>([])
  const [pins, setPins] = useState<Pin[]>([])
  const [nyPin, setNyPin] = useState<{ profileId: string; ligaNavn: string }>({
    profileId: '',
    ligaNavn: '',
  })

  useEffect(() => {
    fetch('/api/admin/fordel/deltagere')
      .then(r => r.json())
      .then(data => setDeltagere(data.deltagere ?? []))
      .catch(() => {})
  }, [])

  function tilføjPin() {
    if (!nyPin.profileId || !nyPin.ligaNavn.trim()) return
    const ligaNavn = nyPin.ligaNavn.trim().toUpperCase()
    // Don't add duplicate pins for the same person
    if (pins.some(p => p.profileId === nyPin.profileId)) return
    setPins(prev => [...prev, { profileId: nyPin.profileId, ligaNavn }])
    setNyPin({ profileId: '', ligaNavn: '' })
  }

  function fjernPin(profileId: string) {
    setPins(prev => prev.filter(p => p.profileId !== profileId))
  }

  function displayForPin(profileId: string) {
    return deltagere.find(d => d.profile_id === profileId)?.display_name ?? profileId
  }

  async function beregnForslag() {
    setLoading(true)
    setResultat(null)
    setStatus('')
    const res = await fetch('/api/admin/fordel/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ligaStørrelse, pins }),
    })
    const data = await res.json()
    setResultat(data)
    setLoading(false)
  }

  async function bekræftFordeling() {
    if (!resultat) return
    setLoading(true)
    const res = await fetch('/api/admin/fordel/bekræft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ligaer: resultat.ligaer, sæson: CURRENT_SEASON }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      setBekræftet(true)
      setStatus(`✓ ${data.tildelt} deltagere tildelt ligaer.${data.fejl?.length ? ` ${data.fejl.length} fejl.` : ''}`)
    } else {
      setStatus('Noget gik galt. Prøv igen.')
    }
  }

  if (bekræftet) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-white mb-3">Fordeling gennemført</h1>
          <p className="text-gray-400 mb-6">{status}</p>
          <Link
            href="/admin"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Tilbage til admin
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-gray-500 hover:text-white transition-colors">← Admin</Link>
          <h1 className="text-2xl font-bold">Ligafordeling — {CURRENT_SEASON}</h1>
        </div>

        {/* Settings */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6 flex flex-wrap items-end gap-6">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Hold per liga</label>
            <input
              type="number" min={8} max={20} value={ligaStørrelse}
              onChange={e => setLigaStørrelse(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 w-24 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={beregnForslag} disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Beregner...' : resultat ? '🔀 Træk ny fordeling' : '🔀 Beregn fordeling'}
          </button>
          <p className="text-gray-600 text-sm">
            Deltagere kan spille i flere ligaer. Prioritetsrækkefølgen afgør hvem der kommer med, når en type er overtegnet.
          </p>
        </div>

        {/* VIP pins */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold mb-4">VIP-pins <span className="text-gray-500 font-normal text-sm">(valgfrit)</span></h2>
          <p className="text-gray-500 text-sm mb-4">
            Fastlås specifikke deltagere til en bestemt liga. Pins respekteres altid — resten fordeles tilfældigt.
          </p>

          {/* Existing pins */}
          {pins.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {pins.map(pin => (
                <div key={pin.profileId} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-2 text-sm">
                  <span className="font-medium flex-1">{displayForPin(pin.profileId)}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-mono text-indigo-300 w-12 text-center">{pin.ligaNavn}</span>
                  <button
                    onClick={() => fjernPin(pin.profileId)}
                    className="text-gray-600 hover:text-red-400 transition-colors ml-2"
                    aria-label="Fjern pin"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add pin form */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-48">
              <label className="text-xs text-gray-500 mb-1 block">Deltager</label>
              <select
                value={nyPin.profileId}
                onChange={e => setNyPin(p => ({ ...p, profileId: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="">Vælg deltager...</option>
                {deltagere
                  .filter(d => !pins.some(p => p.profileId === d.profile_id))
                  .map(d => (
                    <option key={d.profile_id} value={d.profile_id}>
                      {d.display_name} ({d.username})
                    </option>
                  ))}
              </select>
            </div>
            <div className="w-28">
              <label className="text-xs text-gray-500 mb-1 block">Liga</label>
              <input
                type="text"
                placeholder="BB1, M2..."
                value={nyPin.ligaNavn}
                onChange={e => setNyPin(p => ({ ...p, ligaNavn: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), tilføjPin())}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-mono uppercase"
              />
            </div>
            <button
              onClick={tilføjPin}
              disabled={!nyPin.profileId || !nyPin.ligaNavn.trim()}
              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Tilføj pin
            </button>
          </div>
        </div>

        {/* Result */}
        {resultat && (
          <>
            {resultat.ligaer.length === 0 ? (
              <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-500">
                Ingen tilmeldinger at fordele endnu.
              </div>
            ) : (
              <>
                {/* League cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {resultat.ligaer.map((liga: LigaForslag) => (
                    <div
                      key={liga.ligaNavn}
                      className="bg-gray-900 border border-gray-800 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold">{liga.ligaNavn}</h2>
                        <span className={`px-2 py-0.5 rounded text-xs border ${TYPEBADGE[liga.type]}`}>
                          {liga.type}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mb-2">{liga.deltagere.length} hold</p>
                      <ol className="space-y-1">
                        {liga.deltagere.map((d, i) => (
                          <li key={d.profileId} className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600 w-5 shrink-0">{i + 1}.</span>
                            <span className="font-medium flex-1 min-w-0 truncate">{d.displayName}</span>
                            {d.pinned && (
                              <span title="VIP-pin" className="text-yellow-500 text-xs shrink-0">⭐</span>
                            )}
                            <span className="text-gray-600 text-xs font-mono shrink-0">{d.sleeperUsername}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>

                {/* Unassignable */}
                {resultat.ikkeFordelbare.length > 0 && (
                  <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 mb-6">
                    <h3 className="text-yellow-400 font-semibold mb-2">
                      {resultat.ikkeFordelbare.length} ikke tildelt
                    </h3>
                    <p className="text-gray-400 text-sm mb-3">
                      Disse deltagere har ingen præferencer og er ikke tildelt en liga.
                    </p>
                    <ul className="space-y-1">
                      {resultat.ikkeFordelbare.map(d => (
                        <li key={d.profileId} className="text-sm text-gray-300">
                          {d.displayName} <span className="text-gray-600 font-mono text-xs">({d.sleeperUsername})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Summary and confirm */}
                <div className="bg-gray-900 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-white font-medium">
                      {new Set(resultat.ligaer.flatMap(l => l.deltagere.map(d => d.profileId))).size} unikke deltagere
                      · {resultat.ligaer.reduce((s, l) => s + l.deltagere.length, 0)} ligapladser
                      · {resultat.ligaer.length} ligaer
                      {pins.length > 0 && (
                        <span className="text-yellow-500 text-sm ml-2">· {pins.length} VIP-pin{pins.length !== 1 ? 's' : ''}</span>
                      )}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Ikke tilfreds? Klik "Træk ny fordeling" for en ny tilfældig fordeling.
                    </p>
                  </div>
                  <button
                    onClick={bekræftFordeling} disabled={loading}
                    className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
                  >
                    {loading ? 'Gemmer...' : '✓ Bekræft og gem fordeling'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}
