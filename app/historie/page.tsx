import Link from 'next/link'
import {
  listAfsluttedeSæsoner,
  hentSæsonOversigt,
  hentAllTimeOversigt,
  hentBedsteSæsonRekorder,
  hentSæsonVinder,
  hentSingleWeekRekord,
  type AllTimeEntry,
  type SæsonRekord,
  type SæsonVinder,
  type UgeRekord,
} from '@/lib/historie'
import type { LeaderboardEntry } from '@/types/sleeper'

export const revalidate = 3600

type Visning = 'sæson' | 'alltime'

export default async function HistoriePage({
  searchParams,
}: {
  searchParams: Promise<{ visning?: string; saeson?: string }>
}) {
  const { visning: rawVisning, saeson: rawSaeson } = await searchParams
  const visning: Visning = rawVisning === 'alltime' ? 'alltime' : 'sæson'

  const sæsoner = listAfsluttedeSæsoner()
  const valgtSæson = sæsoner.includes(rawSaeson ?? '') ? rawSaeson! : sæsoner[0]

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📚 Historie</h1>
          <p className="text-gray-400">
            Tidligere sæsoner og all-time rekorder fra Guldbjergs Fantasy Challenge.
          </p>
        </div>

        <VisningTabs aktiv={visning} sæson={valgtSæson} />

        {visning === 'sæson' ? (
          sæsoner.length === 0 ? (
            <IngenDataKort />
          ) : (
            <SæsonView sæsoner={sæsoner} valgtSæson={valgtSæson} />
          )
        ) : (
          <AllTimeView />
        )}
      </div>
    </main>
  )
}

function VisningTabs({ aktiv, sæson }: { aktiv: Visning; sæson: string | undefined }) {
  return (
    <div className="flex items-center gap-2 mb-8 border-b border-gray-800">
      <Tab
        href={sæson ? `/historie?visning=sæson&saeson=${sæson}` : '/historie'}
        aktiv={aktiv === 'sæson'}
      >
        Sæson
      </Tab>
      <Tab href="/historie?visning=alltime" aktiv={aktiv === 'alltime'}>
        All-time
      </Tab>
    </div>
  )
}

