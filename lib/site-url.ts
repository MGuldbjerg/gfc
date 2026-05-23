// Canonical site URL — used for email links, sitemap, OG tags.
// AUTH_URL is the canonical env var (set in Vercel production).
export const SITE_URL =
  process.env.AUTH_URL?.replace(/\/$/, '') ?? 'https://fantasychallenge.dk'
