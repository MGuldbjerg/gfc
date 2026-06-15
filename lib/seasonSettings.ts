// Per-season admin settings: signup deadline + invite-code bypass.
// Backed by the season_settings table (one row per season).

import { queryOne, execute } from '@/lib/turso'

export interface SeasonSettings {
  season: string
  signupDeadline: string | null // ISO 8601 with offset, or null = open
  inviteCode: string | null
}

interface Row {
  season: string
  signup_deadline: string | null
  invite_code: string | null
}

export async function getSeasonSettings(season: string): Promise<SeasonSettings | null> {
  const row = await queryOne<Row>(
    'SELECT season, signup_deadline, invite_code FROM season_settings WHERE season = ?',
    [season]
  )
  if (!row) return null
  return { season: row.season, signupDeadline: row.signup_deadline, inviteCode: row.invite_code }
}

// Upserts the deadline and/or invite code for a season. Pass `undefined` to
// leave a field unchanged; pass `null` to clear the deadline (= reopen signups).
export async function upsertSeasonSettings(
  season: string,
  fields: { signupDeadline?: string | null; inviteCode?: string }
): Promise<void> {
  const current = await getSeasonSettings(season)
  const deadline = fields.signupDeadline === undefined ? current?.signupDeadline ?? null : fields.signupDeadline
  const invite = fields.inviteCode === undefined ? current?.inviteCode ?? null : fields.inviteCode
  await execute(
    `INSERT INTO season_settings (season, signup_deadline, invite_code, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(season) DO UPDATE SET
       signup_deadline = excluded.signup_deadline,
       invite_code = excluded.invite_code,
       updated_at = datetime('now')`,
    [season, deadline, invite]
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
