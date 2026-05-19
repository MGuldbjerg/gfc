import Link from 'next/link'
import { calculateDraftStatistics, type ADPStats } from '@/lib/draft-stats'
import { listSæsoner } from '@/lib/historie'

// Draft picks never change once a draft completes — cache aggressively. If
// you need to force a refresh (e.g. during a live draft), push any commit or
// trigger a Vercel redeploy.
export const revalidate = 2592000 // 30 days

export default async function DraftStatistikPage({
  searchParams,
}: {
  searchParams: Promise<{ saeson?: string }>
}) {
  const sæsoner = listSæsoner()
  const { saeson } = await searchParams
  const valgtSæson = sæsoner.includes(saeson ?? '') ? saeson! : sæsoner[0]

  const stats = valgtSæson ? await calculateDraftStatistics(valgtSæson) : null

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📊 Draftstatistik</h1>
          <p className="text-gray-400">
            ADP, udsving og drafttendenser på tværs af GFC-ligaer.
          </p>
        </div>

        {sæsoner.length === 0 ? (
          <p className="text-gray-500">Ingen draftdata endnu.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <span className="text-sm text-gray-500 mr-2">Sæson:</span>
              {sæsoner.map(s => (
                <Link
                  key={s}
                  href={`/draft-statistik?saeson=${s}`}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                    ${s === valgtSæson
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                >
                  {s}
                </Link>
              ))}
            </div>

            {!stats || stats.topADP.length === 0 ? (
              <p className="text-gray-500">
                Ingen draftdata for {valgtSæson}. Drafts er muligvis ikke afsluttet endnu.
              </p>
            ) : (
              <div className="flex flex-col gap-10">
                <Sektion
                  titel="📈 Højeste ADP — mest valgt"
                  beskrivelse="Spillere med lavest gennemsnitlig draft-position på tværs af ligaer."
                  stats={stats.topADP}
                  visBåde="adp+picks"
                />

                <Sektion
                  titel="⚡ Største udsving"
                  beskrivelse="Spillere med størst forskel mellem tidligste og seneste pick."
                  stats={stats.adpSwings}
                  visBåde="udsving"
                />

                <Sektion
                  titel="✅ Mest konsistente picks"
                  beskrivelse="Spillere draftet i ~samme runde på tværs af alle ligaer (minimum 3 drafts)."
                  stats={stats.mostConsistent}
                  visBåde="udsving"
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Sektion
                    titel="⚙️ Managed — top ADP"
                    beskrivelse="Tidligste draftede spillere i managed-ligaer."
                    stats={stats.perFormat.managed}
                    visBåde="adp+picks"
                  />
                  <Sektion
                    titel="🎯 Bestball — top ADP"
                    beskrivelse="Tidligste draftede spillere i bestball-ligaer."
                    stats={stats.perFormat.bestball}
                    visBåde="adp+picks"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

type Visning = 'adp+picks' | 'udsving'

function Sektion({
  titel,
  beskrivelse,
  stats,
  visBåde,
}: {
  titel: string
  beskrivelse: string
  stats: ADPStats[]
  visBåde: Visning
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold mb-1">{titel}</h2>
      <p className="text-gray-500 text-sm mb-3">{beskrivelse}</p>
      {stats.length === 0 ? (
        <p className="text-gray-600 text-sm">Ingen data</p>
      ) : (
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-center px-3 py-2 w-10">#</th>
                <th className="text-left px-3 py-2">Spiller</th>
                <th className="text-right px-3 py-2">ADP</th>
                {visBåde === 'adp+picks' && <th className="text-right px-3 py-2">Drafts</th>}
                {visBåde === 'udsving' && (
                  <>
                    <th className="text-right px-3 py-2">Min</th>
                    <th className="text-right px-3 py-2">Max</th>
                    <th className="text-right px-3 py-2">Udsving</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={s.playerId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-3 py-2 text-center text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{s.playerName}</td>
                  <td className="px-3 py-2 text-right font-mono text-indigo-400">{s.adp.toFixed(1)}</td>
                  {visBåde === 'adp+picks' && (
                    <td className="px-3 py-2 text-right font-mono text-gray-400">{s.picks}</td>
                  )}
                  {visBåde === 'udsving' && (
                    <>
                      <td className="px-3 py-2 text-right font-mono text-green-400">{s.minPick}</td>
                      <td className="px-3 py-2 text-right font-mono text-red-400">{s.maxPick}</td>
                      <td className="px-3 py-2 text-right font-mono text-orange-400">{s.variance}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
