// Edge-compatible Auth.js config. No adapter, no DB calls — just the bits
// that need to run inside middleware (Edge runtime).

import type { NextAuthConfig } from 'next-auth'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'mgj@groenagergaard.dk')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean)

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isAdmin: boolean
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  providers: [], // populated in auth.ts where the email provider is added
  pages: {
    signIn: '/log-ind',
    verifyRequest: '/log-ind/tjek-mail',
    error: '/log-ind/fejl',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email ?? token.email
      }
      return token
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      session.user.isAdmin = !!session.user.email
        && ADMIN_EMAILS.includes(session.user.email.toLowerCase())
      return session
    },
  },
}
