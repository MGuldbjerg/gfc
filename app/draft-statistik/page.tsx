import Link from 'next/link'
import { calculateDraftStatistics, type ADPStats } from '@/lib/draft-stats'
import { listSæsoner } from '@/lib/historie'
import { DraftRefreshButton } from '@/components/DraftRefreshButton'

// During draft season (June–August) drop to 5 min so the refresh button
// picks up new picks quickly. Outside that window the data is immutable.
export const revalidate = 300

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
    <div className="gfc-app">
      <div className="container">
        <div className="page-head">
          <div className="kicker-strip">
            <span className="dash" />
            <span className="eyebrow">Draft</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1>Draftstatistik</h1>
              <p className="sub">ADP, udsving og drafttendenser på tværs af GFC-ligaer.</p>
            </div>
            <DraftRefreshButton />
          </div>
        </div>

        {sæsoner.length === 0 ? (
          <p className="eyebrow" style={{ padding: '32px 0' }}>Ingen draftdata endnu.</p>
        ) : (
          <>
            <div className="season-pills">
              <span className="lbl">Sæson</span>
              {sæsoner.map(s => (
                <Link
                  key={s}
                  href={`/draft-statistik?saeson=${s}`}
                  className={`season-pill${s === valgtSæson ? ' active' : ''}`}
                >
                  {s}
                </Link>
              ))}
            </div>

            {!stats || stats.topADP.length === 0 ? (
              <p className="eyebrow" style={{ padding: '32px 0' }}>
                Ingen draftdata for {valgtSæson}. Drafts er muligvis ikke afsluttet endnu.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 48, paddingBottom: 80 }}>
                <DraftSektion
                  titel="Højeste ADP — mest valgt"
                  beskrivelse="Spillere med lavest gennemsnitlig draft-position på tværs af ligaer."
                  stats={stats.topADP}
                  visning="adp+picks"
                />
                <DraftSektion
                  titel="Største udsving"
                  beskrivelse="Spillere med størst forskel mellem tidligste og seneste pick."
                  stats={stats.adpSwings}
                  visning="udsving"
                />
                <DraftSektion
                  titel="Mest konsistente picks"
                  beskrivelse="Spillere draftet i ~samme runde på tværs af alle ligaer (minimum 3 drafts)."
                  stats={stats.mostConsistent}
                  visning="udsving"
                />

                <div className="draft-format-grid">
                  <DraftSektion
                    titel="Managed — top ADP"
                    beskrivelse="Tidligste draftede spillere i managed-ligaer."
                    stats={stats.perFormat.managed}
                    visning="adp+picks"
                  />
                  <DraftSektion
                    titel="Bestball — top ADP"
                    beskrivelse="Tidligste draftede spillere i bestball-ligaer."
                    stats={stats.perFormat.bestball}
                    visning="adp+picks"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

type Visning = 'adp+picks' | 'udsving'

function DraftSektion({
  titel,
  beskrivelse,
  stats,
  visning,
}: {
  titel: string
  beskrivelse: string
  stats: ADPStats[]
  visning: Visning
}) {
  return (
    <section>
      <div className="lb-section-head">
        {titel}
        <span className="dash" />
      </div>
      <p className="eyebrow" style={{ marginBottom: 16 }}>{beskrivelse}</p>
      {stats.length === 0 ? (
        <p className="eyebrow">Ingen data</p>
      ) : (
        <div className="lb-col">
          <table className="tbl">
            <thead>
              <tr>
                <th className="c">#</th>
                <th>Spiller</th>
                <th className="r">ADP</th>
                {visning === 'adp+picks' && <th className="r">Drafts</th>}
                {visning === 'udsving' && (
                  <>
                    <th className="r">Min</th>
                    <th className="r">Max</th>
                    <th className="r">Udsving</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={s.playerId}>
                  <td className="rank c">{i + 1}</td>
                  <td className="name">{s.playerName}</td>
                  <td className="r">{s.adp.toFixed(1)}</td>
                  {visning === 'adp+picks' && <td className="r">{s.picks}</td>}
                  {visning === 'udsving' && (
                    <>
                      <td className="r">{s.minPick}</td>
                      <td className="r">{s.maxPick}</td>
                      <td className="r">{s.variance}</td>
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
