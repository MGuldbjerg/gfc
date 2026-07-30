import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth, signOut } from '@/auth'
import { query, queryOne, execute } from '@/lib/turso'
import { CURRENT_SEASON } from '@/lib/leagues'

export const dynamic = 'force-dynamic'

type ProfilRow = {
  display_name: string
  username: string
  vis_sleeper_username: number
  vis_badges: number
  nyhedsbrev: number
}

type RegistrationRow = {
  id: string
  preferred_types: string | null
  status: string
}

type LeagueAssignmentRow = {
  liga_navn: string
  league_type: string
}

export default async function MinSide() {
  const session = await auth()
  if (!session?.user?.id) redirect('/log-ind')

  const profil = await queryOne<ProfilRow>(
    `SELECT display_name, username, vis_sleeper_username, vis_badges, nyhedsbrev
       FROM profiles WHERE id = ?`,
    [session.user.id]
  )
  if (!profil) redirect('/profil-setup')

  const reg = await queryOne<RegistrationRow>(
    `SELECT id, preferred_types, status
       FROM registrations
      WHERE profile_id = ? AND season = ?`,
    [session.user.id, CURRENT_SEASON]
  )

  const tildelteLigaer = reg
    ? await query<LeagueAssignmentRow>(
        `SELECT liga_navn, league_type
           FROM league_assignments
          WHERE registration_id = ?
          ORDER BY liga_navn`,
        [reg.id]
      )
    : []

  const tidligereReg = !reg
    ? await queryOne<{ season: string }>(
        `SELECT season FROM registrations
          WHERE profile_id = ? AND season <> ?
          ORDER BY season DESC LIMIT 1`,
        [session.user.id, CURRENT_SEASON]
      )
    : null

  const rækker = parseRækker(reg?.preferred_types)

  async function logUd() {
    'use server'
    await signOut({ redirectTo: '/' })
  }

  async function frameld() {
    'use server'
    const s = await auth()
    if (!s?.user?.id) return
    await execute(
      'DELETE FROM registrations WHERE profile_id = ? AND season = ?',
      [s.user.id, CURRENT_SEASON]
    )
    redirect('/min-side')
  }

  return (
    <div className="gfc-app">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="page-head" style={{ paddingBottom: 32 }}>
          <div className="kicker-strip">
            <span className="dash" />
            <span className="eyebrow">Din side</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>{profil.display_name}</h1>
              <p className="eyebrow" style={{ marginTop: 8 }}>@{profil.username}</p>
            </div>
            <form action={logUd} style={{ flexShrink: 0, paddingTop: 8 }}>
              <button
                type="submit"
                className="eyebrow"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                Log ud
              </button>
            </form>
          </div>
        </div>

        {!reg
          ? tidligereReg
            ? <BannerVelkommenTilbage navn={profil.display_name} sidsteSæson={tidligereReg.season} />
            : <BannerTilmeldSaeson />
          : <StatusKort rækker={rækker} tildelteLigaer={tildelteLigaer} frameld={frameld} />
        }

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <DashboardKort href="/indstillinger" ix="01" titel="Indstillinger" tekst="Privatliv og nyhedsbrev" />
          <DashboardKort href="/leaderboard" ix="02" titel="Leaderboard" tekst="Se sæsonens stilling" />
          <DashboardKort href="/historie" ix="03" titel="Historie" tekst="Resultater fra tidligere sæsoner" />
          <DashboardKort href="/draft-statistik" ix="04" titel="Draftstatistik" tekst="ADP og format-sammenligning" />
        </div>

        {session.user.isAdmin && (
          <div style={{
            marginTop: 32,
            padding: '20px 24px',
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
          }}>
            <span className="eyebrow" style={{ display: 'block', marginBottom: 10 }}>Admin</span>
            <Link href="/admin" style={{ color: 'var(--accent)', fontWeight: 500 }}>
              Gå til admin-dashboardet →
            </Link>
          </div>
        )}

        <div style={{ paddingBottom: 80 }} />
      </div>
    </div>
  )
}

