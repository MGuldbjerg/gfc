import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth, signOut } from '@/auth'
import { queryOne } from '@/lib/turso'
import { CURRENT_SEASON } from '@/lib/leagues'

export const dynamic = 'force-dynamic'

type ProfilRow = {
  display_name: string
  username: string
  vis_sleeper_username: number
  vis_badges: number
  nyhedsbrev: number
}

type RegistrationRow = {
  preferred_types: string | null
  status: string
  assigned_league_name: string | null
}

export default async function MinSide() {
  const session = await auth()
  if (!session?.user?.id) redirect('/log-ind')

  const profil = await queryOne<ProfilRow>(
    `SELECT display_name, username, vis_sleeper_username, vis_badges, nyhedsbrev
       FROM profiles WHERE id = ?`,
    [session.user.id]
  )
  if (!profil) redirect('/profil-setup')

  const reg = await queryOne<RegistrationRow>(
    `SELECT preferred_types, status, assigned_league_name
       FROM registrations
      WHERE profile_id = ? AND season = ?`,
    [session.user.id, CURRENT_SEASON]
  )

  const rækker = parseRækker(reg?.preferred_types)

  async function logUd() {
    'use server'
    await signOut({ redirectTo: '/' })
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm text-gray-500">Din side</p>
            <h1 className="text-3xl font-bold mt-1">{profil.display_name}</h1>
            <p className="text-gray-500 text-sm mt-1">@{profil.username}</p>
          </div>
          <form action={logUd}>
            <button type="submit" className="text-sm text-gray-400 hover:text-white">
              Log ud
            </button>
          </form>
        </div>

        {!reg ? <BannerTilmeldSaeson /> : <StatusKort reg={reg} rækker={rækker} />}

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DashboardKort href="/indstillinger" emoji="⚙️" titel="Indstillinger" tekst="Privatliv og nyhedsbrev" />
          <DashboardKort href="/leaderboard" emoji="🏆" titel="Leaderboard" tekst="Se sæsonens stilling" />
          <DashboardKort href="/historie" emoji="📚" titel="Historie" tekst="Resultater fra tidligere sæsoner" />
          <DashboardKort href="/draft-statistik" emoji="📊" titel="Draftstatistik" tekst="ADP og format-sammenligning" />
        </div>

        {session.user.isAdmin && (
          <div className="mt-8 bg-indigo-900/30 border border-indigo-700/40 rounded-2xl p-5">
            <p className="text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">Admin</p>
            <Link href="/admin" className="text-white hover:underline">→ Gå til admin-dashboardet</Link>
          </div>
        )}
      </div>
    </main>
  )
}

function BannerTilmeldSaeson() {
  return (
    <div className="bg-gradient-to-br from-indigo-900/60 to-indigo-800/40 border border-indigo-700/40 rounded-2xl p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="text-4xl">🏈</div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">GFC {CURRENT_SEASON} er åben</h2>
          <p className="text-gray-300 text-sm mt-1">
            Du har en profil, men er ikke tilmeldt {CURRENT_SEASON} endnu. Tilmeld dig nu og vælg dine rækker.
          </p>
        </div>
        <Link
          href="/saeson/tilmeld"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors whitespace-nowrap"
        >
          Tilmeld mig
        </Link>
      </div>
    </div>
  )
}

function StatusKort({ reg, rækker }: { reg: RegistrationRow; rækker: string[] }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">
        ✓ Tilmeldt GFC {CURRENT_SEASON}
      </p>
      <h2 className="text-xl font-bold text-white">
        {reg.assigned_league_name
          ? `Du er tildelt ${reg.assigned_league_name}`
          : 'Afventer ligafordeling'}
      </h2>
      <p className="text-gray-400 text-sm mt-2">
        Rækker: {rækker.length > 0 ? rækker.join(', ') : '—'}
      </p>
      <p className="text-gray-500 text-xs mt-4">
        Vil du ændre rækker? <Link href="/saeson/tilmeld" className="text-indigo-400 hover:underline">Opdater tilmelding</Link>
      </p>
    </div>
  )
}

function DashboardKort({ href, emoji, titel, tekst }: { href: string; emoji: string; titel: string; tekst: string }) {
  return (
    <Link
      href={href}
      className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
    >
      <div className="text-2xl mb-2">{emoji}</div>
      <p className="text-white font-semibold">{titel}</p>
      <p className="text-gray-500 text-sm mt-1">{tekst}</p>
    </Link>
  )
}

function parseRækker(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
