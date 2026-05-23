import Link from 'next/link'
import {
  listAfsluttedeSæsoner,
  hentSæsonOversigt,
  hentAllTimeOversigt,
  hentBedsteSæsonRekorder,
  hentSæsonVinder,
  hentSingleWeekRekord,
  hentManagedSlutstilling,
  type AllTimeEntry,
  type SæsonRekord,
  type SæsonVinder,
  type UgeRekord,
} from '@/lib/historie'
import ManagedColumn from '@/components/ManagedColumn'
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
    <div className="gfc-app">
      <div className="container">
        <div className="page-head">
          <div className="kicker-strip">
            <span className="dash" />
            <span className="eyebrow">Resultater</span>
          </div>
          <h1>Historie</h1>
          <p className="sub">Tidligere sæsoner og all-time rekorder fra Guldbjergs Fantasy Challenge.</p>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <Link
            href={valgtSæson ? `/historie?visning=sæson&saeson=${valgtSæson}` : '/historie'}
            className={`tab${visning === 'sæson' ? ' active' : ''}`}
          >
            Sæson
          </Link>
          <Link
            href="/historie?visning=alltime"
            className={`tab${visning === 'alltime' ? ' active' : ''}`}
          >
            All-time
          </Link>
        </div>

        <div style={{ marginTop: 48 }}>
          {visning === 'sæson' ? (
            sæsoner.length === 0 ? (
              <IngenData />
            ) : (
              <SæsonView sæsoner={sæsoner} valgtSæson={valgtSæson} />
            )
          ) : (
            <AllTimeView />
          )}
        </div>
      </div>
    </div>
  )
}

