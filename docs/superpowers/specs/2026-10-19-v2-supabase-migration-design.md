# Design Specification: v2 Next.js Supabase Database Rendering Migration

**Date:** 2026-10-19  
**Status:** Approved  
**Subproject:** `v2` (Next.js 16 Web Application)  
**Target Branch:** `feat/ftp-server`

---

## 1. Overview & Context

Previously, the `v2` Next.js frontend application rendered tournament listings and tournament details exclusively by fetching static JSON files over HTTP (`tournament.json`, `data_clean.json`, `data.json`) or reading `../www/tournament.json` at static build time.

With the native data pipeline (`hbcc prepare-data`) and Supabase integration now master-syncing parsed tournament data and JSONB blobs directly into the Supabase `tournaments` table, `v2` is being updated to load tournament data directly from the Supabase database. To ensure high availability and backwards compatibility, the application implements a database-first strategy with automatic fallback to static JSON files.

---

## 2. Goals & Non-Goals

### Goals
- **Database-First Data Access:** Fetch tournament lists and full tournament details directly from Supabase via `@supabase/supabase-js`.
- **Seamless Static Fallback:** If Supabase is unreachable (network down, RLS error, or tournament not yet in DB), gracefully fall back to existing static JSON endpoints without breaking the user experience.
- **Static Export & GitHub Pages Support:** Support both dynamic client-side rendering and static export (`NEXT_PUBLIC_EXPORT_STATIC=true` used in CI to output to `www/v2`).
- **Clean Architecture:** Abstract database queries and fallback logic into a dedicated `tournamentService.ts` module, keeping UI components decoupled from transport details.

### Non-Goals
- Migrating rating leaderboards (`junior-ratings.json`, `open-ratings.json`) in this phase (remains on JSON files).
- Modifying the underlying Supabase table schema or native parser pipeline.
- Modifying UI layouts, color tokens, or styling components.

---

## 3. Architecture & Data Flow

```
+-------------------------------------------------------------+
|                         Next.js App                         |
|                                                             |
|   +-----------------------+     +-----------------------+   |
|   |   src/app/page.tsx    |     |  TournamentClient.tsx |   |
|   |   (Tournament List)   |     | (Pairings/Standings)  |   |
|   +-----------+-----------+     +-----------+-----------+   |
|               |                             |               |
|               +--------------+--------------+               |
|                              |                              |
|                              v                              |
|                 src/lib/tournamentService.ts                |
|               +-----------------------------+               |
|               |  - getTournaments()         |               |
|               |  - getTournamentBySlug()    |               |
|               |  - getAllTournamentSlugs()  |               |
|               +--------------+--------------+               |
+------------------------------|------------------------------+
                               |
               +---------------+---------------+
               |                               |
       (Primary Source)                (Fallback Source)
               |                               |
               v                               v
    +--------------------+            +------------------+
    |  Supabase Database |            | Static JSON Files|
    | 'tournaments' table|            | tournament.json  |
    |  (anon public RLS) |            | data_clean.json  |
    +--------------------+            +------------------+
```

---

## 4. Detailed Component Design

### 4.1 Supabase Client: `v2/src/lib/supabase.ts`
- **Dependencies:** `@supabase/supabase-js` added to `v2/package.json`.
- **Credentials:**
  - `NEXT_PUBLIC_SUPABASE_URL` (default: `https://oezanuqlynjqwgkownxd.supabase.co`)
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (default: `sb_publishable_U_v4N9PWgRbkRoPTU30uRg_zfDzEcL0`)
- **Configuration:**
  - Client created with `persistSession: false` and `autoRefreshToken: false`.
  - Exported as `getSupabaseClient()` or `supabase`.

### 4.2 Tournament Service: `v2/src/lib/tournamentService.ts`

#### `getTournaments(): Promise<Tournament[]>`
1. Queries Supabase:
   ```ts
   const { data, error } = await supabase
     .from('tournaments')
     .select('slug, name, category, date_begin, date_end, year, status, player_count, top_players, metadata')
     .order('date_ts', { ascending: false });
   ```
2. Maps each row to the `Tournament` interface:
   - `path`: `${slug}/data.json`
   - `data`: reconstructed metadata map including `Tournament Name`, `Date Begin`, `Date End`, `Category`, `Registered Players`.
   - `top_players`: top player list from row.
   - `status`: calculated `Completed` | `In Progress` | `Planned`.
3. If query fails or returns empty array, falls back to fetching `${NEXT_PUBLIC_APP_URL}/tournament.json`.

#### `getTournamentBySlug(slug: string): Promise<TournamentData | null>`
1. Normalizes the tournament slug (checks param with and without leading `www`).
2. Queries Supabase:
   ```ts
   const { data, error } = await supabase
     .from('tournaments')
     .select('data, metadata, name, category, status')
     .or(`slug.eq.${slug},slug.eq.www${slug}`)
     .maybeSingle();
   ```
3. If row found and `data.data` is an object:
   - Passes the payload into `normalizeTournamentData(data.data)`.
   - Returns normalized `TournamentData`.
4. If missing, null, or query error:
   - Executes HTTP fetch against `${primaryCleanUrl}` (`data_clean.json`) followed by `${primaryFallbackUrl}` (`data.json`).

#### `getAllTournamentSlugs(): Promise<string[]>`
1. Used in `v2/src/app/[tournament]/page.tsx` for `generateStaticParams()`.
2. Queries `tournaments` table for `slug`. Strips leading `www` for clean routing.
3. Fallback: Reads `../www/tournament.json` via Node.js `fs`.

### 4.3 Page Updates

#### `v2/src/app/page.tsx`
- Replaces raw `fetch('/tournament.json')` in `useEffect` with `getTournaments()`.
- Retains all category filtering, year filtering, and tournament cards.

#### `v2/src/app/[tournament]/page.tsx`
- Converts `generateStaticParams()` to `async` calling `getAllTournamentSlugs()`.
- Retains `<Suspense>` wrapper and `<TournamentClient />`.

#### `v2/src/app/[tournament]/TournamentClient.tsx`
- Replaces complex dual-URL fetching with `getTournamentBySlug(resolvedParams.tournament)`.
- Retains team tournament autoredirect to `teamslist.html`.
- Retains player auto-scrolling with `?id=...`.
- Retains footer `Generated at` display.

---

## 5. Security & RLS Requirements

- Supabase table `tournaments` must allow `SELECT` for anonymous users (`anon` role / public).
- Only public tournament metadata and pairings/crosstables are exposed; no administrative or authentication secrets are included in client bundles.

---

## 6. Verification Plan

1. **Dependency Installation:** `npm install @supabase/supabase-js` inside `v2`.
2. **Type Check & Lint:** `npm run lint` and `npx tsc --noEmit` inside `v2`.
3. **Static Build Validation:** Run `npm run build:export` inside `v2` to confirm static export generates without errors.
4. **End-to-End Functional Test:**
   - Run dev server / preview build.
   - Verify homepage loads tournaments from Supabase.
   - Verify tournament page (e.g. `2025HobsonsBayAprilBlitz`) renders full pairings and standings from database.
   - Verify fallback functions when offline or given invalid slug.
