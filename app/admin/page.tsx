import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { CURRENT_SEASON } from '@/lib/leagues'
import AdminTilmeldinger from './AdminTilmeldinger'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: tilmeldinger } = await supabase
    .from('registrations')
    .select(`
      id,
      season,
      preferred_types,
      assigned_league_name,
      status,
      created_at,
      profiles (
        display_name,
        username,
        id
      )
    `)
    .eq('season', CURRENT_SEASON)
    .order('created_at', { ascending: false })

  const stats = {
    total: tilmeldinger?.length ?? 0,
    tildelt: tilmeldinger?.filter(t => t.status === 'assigned').length ?? 0,
    bestball: tilmeldinger?.filter(t => t.preferred_types?.includes('bestball')).length ?? 0,
    managed: tilmeldinger?.filter(t => t.preferred_types?.includes('managed')).length ?? 0,
    chopped: tilmeldinger?.filter(t => t.preferred_types?.includes('chopped')).length ?? 0,
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Admin — GFC {CURRENT_SEASON}</h1>
        <p className="text-gray-500 text-sm mb-8">Tilmeldingsoversigt og ligafordeling</p>

        {/* Stat-kort */}
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

        {/* Handlinger */}
        <div className="flex gap-3 mb-6">
          <Link href="/admin/fordel"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-medium transition-colors text-sm">
            🔀 Fordel deltagere i ligaer
          </Link>
        </div>

        <AdminTilmeldinger tilmeldinger={tilmeldinger ?? []} />
      </div>
    </main>
  )
}