function IngenData() {
  return (
    <div style={{
      padding: '64px 32px',
      textAlign: 'center',
      background: 'var(--panel)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r)',
    }}>
      <p className="eyebrow">Ingen afsluttede sæsoner endnu. Tjek tilbage efter sæsonen.</p>
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
  const [oversigt, bbVinder, mVinder, cVinder, bbRekord, mRekord, cRekord, managedSlut] = await Promise.all([
    hentSæsonOversigt(valgtSæson),
    hentSæsonVinder(valgtSæson, 'bestball'),
    hentSæsonVinder(valgtSæson, 'managed'),
    hentSæsonVinder(valgtSæson, 'chopped'),
    hentSingleWeekRekord(valgtSæson, 'bestball'),
    hentSingleWeekRekord(valgtSæson, 'managed'),
    hentSingleWeekRekord(valgtSæson, 'chopped'),
    hentManagedSlutstilling(valgtSæson),
  ])

  return (
    <div>
      {/* Season picker */}
      <div className="season-pills">
        <span className="lbl">Sæson</span>
        {sæsoner.map(s => (
          <Link
            key={s}
            href={`/historie?visning=sæson&saeson=${s}`}
            className={`season-pill${s === valgtSæson ? ' active' : ''}`}
          >
            {s}
          </Link>
        ))}
      </div>

      {/* Winners */}
      {(bbVinder || mVinder || cVinder) && (
        <>
          <div className="lb-section-head">
            Sæsonvindere
            <span className="dash" />
          </div>
          <div className="winners">
            {bbVinder && <VinderKort type="Bestball" ix="01" vinder={bbVinder} />}
            {mVinder && <VinderKort type="Managed" ix="02" vinder={mVinder} />}
            {cVinder && <VinderKort type="Chopped" ix="03" vinder={cVinder} />}
          </div>
        </>
      )}

      {/* Week records */}
      {(bbRekord || mRekord || cRekord) && (
        <>
          <div className="lb-section-head" style={{ marginTop: 40 }}>
            Sæsonens højeste enkeltscore
            <span className="dash" />
          </div>
          <div className="records">
            {bbRekord && <RekordKort type="Bestball" ix="01" rekord={bbRekord} />}
            {mRekord && <RekordKort type="Managed" ix="02" rekord={mRekord} />}
            {cRekord && <RekordKort type="Chopped" ix="03" rekord={cRekord} />}
          </div>
        </>
      )}

      {/* Full standings */}
      <div className="lb-section-head" style={{ marginTop: 56 }}>
        Slutstillinger
        <span className="dash" />
      </div>
      <div className={`lb-grid${oversigt.chopped.entries.length === 0 ? ' two-col' : ''}`}>
        <SæsonKolonne titel="Bestball" ix="01" entries={oversigt.bestball.entries} />
        {managedSlut && managedSlut.some(e => e.tier !== 'rest') ? (
          <ManagedColumn titel="Managed" ix="02" entries={managedSlut} />
        ) : (
          <SæsonKolonne titel="Managed" ix="02" entries={oversigt.managed.entries} visWins />
        )}
        {oversigt.chopped.entries.length > 0 && (
          <SæsonKolonne titel="Chopped" ix="03" entries={oversigt.chopped.entries} />
        )}
      </div>
    </div>
  )
}

function VinderKort({ type, ix, vinder }: { type: string; ix: string; vinder: SæsonVinder }) {
  return (
    <div className="winner">
      <div className="winner-eyebrow">
        <span className="eyebrow">{ix}</span>
        <span className="eyebrow">{type} — Sæsonvinder</span>
      </div>
      <div className="name">{vinder.displayName}</div>
      <div className="pts"><em>{vinder.points.toFixed(1)}</em> point</div>
      {vinder.beskrivelse && <div className="blurb">{vinder.beskrivelse}</div>}
    </div>
  )
}

function RekordKort({ type, ix, rekord }: { type: string; ix: string; rekord: UgeRekord }) {
  return (
    <div className="record">
      <div className="winner-eyebrow">
        <span className="eyebrow">{ix}</span>
        <span className="eyebrow">{type}</span>
      </div>
      <div className="name">{rekord.displayName}</div>
      <div className="rec-meta">
        <span className="rec-pts">{rekord.points.toFixed(1)} point</span>
        {' · '}Uge {rekord.week} · {rekord.leagueName}
      </div>
    </div>
  )
}

function SæsonKolonne({
  titel,
  ix,
  entries,
  visWins,
}: {
  titel: string
  ix: string
  entries: LeaderboardEntry[]
  visWins?: boolean
}) {
  return (
    <div className="lb-col">
      <div className="lb-col-head">
        <span className="lb-col-name">
          <span className="lb-ix">{ix}</span>
          {titel}
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="eyebrow" style={{ padding: '16px 0' }}>Ingen data</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th className="c">#</th>
              <th>Hold</th>
              {visWins && <th className="c">W</th>}
              <th className="r">Point</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, 25).map(entry => {
              const rank = entry.rank
              const rc = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''
              return (
                <tr key={`${entry.leagueType}-${entry.username}`}>
                  <td className={`rank ${rc}`}>
                    {rc && <span className="rmark" aria-hidden />}
                    {rc ? '' : rank}
                  </td>
                  <td className="name">
                    <Link href={`/profil/${entry.username}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {entry.displayName}
                    </Link>
                  </td>
                  {visWins && <td className="c">{entry.wins ?? 0}</td>}
                  <td className="pts">{entry.totalPoints.toFixed(1)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ---------- All-time view ----------------------------------------------------

async function AllTimeView() {
  const sæsoner = listAfsluttedeSæsoner()
  if (sæsoner.length === 0) return <IngenData />

  const [bestball, managed, chopped, rekorder] = await Promise.all([
    hentAllTimeOversigt('bestball'),
    hentAllTimeOversigt('managed'),
    hentAllTimeOversigt('chopped'),
    hentBedsteSæsonRekorder(10),
  ])

  const harChopped = chopped.entries.length > 0
  const bedsteSæsoner = rekorder.sort((a, b) => b.points - a.points).slice(0, 10)
  const flesteSæsoner = mergeForAppearances([bestball.entries, managed.entries, chopped.entries]).slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
      {/* All-time standings */}
      <section>
        <div className="lb-section-head">
          All-time leaderboards
          <span className="dash" />
        </div>
        <p className="eyebrow" style={{ marginBottom: 24 }}>
          Aggregeret på tværs af {sæsoner.length} afsluttede sæsoner: {sæsoner.join(', ')}
        </p>
        <div className={`lb-grid${!harChopped ? ' two-col' : ''}`}>
          <AllTimeKolonne titel="Bestball" ix="01" entries={bestball.entries} />
          <AllTimeKolonne titel="Managed" ix="02" entries={managed.entries} visWins />
          {harChopped && <AllTimeKolonne titel="Chopped" ix="03" entries={chopped.entries} />}
        </div>
      </section>

      {/* Best single seasons */}
      <section>
        <div className="lb-section-head">
          Bedste enkelt-sæsoner
          <span className="dash" />
        </div>
        <div className="lb-col" style={{ maxWidth: 560 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th className="c">#</th>
                <th>Hold</th>
                <th>Sæson</th>
                <th>Række</th>
                <th className="r">Point</th>
              </tr>
            </thead>
            <tbody>
              {bedsteSæsoner.map((r, i) => (
                <tr key={`${r.username}-${r.season}-${r.type}`}>
                  <td className="rank c">{i + 1}</td>
                  <td className="name">
                    <Link href={`/profil/${r.username}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {r.displayName}
                    </Link>
                  </td>
                  <td>{r.season}</td>
                  <td>{TYPE_LABEL[r.type]}</td>
                  <td className="pts">{r.points.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Most appearances */}
      <section>
        <div className="lb-section-head">
          Mest aktive deltagere
          <span className="dash" />
        </div>
        <div className="lb-col" style={{ maxWidth: 400 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th className="c">#</th>
                <th>Hold</th>
                <th className="r">Deltagelser</th>
              </tr>
            </thead>
            <tbody>
              {flesteSæsoner.map((e, i) => (
                <tr key={e.username}>
                  <td className="rank c">{i + 1}</td>
                  <td className="name">
                    <Link href={`/profil/${e.username}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {e.displayName}
                    </Link>
                  </td>
                  <td className="r">{e.appearances}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

const TYPE_LABEL: Record<SæsonRekord['type'], string> = {
  bestball: 'Bestball',
  managed: 'Managed',
  chopped: 'Chopped',
}

function AllTimeKolonne({
  titel,
  ix,
  entries,
  visWins,
}: {
  titel: string
  ix: string
  entries: AllTimeEntry[]
  visWins?: boolean
}) {
  return (
    <div className="lb-col">
      <div className="lb-col-head">
        <span className="lb-col-name">
          <span className="lb-ix">{ix}</span>
          {titel}
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="eyebrow" style={{ padding: '16px 0' }}>Ingen data</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th className="c">#</th>
              <th>Hold</th>
              <th className="c">Sæsoner</th>
              {visWins && <th className="c">W</th>}
              <th className="r">Snit</th>
              <th className="r">Total</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, 25).map((entry, i) => (
              <tr key={entry.username}>
                <td className="rank c">{i + 1}</td>
                <td className="name">
                  <Link href={`/profil/${entry.username}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {entry.displayName}
                  </Link>
                </td>
                <td className="c">{entry.seasonsPlayed}</td>
                {visWins && <td className="c">{entry.totalWins}</td>}
                <td className="r">{entry.gennemsnitPerSæson.toFixed(1)}</td>
                <td className="pts">{entry.totalPoints.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

type AppearanceEntry = { username: string; displayName: string; appearances: number }

function mergeForAppearances(allLists: AllTimeEntry[][]): AppearanceEntry[] {
  const map = new Map<string, AppearanceEntry>()
  for (const list of allLists) {
    for (const e of list) {
      const eks = map.get(e.username) ?? { username: e.username, displayName: e.displayName, appearances: 0 }
      eks.appearances += e.seasonsPlayed
      map.set(e.username, eks)
    }
  }
  return Array.from(map.values()).sort((a, b) => b.appearances - a.appearances)
}
