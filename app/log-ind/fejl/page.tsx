import Link from 'next/link'

export default function LogIndFejlPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return <FejlIndhold searchParams={searchParams} />
}

async function FejlIndhold({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const besked = beskedFraFejl(error)

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-white mb-3">Login fejlede</h1>
        <p className="text-gray-400 leading-relaxed mb-6">{besked}</p>
        <Link
          href="/log-ind"
          className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Prøv igen
        </Link>
      </div>
    </main>
  )
}

function beskedFraFejl(error?: string): string {
  switch (error) {
    case 'Verification':
      return 'Linket er udløbet eller allerede brugt. Bed om et nyt.'
    case 'AccessDenied':
      return 'Du har ikke adgang til denne side.'
    default:
      return 'Noget gik galt. Prøv at bede om et nyt login-link.'
  }
}
