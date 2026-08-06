# GFC — Guldbjergs Fantasy Challenge

Live at <https://www.fantasychallenge.dk> (canonical host is `www`; the apex
307s to it). Next.js 16 on Vercel, Turso (libSQL), Auth.js v5 magic links via
Brevo, data from the Sleeper API. Push to `main` deploys.

Status doc: `Mikkels eget/GFC/projekt-status.md` in OneDrive.

## The one rule that explains most of the codebase

**Code is the default, the database overrides it, deleting the row restores the
code.** Mikkel is not a developer, so anything he needs to change himself is
editable in `/admin` under this model — and no admin edit can permanently break
the site. Every DB read here falls back to the code default if the table is
missing, so the app builds and runs against an unmigrated database.

| What | Code default | DB override | Edited in |
|---|---|---|---|
| Current season | `CURRENT_SEASON` in `lib/leagues.ts` | `app_settings.current_season` | Sæson-fanen |
| Sleeper leagues | `ALL_LEAGUES` in `lib/leagues.ts` | `season_leagues` | Sæson-fanen |
| Markdown pages | `content/sider/*.md` | `side_indhold` | Indhold-fanen |
| Forside/menu text | `content/tekst.ts` | `tekst_override` (dot-path) | Indhold-fanen |
| Deadline + nøgledatoer | — | `season_settings` | Sæson-fanen |

## Where things are

```
lib/seasonConfig.ts   Season + league resolution (DB over code). SERVER ONLY.
lib/indhold.ts        Editable text + {placeholder} substitution. SERVER ONLY.
lib/leagues.ts        League constants + short-name helpers. NO db imports —
                      client components import this file.
lib/seasonSettings.ts season_settings row: deadline, invite code, nøgledatoer.
lib/fordeling.ts      League allocation algorithm (pure).
lib/leaderboard.ts    Sleeper → leaderboard. lib/historie.ts  Cross-season.
lib/badges.ts         Badge rules.  lib/profil.ts  Per-player Sleeper data.
lib/ugeresume.ts      Weekly summary generator (zero AI tokens).
lib/turso.ts          query / queryOne / execute.
lib/brevo.ts          Transactional mail + campaigns.

app/admin/            Tabs: Tilmeldinger, Ugeresumé, E-mail, Sæson, Indhold.
app/admin/fordel/     Allocation preview/confirm + manual placement.
app/api/admin/…       All admin endpoints; each checks session.user.isAdmin.
app/[slug]/page.tsx   Renders any markdown page, file or DB.
db/schema.sql         Full schema, with comments explaining each table.
scripts/              apply-schema.mjs, migrations, and
                      synk-liga-fra-sleeper.mjs — reconciles one Sleeper
                      league's members into league_assignments (dry run by
                      default, --commit to save, never mails).
```

Knowledge graph in `graphify-out/` — run `graphify update .` after changing code.

## Gotchas that have bitten before

- **`lib/leagues.ts` must not import the database.** `TilmeldForm.tsx`,
  `NavInner.tsx` and `app/admin/fordel/page.tsx` are client components that
  import it. Season/league lookups that need the DB live in `lib/seasonConfig.ts`.
- **Season is async now.** `hentAktuelSæson()`, `listSæsoner()` and
  `listAfsluttedeSæsoner()` all return promises. Client components receive the
  season as a prop; `CURRENT_SEASON` in a client file is only a fallback.
- **`/api/admin/fordel/bekraeft` rewrites the whole season**, so a full re-run
  overwrites manual placements from `/api/admin/fordel/manuel`.
- **Sleeper's API is read-only.** Creating leagues and inviting players is
  manual work in the Sleeper app — no amount of code fixes that. When a league
  is changed there, the site does not find out: add it to `ALL_LEAGUES` and run
  `scripts/synk-liga-fra-sleeper.mjs` to make the database agree.
- **The leaderboard reads `leaderboard_cache` first**, so a league added
  mid-season stays invisible there until "Opdater nu" (or Tuesday's cron) runs.
  Deleting the season's cache rows makes the page compute live in the meantime.
- **`profiles.id` equals the Auth.js user id** for anyone who can log in, and is
  a freestanding uuid for admin-added players with no email. Join
  `authjs_user u ON u.id = p.id`.
- **Two pre-existing lint errors** (`profil-setup/page.tsx`, `ProfilModal.tsx`,
  both "setState in effect"). Not yours; don't be alarmed.
- `public/` is untracked in git and holds a VIP photo. Leave it out of commits.

## Verify before you ship

```bash
npx tsc --noEmit && npm run build     # build reads the real DB — 0 "Query error" lines expected
```

Live smoke test: an admin route returns `401` when it exists and `404` when it
does not, so `curl -so /dev/null -w '%{http_code}' https://www.fantasychallenge.dk/api/admin/<route>`
tells you whether a deploy has landed.

Migrations run manually: `set -a && . ./.env.local && set +a && node scripts/<script>.mjs`

## Conventions

- Danish for anything Mikkel or a participant reads (UI, admin labels, commit
  messages). English for code comments and identifiers that are already English.
  Danish identifiers (`hentSide`, `sæson`) are normal here — match the file.
- Comments explain *why*, not what. Existing files are written that way.
