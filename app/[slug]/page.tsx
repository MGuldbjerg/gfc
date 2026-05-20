import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { listSlugs, loadSide } from '@/lib/sider'

export const dynamicParams = false

export async function generateStaticParams() {
  return listSlugs().map(slug => ({ slug }))
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
          className="
            [&_h2]:font-[var(--font-display)] [&_h2]:text-[var(--ink)] [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:mt-10 [&_h2]:mb-4
            [&_h3]:text-[var(--ink)] [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3
            [&_p]:mb-4
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-1
            [&_a]:text-[var(--accent)] [&_a]:underline [&_a]:underline-offset-2
            [&_strong]:text-[var(--ink)] [&_strong]:font-semibold
            [&_code]:bg-[var(--bg-2)] [&_code]:border [&_code]:border-[var(--line)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
            [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--line)] [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-[var(--muted)] [&_blockquote]:my-4
            [&_hr]:border-[var(--line)] [&_hr]:my-8
            [&_table]:w-full [&_table]:my-4 [&_table]:border-collapse
            [&_th]:text-left [&_th]:text-[var(--ink)] [&_th]:font-semibold [&_th]:border-b [&_th]:border-[var(--line)] [&_th]:px-3 [&_th]:py-2
            [&_td]:border-b [&_td]:border-[var(--line-2)] [&_td]:px-3 [&_td]:py-2
          "
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{side.body}</ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
