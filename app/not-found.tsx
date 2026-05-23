import Link from 'next/link'

export const metadata = { title: 'Siden findes ikke' }

export default function NotFound() {
  return (
    <div className="gfc-app">
      <div className="container" style={{ maxWidth: 640 }}>
        <div style={{
          minHeight: 'calc(100vh - 200px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingTop: 80,
          paddingBottom: 80,
        }}>
          <div className="kicker-strip">
            <span className="dash" />
            <span className="eyebrow">Fejl 404</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(44px, 8vw, 84px)',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.02,
            color: 'var(--ink)',
            margin: 0,
          }}>
            Fumble og <em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>−2 point</em> til mig!
          </h1>

          <p style={{
            marginTop: 24,
            fontSize: 17,
            lineHeight: 1.55,
            color: 'var(--ink-2)',
            maxWidth: 520,
          }}>
            Siden findes ikke. Gå tilbage i din browser — eller hop direkte videre:
          </p>

          <ul style={{
            marginTop: 24,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            width: '100%',
            maxWidth: 460,
          }}>
            {[
              { href: '/',                label: 'Forsiden' },
              { href: '/leaderboard',     label: 'Leaderboard' },
              { href: '/historie',        label: 'Historie og tidligere vindere' },
              { href: '/regler',          label: 'Regler' },
              { href: '/sponsorer',       label: 'Sponsorer og præmier' },
              { href: '/om-gfc',          label: 'Om GFC' },
              { href: '/draft-statistik', label: 'Draftstatistik' },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 4px',
                    borderBottom: '1px solid var(--line)',
                    fontSize: 16,
                    fontWeight: 500,
                    color: 'var(--ink)',
                    textDecoration: 'none',
                  }}
                >
                  <span>{label}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 14 }}>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
