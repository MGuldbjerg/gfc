// Full Auth.js v5 configuration — used by route handlers and server actions.
// The middleware uses the lighter edge-only config in auth.config.ts.

import NextAuth from 'next-auth'
import type { Provider } from 'next-auth/providers'
import { authConfig } from './auth.config'
import { tursoAdapter } from '@/lib/auth-adapter'
import { sendMagicLinkMail } from '@/lib/brevo'

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
    await sendMagicLinkMail({ email: identifier, url })
  },
} satisfies Provider

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: tursoAdapter,
  providers: [emailProvider],
})
