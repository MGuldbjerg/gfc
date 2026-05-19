import Link from 'next/link'
import { query } from '@/lib/turso'
import { CURRENT_SEASON } from '@/lib/leagues'
import AdminTilmeldinger from './AdminTilmeldinger'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  season: string
  preferred_types: string | null
  assigned_league_name: string | null
  status: string
  created_at: string
  profile_id: string
  display_name: string
  username: string
}

function parsePreferredTypes(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default async function AdminPage() {
  const rows = await query<Row>(
    `SELECT r.id, r.season, r.preferred_types, r.assigned_league_name, r.status, r.created_at,
            p.id AS profile_id, p.display_name, p.username
       FROM registrations r
       JOIN profiles p ON p.id = r.profile_id
      WHERE r.season = ?
      ORDER BY r.created_at DESC`,
    [CURRENT_SEASON]
  )

  const tilmeldinger = rows.map(r => ({
    id: r.id,
    season: r.season,
    preferred_types: parsePreferredTypes(r.preferred_types),
    assigned_league_name: r.assigned_league_name,
    status: r.status,
    created_at: r.created_at,
    profiles: { id: r.profile_id, display_name: r.display_name, username: r.username },
  }))

  const stats = {
    total: tilmeldinger.length,
    tildelt: tilmeldinger.filter(t => t.status === 'assigned').length,
    bestball: tilmeldinger.filter(t => t.preferred_types.includes('bestball')).length,
    managed: tilmeldinger.filter(t => t.preferred_types.includes('managed')).length,
    chopped: tilmeldinger.filter(t => t.preferred_types.includes('chopped')).length,
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Admin — GFC {CURRENT_SEASON}</h1>
        <p className="text-gray-500 text-sm mb-8">Tilmeldingsoversigt og ligafordeling</p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Tilmeldte', value: stats.total, color: 'text-white' },
            { label: 'Tildelt liga', value: stats.tildelt, color: 'text-green-400' },
            { label: 'Bestball', value: stats.bestball, color: 'text-indigo-400' },
            { label: 'Managed', value: stats.managed, color: 'text-blue-400' },
            { label: 'Chopped', value: stats.chopped, color: 'text-purple-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 rounded-xl p-4">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-gray-500 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <Link href="/admin/fordel"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-medium transition-colors text-sm">
            🔀 Fordel deltagere i ligaer
          </Link>
        </div>

        <AdminTilmeldinger tilmeldinger={tilmeldinger} />
      </div>
    </main>
  )
}
