import Link from 'next/link'
import { tekst, t } from '@/content/tekst'
import { CURRENT_SEASON } from '@/lib/leagues'
import { queryOne } from '@/lib/turso'
import { getSeasonSettings } from '@/lib/seasonSettings'
import { listAfsluttedeSæsoner, hentSæsonNøgletal } from '@/lib/historie'
import SignupCountdown from './SignupCountdown'

export const revalidate = 3600

const COUNTDOWN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // show the countdown within 30 days of the deadline

// Returns the deadline ISO only when it is in the future and within the window.
async function countdownDeadline(): Promise<string | null> {
  const settings = await getSeasonSettings(CURRENT_SEASON)
  if (!settings?.signupDeadline) return null
  const ms = new Date(settings.signupDeadline).getTime() - Date.now()
  if (Number.isNaN(ms) || ms <= 0 || ms > COUNTDOWN_WINDOW_MS) return null
  return settings.signupDeadline
}

type StatsRow = {
  total: number
  bestball: number
  managed: number
  chopped: number
}

const TRACKS = [
  {
    ix: '01',
    name: 'Bestball',
    corner: 'sat-og-glem',
    desc: 'Automatiske startere — draft et hold og lad systemet vælge dine bedste spillere hver uge. Ingen lineups at håndtere.',
    tags: ['automatisk', 'draft', 'total point'],
  },
  {
    ix: '02',
    name: 'Managed',
    corner: 'klassisk',
    desc: 'Klassisk fantasy. Sæt dit hold manuelt hver uge, lav byttehandler og match dig mod resten af ligaen.',
    tags: ['manuelt', 'byttehandler', 'head-to-head'],
  },
  {
    ix: '03',
    name: 'Chopped',
    corner: 'guillotine',
    desc: 'Lavest scorende hold ryger ud hver uge. Én liga, én vinder — sæsonens skarpeste tilbageværende.',
    tags: ['elimination', 'ugentlig', 'survivor'],
  },
]

export default async function HomePage() {
  const stats = await queryOne<StatsRow>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN preferred_types LIKE '%bestball%' THEN 1 ELSE 0 END) AS bestball,
       SUM(CASE WHEN preferred_types LIKE '%managed%'  THEN 1 ELSE 0 END) AS managed,
       SUM(CASE WHEN preferred_types LIKE '%chopped%'  THEN 1 ELSE 0 END) AS chopped
     FROM registrations
     WHERE season = ?`,
    [CURRENT_SEASON]
  ) ?? { total: 0, bestball: 0, managed: 0, chopped: 0 }
  const deadline = await countdownDeadline()

  // Hero stats, live from Sleeper for the latest completed season. Falls back to
  // the static text if there is no finished season yet. Cached hourly via
  // `revalidate` above, so this only hits Sleeper once per hour.
  const afsluttede = listAfsluttedeSæsoner()
  const senesteSæson = afsluttede[0]
  const nøgletal = senesteSæson ? await hentSæsonNøgletal(senesteSæson) : null
  const hojdepunkter = nøgletal
    ? [
        { tal: String(afsluttede.length), label: 'Sæsoner kørt' },
        { tal: String(nøgletal.deltagere), label: `Deltagere i ${senesteSæson}` },
        { tal: String(nøgletal.ligaer), label: 'Sleeper-ligaer' },
      ]
    : tekst.landing.hojdepunkter
  return (
    <div className="gfc-app">
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-inner">
            <div className="hero-top">
              <div className="kicker-strip">
                <span className="dash" />
                <span className="eyebrow">Guldbjergs Fantasy Challenge — {CURRENT_SEASON}</span>
              </div>
              <div className="hero-meta">
                <span className="hero-meta-item">NFL 2026</span>
                <span className="hero-meta-item">3 rækker</span>
                <span className="hero-meta-item">Slow draft</span>
              </div>
            </div>

            <div className="hero-row2">
              <div>
                <h1 className="display">
                  Danmarks<br />
                  <em>største</em><br />
                  fantasy<br />
                  challenge
                </h1>
                <div className="hero-cta-group">
                  <Link href="/log-ind" className="btn">
                    {t(tekst.landing.primaerCta)}
                    <span className="arrow" aria-hidden />
                  </Link>
                  <Link href="/leaderboard" className="btn ghost">
                    {tekst.landing.sekundaerCta}
                  </Link>
                </div>
              </div>

              <div className="stat-blocks">
                {hojdepunkter.map(h => (
                  <div key={h.label} className="stat-block">
                    <div className="stat-num">{h.tal}</div>
                    <div className="stat-label">{h.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signup deadline countdown — only within 30 days of the deadline */}
      {deadline && <SignupCountdown deadline={deadline} />}

      {/* Live signup counts */}
      <section className="section signup-counts">
        <div className="container">
          <div className="kicker-strip">
            <span className="dash" />
            <span className="eyebrow">Sæson {CURRENT_SEASON} · Tilmeldinger</span>
          </div>
          <div className="counts-grid">
            <div className="count-item count-item--total">
              <div className="count-num">{stats.total}</div>
              <div className="count-label">tilmeldte i alt</div>
            </div>
            <div className="counts-split">
              <div className="count-item">
                <div className="count-num">{stats.bestball}</div>
                <div className="count-label">Bestball</div>
              </div>
              <div className="count-item">
                <div className="count-num">{stats.managed}</div>
                <div className="count-label">Managed</div>
              </div>
              <div className="count-item">
                <div className="count-num">{stats.chopped}</div>
                <div className="count-label">Chopped</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tracks */}
      <section className="section alt">
        <div className="container">
          <div className="section-head">
            <div className="left">
              <div className="kicker-strip">
                <span className="dash" />
                <span className="eyebrow">Tre rækker</span>
              </div>
              <h2 className="section-title">{tekst.landing.raekkerTitel}</h2>
              <p className="lede">{tekst.landing.raekkerUndertitel}</p>
            </div>
          </div>

          <div className="tracks">
            {TRACKS.map(track => (
              <div key={track.ix} className="track">
                <span className="ix">{track.ix}</span>
                <span className="corner">{track.corner}</span>
                <div className="name">{track.name}</div>
                <p className="desc">{track.desc}</p>
                <div className="tags">
                  {track.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="left">
              <div className="kicker-strip">
                <span className="dash" />
                <span className="eyebrow">Sæsonplan</span>
              </div>
              <h2 className="section-title">{tekst.landing.tidslinjeTitel}</h2>
            </div>
          </div>

          <ol className="timeline">
            {tekst.landing.tidslinje.map((trin, i) => (
              <li key={trin.tid} className="tl-step">
                <div className="step-no">TRIN {String(i + 1).padStart(2, '0')}</div>
                <div className="step-when">{trin.tid}</div>
                <div className="step-what">{trin.hvad}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Final CTA */}
      <div className="finalcta">
        <div className="finalcta-inner">
          <div>
            <h2>Klar til at spille med?</h2>
          </div>
          <div>
            <p>{tekst.landing.finalCtaTekst}</p>
            <Link href="/log-ind" className="btn">
              {t(tekst.landing.finalCta)}
              <span className="arrow" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="gfc-footer">
        <div className="container">
          <div className="gfc-footer-inner">
            <span>GFC {CURRENT_SEASON}</span>
            <span>Data fra Sleeper API</span>
            <span>Guldbjergs Fantasy Challenge</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
