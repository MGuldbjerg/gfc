'use client'

import { useState } from 'react'
import Link from 'next/link'
import AdminTilmeldinger, { type Tilmelding } from './AdminTilmeldinger'
import { AdminAnnoncering } from './AdminAnnoncering'
import { AdminUgeresume } from './AdminUgeresume'
import { AdminSaeson } from './AdminSaeson'
import { AdminIndhold } from './AdminIndhold'

type Tab = 'tilmeldinger' | 'ugeresume' | 'email' | 'saeson' | 'indhold'

interface Stats {
  total: number
  tildelt: number
  bestball: number
  managed: number
  chopped: number
}

export function AdminTabs({
  tilmeldinger,
  stats,
  season,
}: {
  tilmeldinger: Tilmelding[]
  stats: Stats
  season: string
}) {
  const [aktiv, setAktiv] = useState<Tab>('tilmeldinger')

  return (
    <>
      <div className="season-pills" style={{ margin: '0 0 32px' }}>
        <button
          className={`season-pill${aktiv === 'tilmeldinger' ? ' active' : ''}`}
          onClick={() => setAktiv('tilmeldinger')}
        >
          Tilmeldinger
        </button>
        <button
          className={`season-pill${aktiv === 'ugeresume' ? ' active' : ''}`}
          onClick={() => setAktiv('ugeresume')}
        >
          Ugeresumé
        </button>
        <button
          className={`season-pill${aktiv === 'email' ? ' active' : ''}`}
          onClick={() => setAktiv('email')}
        >
          E-mail
        </button>
        <button
          className={`season-pill${aktiv === 'saeson' ? ' active' : ''}`}
          onClick={() => setAktiv('saeson')}
        >
          Sæson
        </button>
        <button
          className={`season-pill${aktiv === 'indhold' ? ' active' : ''}`}
          onClick={() => setAktiv('indhold')}
        >
          Indhold
        </button>
      </div>

      {aktiv === 'tilmeldinger' && (
        <>
          <div className="stat-blocks" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 32 }}>
            {[
              { label: 'Tilmeldte',    value: stats.total },
              { label: 'Tildelt liga', value: stats.tildelt },
              { label: 'Bestball',     value: stats.bestball },
              { label: 'Managed',      value: stats.managed },
              { label: 'Chopped',      value: stats.chopped },
            ].map(({ label, value }) => (
              <div key={label} className="stat-block">
                <div className="stat-num" style={{ fontSize: 40 }}>{value}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
            <Link href="/admin/fordel" className="btn">
              Fordel deltagere i ligaer
              <span className="arrow" aria-hidden />
            </Link>
          </div>

          <AdminTilmeldinger tilmeldinger={tilmeldinger} />
          <div style={{ paddingBottom: 80 }} />
        </>
      )}

      {aktiv === 'ugeresume' && (
        <>
          <AdminUgeresume />
          <div style={{ paddingBottom: 80 }} />
        </>
      )}

      {aktiv === 'email' && (
        <>
          <AdminAnnoncering />
          <div style={{ paddingBottom: 80 }} />
        </>
      )}

      {aktiv === 'saeson' && (
        <>
          <AdminSaeson season={season} />
          <div style={{ paddingBottom: 80 }} />
        </>
      )}

      {aktiv === 'indhold' && (
        <>
          <AdminIndhold />
          <div style={{ paddingBottom: 80 }} />
        </>
      )}
    </>
  )
}
