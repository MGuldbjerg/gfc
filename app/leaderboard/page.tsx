import { computeLeaderboard } from '@/lib/leaderboard'
import { CURRENT_SEASON } from '@/lib/leagues'
import LeaderboardTable from './LeaderboardTable'

export const revalidate = 3600 // genindlæs max én gang i timen

export default async function LeaderboardPage() {
  const [bestball, managed, chopped] = await Promise.all([
    computeLeaderboard('bestball', CURRENT_SEASON),
    computeLeaderboard('managed', CURRENT_SEASON),
    computeLeaderboard('chopped', CURRENT_SEASON),
  ])

  const harChopped = chopped.entries.length > 0

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-1">🏈 GFC Leaderboard</h1>
          <p className="text-gray-400">Guldbjergs Fantasy Challenge {CURRENT_SEASON}</p>
        </div>

        {/* Sæsonens højeste score — præmie */}
        <SeasonHighscoreCard bestball={bestball} managed={managed} />

        {/* Tabs */}
        <div className={`grid grid-cols-1 gap-6 mt-6 ${harChopped ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>

          {/* Bestball */}
          <section>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              🎯 <span>Bestball</span>
              <span className="text-sm font-normal text-gray-500">Top 25 total point</span>
            </h2>
            <LeaderboardTable entries={bestball.entries.slice(0, 25)} type="bestball" />

            <h3 className="text-lg font-semibold mt-6 mb-3 flex items-center gap-2">
              ⚡ <span>Ugentlige topscorer</span>
            </h3>
            <WeeklyTable scores={bestball.weeklyHighscores} />
          </section>

          {/* Managed */}
          <section>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              ⚙️ <span>Managed</span>
              <span className="text-sm font-normal text-gray-500">Top 25 wins &amp; point</span>
            </h2>
            <LeaderboardTable entries={managed.entries.slice(0, 25)} type="managed" />

            <h3 className="text-lg font-semibold mt-6 mb-3 flex items-center gap-2">
              ⚡ <span>Ugentlige topscorer</span>
            </h3>
            <WeeklyTable scores={managed.weeklyHighscores} />
          </section>

          {/* Chopped — vises kun når der er data */}
          {harChopped && (
            <section>
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                🔪 <span>Chopped</span>
                <span className="text-sm font-normal text-gray-500">Guillotine — én ryger ud om ugen</span>
              </h2>
              <LeaderboardTable entries={chopped.entries.slice(0, 25)} type="chopped" />

              <h3 className="text-lg font-semibold mt-6 mb-3 flex items-center gap-2">
                ⚡ <span>Ugentlige topscorer</span>
              </h3>
              <WeeklyTable scores={chopped.weeklyHighscores} />
            </section>
          )}

        </div>

        <p className="text-center text-gray-700 text-xs mt-10">
          Data fra Sleeper API · Opdateres automatisk
        </p>
      </div>
    </main>
  )
}

function SeasonHighscoreCard({
  bestball,
  managed,
}: {
  bestball: Awaited<ReturnType<typeof computeLeaderboard>>
  managed: Awaited<ReturnType<typeof computeLeaderboard>>
}) {
  const bbHigh = bestball.seasonHighscore
  const mHigh = managed.seasonHighscore

  if (!bbHigh && !mHigh) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {bbHigh && (
        <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-700/40 rounded-xl p-4">
          <div className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-1">
            🏆 Sæsonens højeste score — Bestball
          </div>
          <div className="text-2xl font-bold">{bbHigh.points.toFixed(1)}</div>
          <div className="text-white font-medium">{bbHigh.displayName}</div>
          <div className="text-gray-400 text-sm">{bbHigh.league} · Uge {bbHigh.week}</div>
        </div>
      )}
      {mHigh && (
        <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-700/40 rounded-xl p-4">
          <div className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-1">
            🏆 Sæsonens højeste score — Managed
          </div>
          <div className="text-2xl font-bold">{mHigh.points.toFixed(1)}</div>
          <div className="text-white font-medium">{mHigh.displayName}</div>
          <div className="text-gray-400 text-sm">{mHigh.league} · Uge {mHigh.week}</div>
        </div>
      )}
    </div>
  )
}

function WeeklyTable({
  scores,
}: {
  scores: Awaited<ReturnType<typeof computeLeaderboard>>['weeklyHighscores']
}) {
  if (scores.length === 0) {
    return <p className="text-gray-600 text-sm">Ingen data endnu</p>
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-800">
            <th className="text-left px-4 py-2">Hold</th>
            <th className="text-left px-4 py-2">Liga</th>
            <th className="text-center px-4 py-2">Uge</th>
            <th className="text-right px-4 py-2">Point</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s, i) => (
            <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="px-4 py-2 font-medium">{s.displayName}</td>
              <td className="px-4 py-2 text-gray-400">{s.league}</td>
              <td className="px-4 py-2 text-center text-gray-400">{s.week}</td>
              <td className="px-4 py-2 text-right font-mono text-green-400">{s.points.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
