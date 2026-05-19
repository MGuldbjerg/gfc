// Lookup helpers for editable markdown pages stored in content/sider/*.md.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SIDER_DIR = join(process.cwd(), 'content', 'sider')

export function listSlugs(): string[] {
  if (!existsSync(SIDER_DIR)) return []
  return readdirSync(SIDER_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''))
}

export type SideIndhold = {
  slug: string
  title: string
  body: string
}

export function loadSide(slug: string): SideIndhold | null {
  const file = join(SIDER_DIR, `${slug}.md`)
  if (!existsSync(file)) return null

  const raw = readFileSync(file, 'utf8')
  const titleMatch = raw.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1].trim() : slug

  // Strip the first H1 from the body — we render it separately.
  const body = titleMatch ? raw.replace(titleMatch[0], '').trim() : raw.trim()

  return { slug, title, body }
}
