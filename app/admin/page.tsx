import { query } from '@/lib/turso'
import { CURRENT_SEASON } from '@/lib/leagues'
import { AdminTabs } from './AdminTabs'

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
  nyhedsbrev: number
  er_amerikansk_vip: number
  er_dansk_vip: number
  undgaa_amerikansk_vip: number
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
            r.undgaa_amerikansk_vip,
            p.id AS profile_id, p.display_name, p.username, p.nyhedsbrev, p.er_amerikansk_vip, p.er_dansk_vip
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
    nyhedsbrev: Boolean(r.nyhedsbrev),
    erAmerikanskVip: Boolean(r.er_amerikansk_vip),
    erDanskVip: Boolean(r.er_dansk_vip),
    undgaaAmerikanskVip: Boolean(r.undgaa_amerikansk_vip),
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

      <AdminTabs tilmeldinger={tilmeldinger} stats={stats} />
    </>
  )
}
