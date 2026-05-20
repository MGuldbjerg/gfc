import Link from 'next/link'
import { tekst, t } from '@/content/tekst'
import { CURRENT_SEASON } from '@/lib/leagues'

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

export default function HomePage() {
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
                {tekst.landing.hojdepunkter.map(h => (
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
