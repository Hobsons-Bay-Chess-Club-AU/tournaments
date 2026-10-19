# Home Tournament Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish each tournament's optional top-three standings and render it in a playful, easy-to-scan home-page card.

**Architecture:** Derive `top_players` from the already enriched standings rows while producing `www/tournament.json`. Extract the home-card presentation into a dedicated Tailwind component, then make the home page retain data fetching, filtering, sorting, and destination selection while delegating card rendering.

**Tech Stack:** Node.js and Cheerio data preparation; Next.js 16, React 19, TypeScript, Tailwind CSS 4.

## Global Constraints

- Change only tournament-card presentation and the data it needs; do not alter menu, hero, filters, pagination, or routing rules.
- Use the existing `primary-*` Tailwind utilities and Geist font tokens; introduce no global palette or font changes.
- The generated `top_players` property is optional and has the exact shape `Array<{ name: string; point: number; elo: string; title: string }>`.
- Completed events link to standings; planned and in-progress events link to the tournament route.
- Do not add an automated test file; validate with the data generator, Next build, and responsive browser inspection.
- The top-three strip renders only when player data is available; never invent player data or an empty placeholder.

---

### Task 1: Publish top standings in the tournament index

**Files:**
- Modify: `src/prepare-data.mjs:1044-1153` and `src/prepare-data.mjs:1559-1584`

**Interfaces:**
- Consumes: enriched standings rows in `result.page['standings.html'].tables`, with `Player.playerName`, `Player.title`, `Player.rating`, `Pts`, and optional `Pos`.
- Produces: optional `top_players` on each `www/tournament.json` entry, with `{ name, point, elo, title }` records in final-standing order.

- [ ] **Step 1: Add a focused standings extractor above `processFolder`**

```js
function extractTopPlayers(pageData) {
    const standingsTable = pageData['standings.html']?.tables?.find((table) => {
        const headers = table.headers?.map((header) =>
            typeof header === 'string' ? header : header.name
        ) || [];
        return headers.includes('Player') && headers.includes('Pts');
    });

    if (!standingsTable?.rows) return [];

    return standingsTable.rows
        .map((row) => {
            const player = row.Player;
            const point = Number.parseFloat(String(row.Pts ?? ''));
            const position = Number.parseInt(String(row.Pos ?? ''), 10);
            if (!player?.playerName || !Number.isFinite(point)) return null;
            return {
                name: player.playerName.trim(),
                point,
                elo: String(player.rating || ''),
                title: String(player.title || ''),
                position: Number.isFinite(position) ? position : Number.MAX_SAFE_INTEGER,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.position - b.position || b.point - a.point || a.name.localeCompare(b.name))
        .slice(0, 3)
        .map(({ position, ...player }) => player);
}
```

- [ ] **Step 2: Attach data after the existing table-enrichment pass**

```js
result.page = enrichTablesWithPlayerData(result.page, playerLookup);
result.top_players = extractTopPlayers(result.page);
```

When assembling `tournaments`, include the property only when rows exist:

```js
const topPlayers = result.top_players || [];
tournaments.push({
    data: result.metadata,
    path: `${folderName}/data.json`,
    category: result.category || result.metadata.category || 'Junior',
    ...(topPlayers.length > 0 ? { top_players: topPlayers } : {}),
});
```

- [ ] **Step 3: Regenerate and inspect data**

Run: `node src/prepare-data.mjs`

Inspect: `node -e 'const fs=require("fs"); const data=JSON.parse(fs.readFileSync("www/tournament.json")); console.log(data.find((t)=>t.top_players)?.top_players)'`

Expected: up to three `{ name, point, elo, title }` objects for an event with valid standings; events without valid standings have no `top_players` key.

- [ ] **Step 4: Commit the data contract**

```bash
git add src/prepare-data.mjs www/tournament.json
git commit -m "feat: publish tournament top players"
```

### Task 2: Create the Tailwind tournament-card component and state preview

**Files:**
- Create: `v2/src/components/TournamentCard.tsx`
- Create: `v2/src/components/TournamentCard.preview.tsx`

