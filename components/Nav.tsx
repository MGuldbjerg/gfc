import Link from 'next/link'
import { tekst, t } from '@/content/tekst'

const links = [
  { href: '/leaderboard', label: tekst.nav.leaderboard },
  { href: '/tilmeld', label: tekst.nav.tilmeld },
  { href: '/historie', label: tekst.nav.historie },
  { href: '/draft-statistik', label: tekst.nav.draftstatistik },
]

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-800/60 bg-gray-950/85 backdrop-blur">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-white font-semibold tracking-tight text-lg"
        >
          <span aria-hidden>🏈</span>
          <span>GFC</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-gray-300 hover:text-white px-2 sm:px-3 py-1.5 rounded-md hover:bg-gray-800/60 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/tilmeld"
            className="ml-1 sm:ml-2 hidden md:inline-flex bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
          >
            {t(tekst.nav.tilmeldCta)}
          </Link>
        </nav>
      </div>
    </header>
  )
}