function Tab({
  href,
  aktiv,
  children,
}: {
  href: string
  aktiv: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-3 text-sm font-medium transition-colors -mb-px border-b-2
        ${aktiv
          ? 'text-white border-indigo-500'
          : 'text-gray-500 hover:text-gray-300 border-transparent'}`}
    >
      {children}
    </Link>
  )
}

function IngenDataKort() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
      <p className="text-3xl mb-3">📭</p>
      <p className="text-gray-400">Ingen afsluttede sæsoner endnu. Tjek tilbage efter sæsonen.</p>
    </div>
  )
}

// ---------- Sæson view -------------------------------------------------------

async function SæsonView({
  sæsoner,
  valgtSæson,
}: {
  sæsoner: string[]
  valgtSæson: string
}) {
  const [oversigt, bbVinder, mVinder, cVinder, bbRekord, mRekord, cRekord] = await Promise.all([
    hentSæsonOversigt(valgtSæson),
    hentSæsonVinder(valgtSæson, 'bestball'),
    hentSæsonVinder(valgtSæson, 'managed'),
    hentSæsonVinder(valgtSæson, 'chopped'),
    hentSingleWeekRekord(valgtSæson, 'bestball'),
    hentSingleWeekRekord(valgtSæson, 'managed'),
    hentSingleWeekRekord(valgtSæson, 'chopped'),
  ])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-sm text-gray-500 mr-2">Sæson:</span>
        {sæsoner.map(s => (
          <Link
            key={s}
            href={`/historie?visning=sæson&saeson=${s}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${s === valgtSæson
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <SæsonsVindere
        bb={bbVinder}
        m={mVinder}
        c={cVinder}
      />

      <UgeRekorder bb={bbRekord} m={mRekord} c={cRekord} />

      <div className={`grid grid-cols-1 gap-6 mt-8 ${oversigt.chopped.entries.length > 0 ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
        <SæsonTabel titel="🎯 Bestball" entries={oversigt.bestball.entries} />
        <SæsonTabel titel="⚙️ Managed" entries={oversigt.managed.entries} visWins />
        {oversigt.chopped.entries.length > 0 && (
          <SæsonTabel titel="🔪 Chopped" entries={oversigt.chopped.entries} />
        )}
      </div>
    </div>
  )
}

function SæsonsVindere({
  bb,
  m,
  c,
}: {
  bb: SæsonVinder | null
  m: SæsonVinder | null
  c: SæsonVinder | null
}) {
  if (!bb && !m && !c) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {bb && <VinderKort emoji="🎯" type="Bestball" vinder={bb} />}
      {m && <VinderKort emoji="⚙️" type="Managed" vinder={m} />}
      {c && <VinderKort emoji="🔪" type="Chopped" vinder={c} />}
    </div>
  )
}

function VinderKort({
  emoji,
  type,
  vinder,
}: {
  emoji: string
  type: string
  vinder: SæsonVinder
}) {
  return (
    <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-700/40 rounded-xl p-5">
      <div className="text-yellow-400 text-xs font-semibold uppercase tracking-wider">
        {emoji} {type} — Sæsonvinder
      </div>
      <div className="text-2xl font-bold text-white mt-2">{vinder.displayName}</div>
      <div className="text-gray-400 text-sm mt-1">
        {vinder.points.toFixed(1)} point
      </div>
      <div className="text-gray-500 text-xs mt-2">{vinder.beskrivelse}</div>
    </div>
  )
}

function UgeRekorder({
  bb,
  m,
  c,
}: {
  bb: UgeRekord | null
  m: UgeRekord | null
  c: UgeRekord | null
}) {
  if (!bb && !m && !c) return null
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        ⚡ Højeste enkeltscore i grundspillet
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bb && <UgeRekordKort emoji="🎯" type="Bestball" rekord={bb} />}
        {m && <UgeRekordKort emoji="⚙️" type="Managed" rekord={m} />}
        {c && <UgeRekordKort emoji="🔪" type="Chopped" rekord={c} />}
      </div>
    </div>
  )
}

function UgeRekordKort({
  emoji,
  type,
  rekord,
}: {
  emoji: string
  type: string
  rekord: UgeRekord
}) {
  return (
    <div className="bg-gradient-to-br from-indigo-900/30 to-indigo-800/10 border border-indigo-700/30 rounded-xl p-5">
      <div className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">
        {emoji} {type}
      </div>
      <div className="text-xl font-bold text-white mt-2">{rekord.displayName}</div>
      <div className="text-gray-400 text-sm mt-1">
        {rekord.points.toFixed(1)} point · Uge {rekord.week} · {rekord.leagueName}
      </div>
    </div>
  )
}

function SæsonTabel({
  titel,
  entries,
  visWins,
}: {
  titel: string
  emoji?: string
  entries: LeaderboardEntry[]
  visWins?: boolean
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">{titel}</h2>
      {entries.length === 0 ? (
        <p className="text-gray-600 text-sm">Ingen data</p>
      ) : (
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-center px-3 py-2 w-10">#</th>
                <th className="text-left px-3 py-2">Hold</th>
                {visWins && <th className="text-center px-3 py-2">W</th>}
                <th className="text-right px-3 py-2">Point</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 25).map(entry => (
                <tr
                  key={`${entry.leagueType}-${entry.username}`}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="px-3 py-2 text-center text-gray-500">{entry.rank}</td>
                  <td className="px-3 py-2 font-medium">{entry.displayName}</td>
                  {visWins && (
                    <td className="px-3 py-2 text-center text-gray-400">{entry.wins ?? 0}</td>
                  )}
                  <td className="px-3 py-2 text-right font-mono text-green-400">
                    {entry.totalPoints.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ---------- All-time view ----------------------------------------------------

async function AllTimeView() {
  const sæsoner = listAfsluttedeSæsoner()
  if (sæsoner.length === 0) return <IngenDataKort />

  const [bestball, managed, chopped, rekorder] = await Promise.all([
    hentAllTimeOversigt('bestball'),
    hentAllTimeOversigt('managed'),
    hentAllTimeOversigt('chopped'),
    hentBedsteSæsonRekorder(10),
  ])

  const harChopped = chopped.entries.length > 0
  const bedsteSæsoner = rekorder
    .sort((a, b) => b.points - a.points)
    .slice(0, 10)

  const flesteSæsoner = mergeForAppearances([bestball.entries, managed.entries, chopped.entries])
    .slice(0, 10)

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="text-2xl font-semibold mb-4">All-time leaderboards</h2>
        <p className="text-gray-500 text-sm mb-6">
          Aggregeret på tværs af {sæsoner.length} afsluttede sæsoner: {sæsoner.join(', ')}.
        </p>

        <div className={`grid grid-cols-1 gap-6 ${harChopped ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
          <AllTimeTabel titel="🎯 Bestball" entries={bestball.entries} />
          <AllTimeTabel titel="⚙️ Managed" entries={managed.entries} visWins />
          {harChopped && <AllTimeTabel titel="🔪 Chopped" entries={chopped.entries} />}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">🏆 Bedste enkelt-sæsoner</h2>
        <p className="text-gray-500 text-sm mb-4">
          De højeste single-sæson totaler på tværs af alle rækker og år.
        </p>
        <BedsteSæsonerTabel entries={bedsteSæsoner} />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">🏅 Mest aktive deltagere</h2>
        <p className="text-gray-500 text-sm mb-4">
          Spillere med flest deltagelser på tværs af rækker.
        </p>
        <FlesteSæsonerTabel entries={flesteSæsoner} />
      </section>
    </div>
  )
}

function AllTimeTabel({
  titel,
  entries,
  visWins,
}: {
  titel: string
  entries: AllTimeEntry[]
  visWins?: boolean
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">{titel}</h3>
      {entries.length === 0 ? (
        <p className="text-gray-600 text-sm">Ingen data</p>
      ) : (
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-center px-3 py-2 w-10">#</th>
                <th className="text-left px-3 py-2">Hold</th>
                <th className="text-center px-3 py-2">Sæsoner</th>
                {visWins && <th className="text-center px-3 py-2">W</th>}
                <th className="text-right px-3 py-2">Snit</th>
                <th className="text-right px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 25).map((entry, i) => (
                <tr key={entry.username} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-3 py-2 text-center text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{entry.displayName}</td>
                  <td className="px-3 py-2 text-center text-gray-400">{entry.seasonsPlayed}</td>
                  {visWins && (
                    <td className="px-3 py-2 text-center text-gray-400">{entry.totalWins}</td>
                  )}
                  <td className="px-3 py-2 text-right font-mono text-gray-300">
                    {entry.gennemsnitPerSæson.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-green-400">
                    {entry.totalPoints.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function BedsteSæsonerTabel({ entries }: { entries: SæsonRekord[] }) {
  const typeLabel: Record<SæsonRekord['type'], string> = {
    bestball: 'Bestball',
    managed: 'Managed',
    chopped: 'Chopped',
  }
  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-800">
            <th className="text-center px-3 py-2 w-10">#</th>
            <th className="text-left px-3 py-2">Hold</th>
            <th className="text-left px-3 py-2">Sæson</th>
            <th className="text-left px-3 py-2">Række</th>
            <th className="text-right px-3 py-2">Point</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((r, i) => (
            <tr key={`${r.username}-${r.season}-${r.type}`} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="px-3 py-2 text-center text-gray-500">{i + 1}</td>
              <td className="px-3 py-2 font-medium">{r.displayName}</td>
              <td className="px-3 py-2 text-gray-400">{r.season}</td>
              <td className="px-3 py-2 text-gray-400">{typeLabel[r.type]}</td>
              <td className="px-3 py-2 text-right font-mono text-green-400">{r.points.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FlesteSæsonerTabel({ entries }: { entries: AppearanceEntry[] }) {
  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-800">
            <th className="text-center px-3 py-2 w-10">#</th>
            <th className="text-left px-3 py-2">Hold</th>
            <th className="text-right px-3 py-2">Deltagelser</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.username} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="px-3 py-2 text-center text-gray-500">{i + 1}</td>
              <td className="px-3 py-2 font-medium">{e.displayName}</td>
              <td className="px-3 py-2 text-right font-mono text-gray-300">{e.appearances}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type AppearanceEntry = { username: string; displayName: string; appearances: number }

function mergeForAppearances(allLists: AllTimeEntry[][]): AppearanceEntry[] {
  const map = new Map<string, AppearanceEntry>()
  for (const list of allLists) {
    for (const e of list) {
      const eks = map.get(e.username) ?? {
        username: e.username,
        displayName: e.displayName,
        appearances: 0,
      }
      eks.appearances += e.seasonsPlayed
      map.set(e.username, eks)
    }
  }
  return Array.from(map.values()).sort((a, b) => b.appearances - a.appearances)
}
