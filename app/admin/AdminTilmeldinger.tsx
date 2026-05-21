'use client'

import { useState } from 'react'

type Profil = { display_name: string; username: string; id: string }

interface Tilmelding {
  id: string
  season: string
  preferred_types: string[]
  assigned_league_name: string | null
  status: string
  created_at: string
  nyhedsbrev: boolean
  profiles: Profil | Profil[] | null
}

function getProfil(profiles: Tilmelding['profiles']): Profil | null {
  if (!profiles) return null
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles
}

const FILTERKNAPPER = ['alle', 'bestball', 'managed', 'chopped']

export default function AdminTilmeldinger({ tilmeldinger }: { tilmeldinger: Tilmelding[] }) {
  const [filter, setFilter] = useState<string>('alle')
  const [søgning, setSøgning] = useState('')

  const filtrerede = tilmeldinger.filter(t => {
    const matchFilter = filter === 'alle' || t.preferred_types?.includes(filter)
    const profil = getProfil(t.profiles)
    const matchSøgning = søgning === '' ||
      profil?.display_name.toLowerCase().includes(søgning.toLowerCase()) ||
      profil?.username.toLowerCase().includes(søgning.toLowerCase())
    return matchFilter && matchSøgning
  })

  return (
    <div>
      <div className="lb-section-head">
        Tilmeldinger
        <span className="dash" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Søg navn eller Sleeper-brugernavn..."
          value={søgning}
          onChange={e => setSøgning(e.target.value)}
          className="gfc-input"
          style={{ flex: 1, minWidth: 220 }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERKNAPPER.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={f !== 'alle' ? `type-badge ${f}` : 'type-badge'}
              style={{
                cursor: 'pointer',
                fontSize: 11,
                padding: '6px 14px',
                background: filter === f ? 'var(--ink)' : undefined,
                color: filter === f ? 'var(--bg)' : undefined,
                borderColor: filter === f ? 'var(--ink)' : undefined,
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="lb-col" style={{ padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Deltager</th>
              <th>Sleeper</th>
              <th>Rækker</th>
              <th>Liga</th>
              <th>Status</th>
              <th className="c">Mail</th>
              <th>Tilmeldt</th>
            </tr>
          </thead>
          <tbody>
            {filtrerede.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  Ingen tilmeldinger
                </td>
              </tr>
            ) : filtrerede.map(t => {
              const profil = getProfil(t.profiles)
              return (
                <tr key={t.id}>
                  <td className="name">{profil?.display_name ?? '—'}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{profil?.username ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {t.preferred_types?.map(type => (
                        <span key={type} className={`type-badge ${type}`}>{type}</span>
                      ))}
                    </div>
                  </td>
                  <td>{t.assigned_league_name ?? '—'}</td>
                  <td>
                    <span
                      className="type-badge"
                      style={t.status === 'assigned' || t.status === 'active'
                        ? { color: 'var(--pos)', borderColor: 'color-mix(in oklch, var(--pos) 30%, transparent)', background: 'color-mix(in oklch, var(--pos) 10%, var(--bg))' }
                        : undefined}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="c" style={{ fontSize: 16 }} title={t.nyhedsbrev ? 'Tilmeldt nyhedsbrev' : 'Frameldt nyhedsbrev'}>
                    {t.nyhedsbrev ? '✓' : '–'}
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {new Date(t.created_at).toLocaleDateString('da-DK')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="eyebrow" style={{ marginTop: 12 }}>
        {filtrerede.length} af {tilmeldinger.length} tilmeldinger
      </p>
    </div>
  )
}
