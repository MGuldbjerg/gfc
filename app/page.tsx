import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-2">🏈 GFC</h1>
        <p className="text-xl text-gray-400">Guldbjergs Fantasy Challenge</p>
        <p className="text-sm text-gray-600 mt-1">Danmarks største fantasy football-konkurrence</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/leaderboard"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-center py-3 px-6 rounded-lg font-medium transition-colors"
        >
          Leaderboard
        </Link>
        <Link
          href="/api/sleeper/test"
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-center py-3 px-6 rounded-lg font-medium transition-colors text-sm"
        >
          Test Sleeper API →
        </Link>
      </div>

      <p className="text-gray-700 text-xs">Under opbygning — sæson 2026</p>
    </main>
  )
}
