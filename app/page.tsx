import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 flex flex-col items-center justify-center gap-8">
      <div className="max-w-3xl text-center">
        <p className="text-sm uppercase tracking-[0.28em] text-gray-400">GFC Leaderboard</p>
        <h1 className="mt-4 text-5xl font-bold">Velkommen</h1>
        <p className="mt-4 text-gray-300 leading-8">
          Se historiske all-time resultater og sammenlign de bedste hold på tværs af sæsoner.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <Link
          href="/historie"
          className="rounded-full bg-indigo-600 px-8 py-4 text-base font-semibold text-white transition hover:bg-indigo-500"
        >
          Gå til Historie
        </Link>
        <Link
          href="/draft-statistik"
          className="rounded-full border border-gray-600 px-8 py-4 text-base font-semibold text-white transition hover:border-white hover:bg-gray-800"
        >
          Draft-statistik
        </Link>
      </div>
    </main>
  )
}
