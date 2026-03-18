'use client'

import { useState } from 'react'

type Profil = { display_name: string; username: string; id: string }

interface Tilmelding {
  id: string
  season: string
  preferred_types: string[]
  assigned_league_name: string | null
  status: string
  created_at: string
  profiles: Profil | Profil[] | null
}

function getProfil(profiles: Tilmelding['profiles']): Profil | null {
  if (!profiles) return null
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles
}

const RÆKKEBADGE: Record<string, string> = {
  bestball: 'bg-indigo-900/50 text-indigo-300',
  managed: 'bg-blue-900/50 text-blue-300',
  chopped: 'bg-purple-900/50 text-purple-300',
}

const STATUSBADGE: Record<string, string> = {
  registered: 'bg-yellow-900/50 text-yellow-300',
  assigned: 'bg-green-900/50 text-green-300',
  active: 'bg-green-900/50 text-green-300',
}

export default function AdminTilmeldinger({ tilmeldinger }: { tilmeldinger: Tilmelding[] }) {
  const [filter, setFilter] = useState<string>('alle')
  const [søgning, setSøgning] = useState('')

  const filtrerede = tilmeldinger.filter(t => {
    const matchFilter = filter === 'alle' || t.preferred_types?.includes(filter)
    const profil = getProfil(t.profiles)
    const matchSøgning = søgning === '' ||
      profil?.display_name.toLowerCase().includes(søgning.toLowerCase()) ||
      profil?.username.toLowerCase().includes(søgning.toLowerCase())
    return matchFilter && matchSøgning
  })

  return (
    <div>
      {/* Filtre */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text" placeholder="Søg navn eller Sleeper-brugernavn..."
          value={søgning} onChange={e => setSøgning(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 flex-1 min-w-48"
        />
        <div className="flex gap-2">
          {['alle', 'bestball', 'managed', 'chopped'].map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-gray-900 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs border-b border-gray-800">
              <th className="text-left px-4 py-3">Deltager</th>
              <th className="text-left px-4 py-3">Sleeper</th>
              <th className="text-left px-4 py-3">Rækker</th>
              <th className="text-left px-4 py-3">Liga</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Tilmeldt</th>
            </tr>
          </thead>
          <tbody>
            {filtrerede.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-600 py-8">Ingen tilmeldinger</td></tr>
            ) : filtrerede.map(t => (
              <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-medium">{getProfil(t.profiles)?.display_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{getProfil(t.profiles)?.username ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {t.preferred_types?.map(type => (
                      <span key={type} className={`px-2 py-0.5 rounded text-xs ${RÆKKEBADGE[type] ?? ''}`}>
                        {type}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400">{t.assigned_league_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${STATUSBADGE[t.status] ?? ''}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {new Date(t.created_at).toLocaleDateString('da-DK')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-gray-700 text-xs mt-3">{filtrerede.length} af {tilmeldinger.length} tilmeldinger</p>
    </div>
  )
}
