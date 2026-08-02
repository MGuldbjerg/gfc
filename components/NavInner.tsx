'use client'

import Link from 'next/link'
import { useState } from 'react'

type NavLink = { href: string; label: string }

// Season and label arrive as props: this is a client component, and both are
// resolved from the database by <Nav> on the server.
export function NavInner({
  links,
  loggedIn,
  sæson,
  tilmeldCta,
}: {
  links: NavLink[]
  loggedIn: boolean
  sæson: string
  tilmeldCta: string
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const ctaHref = loggedIn ? '/min-side' : '/log-ind'
  const ctaLabel = loggedIn ? 'Min side' : tilmeldCta

  return (
    <div className="gfc-nav-inner">
      <Link href="/" className="gfc-brand" onClick={close}>
        <span className="gfc-brand-mark" aria-hidden>G</span>
        <span className="gfc-brand-word">GFC</span>
        <span className="gfc-brand-year">{sæson}</span>
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
            <Link href="/log-ind" className="gfc-nav-cta">{tilmeldCta}</Link>
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
