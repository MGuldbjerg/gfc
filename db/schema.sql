-- GFC Platform — Turso (libSQL/SQLite) schema
-- Apply with: node scripts/apply-schema.mjs

-- Participant profiles. id matches the Auth.js user id for self-signups and for
-- admin-added players given an email; for admin-added players without an email
-- (no login) it is a freestanding uuid.
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,                          -- Sleeper username
  display_name TEXT NOT NULL,
  sleeper_user_id TEXT,                                   -- verified Sleeper user_id
  vis_sleeper_username INTEGER NOT NULL DEFAULT 1,        -- 0/1 boolean (Phase 3.1)
  vis_badges INTEGER NOT NULL DEFAULT 1,                  -- 0/1 boolean (Phase 3.1)
  nyhedsbrev INTEGER NOT NULL DEFAULT 0,                  -- 0/1 boolean (Phase 3.1)
  er_amerikansk_vip INTEGER NOT NULL DEFAULT 0,           -- 0/1 — admin-set tag for US industry guests
  er_dansk_vip INTEGER NOT NULL DEFAULT 0,                -- 0/1 — admin-set tag for Danish VIP guests (mutually exclusive with US)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Per-season registrations.
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,                                    -- uuid generated in app
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season TEXT NOT NULL,                                   -- '2025', '2026', ...
  preferred_types TEXT NOT NULL DEFAULT '[]',             -- JSON array of strings
  assigned_league_id TEXT,                                -- Sleeper league id after assignment
  assigned_league_name TEXT,                              -- 'BB1', 'M3' ...
  status TEXT NOT NULL DEFAULT 'registered',              -- registered | assigned | active
  undgaa_amerikansk_vip INTEGER NOT NULL DEFAULT 0,       -- 0/1 — participant prefers no US VIP in league
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(profile_id, season)
);

-- Leaderboard cache, written by GitHub Actions weekly.
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id TEXT PRIMARY KEY,
  season TEXT NOT NULL,
  league_type TEXT NOT NULL,                              -- 'bestball' | 'managed' | 'chopped'
  data TEXT NOT NULL,                                     -- JSON-serialised leaderboard object
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(season, league_type)
);

-- Badges awarded to participants.
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,                               -- 'og', 'raketstart', ...
  season TEXT,                                            -- NULL = all-time badge (e.g. OG)
  awarded_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(profile_id, badge_type, season)
);

-- Per-season admin settings: signup deadline + an invite code that bypasses
-- the deadline for late entrants. One row per season; edited from the admin
-- "Sæson" tab. signup_deadline is a tz-aware ISO 8601 instant (e.g.
-- '2026-07-03T18:00:00+02:00'); a NULL deadline means signups are open.
-- The three nøgledatoer are plain dates ('2026-07-04') rather than instants:
-- they are read as "the day X happens" and rendered as "4. juli", never as a
-- clock time. They feed the {draftstart}/{fordelingsdato}/{sæsonstart}
-- placeholders. Existing databases get these via scripts/migrate-selvbetjening.mjs.
CREATE TABLE IF NOT EXISTS season_settings (
  season          TEXT PRIMARY KEY,                      -- '2026', ...
  signup_deadline TEXT,                                  -- ISO 8601 with offset, or NULL = open
  invite_code     TEXT,                                  -- bypass token for late entrants
  draft_start     TEXT,                                  -- 'YYYY-MM-DD' — slow drafts start
  fordeling_dato  TEXT,                                  -- 'YYYY-MM-DD' — league allocation day
  saeson_start    TEXT,                                  -- 'YYYY-MM-DD' — NFL season kickoff
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per person per confirmed league. registrations.assigned_league_name/
-- assigned_league_id only hold a single value, but a person can be confirmed
-- into up to 3 leagues (bestball + managed + chopped) — this table is the
-- actual one-to-many record. Written by /api/admin/fordel/bekræft; read by
-- /min-side and the "Aktuel fordeling" view on /admin/fordel.
CREATE TABLE IF NOT EXISTS league_assignments (
  id                TEXT PRIMARY KEY,
  registration_id   TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  profile_id        TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season            TEXT NOT NULL,
  liga_navn         TEXT NOT NULL,                          -- 'BB1', 'M3', ...
  league_type       TEXT NOT NULL,                          -- 'bestball' | 'managed' | 'chopped'
  sleeper_league_id TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(registration_id, liga_navn)
);

-- Site-wide key/value settings that used to be constants in the code. Today
-- only 'current_season' lives here, so a new season can be started from the
-- admin "Sæson" tab instead of a code deploy. CURRENT_SEASON in lib/leagues.ts
-- remains the fallback when the key is missing.
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sleeper leagues registered from the admin UI. ALL_LEAGUES in lib/leagues.ts
-- keeps the historical seasons; anything added here is merged on top, so a new
-- season's leagues can be entered without touching code. A row here wins over a
-- code row with the same (season, liga_navn).
CREATE TABLE IF NOT EXISTS season_leagues (
  id          TEXT PRIMARY KEY,
  season      TEXT NOT NULL,
  liga_navn   TEXT NOT NULL,                          -- 'BB1', 'M3', 'C1'
  league_type TEXT NOT NULL,                          -- 'bestball' | 'managed' | 'chopped'
  sleeper_id  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(season, liga_navn)
);

-- Editable markdown pages. Overrides content/sider/*.md when a row exists, so
-- the files stay as the shipped default and a bad edit can always be reverted
-- by deleting the row. Rows with no matching file are brand-new pages.
CREATE TABLE IF NOT EXISTS side_indhold (
  slug       TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  i_menu     INTEGER NOT NULL DEFAULT 0,              -- 0/1 — show in the nav bar
  sort_order INTEGER NOT NULL DEFAULT 100,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Editable strings from content/tekst.ts, keyed by dot-path ('landing.titel',
-- 'landing.tidslinje.1.tid'). Same override-the-code-default model as
-- side_indhold: delete the row to fall back to what is in the file.
CREATE TABLE IF NOT EXISTS tekst_override (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_registrations_season ON registrations(season);
CREATE INDEX IF NOT EXISTS idx_season_leagues_season ON season_leagues(season);
CREATE INDEX IF NOT EXISTS idx_registrations_profile ON registrations(profile_id);
CREATE INDEX IF NOT EXISTS idx_badges_profile ON badges(profile_id);
CREATE INDEX IF NOT EXISTS idx_league_assignments_season ON league_assignments(season);
CREATE INDEX IF NOT EXISTS idx_league_assignments_profile ON league_assignments(profile_id);

-- Auth.js (NextAuth v5) — JWT sessions + email magic-link provider.
-- Only the tables required by the email provider are created here; no `session`
-- table (JWT) and no `account` table (no OAuth providers).
CREATE TABLE IF NOT EXISTS authjs_user (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified TEXT,
  name TEXT,
  image TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS authjs_verification_token (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE INDEX IF NOT EXISTS idx_authjs_user_email ON authjs_user(email);
