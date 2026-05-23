import Link from 'next/link'
import type { ManagedSlutstillingEntry, PlayoffTier } from '@/lib/historie'
import type { WeeklyHighscore } from '@/types/sleeper'

const TIER_LABEL: Record<PlayoffTier, string> = {
  winner: 'Mester',
  finalist: 'Finalist',
  semifinalist: 'Semifinalist',
  quarterfinalist: 'Kvartfinalist',
  rest: 'Grundspil',
}

const TIER_ORDER: PlayoffTier[] = ['winner', 'finalist', 'semifinalist', 'quarterfinalist', 'rest']

export default function ManagedColumn({
  titel,
  ix,
  sub,
  entries,
  weekly,
}: {
  titel: string
  ix: string
  sub?: string
  entries: ManagedSlutstillingEntry[]
  weekly?: WeeklyHighscore[]
}) {
  const grouped = TIER_ORDER.map((tier) => ({
    tier,
    rows: entries.filter((e) => e.tier === tier),
  })).filter((g) => g.rows.length > 0)

  const harPlayoff = entries.some((e) => e.tier !== 'rest')

  return (
    <div className="lb-col">
      <div className="lb-col-head">
        <span className="lb-col-name">
          <span className="lb-ix">{ix}</span>
          {titel}
        </span>
        <span className="eyebrow">{harPlayoff ? 'Slutspil' : sub ?? 'Grundspil'}</span>
      </div>

      {entries.length === 0 ? (
        <p className="eyebrow" style={{ padding: '24px 0' }}>Ingen data endnu</p>
      ) : (
        grouped.map((g, gi) => (
          <div key={g.tier} style={{ marginTop: gi === 0 ? 0 : 24 }}>
            {/* Tier header — hide when only the "rest" group exists (pre-playoff). */}
            {harPlayoff && (
              <div
                className="eyebrow"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 10,
                  color: g.tier === 'winner' ? 'var(--accent)' : undefined,
                }}
              >
                <span>{TIER_LABEL[g.tier]}</span>
                <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                <span>{g.rows.length}</span>
              </div>
            )}
            <table className="tbl">
              <tbody>
                {g.rows.map((e, i) => (
                  <tr key={`${g.tier}-${e.username}-${i}`}>
                    <td className="name">
                      <Link
                        href={`/profil/${e.username}`}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {e.displayName}
                      </Link>
                      <span
                        className="mono"
                        style={{ marginLeft: 8, color: 'var(--muted)', fontSize: 11 }}
                      >
                        {e.leagueName.replace(/^Managed /, 'M')}
                      </span>
                    </td>
                    {g.tier === 'rest' ? (
                      <td className="r" style={{ whiteSpace: 'nowrap' }}>
                        {e.wins}
                        <span style={{ color: 'var(--muted)' }}>
                          –{e.points.toFixed(1)}
                        </span>
                      </td>
                    ) : (
                      <td className="pts">
                        {e.playoffScore?.toFixed(1) ?? '—'}
                        <span
                          className="mono"
                          style={{ marginLeft: 6, color: 'var(--muted)', fontSize: 10 }}
                        >
                          U{e.playoffWeek}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {weekly && weekly.length > 0 && (
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
                <tr key={`${s.league}-${s.week}-${i}`}>
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
