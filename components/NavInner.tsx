'use client'

import Link from 'next/link'
import { useState } from 'react'
import { tekst, t } from '@/content/tekst'
import { CURRENT_SEASON } from '@/lib/leagues'

type NavLink = { href: string; label: string }

export function NavInner({
  links,
  loggedIn,
}: {
  links: NavLink[]
  loggedIn: boolean
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const ctaHref = loggedIn ? '/min-side' : '/log-ind'
  const ctaLabel = loggedIn ? 'Min side' : t(tekst.nav.tilmeldCta)

  return (
    <div className="gfc-nav-inner">
      <Link href="/" className="gfc-brand" onClick={close}>
        <span className="gfc-brand-mark" aria-hidden>G</span>
        <span className="gfc-brand-word">GFC</span>
        <span className="gfc-brand-year">{CURRENT_SEASON}</span>
      </Link>

      {/* Desktop links */}
      <div className="gfc-nav-links">
        {links.map(link => (
          <Link key={link.href} href={link.href} className="gfc-nav-link">
            {link.label}
          </Link>
        ))}
      </div>

      {/* Desktop CTA */}
      <div className="nav-desktop-cta" style={{ display: 'flex', alignItems: 'center' }}>
        {loggedIn ? (
          <Link href="/min-side" className="gfc-nav-cta">Min side</Link>
        ) : (
          <>
            <Link href="/log-ind" className="gfc-nav-link">Log ind</Link>
            <Link href="/log-ind" className="gfc-nav-cta">{t(tekst.nav.tilmeldCta)}</Link>
          </>
        )}
      </div>

      {/* Hamburger */}
      <button
        className="nav-hamburger"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Luk menu' : 'Åbn menu'}
        aria-expanded={open}
      >
        <span style={open ? { transform: 'translateY(6.5px) rotate(45deg)' } : undefined} />
        <span style={open ? { opacity: 0 } : undefined} />
        <span style={open ? { transform: 'translateY(-6.5px) rotate(-45deg)' } : undefined} />
      </button>

      {/* Mobile dropdown */}
      {open && (
        <div className="nav-mobile-menu">
          {links.map(link => (
            <Link key={link.href} href={link.href} onClick={close}>
              {link.label}
            </Link>
          ))}
          <Link href={ctaHref} className="mobile-cta" onClick={close}>
            {ctaLabel}
          </Link>
        </div>
      )}
    </div>
  )
}
