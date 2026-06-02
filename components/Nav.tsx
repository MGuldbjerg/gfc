import { auth } from '@/auth'
import { tekst } from '@/content/tekst'
import { NavInner } from './NavInner'

const links = [
  { href: '/leaderboard', label: tekst.nav.leaderboard },
  { href: '/historie', label: tekst.nav.historie },
  { href: '/om-gfc', label: 'Om GFC' },
  { href: '/vip', label: 'VIP' },
  { href: '/draft-statistik', label: tekst.nav.draftstatistik },
  { href: '/regler', label: tekst.nav.regler },
  { href: '/sponsorer', label: 'Sponsorer og præmier' },
]

export async function Nav() {
  const session = await auth()
  return (
    <nav className="gfc-nav" aria-label="Primær navigation">
      <NavInner links={links} loggedIn={!!session?.user} />
    </nav>
  )
}
