// Full Auth.js v5 configuration — used by route handlers and server actions.
// The middleware uses the lighter edge-only config in auth.config.ts.

import NextAuth from 'next-auth'
import type { Provider } from 'next-auth/providers'
import { authConfig } from './auth.config'
import { tursoAdapter } from '@/lib/auth-adapter'
import { sendMagicLinkMail } from '@/lib/brevo'
import { rateLimit } from '@/lib/rate-limit'

// Cap how many magic-link mails a single address can trigger, regardless of
// source IP — stops a distributed flood aimed at one victim's inbox. Pairs with
// the per-IP throttle in middleware.ts.
const EMAIL_LIMIT = 3
const EMAIL_WINDOW_MS = 60 * 60 * 1000

const emailProvider = {
  id: 'email',
  type: 'email',
  name: 'Email',
  from: process.env.BREVO_SENDER_EMAIL ?? 'noreply@example.com',
  server: { host: '', port: 587, auth: { user: '', pass: '' } },
  maxAge: 24 * 60 * 60,
  options: {},
  async sendVerificationRequest({
    identifier,
    url,
  }: {
    identifier: string
    url: string
  }) {
    const { ok } = rateLimit(
      `signin-email:${identifier.toLowerCase()}`,
      EMAIL_LIMIT,
      EMAIL_WINDOW_MS
    )
    if (!ok) {
      // Silently skip: a real user already got a link within the window, and we
      // don't want to confirm to an abuser whether the address exists.
      console.warn(`Magic-link rate limit hit for ${identifier}`)
      return
    }
    await sendMagicLinkMail({ email: identifier, url })
  },
} satisfies Provider

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: tursoAdapter,
  providers: [emailProvider],
})
