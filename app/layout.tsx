import type { Metadata } from 'next'
import { Manrope, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Nav } from '@/components/Nav'
import { SITE_URL } from '@/lib/site-url'

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Guldbjergs Fantasy Challenge',
    template: '%s · GFC',
  },
  description: 'Danmarks største fantasy football-konkurrence. Tilmeld dig GFC 2026.',
  openGraph: {
    title: 'Guldbjergs Fantasy Challenge',
    description: 'Danmarks største fantasy football-konkurrence.',
    url: SITE_URL,
    siteName: 'GFC',
    locale: 'da_DK',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="da">
      <body className={`${manrope.variable} ${jetbrainsMono.variable} antialiased`}>
        <Nav />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
