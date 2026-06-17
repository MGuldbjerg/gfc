import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-url'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const paths = ['', '/leaderboard', '/historie', '/draft-statistik', '/om-gfc', '/regler', '/faq', '/sponsorer']

  return paths.map(path => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '/leaderboard' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }))
}
