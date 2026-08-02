import { auth } from '@/auth'
import { hentTekst, hentSiderTilAdmin } from '@/lib/indhold'
import { hentAktuelSæson } from '@/lib/seasonConfig'
import { NavInner } from './NavInner'

// The fixed links point at real routes, so the list stays in code. Only their
// labels are editable, via the resolved text.
function fasteLinks(tekst: Awaited<ReturnType<typeof hentTekst>>) {
  return [
    { href: '/leaderboard', label: tekst.nav.leaderboard },
    { href: '/historie', label: tekst.nav.historie },
    { href: '/om-gfc', label: 'Om GFC' },
    { href: '/vip', label: 'VIP' },
    { href: '/draft-statistik', label: tekst.nav.draftstatistik },
    { href: '/regler', label: tekst.nav.regler },
    { href: '/faq', label: tekst.nav.faq },
    { href: '/sponsorer', label: 'Sponsorer og præmier' },
  ]
}

export async function Nav() {
  const [session, tekst, sæson, sider] = await Promise.all([
    auth(),
    hentTekst(),
    hentAktuelSæson(),
    hentSiderTilAdmin(),
  ])

  const faste = fasteLinks(tekst)
  const kendte = new Set(faste.map(l => l.href))

  // Admin-created pages ticked "vis i menuen", minus anything already linked.
  const ekstra = sider
    .filter(s => s.iMenu && !kendte.has(`/${s.slug}`))
    .map(s => ({ href: `/${s.slug}`, label: s.title }))

  return (
    <nav className="gfc-nav" aria-label="Primær navigation">
      <NavInner
        links={[...faste, ...ekstra]}
        loggedIn={!!session?.user}
        sæson={sæson}
        tilmeldCta={tekst.nav.tilmeldCta}
      />
    </nav>
  )
}
