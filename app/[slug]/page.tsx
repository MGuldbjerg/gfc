import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { listSlugs, loadSide } from '@/lib/sider'
import { CURRENT_SEASON } from '@/lib/leagues'
import { getSeasonSettings } from '@/lib/seasonSettings'

export const dynamicParams = false
// Markdown pages may embed {sæson} and {deadline}. We resolve those at render
// time and revalidate periodically, so an admin deadline change shows up
// without a redeploy.
export const revalidate = 600

export async function generateStaticParams() {
  return listSlugs().map(slug => ({ slug }))
}

// Formats an ISO-with-offset deadline as Danish wall-clock time, e.g.
// "3. juli kl. 18:00". Returns a graceful fallback when no deadline is set.
function formatDeadline(iso: string | null): string {
  if (!iso) return 'endnu ikke fastsat'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'endnu ikke fastsat'
  const dato = d.toLocaleDateString('da-DK', {
    timeZone: 'Europe/Copenhagen', day: 'numeric', month: 'long',
  })
  const tid = d
    .toLocaleTimeString('da-DK', {
      timeZone: 'Europe/Copenhagen', hour: '2-digit', minute: '2-digit',
    })
    .replace('.', ':') // da-DK uses "18.00"; the site writes times with a colon
  return `${dato} kl. ${tid}`
}

// Replaces {sæson} and {deadline} placeholders in markdown body text.
// Only touches the database when the page actually uses {deadline}.
async function substituerPladsholdere(body: string): Promise<string> {
  let out = body
  if (out.includes('{sæson}')) {
    out = out.replace(/\{sæson\}/g, CURRENT_SEASON)
  }
  if (out.includes('{deadline}')) {
    const settings = await getSeasonSettings(CURRENT_SEASON)
    out = out.replace(/\{deadline\}/g, formatDeadline(settings?.signupDeadline ?? null))
  }
  return out
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const side = loadSide(slug)
  if (!side) return {}
  return { title: `${side.title} · GFC` }
}

export default async function MarkdownSide({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const side = loadSide(slug)
  if (!side) notFound()

  const body = await substituerPladsholdere(side.body)

  return (
    <div className="gfc-app">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="page-head">
          <div className="kicker-strip">
            <span className="dash" />
            <span className="eyebrow">GFC</span>
          </div>
          <h1>{side.title}</h1>
        </div>

        <article
          style={{
            paddingBottom: 96,
            color: 'var(--ink-2)',
            fontSize: 16,
            lineHeight: 1.7,
            letterSpacing: '-0.005em',
          }}
          className="markdown-body
            [&_h2]:font-[var(--font-display)] [&_h2]:text-[var(--ink)] [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:mt-10 [&_h2]:mb-4
            [&_h3]:text-[var(--ink)] [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3
            [&_p]:mb-4
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-1
            [&_strong]:text-[var(--ink)] [&_strong]:font-semibold
            [&_code]:bg-[var(--bg-2)] [&_code]:border [&_code]:border-[var(--line)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
            [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--line)] [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-[var(--muted)] [&_blockquote]:my-4
            [&_hr]:border-[var(--line)] [&_hr]:my-8
            [&_table]:w-full [&_table]:my-4 [&_table]:border-collapse
            [&_th]:text-left [&_th]:text-[var(--ink)] [&_th]:font-semibold [&_th]:border-b [&_th]:border-[var(--line)] [&_th]:px-3 [&_th]:py-2
            [&_td]:border-b [&_td]:border-[var(--line-2)] [&_td]:px-3 [&_td]:py-2
          "
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{body}</ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
