'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CURRENT_SEASON } from '@/lib/leagues'

const RÆKKER = [
  { id: 'bestball', label: 'Bestball', desc: 'Automatiske startere — sat-og-glem' },
  { id: 'managed', label: 'Managed', desc: 'Klassisk fantasy — sæt dit hold hver uge' },
  { id: 'chopped', label: 'Chopped', desc: 'Guillotine-format — én ryger ud om ugen' },
]

const PRIORITET_LABEL = ['1. prioritet', '2. prioritet', '3. prioritet']

export default function SaesonTilmeldPage() {
  const router = useRouter()
  // Ordered list — index 0 is top priority. Submitted as-is to the API.
  const [prioritet, setPrioritet] = useState<string[]>(['bestball', 'managed'])
  const [fejl, setFejl] = useState('')
  const [loading, setLoading] = useState(false)

  function toggle(id: string) {
    setPrioritet(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  function flyt(id: string, retning: -1 | 1) {
    setPrioritet(prev => {
      const idx = prev.indexOf(id)
      const nyIdx = idx + retning
      if (nyIdx < 0 || nyIdx >= prev.length) return prev
      const næste = [...prev]
      ;[næste[idx], næste[nyIdx]] = [næste[nyIdx], næste[idx]]
      return næste
    })
  }

  async function tilmeld(e: React.FormEvent) {
    e.preventDefault()
    setFejl('')
    setLoading(true)

    const res = await fetch('/api/saeson/tilmeld', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valgteRækker: prioritet }),
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

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🏈</div>
          <h1 className="text-2xl font-bold text-white">Tilmeld dig GFC {CURRENT_SEASON}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Vælg de rækker du vil spille og sæt dem i rækkefølge. Vi fordeler dig efter din 1. prioritet hvis muligt.
          </p>
        </div>

        {fejl && (
          <div className="bg-red-900/40 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
            {fejl}
          </div>
        )}

        <form onSubmit={tilmeld} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {RÆKKER.map(({ id, label, desc }) => {
              const prio = prioritet.indexOf(id)
              const valgt = prio !== -1
              return (
                <div
                  key={id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors
                    ${valgt
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-gray-700 hover:border-gray-600'}`}
                >
                  {/* Priority badge — click to toggle */}
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className={`w-8 h-8 shrink-0 rounded-full text-xs font-bold flex items-center justify-center transition-colors
                      ${valgt
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                    aria-label={valgt ? `Fjern ${label}` : `Tilføj ${label}`}
                  >
                    {valgt ? prio + 1 : '+'}
                  </button>

                  {/* Label */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggle(id)}>
                    <p className="text-white text-sm font-medium">{label}</p>
                    <p className="text-gray-500 text-xs">{desc}</p>
                    {valgt && (
                      <p className="text-indigo-400 text-xs mt-0.5">{PRIORITET_LABEL[prio]}</p>
                    )}
                  </div>

                  {/* Up / Down — only when selected */}
                  {valgt && (
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => flyt(id, -1)}
                        disabled={prio === 0}
                        className="text-gray-500 hover:text-white disabled:opacity-20 px-1 py-0.5 text-xs leading-none"
                        aria-label="Flyt op i prioritet"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => flyt(id, 1)}
                        disabled={prio === prioritet.length - 1}
                        className="text-gray-500 hover:text-white disabled:opacity-20 px-1 py-0.5 text-xs leading-none"
                        aria-label="Flyt ned i prioritet"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button
            type="submit"
            disabled={loading || prioritet.length === 0}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors mt-2"
          >
            {loading ? 'Gemmer...' : `Tilmeld mig GFC ${CURRENT_SEASON}`}
          </button>

          <p className="text-gray-600 text-xs text-center">
            Du kan altid ændre dine præferencer eller framelde dig fra din side.
          </p>
        </form>
      </div>
    </main>
  )
}
