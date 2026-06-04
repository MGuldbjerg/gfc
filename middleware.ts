import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from './auth.config'
import { rateLimit } from './lib/rate-limit'

const { auth } = NextAuth(authConfig)

// Per-IP throttle on the magic-link sign-in endpoint to blunt email-bombing /
// spam-relay abuse. Edge-only, per-instance — the authoritative limit is the
// Cloudflare WAF rule. 5 attempts per 10 minutes is generous for a real user.
const SIGNIN_LIMIT = 5
const SIGNIN_WINDOW_MS = 10 * 60 * 1000

function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

export default auth(req => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (pathname.startsWith('/api/auth/signin')) {
    const { ok, retryAfter } = rateLimit(
      `signin-ip:${clientIp(req)}`,
      SIGNIN_LIMIT,
      SIGNIN_WINDOW_MS
    )
    if (!ok) {
      return NextResponse.json(
        { error: 'For mange loginforsøg. Prøv igen om lidt.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }
    return NextResponse.next()
  }

  const requiresAuth =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/min-side') ||
    pathname.startsWith('/profil-setup') ||
    pathname.startsWith('/saeson') ||
    pathname.startsWith('/indstillinger')

  if (requiresAuth && !session) {
    const url = new URL('/log-ind', req.url)
    url.searchParams.set('retur', pathname)
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/admin') && !session?.user?.isAdmin) {
    return NextResponse.redirect(new URL('/min-side', req.url))
  }
})

export const config = {
  matcher: [
    '/api/auth/signin/:path*',
    '/admin/:path*',
    '/min-side/:path*',
    '/profil-setup',
    '/saeson/:path*',
    '/indstillinger',
  ],
}
