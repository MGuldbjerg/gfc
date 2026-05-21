import Link from 'next/link'
import { query } from '@/lib/turso'
import { CURRENT_SEASON } from '@/lib/leagues'
import AdminTilmeldinger from './AdminTilmeldinger'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  season: string
  preferred_types: string | null
  assigned_league_name: string | null
  status: string
  created_at: string
  profile_id: string
  display_name: string
  username: string
}

function parsePreferredTypes(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default async function AdminPage() {
  const rows = await query<Row>(
    `SELECT r.id, r.season, r.preferred_types, r.assigned_league_name, r.status, r.created_at,
            p.id AS profile_id, p.display_name, p.username
       FROM registrations r
       JOIN profiles p ON p.id = r.profile_id
      WHERE r.season = ?
      ORDER BY r.created_at DESC`,
    [CURRENT_SEASON]
  )

  const tilmeldinger = rows.map(r => ({
    id: r.id,
    season: r.season,
    preferred_types: parsePreferredTypes(r.preferred_types),
    assigned_league_name: r.assigned_league_name,
    status: r.status,
    created_at: r.created_at,
    profiles: { id: r.profile_id, display_name: r.display_name, username: r.username },
  }))

  const stats = {
    total:    tilmeldinger.length,
    tildelt:  tilmeldinger.filter(t => t.status === 'assigned').length,
    bestball: tilmeldinger.filter(t => t.preferred_types.includes('bestball')).length,
    managed:  tilmeldinger.filter(t => t.preferred_types.includes('managed')).length,
    chopped:  tilmeldinger.filter(t => t.preferred_types.includes('chopped')).length,
  }

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 32 }}>
        <div className="kicker-strip">
          <span className="dash" />
          <span className="eyebrow">Admin</span>
        </div>
        <h1>GFC {CURRENT_SEASON}</h1>
        <p className="sub">Tilmeldingsoversigt og ligafordeling</p>
      </div>

      <div className="stat-blocks" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 32 }}>
        {[
          { label: 'Tilmeldte',  value: stats.total },
          { label: 'Tildelt liga', value: stats.tildelt },
          { label: 'Bestball',   value: stats.bestball },
          { label: 'Managed',    value: stats.managed },
          { label: 'Chopped',    value: stats.chopped },
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
  )
}
