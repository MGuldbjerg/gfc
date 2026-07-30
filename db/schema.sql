-- GFC Platform — Turso (libSQL/SQLite) schema
-- Apply with: node scripts/apply-schema.mjs

-- Participant profiles. id matches the Auth.js user id for self-signups; for
-- admin-added players (no login) it is a freestanding uuid.
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
CREATE TABLE IF NOT EXISTS season_settings (
  season          TEXT PRIMARY KEY,                      -- '2026', ...
  signup_deadline TEXT,                                  -- ISO 8601 with offset, or NULL = open
  invite_code     TEXT,                                  -- bypass token for late entrants
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

CREATE INDEX IF NOT EXISTS idx_registrations_season ON registrations(season);
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
