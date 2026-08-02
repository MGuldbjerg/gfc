import { notFound } from 'next/navigation'
import Link from 'next/link'
import { hentProfilData, hentTilmeldteSæsoner } from '@/lib/profil'
import { beregnBadges } from '@/lib/badges'
import BadgeHylde from '@/components/BadgeHylde'
import { listSæsoner, listAfsluttedeSæsoner, hentSingleWeekRekord, hentSæsonVinder } from '@/lib/historie'
import type { BadgeType } from '@/lib/badges'
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

const TYPEIX: Record<string, string> = {
  bestball: '01',
  managed:  '02',
  chopped:  '03',
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

  const afsluttedeSæsoner = await listAfsluttedeSæsoner()
  const leagueTypes = ['bestball', 'managed', 'chopped'] as const

  const [ugeRekorder, sæsonVindere] = await Promise.all([
    Promise.all(afsluttedeSæsoner.flatMap(s => leagueTypes.map(t => hentSingleWeekRekord(s, t)))),
    Promise.all(afsluttedeSæsoner.flatMap(s => leagueTypes.map(t => hentSæsonVinder(s, t)))),
  ])

  const erUgeRekordHolder = ugeRekorder.some(r => r?.username === profil.sleeperUsername)
  const erSæsonVinder = sæsonVindere.some(r => r?.username === profil.sleeperUsername)

  const peakRekord = ugeRekorder.find(r => r?.username === profil.sleeperUsername)
  const tooltipOverrides: Partial<Record<BadgeType, string>> = {}
  if (peakRekord) {
    tooltipOverrides['peak'] = `Uge ${peakRekord.week} — ${peakRekord.leagueName} (${peakRekord.points.toFixed(2)} pts)`
  }

  const badges = beregnBadges(sæsoner, profil.sleeperUserId, {
    erUgeRekordHolder,
    erSæsonVinder,
    alleKendteSæsoner: await listSæsoner(),
    tilmeldteSæsoner: await hentTilmeldteSæsoner(profil.sleeperUsername),
  })

  return (
    <div className="gfc-app">
      <div className="container" style={{ maxWidth: 900 }}>
        <div className="page-head" style={{ paddingBottom: 32 }}>
          <Link href="/leaderboard" className="eyebrow" style={{ color: 'var(--muted)', display: 'inline-block', marginBottom: 24 }}>
            ← Leaderboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{
              width: 72, height: 72,
              borderRadius: '50%',
              background: 'var(--bg-2)',
              border: '1px solid var(--line)',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt={profil.displayName ?? brugernavn} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '○'
              }
            </div>
            <div>
              <h1 style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}>{profil.displayName ?? brugernavn}</h1>
              <p className="eyebrow" style={{ marginTop: 8 }}>
                {profil.sleeperUsername} på Sleeper · {alleSæsonÅr.length} sæson{alleSæsonÅr.length !== 1 ? 'er' : ''} i GFC
              </p>
            </div>
          </div>
        </div>

        <BadgeHylde badges={badges} tooltipOverrides={tooltipOverrides} />

        {sæsoner.length === 0 ? (
          <div style={{
            padding: '48px 32px',
            textAlign: 'center',
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            marginBottom: 80,
          }}>
            <p className="eyebrow">Ingen GFC-sæsondata fundet for dette brugernavn.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 56, paddingBottom: 96 }}>
            {alleSæsonÅr.map(år => {
              const ligaer = sæsoner.filter(s => s.sæson === år)
              return (
                <section key={år}>
                  <div className="lb-section-head">
                    Sæson {år}
                    <span className="dash" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {ligaer.map(s => (
                      <LigaKort key={`${år}-${s.ligaNavn}`} data={s} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function LigaKort({ data }: { data: SæsonData }) {
  const maxPoint = Math.max(...data.weeklyScores.map(w => w.point), 1)

  return (
    <div className="lb-col">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="lb-ix">{TYPEIX[data.leagueType] ?? '—'}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, letterSpacing: '-0.02em' }}>
            {TYPELABEL[data.leagueType]}
          </span>
          <span className="eyebrow" style={{ color: 'var(--muted-2)' }}>{data.ligaNavn}</span>
        </div>
        {data.rangPlacering && (
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.03em', color: 'var(--ink)' }}>
              #{data.rangPlacering}
            </span>
            <p className="eyebrow" style={{ marginTop: 2 }}>af {data.antalHold} hold</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 24 }}>
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

      {/* Bar chart */}
      {data.weeklyScores.length > 0 && (
        <div>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Point per uge</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 56 }}>
            {data.weeklyScores.map(w => {
              const pct = (w.point / maxPoint) * 100
              const erHøjeste = w.point === data.højesteSingleScore
              return (
                <div
                  key={w.uge}
                  title={`Uge ${w.uge}: ${w.point.toFixed(1)}`}
                  style={{
                    flex: 1,
                    height: `${Math.max(pct, 4)}%`,
                    background: erHøjeste ? 'var(--accent)' : 'var(--line)',
                    borderRadius: '3px 3px 0 0',
                    transition: 'background .15s',
                    cursor: 'default',
                  }}
                />
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span className="eyebrow">Uge 1</span>
            <span className="eyebrow">Uge {data.weeklyScores[data.weeklyScores.length - 1]?.uge}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function StatKort({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      padding: '14px 16px',
      background: 'var(--bg-2)',
      border: '1px solid var(--line-2)',
      borderRadius: 'var(--r-sm)',
    }}>
      <p className="eyebrow" style={{ marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.025em', lineHeight: 1, color: 'var(--ink)' }}>
        {value}
      </p>
      {sub && <p className="eyebrow" style={{ marginTop: 6 }}>{sub}</p>}
    </div>
  )
}
