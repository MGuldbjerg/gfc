'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CURRENT_SEASON } from '@/lib/leagues'

const RÆKKER = [
  { id: 'bestball', label: 'Bestball', desc: 'Automatiske startere — sat-og-glem' },
  { id: 'managed', label: 'Managed', desc: 'Klassisk fantasy — sæt dit hold hver uge' },
  { id: 'chopped', label: 'Chopped', desc: 'Guillotine-format — én ryger ud om ugen' },
]

export default function SaesonTilmeldPage() {
  const router = useRouter()
  const [valgteRækker, setValgteRækker] = useState<string[]>(['bestball', 'managed'])
  const [fejl, setFejl] = useState('')
  const [loading, setLoading] = useState(false)

  function toggle(id: string) {
    setValgteRækker(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  async function tilmeld(e: React.FormEvent) {
    e.preventDefault()
    setFejl('')
    setLoading(true)

    const res = await fetch('/api/saeson/tilmeld', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valgteRækker }),
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
          <p className="text-gray-500 text-sm mt-1">Vælg de rækker du vil med i.</p>
        </div>

        {fejl && (
          <div className="bg-red-900/40 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
            {fejl}
          </div>
        )}

        <form onSubmit={tilmeld} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {RÆKKER.map(({ id, label, desc }) => (
              <label key={id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                  ${valgteRækker.includes(id)
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-gray-700 hover:border-gray-600'}`}>
                <input
                  type="checkbox" checked={valgteRækker.includes(id)}
                  onChange={() => toggle(id)}
                  className="mt-0.5 accent-indigo-500"
                />
                <div>
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-gray-500 text-xs">{desc}</p>
                </div>
              </label>
            ))}
          </div>

          <button
            type="submit" disabled={loading || valgteRækker.length === 0}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors mt-2"
          >
            {loading ? 'Gemmer...' : `Tilmeld mig GFC ${CURRENT_SEASON}`}
          </button>

          <p className="text-gray-600 text-xs text-center">
            Du kan altid framelde dig senere fra din side.
          </p>
        </form>
      </div>
    </main>
  )
}
