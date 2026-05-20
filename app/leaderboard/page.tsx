import Link from 'next/link'
import { computeLeaderboard, type LeaderboardType } from '@/lib/leaderboard'
import { CURRENT_SEASON } from '@/lib/leagues'
import { queryOne } from '@/lib/turso'
import type { LeaderboardResult, LeaderboardEntry } from '@/types/sleeper'
import LeaderboardTable from './LeaderboardTable'

export const revalidate = 3600

async function getLeaderboard(type: LeaderboardType, season: string): Promise<LeaderboardResult> {
  const row = await queryOne<{ data: string }>(
    'SELECT data FROM leaderboard_cache WHERE season = ? AND league_type = ?',
    [season, type]
  )
  if (row) return JSON.parse(row.data) as LeaderboardResult
  return computeLeaderboard(type, season)
}

export default async function LeaderboardPage() {
  const [bestball, managed, chopped] = await Promise.all([
    getLeaderboard('bestball', CURRENT_SEASON),
    getLeaderboard('managed', CURRENT_SEASON),
    getLeaderboard('chopped', CURRENT_SEASON),
  ])

  const harChopped = chopped.entries.length > 0
  const ingenData = bestball.entries.length === 0 && managed.entries.length === 0 && chopped.entries.length === 0
  const bbHigh = bestball.seasonHighscore
  const mHigh = managed.seasonHighscore

  if (ingenData) {
    return (
      <div className="gfc-app">
        <div className="container">
          <div className="page-head">
            <div className="kicker-strip">
              <span className="dash" />
              <span className="eyebrow">GFC {CURRENT_SEASON}</span>
            </div>
            <h1>Leaderboard</h1>
          </div>
          <div style={{
            padding: '64px 48px',
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            boxShadow: 'var(--sh-1)',
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: 48,
            alignItems: 'center',
            marginBottom: 80,
          }}>
            <div>
              <div className="kicker-strip" style={{ marginBottom: 20 }}>
                <span className="dash" />
                <span className="eyebrow">Sæson {CURRENT_SEASON}</span>
              </div>
              <h2 className="section-title" style={{ fontSize: 'clamp(28px, 3vw, 44px)' }}>
                Sæsonen starter i september
              </h2>
              <p className="lede" style={{ marginTop: 16, maxWidth: '44ch' }}>
                NFL-sæsonen er ikke startet endnu. Tilmeld dig nu — slow drafts starter i juni.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
              <Link href="/log-ind" className="btn">
                Tilmeld dig GFC {CURRENT_SEASON}
                <span className="arrow" aria-hidden />
              </Link>
              <Link href="/historie" className="btn ghost">
                Se tidligere sæsoner
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gfc-app">
      <div className="container">
        <div className="page-head">
          <div className="kicker-strip">
            <span className="dash" />
            <span className="eyebrow">GFC {CURRENT_SEASON}</span>
          </div>
          <h1>Leaderboard</h1>
          <p className="sub">Standings på tværs af alle rækker — opdateres automatisk tirsdage.</p>
        </div>

        {/* Season highscore cards */}
        {(bbHigh || mHigh) && (
          <div className="hs-grid">
            {bbHigh && (
              <div className="hs-card accent">
                <div className="hs-label">
                  <span className="trophy" />
                  <span className="eyebrow">Sæsonens højeste score — Bestball</span>
                </div>
                <div className="pts">{bbHigh.points.toFixed(1)}</div>
                <div className="who">{bbHigh.displayName}</div>
                <div className="hs-meta">{bbHigh.league} · UGE {bbHigh.week}</div>
              </div>
            )}
            {mHigh && (
              <div className="hs-card">
                <div className="hs-label">
                  <span className="trophy" />
                  <span className="eyebrow">Sæsonens højeste score — Managed</span>
                </div>
                <div className="pts">{mHigh.points.toFixed(1)}</div>
                <div className="who">{mHigh.displayName}</div>
                <div className="hs-meta">{mHigh.league} · UGE {mHigh.week}</div>
              </div>
            )}
          </div>
        )}

        {/* Three-column leaderboard */}
        <div className="lb-grid" style={!harChopped ? { gridTemplateColumns: '1fr 1fr' } : undefined}>
          <LeagueCol
            name="Bestball"
            ix="01"
            sub="Total point"
            entries={bestball.entries.slice(0, 25)}
            weekly={bestball.weeklyHighscores}
            type="bestball"
          />
          <LeagueCol
            name="Managed"
            ix="02"
            sub="Wins · Total point"
            entries={managed.entries.slice(0, 25)}
            weekly={managed.weeklyHighscores}
            type="managed"
            visWins
          />
          {harChopped && (
            <LeagueCol
              name="Chopped"
              ix="03"
              sub="Guillotine"
              entries={chopped.entries.slice(0, 25)}
              weekly={chopped.weeklyHighscores}
              type="chopped"
            />
          )}
        </div>

        <p className="eyebrow" style={{ textAlign: 'center', paddingBottom: 64, paddingTop: 48 }}>
          Data fra Sleeper API · Opdateres automatisk
        </p>
      </div>
    </div>
  )
}

function LeagueCol({
  name,
  ix,
  sub,
  entries,
  weekly,
  type,
  visWins,
}: {
  name: string
  ix: string
  sub: string
  entries: LeaderboardEntry[]
  weekly: LeaderboardResult['weeklyHighscores']
  type: LeaderboardType
  visWins?: boolean
}) {
  return (
    <div className="lb-col">
      <div className="lb-col-head">
        <span className="lb-col-name">
          <span className="lb-ix">{ix}</span>
          {name}
        </span>
        <span className="eyebrow">{sub}</span>
      </div>

      {entries.length === 0 ? (
        <p className="eyebrow" style={{ padding: '24px 0' }}>Ingen data endnu</p>
      ) : (
        <LeaderboardTable entries={entries} type={type} />
      )}

      {weekly.length > 0 && (
        <>
          <div className="lb-section-head">
            Ugentlige topscorer
            <span className="dash" />
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Hold</th>
                <th>Liga</th>
                <th className="c">Uge</th>
                <th className="r">Point</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((s, i) => (
                <tr key={i}>
                  <td className="name">{s.displayName}</td>
                  <td>{s.league}</td>
                  <td className="c">{s.week}</td>
                  <td className="pts">{s.points.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
