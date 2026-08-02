// Per-season admin settings: signup deadline + invite-code bypass.
// Backed by the season_settings table (one row per season).

import { queryOne, execute } from '@/lib/turso'

export interface SeasonSettings {
  season: string
  signupDeadline: string | null // ISO 8601 with offset, or null = open
  inviteCode: string | null
  // Nøgledatoer — plain 'YYYY-MM-DD'. They are read as "the day X happens" and
  // rendered as "4. juli", so they carry no clock time or offset.
  draftStart: string | null
  fordelingDato: string | null
  sæsonStart: string | null
}

interface Row {
  season: string
  signup_deadline: string | null
  invite_code: string | null
  draft_start: string | null
  fordeling_dato: string | null
  saeson_start: string | null
}

export async function getSeasonSettings(season: string): Promise<SeasonSettings | null> {
  const row = await queryOne<Row>(
    `SELECT season, signup_deadline, invite_code, draft_start, fordeling_dato, saeson_start
       FROM season_settings WHERE season = ?`,
    [season]
  )
  if (!row) return null
  return {
    season: row.season,
    signupDeadline: row.signup_deadline,
    inviteCode: row.invite_code,
    draftStart: row.draft_start,
    fordelingDato: row.fordeling_dato,
    sæsonStart: row.saeson_start,
  }
}

// Upserts settings for a season. Pass `undefined` to leave a field unchanged;
// pass `null` to clear it (clearing the deadline reopens signups).
export async function upsertSeasonSettings(
  season: string,
  fields: {
    signupDeadline?: string | null
    inviteCode?: string
    draftStart?: string | null
    fordelingDato?: string | null
    sæsonStart?: string | null
  }
): Promise<void> {
  const nu = await getSeasonSettings(season)
  const behold = <T,>(ny: T | undefined, gammel: T | null | undefined): T | null =>
    ny === undefined ? gammel ?? null : ny

  await execute(
    `INSERT INTO season_settings
       (season, signup_deadline, invite_code, draft_start, fordeling_dato, saeson_start, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(season) DO UPDATE SET
       signup_deadline = excluded.signup_deadline,
       invite_code     = excluded.invite_code,
       draft_start     = excluded.draft_start,
       fordeling_dato  = excluded.fordeling_dato,
       saeson_start    = excluded.saeson_start,
       updated_at      = datetime('now')`,
    [
      season,
      behold(fields.signupDeadline, nu?.signupDeadline),
      behold(fields.inviteCode, nu?.inviteCode),
      behold(fields.draftStart, nu?.draftStart),
      behold(fields.fordelingDato, nu?.fordelingDato),
      behold(fields.sæsonStart, nu?.sæsonStart),
    ]
  )
}

// True when a deadline is set and now is past it. No deadline → never passed.
export function deadlinePassed(deadlineIso: string | null, now: Date = new Date()): boolean {
  if (!deadlineIso) return false
  const d = new Date(deadlineIso)
  if (Number.isNaN(d.getTime())) return false
  return now.getTime() > d.getTime()
}

export interface SignupGate {
  allowed: boolean
  closed: boolean // deadline has passed (the form should show the closed state)
  deadline: string | null
}

// Decides whether a signup is allowed. Open until the deadline; after it, only
// a request carrying the season's invite code gets through.
export async function evaluateSignupGate(
  season: string,
  invite?: string | null
): Promise<SignupGate> {
  const settings = await getSeasonSettings(season)
  const deadline = settings?.signupDeadline ?? null
  const closed = deadlinePassed(deadline)
  if (!closed) return { allowed: true, closed: false, deadline }
  const hasValidInvite = Boolean(invite && settings?.inviteCode && invite === settings.inviteCode)
  return { allowed: hasValidInvite, closed: true, deadline }
}