**Interfaces:**
- Consumes: `TournamentCardProps` with tournament name, dates, site, category, derived status, destination URL, and optional `topPlayers`.
- Produces: an accessible `Link` card with status-specific destination copy and an optional top-three standings strip.

- [ ] **Step 1: Define the component data contract**

```ts
export type TopPlayer = {
  name: string;
  point: number;
  elo: string;
  title: string;
};

export type TournamentCardProps = {
  title: string;
  date: string;
  endDate: string;
  site: string;
  category: string;
  status: "Completed" | "Planned" | "In Progress";
  href: string;
  topPlayers?: TopPlayer[];
  previewState?: "default" | "hover" | "focus" | "active" | "disabled" | "loading" | "error" | "success";
};
```

- [ ] **Step 2: Implement the ticket hierarchy with Tailwind utilities**

Render the following DOM order inside the existing `next/link` component:

```tsx
<div className="flex items-start justify-between gap-3">
  <span>{status}</span>
  <span>{category}</span>
</div>
<div className="mt-6 flex items-start gap-4">
  <time>{date}</time>
  <div><h2>{title}</h2>{site && <p>{site}</p>}</div>
</div>
{topPlayers?.length ? <ol aria-label="Top standings">...</ol> : null}
<span>{status === "Completed" ? "View standings" : "Open tournament"}</span>
```

Use `group`, `focus-visible:outline`, and `transition-transform` with existing Tailwind `primary-*` utilities. Hover movement is limited to one small `-translate-y-1`; active movement returns it to `translate-y-0`. The title has `min-w-0` and `break-words`, and every direct action label uses `whitespace-nowrap`.

For the top-three row, show rank, name, optional title, point total, and optional ELO. Use semantic `<ol>` and stable rank labels rather than colour alone.

- [ ] **Step 3: Add the non-production Hallmark state wrapper**

`TournamentCard.preview.tsx` renders eight labelled instances with `previewState` set to `default`, `hover`, `focus`, `active`, `disabled`, `loading`, `error`, and `success`. In `TournamentCard.tsx`, each state gets an explicit visual treatment while retaining readable content: disabled is non-interactive with `aria-disabled`, loading exposes `aria-busy`, error includes a text explanation, and success adds a text-plus-icon confirmation. The normal home-page path never passes `previewState`.

- [ ] **Step 4: Commit the component**

```bash
git add v2/src/components/TournamentCard.tsx v2/src/components/TournamentCard.preview.tsx
git commit -m "feat: add tournament ticket card"
```

### Task 3: Wire cards into the home page and verify the route

**Files:**
- Modify: `v2/src/app/page.tsx:1-168`

**Interfaces:**
- Consumes: `TournamentCard`, `TopPlayer`, and the optional `top_players` field returned by `/tournament.json`.
- Produces: the existing filtered card grid with the same status logic and routes, now delegated to `TournamentCard`.

- [ ] **Step 1: Extend the home-page tournament type and import the component**

```ts
import TournamentCard, { type TopPlayer } from "@/components/TournamentCard";

type Tournament = {
  data: TournamentMeta;
  path: string;
  category: string;
  top_players?: TopPlayer[];
  status?: "Completed" | "Planned" | "In Progress";
};
```

- [ ] **Step 2: Replace only the inline `<Link>` card block**

Keep all existing `title`, `date`, `endDate`, `site`, `slug`, status, and `linkUrl` derivation. Replace the returned link with:

```tsx
<TournamentCard
  key={t.path}
  title={title}
  date={date}
  endDate={endDate}
  site={site}
  category={t.category}
  status={status}
  href={linkUrl}
  topPlayers={t.top_players}
/>
```

Update the surrounding grid to `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3` with `min-w-0` on each grid child so the card remains readable without changing any menu or filter structure.

- [ ] **Step 3: Build and inspect responsive states**

Run: `npm run build` from `v2/`

Inspect the home page at 320, 375, 414, and 768 CSS pixels. Confirm no horizontal scrolling, a visible focus ring, non-wrapping destination labels, completed cards targeting standings, active/planned cards targeting tournament details, top-three rendering, and cards without standings rendering cleanly.

- [ ] **Step 4: Commit the home-page integration**

```bash
git add v2/src/app/page.tsx
git commit -m "feat: redesign home tournament cards"
```
