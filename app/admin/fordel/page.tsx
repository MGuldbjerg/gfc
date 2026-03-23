'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CURRENT_SEASON } from '@/lib/leagues'
import type { FordelingsResultat, LigaForslag } from '@/lib/fordeling'

const TYPEBADGE: Record<string, string> = {
  bestball: 'bg-indigo-900/60 text-indigo-300 border-indigo-700/50',
  managed:  'bg-blue-900/60 text-blue-300 border-blue-700/50',
  chopped:  'bg-purple-900/60 text-purple-300 border-purple-700/50',
}

export default function FordelPage() {
  const [ligaStørrelse, setLigaStørrelse] = useState(12)
  const [resultat, setResultat] = useState<FordelingsResultat | null>(null)
  const [loading, setLoading] = useState(false)
  const [bekræftet, setBekræftet] = useState(false)
  const [status, setStatus] = useState('')

  async function beregnForslag() {
    setLoading(true)
    setResultat(null)
    setStatus('')
    const res = await fetch('/api/admin/fordel/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ligaStørrelse }),
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
          <p className="text-gray-500 text-sm mb-6">
            Deltagere modtager en e-mail med deres liga, når Brevo API-nøgle er sat i Vercel.
          </p>
          <Link href="/admin"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium transition-colors">
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

        {/* Indstillinger */}
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
            Kun deltagere med status <em>registreret</em> (ikke allerede tildelt) medtages.
          </p>
        </div>

        {/* Resultat */}
        {resultat && (
          <>
            {resultat.ligaer.length === 0 ? (
              <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-500">
                Ingen tilmeldinger at fordele endnu.
              </div>
            ) : (
              <>
                {/* Ligakort */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {resultat.ligaer.map((liga: LigaForslag) => (
                    <div key={liga.ligaNavn}
                      className={`bg-gray-900 border rounded-xl p-4 ${TYPEBADGE[liga.type]?.split(' ').slice(2).join(' ') ?? ''}`}>
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
                            <span className="font-medium">{d.displayName}</span>
                            <span className="text-gray-600 text-xs font-mono ml-auto">{d.sleeperUsername}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>

                {/* Oversigt og bekræft */}
                <div className="bg-gray-900 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-white font-medium">
                      {resultat.ligaer.reduce((s, l) => s + l.deltagere.length, 0)} deltagere fordelt
                      i {resultat.ligaer.length} ligaer
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
