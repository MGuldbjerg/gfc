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
    <main className="min-h-screen bg-gray-950 text-white">
      <article className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8">{side.title}</h1>
        <div className="
          text-gray-300 leading-relaxed
          [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-4
          [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-8 [&_h3]:mb-3
          [&_p]:mb-4
          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1
          [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-1
          [&_li]:text-gray-300
          [&_a]:text-indigo-400 [&_a]:underline hover:[&_a]:text-indigo-300
          [&_strong]:text-white [&_strong]:font-semibold
          [&_em]:italic
          [&_code]:bg-gray-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
          [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-400 [&_blockquote]:my-4
          [&_hr]:border-gray-800 [&_hr]:my-8
          [&_table]:w-full [&_table]:my-4 [&_table]:border-collapse
          [&_th]:text-left [&_th]:font-semibold [&_th]:text-white [&_th]:border-b [&_th]:border-gray-700 [&_th]:px-3 [&_th]:py-2
          [&_td]:border-b [&_td]:border-gray-800 [&_td]:px-3 [&_td]:py-2
        ">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{side.body}</ReactMarkdown>
        </div>
      </article>
    </main>
  )
}
