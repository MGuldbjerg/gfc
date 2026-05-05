'use client'

import { useEffect, useState, useCallback } from 'react'
import BadgeHylde from '@/components/BadgeHylde'
import type { BadgeType } from '@/lib/badges'

interface UgeScore {
  uge: number
  point: number
}

interface SæsonData {
  sæson: string
  ligaNavn: string
  type: 'bestball' | 'managed' | 'chopped'
  totalPoint: number
  wins?: number
  losses?: number
  weeklyScores: UgeScore[]
  højesteSingleScore: number
  højesteSingleScoreUge: number
  rangPlacering: number | null
  antalHold: number
}

interface ProfilModalData {
  displayName: string | null
  sleeperUsername: string
  sleeperAvatar: string | null
  sæsoner: SæsonData[]
  badges: BadgeType[]
  vis_sleeper_username: boolean
  vis_badges: boolean
}

const TYPELABEL: Record<string, string> = {
  bestball: 'Bestball',
  managed: 'Managed',
  chopped: 'Chopped',
}

const TYPEBADGE: Record<string, string> = {
  bestball: 'bg-indigo-900/50 text-indigo-300',
  managed: 'bg-blue-900/50 text-blue-300',
  chopped: 'bg-purple-900/50 text-purple-300',
}

export default function ProfilModal({
  brugernavn,
  onLuk,
}: {
  brugernavn: string
  onLuk: () => void
}) {
  const [profil, setProfil] = useState<ProfilModalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fejl, setFejl] = useState('')

  useEffect(() => {
    setLoading(true)
    setFejl('')
    setProfil(null)
    fetch(`/api/profil/${encodeURIComponent(brugernavn)}`)
      .then(async r => {
        if (!r.ok) throw new Error('Profil ikke fundet')
        return r.json()
      })
      .then((data: ProfilModalData) => {
        setProfil(data)
        setLoading(false)
      })
      .catch(err => {
        setFejl(err.message ?? 'Kunne ikke hente profildata')
        setLoading(false)
      })
  }, [brugernavn])

  const luk = useCallback(() => onLuk(), [onLuk])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') luk() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [luk])

  const sæsonÅr = profil
    ? [...new Set(profil.sæsoner.map(s => s.sæson))].sort().reverse()
    : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
      onClick={luk}
    >
      <div
        className="bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 py-4">
          <span className="text-sm text-gray-400 font-medium">Profil</span>
          <button
            onClick={luk}
            className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
            aria-label="Luk"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="py-16 text-center text-gray-500">Henter profildata...</div>
          )}
          {fejl && (
            <div className="py-16 text-center text-red-400">{fejl}</div>
          )}

          {profil && (
            <>
              {/* Profilhoved */}
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center text-2xl">
                  {profil.sleeperAvatar
                    ? <img
                        src={`https://sleepercdn.com/avatars/thumbs/${profil.sleeperAvatar}`}
                        alt={profil.displayName ?? brugernavn}
                        className="w-full h-full object-cover"
                      />
                    : '👤'
                  }
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{profil.displayName ?? brugernavn}</h2>
                  {profil.vis_sleeper_username && (
                    <p className="text-gray-500 text-sm mt-0.5 font-mono">
                      {profil.sleeperUsername} på Sleeper
                    </p>
                  )}
                  <p className="text-gray-600 text-sm mt-0.5">
                    {sæsonÅr.length} sæson{sæsonÅr.length !== 1 ? 'er' : ''} i GFC
                  </p>
                </div>
              </div>

              {/* Badges */}
              {profil.vis_badges && profil.badges.length > 0 && (
                <BadgeHylde badges={profil.badges} />
              )}

              {/* Sæsoner */}
              {sæsonÅr.map(år => {
                const sæsonLigaer = profil.sæsoner.filter(s => s.sæson === år)
                return (
                  <section key={år} className="mb-8">
                    <h3 className="text-lg font-semibold mb-3 text-gray-300">Sæson {år}</h3>
                    <div className="flex flex-col gap-4">
                      {sæsonLigaer.map(s => (
                        <LigaKort key={`${år}-${s.ligaNavn}`} data={s} />
                      ))}
                    </div>
                  </section>
                )
              })}

              {profil.sæsoner.length === 0 && (
                <div className="bg-gray-800/50 rounded-xl p-8 text-center text-gray-500">
                  Ingen GFC-sæsondata fundet.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function LigaKort({ data }: { data: SæsonData }) {
  const maxPoint = Math.max(...data.weeklyScores.map(w => w.point), 1)

  return (
    <div className="bg-gray-800/50 rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${TYPEBADGE[data.type]}`}>
            {TYPELABEL[data.type]}
          </span>
          <span className="text-gray-400 text-sm">{data.ligaNavn}</span>
        </div>
        {data.rangPlacering && (
          <div className="text-right">
            <span className="text-xl font-bold">
              {data.rangPlacering === 1 ? '🥇'
                : data.rangPlacering === 2 ? '🥈'
                : data.rangPlacering === 3 ? '🥉'
                : `#${data.rangPlacering}`}
            </span>
            <p className="text-gray-600 text-xs mt-0.5">af {data.antalHold} hold</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
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

      {data.weeklyScores.length > 0 && (
        <div>
          <p className="text-gray-600 text-xs mb-2">Point per uge</p>
          <div className="flex items-end gap-1 h-14">
            {data.weeklyScores.map(w => {
              const pct = (w.point / maxPoint) * 100
              const erHøjeste = w.point === data.højesteSingleScore
              return (
                <div key={w.uge} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className={`w-full rounded-t transition-colors ${erHøjeste ? 'bg-yellow-500' : 'bg-indigo-600 group-hover:bg-indigo-400'}`}
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
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

function StatKort({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="text-white font-bold text-base leading-none">{value}</p>
      {sub && <p className="text-gray-600 text-xs mt-1">{sub}</p>}
    </div>
  )
}
