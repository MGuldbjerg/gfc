import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from './auth.config'

const { auth } = NextAuth(authConfig)

export default auth(req => {
  const { pathname } = req.nextUrl
  const session = req.auth

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
    '/admin/:path*',
    '/min-side/:path*',
    '/profil-setup',
    '/saeson/:path*',
    '/indstillinger',
  ],
}
