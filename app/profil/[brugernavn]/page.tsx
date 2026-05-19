import { notFound } from 'next/navigation'
import Link from 'next/link'
import { hentProfilData } from '@/lib/profil'
import { beregnBadges } from '@/lib/badges'
import BadgeHylde from '@/components/BadgeHylde'
import type { SæsonData } from '@/lib/profil'

export const revalidate = 3600

interface Props {
  params: Promise<{ brugernavn: string }>
}

const TYPELABEL: Record<string, string> = {
  bestball: 'Bestball',
  managed: 'Managed',
  chopped: 'Chopped',
}

const TYPEBADGE: Record<string, string> = {
  bestball: 'bg-indigo-900/50 text-indigo-300',
  managed:  'bg-blue-900/50 text-blue-300',
  chopped:  'bg-purple-900/50 text-purple-300',
}

export default async function ProfilPage({ params }: Props) {
  const { brugernavn } = await params
  const profil = await hentProfilData(decodeURIComponent(brugernavn))

  if (!profil) notFound()

  const avatarUrl = profil.sleeperAvatar
    ? `https://sleepercdn.com/avatars/thumbs/${profil.sleeperAvatar}`
    : null

  const sæsoner = profil.sæsoner
  const alleSæsonÅr = [...new Set(sæsoner.map(s => s.sæson))].sort().reverse()
  const badges = beregnBadges(sæsoner, profil.sleeperUserId)

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Tilbage */}
        <Link href="/leaderboard" className="text-gray-500 hover:text-white text-sm transition-colors">
          ← Leaderboard
        </Link>

        {/* Profilhoved */}
        <div className="flex items-center gap-5 mt-6 mb-10">
          <div className="w-20 h-20 rounded-full bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center text-3xl">
            {avatarUrl
              ? <img src={avatarUrl} alt={profil.displayName ?? brugernavn} className="w-full h-full object-cover" />
              : '👤'
            }
          </div>
          <div>
            <h1 className="text-3xl font-bold">{profil.displayName ?? brugernavn}</h1>
            <p className="text-gray-500 text-sm mt-1 font-mono">{profil.sleeperUsername} på Sleeper</p>
            <p className="text-gray-600 text-sm mt-1">{alleSæsonÅr.length} sæson{alleSæsonÅr.length !== 1 ? 'er' : ''} i GFC</p>
          </div>
        </div>

        {/* Badges */}
        <BadgeHylde badges={badges} />

        {/* Sæson-tabs */}
        {alleSæsonÅr.map(år => {
          const sæsonLigaer = sæsoner.filter(s => s.sæson === år)
          return (
            <section key={år} className="mb-10">
              <h2 className="text-xl font-semibold mb-4 text-gray-300">Sæson {år}</h2>
              <div className="grid grid-cols-1 gap-6">
                {sæsonLigaer.map(s => (
                  <LigaKort key={`${år}-${s.ligaNavn}`} data={s} />
                ))}
              </div>
            </section>
          )
        })}

        {sæsoner.length === 0 && (
          <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-500">
            Ingen GFC-sæsondata fundet for dette brugernavn.
          </div>
        )}
      </div>
    </main>
  )
}

function LigaKort({ data }: { data: SæsonData }) {
  const maxPoint = Math.max(...data.weeklyScores.map(w => w.point), 1)

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${TYPEBADGE[data.leagueType]}`}>
            {TYPELABEL[data.leagueType]}
          </span>
          <span className="text-gray-400 font-medium">{data.ligaNavn}</span>
        </div>
        {data.rangPlacering && (
          <div className="text-right">
            <span className="text-2xl font-bold">
              {data.rangPlacering === 1 ? '🥇' : data.rangPlacering === 2 ? '🥈' : data.rangPlacering === 3 ? '🥉' : `#${data.rangPlacering}`}
            </span>
            <p className="text-gray-600 text-xs mt-0.5">af {data.antalHold} hold</p>
          </div>
        )}
      </div>

      {/* Nøgletal */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatKort label="Total point" value={data.totalPoint.toFixed(1)} />
        {data.wins !== undefined && (
          <StatKort label="Sejre" value={`${data.wins}–${data.losses ?? 0}`} />
        )}
        <StatKort
          label="Bedste uge"
          value={data.højesteSingleScore > 0 ? data.højesteSingleScore.toFixed(1) : '—'}
          sub={data.højesteSingleScoreUge > 0 ? `uge ${data.højesteSingleScoreUge}` : undefined}
        />
        <StatKort label="Uger spillet" value={String(data.weeklyScores.length)} />
      </div>

      {/* Ugescorer søjlediagram */}
      {data.weeklyScores.length > 0 && (
        <div>
          <p className="text-gray-600 text-xs mb-2">Point per uge</p>
          <div className="flex items-end gap-1 h-16">
            {data.weeklyScores.map(w => {
              const pct = (w.point / maxPoint) * 100
              const erHøjeste = w.point === data.højesteSingleScore
              return (
                <div key={w.uge} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className={`w-full rounded-t transition-colors ${erHøjeste ? 'bg-yellow-500' : 'bg-indigo-600 group-hover:bg-indigo-400'}`}
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                    Uge {w.uge}: {w.point.toFixed(1)}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-gray-700 text-xs mt-1">
            <span>Uge 1</span>
            <span>Uge {data.weeklyScores[data.weeklyScores.length - 1]?.uge}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function StatKort({
  label, value, sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="text-white font-bold text-lg leading-none">{value}</p>
      {sub && <p className="text-gray-600 text-xs mt-1">{sub}</p>}
    </div>
  )
}
