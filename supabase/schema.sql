-- GFC Platform — Supabase databaseskema
-- Kør dette i Supabase Dashboard → SQL Editor

-- Deltagerprofiler (linket til Supabase Auth)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,           -- Sleeper-brugernavn
  display_name text not null,
  sleeper_user_id text,                    -- verificeret Sleeper user_id
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tilmeldinger per sæson
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles on delete cascade,
  season text not null,                    -- '2025', '2026' osv.
  preferred_types text[] default '{}',     -- ['bestball', 'managed', 'chopped']
  assigned_league_id text,                 -- Sleeper liga-ID efter fordeling
  assigned_league_name text,               -- 'BB1', 'M3' osv.
  status text default 'registered',        -- registered | assigned | active
  created_at timestamptz default now(),
  unique(profile_id, season)               -- én tilmelding per deltager per sæson
);

-- Cache af leaderboard-data (opdateres af GitHub Actions hver tirsdag)
create table if not exists leaderboard_cache (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  league_type text not null,               -- 'bestball' | 'managed' | 'chopped'
  data jsonb not null,                     -- komplet leaderboard-objekt
  fetched_at timestamptz default now(),
  unique(season, league_type)
);

-- Badges tildelt til deltagere
create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles on delete cascade,
  badge_type text not null,                -- 'og', 'raketstart', 'konsistent_konge' osv.
  season text,                             -- null = all-time badge (fx OG)
  awarded_at timestamptz default now(),
  unique(profile_id, badge_type, season)
);

-- Row Level Security
alter table profiles enable row level security;
alter table registrations enable row level security;
alter table leaderboard_cache enable row level security;
alter table badges enable row level security;

-- Alle kan læse leaderboard-cache og badges
create policy "Leaderboard er offentlig" on leaderboard_cache for select using (true);
create policy "Badges er offentlige" on badges for select using (true);
create policy "Profiler er offentlige" on profiles for select using (true);

-- Kun ejeren kan se og redigere sin tilmelding
create policy "Tilmelding: læs egne" on registrations for select using (auth.uid() = profile_id);
create policy "Tilmelding: opret egne" on registrations for insert with check (auth.uid() = profile_id);
create policy "Tilmelding: opdater egne" on registrations for update using (auth.uid() = profile_id);

-- Kun ejeren kan opdatere sin profil
create policy "Profil: opdater egne" on profiles for update using (auth.uid() = id);
create policy "Profil: opret egne" on profiles for insert with check (auth.uid() = id);

-- Service role kan skrive til leaderboard-cache (GitHub Actions)
create policy "Cache: service kan skrive" on leaderboard_cache
  for all using (auth.role() = 'service_role');
create policy "Cache: service kan tildele badges" on badges
  for all using (auth.role() = 'service_role');
