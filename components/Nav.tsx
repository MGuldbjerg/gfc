import Link from 'next/link'
import { auth } from '@/auth'
import { tekst, t } from '@/content/tekst'
import { CURRENT_SEASON } from '@/lib/leagues'

const links = [
  { href: '/leaderboard', label: tekst.nav.leaderboard },
  { href: '/historie', label: tekst.nav.historie },
  { href: '/om-gfc', label: 'Om GFC' },
  { href: '/draft-statistik', label: tekst.nav.draftstatistik },
  { href: '/regler', label: tekst.nav.regler },
  { href: '/sponsorer', label: tekst.nav.sponsorer },
]

export async function Nav() {
  const session = await auth()
  const loggedIn = !!session?.user

  return (
    <nav className="gfc-nav" aria-label="Primær navigation">
      <div className="gfc-nav-inner">
        <Link href="/" className="gfc-brand">
          <span className="gfc-brand-mark" aria-hidden>G</span>
          <span className="gfc-brand-word">GFC</span>
          <span className="gfc-brand-year">{CURRENT_SEASON}</span>
        </Link>

        <div className="gfc-nav-links">
          {links.map(link => (
            <Link key={link.href} href={link.href} className="gfc-nav-link">
              {link.label}
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          {loggedIn ? (
            <Link href="/min-side" className="gfc-nav-cta">
              Min side
            </Link>
          ) : (
            <>
              <Link href="/log-ind" className="gfc-nav-link">
                Log ind
              </Link>
              <Link href="/log-ind" className="gfc-nav-cta">
                {t(tekst.nav.tilmeldCta)}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
