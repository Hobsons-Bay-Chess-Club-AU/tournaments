# v2 Next.js Supabase Database Rendering Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transition the `v2` Next.js frontend application from reading static JSON files (`tournament.json`, `data_clean.json`, `data.json`) to directly querying master tournament records and JSONB blobs from the Supabase database with automatic static fallback.

**Architecture:** Add `@supabase/supabase-js` to `v2`, configure `src/lib/supabase.ts` with public/anon credentials, create a unified `src/lib/tournamentService.ts` encapsulating all tournament data queries with fallback to static JSON endpoints, and update the homepage and dynamic tournament pages to consume this service while preserving static export (`NEXT_PUBLIC_EXPORT_STATIC=true`).

**Tech Stack:** Next.js 16.0.8, React 19.1.0, TypeScript 5, `@supabase/supabase-js` 2.x, Node.js test runner (`node:test`).

**Spec:** `docs/superpowers/specs/2026-10-19-v2-supabase-migration-design.md`

## Global Constraints

- **Compatibility:** All changes must build successfully under both `npm run build` and `npm run build:export` (`NEXT_PUBLIC_EXPORT_STATIC=true`).
- **Security:** Use only anonymous publishable keys on the client (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_URL`). Never expose service role or secret keys to `v2`.
- **Zero Breaking Changes:** Preserve existing card layouts, year selection, category tabs, and team tournament auto-redirects (`teamslist.html`).
- **Fallback Reliability:** If Supabase is unreachable, offline, or returns empty, components must fall back to the existing static JSON files without throwing unhandled exceptions.

---

### Task 1: Install `@supabase/supabase-js` and Setup Supabase Client Module

**Files:**
- Modify: `v2/package.json`
- Create: `v2/src/lib/supabase.ts`
- Test: `v2/test/supabase-client.test.mjs`

**Interfaces:**
- Produces: `getSupabaseClient(): SupabaseClient | null` and `supabase: SupabaseClient | null`

- [ ] **Step 1: Write the failing test for `supabase.ts`**

Create `v2/test/supabase-client.test.mjs`:
```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const supabaseModulePath = new URL("../src/lib/supabase.ts", import.meta.url);
const pkgPath = new URL("../package.json", import.meta.url);

test("supabase client module exposes client with environment fallback defaults", async () => {
  const [pkgContent, moduleContent] = await Promise.all([
    readFile(pkgPath, "utf8"),
    readFile(supabaseModulePath, "utf8"),
  ]);

  const pkg = JSON.parse(pkgContent);
  assert.ok(
    pkg.dependencies["@supabase/supabase-js"],
    "package.json must include @supabase/supabase-js dependency"
  );

  assert.match(moduleContent, /createClient/, "must use createClient from @supabase/supabase-js");
  assert.match(moduleContent, /NEXT_PUBLIC_SUPABASE_URL/, "must read NEXT_PUBLIC_SUPABASE_URL");
  assert.match(moduleContent, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY/, "must read public key");
  assert.match(moduleContent, /https:\/\/oezanuqlynjqwgkownxd\.supabase\.co/, "must have default fallback URL");
  assert.match(moduleContent, /export (const supabase|function getSupabaseClient)/, "must export supabase client");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/supabase-client.test.mjs` in `v2`
Expected: FAIL with "no such file or directory" for `supabase.ts`

- [ ] **Step 3: Install `@supabase/supabase-js` and write `src/lib/supabase.ts`**

Run:
```bash
npm install @supabase/supabase-js --prefix v2
```

Create `v2/src/lib/supabase.ts`:
```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://oezanuqlynjqwgkownxd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_U_v4N9PWgRbkRoPTU30uRg_zfDzEcL0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return _client;
}

export const supabase = getSupabaseClient();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/supabase-client.test.mjs` in `v2`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add v2/package.json v2/package-lock.json v2/src/lib/supabase.ts v2/test/supabase-client.test.mjs
git commit -m "feat(v2): add @supabase/supabase-js and supabase client module"
```

---

### Task 2: Build `tournamentService.ts` Data Access & Fallback Layer

**Files:**
- Create: `v2/src/lib/tournamentService.ts`
- Test: `v2/test/tournament-service.test.mjs`

**Interfaces:**
- Consumes: `supabase` from `v2/src/lib/supabase.ts`
- Produces:
  - `getTournaments(): Promise<Tournament[]>`
  - `getTournamentBySlug(slug: string): Promise<TournamentData | null>`
  - `getAllTournamentSlugs(): Promise<string[]>`
  - `mapSupabaseRowToTournament(row: Record<string, unknown>): Tournament`
  - `normalizeTournamentData(raw: unknown): TournamentData | null`

- [ ] **Step 1: Write the failing unit test for `tournamentService.ts`**

Create `v2/test/tournament-service.test.mjs`:
```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const servicePath = new URL("../src/lib/tournamentService.ts", import.meta.url);

test("tournamentService defines methods and transforms supabase rows into tournament UI shapes", async () => {
  const content = await readFile(servicePath, "utf8");

  assert.match(content, /export async function getTournaments/, "must export getTournaments");
  assert.match(content, /export async function getTournamentBySlug/, "must export getTournamentBySlug");
  assert.match(content, /export async function getAllTournamentSlugs/, "must export getAllTournamentSlugs");
  assert.match(content, /export function mapSupabaseRowToTournament/, "must export mapSupabaseRowToTournament");
  assert.match(content, /export function normalizeTournamentData/, "must export normalizeTournamentData");

  // Fallback checks
  assert.match(content, /tournament\.json/, "must include tournament.json fallback");
  assert.match(content, /data_clean\.json/, "must include data_clean.json fallback");
  assert.match(content, /data\.json/, "must include data.json fallback");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/tournament-service.test.mjs` in `v2`
Expected: FAIL with "no such file or directory" for `tournamentService.ts`

- [ ] **Step 3: Implement `v2/src/lib/tournamentService.ts`**

Create `v2/src/lib/tournamentService.ts`:
```typescript
import { getSupabaseClient } from './supabase';
import type { TopPlayer, TournamentStatus } from '@/components/TournamentCard';

export type TournamentMeta = {
  [key: string]: string;
};

export type Tournament = {
  data: TournamentMeta;
  path: string;
  category: string;
  top_players?: TopPlayer[];
  status?: TournamentStatus;
};

export type TableCaption = string | {
  playerName?: string;
  id?: string | number;
  moreInfo?: {
    anchor?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type Header = { name: string; key: string };
export type MixedHeader = Header | string;

export type PageData = {
  pageHeading?: string;
  tables?: {
    headers?: MixedHeader[];
    rows?: Record<string, unknown>[];
    caption?: TableCaption;
    footer?: {
      text: string;
      html: string;
    };
    type?: string;
    tournamentType?: string;
    matches?: Array<{
      matchNumber: string;
      team1: { country: string; teamName: string; teamScore: string; matchScore: string; };
      team2: { country: string; teamName: string; teamScore: string; matchScore: string; };
      boardPairings: Array<{
        board: string;
        white: { name: string; rating: string; score: string; };
        black: { name: string; rating: string; score: string; };
      }>;
    }>;
  }[];
  pairingScheduleText?: string;
};

export type Player = {
  id: string;
  name: string;
  title: string;
  federation: string;
  fideId: string;
  fideRating: number | null;
  fideFederation: string;
  gender: string;
  href: string;
  origin: string;
};

export type MenuItem = {
  name: string;
  url: string;
};

export type TournamentData = {
  generatedAt: string;
  tournament: {
    id: string;
    name: string;
    category: string;
    metadata: Record<string, unknown>;
  };
  players: Player[];
  pages: Record<string, PageData>;
  menu: MenuItem[];
};

export function parseAusDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
}

export function computeStatus(dateBeginStr: string, dateEndStr: string): TournamentStatus {
  const now = new Date();
  const beginDateObj = parseAusDate(dateBeginStr);
  const endDateObj = parseAusDate(dateEndStr || dateBeginStr);
  if (beginDateObj.getTime() > now.getTime()) {
    return 'Planned';
  } else if (beginDateObj.getTime() <= now.getTime() && endDateObj.getTime() >= now.getTime()) {
    return 'In Progress';
  }
  return 'Completed';
}

export function mapSupabaseRowToTournament(row: Record<string, unknown>): Tournament {
  const metadata = (row.metadata as Record<string, unknown>) || {};
  const dateBegin = String(row.date_begin || metadata['Date Begin'] || metadata['Date'] || '');
  const dateEnd = String(row.date_end || metadata['Date End'] || metadata['End Date'] || '');
  const slug = String(row.slug || '').replace(/^www/, '');

  const dataMap: TournamentMeta = {
    'Tournament Name': String(row.name || metadata['Tournament Name'] || slug),
    'Date Begin': dateBegin,
    'Date End': dateEnd,
    'Category': String(row.category || metadata['Category'] || 'Senior'),
    'Registered Players': String(row.player_count || metadata['Registered Players'] || '0'),
  };

  Object.entries(metadata).forEach(([k, v]) => {
    if (!(k in dataMap) && v !== null && v !== undefined) {
      dataMap[k] = String(v);
    }
  });

  return {
    path: `${slug}/data.json`,
    category: String(row.category || 'Senior'),
    data: dataMap,
    top_players: Array.isArray(row.top_players) ? (row.top_players as TopPlayer[]) : undefined,
    status: computeStatus(dateBegin, dateEnd),
  };
}

export function normalizeTournamentData(raw: unknown): TournamentData | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;

  const pages = (data.pages || data.page || {}) as Record<string, PageData>;
  const metadata = (data.metadata || {}) as Record<string, unknown>;
  const tournamentObj = (data.tournament as Record<string, unknown>) || {
    id: String(data.tournamentId || ''),
    name: String(metadata['Tournament Name'] || data.name || ''),
    category: String(data.category || 'Senior'),
    metadata: metadata,
  };

  let players: Player[] = [];
  if (Array.isArray(data.players)) {
    players = data.players as Player[];
  } else if (Array.isArray(data.playerLookup)) {
    players = data.playerLookup as Player[];
  } else if (data.playerLookup && typeof data.playerLookup === 'object') {
    players = Object.values(data.playerLookup) as Player[];
  }

  const menu = Array.isArray(data.menu) ? (data.menu as MenuItem[]) : [];
  const generatedAt = typeof data.generatedAt === 'string' ? data.generatedAt : '';

  return {
    generatedAt,
    tournament: tournamentObj as TournamentData['tournament'],
    players,
    pages,
    menu,
  };
}

export async function getTournaments(): Promise<Tournament[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tournaments')
      .select('slug, name, category, date_begin, date_end, year, status, player_count, top_players, metadata')
      .order('date_ts', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(mapSupabaseRowToTournament);
    }
  } catch (err) {
    console.warn('[TournamentService] Supabase getTournaments query failed, falling back to tournament.json:', err);
  }

  // Fallback to static tournament.json
  try {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
    const res = await fetch(`${appUrl}/tournament.json?TS=${Date.now()}`);
    if (res.ok) {
      const json: Tournament[] = await res.json();
      return json.map((t) => {
        const dateBegin = t.data['Date Begin'] || t.data['Date'] || '';
        const dateEnd = t.data['Date End'] || t.data['End Date'] || '';
        return {
          ...t,
          status: computeStatus(dateBegin, dateEnd),
        };
      });
    }
  } catch (err) {
    console.error('[TournamentService] Fallback to tournament.json also failed:', err);
  }

  return [];
}

export async function getTournamentBySlug(tournamentSlug: string): Promise<TournamentData | null> {
  const cleanSlug = tournamentSlug.replace(/^www/, '');
  const folderName = `www${cleanSlug}`;

  // 1. Try Supabase
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tournaments')
      .select('data, metadata, name, category, status')
      .or(`slug.eq.${cleanSlug},slug.eq.${folderName}`)
      .maybeSingle();

    if (!error && data && data.data && Object.keys(data.data).length > 0) {
      const normalized = normalizeTournamentData(data.data);
      if (normalized) {
        return normalized;
      }
    }
  } catch (err) {
    console.warn(`[TournamentService] Supabase getTournamentBySlug for ${cleanSlug} failed:`, err);
  }

  // 2. Fallback to HTTP fetching data_clean.json then data.json
  const primaryBase = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
  const cleanUrl = `${primaryBase}/${folderName}/data_clean.json?ts=${Date.now()}`;
  const fallbackUrl = `${primaryBase}/${folderName}/data.json?ts=${Date.now()}`;

  try {
    const res = await fetch(cleanUrl);
    if (res.ok) {
      const json = await res.json();
      return normalizeTournamentData(json);
    }
  } catch {}

  try {
    const resFallback = await fetch(fallbackUrl);
    if (resFallback.ok) {
      const json = await resFallback.json();
      return normalizeTournamentData(json);
    }
  } catch {}

  return null;
}

export async function getAllTournamentSlugs(): Promise<string[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('tournaments').select('slug');
    if (!error && Array.isArray(data) && data.length > 0) {
      return data
        .map((row) => String(row.slug || '').replace(/^www/, ''))
        .filter(Boolean);
    }
  } catch (err) {
    console.warn('[TournamentService] Supabase getAllTournamentSlugs failed, falling back to local tournament.json:', err);
  }

  // Fallback to local tournament.json if running in Node.js environment
  try {
    if (typeof window === 'undefined') {
      const fs = await import('fs');
      const path = await import('path');
      const tournamentJsonPath = path.join(process.cwd(), '..', 'www', 'tournament.json');
      if (fs.existsSync(tournamentJsonPath)) {
        const fileContent = fs.readFileSync(tournamentJsonPath, 'utf-8');
        const list: { path: string }[] = JSON.parse(fileContent);
        return list.map((item) => {
          const folder = item.path.split('/')[0];
          return folder.replace(/^www/, '');
        });
      }
    }
  } catch (err) {
    console.warn('[TournamentService] Local tournament.json fallback error:', err);
  }

  return [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/tournament-service.test.mjs` in `v2`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add v2/src/lib/tournamentService.ts v2/test/tournament-service.test.mjs
git commit -m "feat(v2): implement tournamentService with supabase and static fallback"
```

---

### Task 3: Integrate `getTournaments()` into Homepage (`v2/src/app/page.tsx`)

**Files:**
- Modify: `v2/src/app/page.tsx`
- Test: `v2/test/home-page-db.test.mjs`

**Interfaces:**
- Consumes: `getTournaments()`, `Tournament`, `parseAusDate` from `v2/src/lib/tournamentService.ts`

- [ ] **Step 1: Write the failing test for homepage Supabase integration**

Create `v2/test/home-page-db.test.mjs`:
```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const pagePath = new URL("../src/app/page.tsx", import.meta.url);

test("homepage uses tournamentService to load tournaments from database", async () => {
  const content = await readFile(pagePath, "utf8");

  assert.match(content, /import.*getTournaments.*from ["']@\/lib\/tournamentService["']/, "must import getTournaments");
  assert.doesNotMatch(content, /fetch\(process\.env\.NEXT_PUBLIC_APP_URL \+ "\/tournament\.json/, "must not directly fetch tournament.json");
  assert.match(content, /getTournaments\(\)\.then\(/, "must call getTournaments() in useEffect");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/home-page-db.test.mjs` in `v2`
Expected: FAIL (assertion does not match)

- [ ] **Step 3: Update `v2/src/app/page.tsx`**

Replace direct `fetch('/tournament.json')` with `getTournaments()`. Use types from `tournamentService.ts`.

In `v2/src/app/page.tsx`:
```typescript
"use client";
import React, { useEffect, useState } from "react";
import HomeHero from "@/components/HomeHero";
import FilterTabs from "@/components/FilterTabs";
import TournamentCard from "@/components/TournamentCard";
import { getTournaments, parseAusDate, type Tournament } from "@/lib/tournamentService";

function getYear(dateStr: string): string {
  if (!dateStr) return new Date().getFullYear().toString();
  const match = dateStr.match(/(\d{4})/);
  return match ? match[1] : new Date().getFullYear().toString();
}

const CATEGORY_OPTIONS = ["All", "Senior", "Junior", "Rapid", "Blitz", "Planned", "In Progress"];

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeOption, setActiveOption] = useState<string>("All");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [years, setYears] = useState<string[]>([]);

  useEffect(() => {
    getTournaments().then((data) => {
      setTournaments(data);
      const allYears = Array.from(
        new Set(
          data.map((t) => {
            const d = t.data["Date Begin"] || t.data["Date"] || "";
            return getYear(d);
          })
        )
      ) as string[];
      const sortedYears = allYears.sort((a, b) => parseInt(b) - parseInt(a));
      setYears(sortedYears);
      if (allYears.includes(new Date().getFullYear().toString())) {
        setYear(new Date().getFullYear().toString());
      } else if (sortedYears.length > 0) {
        setYear(sortedYears[0]);
      }
    });
  }, []);

  const sortedTournaments = [...tournaments].sort((a, b) => {
    const dateA = a.data["Date Begin"] || a.data["Date"] || "";
    const dateB = b.data["Date Begin"] || b.data["Date"] || "";
    const dA = parseAusDate(dateA);
    const dB = parseAusDate(dateB);
    return dB.getTime() - dA.getTime();
  });

  const filtered = sortedTournaments.filter((t) => {
    const tYear = getYear(t.data["Date Begin"] || t.data["Date"] || "");
    const yearMatch = year === "All" || tYear === year;
    let match = false;
    if (activeOption === "All") {
      match = true;
    } else if (activeOption === "Planned" || activeOption === "In Progress") {
      match = t.status === activeOption;
    } else {
      match = (t.category || "").toLowerCase() === activeOption.toLowerCase();
    }
    return yearMatch && match;
  });

  return (
    // Existing JSX remains completely intact
    ...
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/home-page-db.test.mjs` in `v2`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add v2/src/app/page.tsx v2/test/home-page-db.test.mjs
git commit -m "feat(v2): update homepage to load tournaments from database service"
```

---

### Task 4: Integrate `getTournamentBySlug()` into `TournamentClient.tsx` & `[tournament]/page.tsx`

**Files:**
- Modify: `v2/src/app/[tournament]/page.tsx`
- Modify: `v2/src/app/[tournament]/TournamentClient.tsx`
- Test: `v2/test/tournament-page-db.test.mjs`

**Interfaces:**
- Consumes: `getTournamentBySlug(slug)`, `getAllTournamentSlugs()` from `v2/src/lib/tournamentService.ts`

- [ ] **Step 1: Write the failing test for dynamic tournament page database integration**

Create `v2/test/tournament-page-db.test.mjs`:
```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const pagePath = new URL("../src/app/[tournament]/page.tsx", import.meta.url);
const clientPath = new URL("../src/app/[tournament]/TournamentClient.tsx", import.meta.url);

test("tournament page routes and client load tournament from database service", async () => {
  const [pageContent, clientContent] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(clientPath, "utf8"),
  ]);

  assert.match(pageContent, /getAllTournamentSlugs/, "generateStaticParams must use getAllTournamentSlugs");
  assert.match(clientContent, /getTournamentBySlug/, "TournamentClient must use getTournamentBySlug");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/tournament-page-db.test.mjs` in `v2`
Expected: FAIL

- [ ] **Step 3: Update `v2/src/app/[tournament]/page.tsx` and `v2/src/app/[tournament]/TournamentClient.tsx`**

1. In `v2/src/app/[tournament]/page.tsx`:
```typescript
import { Suspense } from 'react';
import TournamentClient from './TournamentClient';
import { getAllTournamentSlugs } from '@/lib/tournamentService';

export async function generateStaticParams() {
  try {
    const slugs = await getAllTournamentSlugs();
    console.log(`Generated ${slugs.length} static params for tournaments from database/fallback`);
    return slugs.map((slug) => ({ tournament: slug }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

export default function TournamentPage({ params }: { params: Promise<{ tournament: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tournament...</p>
            </div>
          </div>
        </div>
      }
    >
      <TournamentClient params={params} />
    </Suspense>
  );
}
```

2. In `v2/src/app/[tournament]/TournamentClient.tsx`:
Replace internal raw `fetchTournamentData` with `getTournamentBySlug(resolvedParams.tournament)`.
Preserve all table parsing, team pairings, player modal, and Melbourne time footer updating.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/tournament-page-db.test.mjs` in `v2`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add v2/src/app/[tournament]/page.tsx v2/src/app/[tournament]/TournamentClient.tsx v2/test/tournament-page-db.test.mjs
git commit -m "feat(v2): update tournament page and client to query database service"
```

---

### Task 5: End-to-End Build & Static Export Verification

**Files:**
- Test: All tests in `v2/test/*.test.mjs`
- Build Output: `v2/.next` and `v2/out`

- [ ] **Step 1: Run all unit tests**

Run:
```bash
node --test test/supabase-client.test.mjs test/tournament-service.test.mjs test/home-page-db.test.mjs test/tournament-page-db.test.mjs
```
Expected: All tests pass.

- [ ] **Step 2: Run TypeScript check and ESLint**

Run:
```bash
npx tsc --noEmit
npm run lint
```
in `v2`.
Expected: 0 errors.

- [ ] **Step 3: Run static export build**

Run:
```bash
NEXT_PUBLIC_EXPORT_STATIC=true npm run build
```
in `v2`.
Expected: Static build completes successfully, outputs to `v2/out/` with pre-rendered routes.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore(v2): verify static export and typecheck with Supabase database rendering"
```
