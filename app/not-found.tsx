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
            fontSize: 'clamp(48px, 9vw, 96px)',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.02,
            color: 'var(--ink)',
            margin: 0,
          }}>
            Den side findes <em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>ikke</em>.
          </h1>

          <p style={{
            marginTop: 24,
            fontSize: 17,
            lineHeight: 1.55,
            color: 'var(--ink-2)',
            maxWidth: 480,
          }}>
            Linket er enten forkert, eller siden er flyttet. Du kan altid finde tilbage til startsiden eller gå direkte til leaderboardet.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
            <Link href="/" className="btn">
              Til forsiden
              <span className="arrow" aria-hidden />
            </Link>
            <Link href="/leaderboard" className="btn ghost">
              Leaderboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