function BannerVelkommenTilbage({ navn, sidsteSæson }: { navn: string; sidsteSæson: string }) {
  return (
    <div style={{
      padding: '32px 28px',
      background: 'var(--ink)',
      color: 'var(--bg)',
      borderRadius: 'var(--r)',
      boxShadow: 'var(--sh-2)',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 24,
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <p className="eyebrow" style={{ marginBottom: 10, color: 'color-mix(in oklch, var(--bg) 55%, transparent)' }}>
          GFC {CURRENT_SEASON}
        </p>
        <p style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 10 }}>
          Velkommen tilbage, {navn}
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.55, color: 'color-mix(in oklch, var(--bg) 70%, transparent)' }}>
          Du deltog i GFC {sidsteSæson} — tilmeld dig {CURRENT_SEASON} og vær med igen.
        </p>
      </div>
      <Link href="/saeson/tilmeld" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--bg)',
        color: 'var(--ink)',
        padding: '13px 26px',
        borderRadius: 'var(--r-pill)',
        fontWeight: 600,
        fontSize: 14,
        letterSpacing: '-0.005em',
        textDecoration: 'none',
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}>
        Tilmeld mig {CURRENT_SEASON}
      </Link>
    </div>
  )
}

function BannerTilmeldSaeson() {
  return (
    <div style={{
      padding: '32px 28px',
      background: 'var(--panel)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r)',
      boxShadow: 'var(--sh-1)',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 24,
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <p className="eyebrow" style={{ marginBottom: 10 }}>GFC {CURRENT_SEASON} er åben</p>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.55 }}>
          Du har en profil, men er ikke tilmeldt {CURRENT_SEASON} endnu. Tilmeld dig nu og vælg dine rækker.
        </p>
      </div>
      <Link href="/saeson/tilmeld" className="btn">
        Tilmeld mig
        <span className="arrow" aria-hidden />
      </Link>
    </div>
  )
}

function StatusKort({
  rækker, tildelteLigaer, frameld,
}: {
  rækker: string[]
  tildelteLigaer: LeagueAssignmentRow[]
  frameld: () => Promise<void>
}) {
  return (
    <div style={{
      padding: '28px',
      background: 'var(--panel)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r)',
      boxShadow: 'var(--sh-1)',
    }}>
      <p className="eyebrow" style={{ color: 'var(--pos)', marginBottom: 12 }}>
        Tilmeldt GFC {CURRENT_SEASON}
      </p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
        {tildelteLigaer.length > 0
          ? `Du er tildelt ${tildelteLigaer.map(l => l.liga_navn).join(', ')}`
          : 'Afventer ligafordeling'}
      </p>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 10 }}>
        Rækker: {rækker.length > 0 ? rækker.join(', ') : '—'}
      </p>
      <div className="eyebrow" style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span>
          Vil du ændre rækker?{' '}
          <Link href="/saeson/tilmeld" style={{ color: 'var(--accent)' }}>
            Opdater tilmelding
          </Link>
        </span>
        <form action={frameld} style={{ marginLeft: 'auto' }}>
          <button
            type="submit"
            className="eyebrow"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}
          >
            Frameld mig
          </button>
        </form>
      </div>
    </div>
  )
}

function DashboardKort({ href, ix, titel, tekst }: { href: string; ix: string; titel: string; tekst: string }) {
  return (
    <Link
      href={href}
      className="track"
      style={{ display: 'block', textDecoration: 'none' }}
    >
      <span className="ix">{ix}</span>
      <div className="name" style={{ fontSize: 20, marginTop: 8 }}>{titel}</div>
      <p className="desc" style={{ marginTop: 8, fontSize: 13.5 }}>{tekst}</p>
    </Link>
  )
}

function parseRækker(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
