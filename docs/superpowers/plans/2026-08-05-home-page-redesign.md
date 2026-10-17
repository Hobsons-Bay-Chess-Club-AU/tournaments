# Home Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a responsive, teal-brand home-page tournament catalogue with a compact masthead, accessible filters, and prominent year navigation.

**Architecture:** Keep the page's client-side tournament loading and `TournamentCard` contract unchanged. `HomeHero` owns the masthead and supporting navigation, `FilterTabs` owns category controls, and `app/page.tsx` composes the catalogue header, year state controls, and the existing grid. A small node test validates the source-level page contract alongside the existing static UI tests.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Node.js built-in test runner.

## Global Constraints

- Preserve the existing HBCC teal brand values, including `--primary: #105463`; do not introduce purple/indigo or rainbow hero accents.
- Preserve tournament fetching, status computation, filter semantics, card destination logic, and routes.
- Do not add dependencies or alter non-home routes.
- All interactive controls must expose visible focus and have a minimum 44px height.
- The home page must avoid page-level horizontal overflow at 375px and respect reduced-motion preferences.

---

### Task 1: Protect the redesigned home-page structure with a source-level test

**Files:**
- Create: `v2/test/home-page-redesign.test.mjs`
- Modify: none

**Interfaces:**
- Consumes: source text from `src/app/page.tsx`, `src/components/HomeHero.tsx`, and `src/components/FilterTabs.tsx`.
- Produces: node:test coverage for the required hero, catalogue, year-control, and mobile-filter markers.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homePath = new URL("../src/app/page.tsx", import.meta.url);
const heroPath = new URL("../src/components/HomeHero.tsx", import.meta.url);
const filtersPath = new URL("../src/components/FilterTabs.tsx", import.meta.url);

test("home page exposes a compact masthead and accessible tournament catalogue", async () => {
  const [home, hero, filters] = await Promise.all([
    readFile(homePath, "utf8"),
    readFile(heroPath, "utf8"),
    readFile(filtersPath, "utf8"),
  ]);

  assert.match(hero, /id="tournaments"/);
  assert.match(hero, /Browse tournaments/);
  assert.match(hero, /bg-primary-900/);
  assert.doesNotMatch(hero, /from-purple|to-indigo|from-yellow|to-orange|to-red/);
  assert.match(home, /<h2[^>]*>Tournaments<\/h2>/);
  assert.match(home, /aria-label="Tournament year"/);
  assert.match(home, /aria-label="Previous tournament year"/);
  assert.match(home, /aria-label="Next tournament year"/);
  assert.match(filters, /overflow-x-auto/);
  assert.match(filters, /min-h-11/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/home-page-redesign.test.mjs`

Expected: FAIL because the current home components lack the revised structural markers.

- [ ] **Step 3: Keep the test isolated from data content**

Do not assert a live tournament count or a specific year. The test must assert only stable source structure and brand restrictions so tournament data changes cannot cause a false failure.

- [ ] **Step 4: Re-run the test before implementation**

Run: `node --test test/home-page-redesign.test.mjs`

Expected: the same intentional failure, confirming the test detects the missing redesign.

### Task 2: Rebuild the hero as a compact teal masthead

**Files:**
- Modify: `v2/src/components/HomeHero.tsx`
- Test: `v2/test/home-page-redesign.test.mjs`

**Interfaces:**
- Consumes: Next.js `Link`.
- Produces: `<HomeHero />` that renders the sole page `h1`, a `#tournaments` primary anchor, and secondary timeline/leaderboard navigation.

- [ ] **Step 1: Implement the minimal masthead markup**

Replace the multi-colour gradient and pulse decorations with a semantic hero similar to:

```tsx
<section className="relative overflow-hidden bg-primary-900 text-white">
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 home-hero-pattern" />
  <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
    <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary-100">Hobsons Bay Chess Club</p>
    <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Current &amp; Archived Tournaments</h1>
    <p className="mt-4 max-w-2xl text-base leading-7 text-primary-100 sm:text-lg">Find upcoming events, revisit championship results, and follow the club&apos;s competitive history.</p>
    <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
      <a href="#tournaments" className="inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 font-bold text-primary-800 transition hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Browse tournaments</a>
      <Link href="/timeline" className="inline-flex min-h-11 items-center font-bold text-primary-100 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Tournament timeline</Link>
      <Link href="/leaderboard/overall" className="inline-flex min-h-11 items-center font-bold text-primary-100 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Overall rankings</Link>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add the restrained CSS-only pattern**

In `v2/src/app/globals.css`, add a `.home-hero-pattern` rule using two low-opacity linear gradients sized to a 40px square. Do not animate it. Add a reduced-motion rule only if a transition is introduced.

```css
.home-hero-pattern {
  background-image: linear-gradient(90deg, rgb(255 255 255 / 0.04) 1px, transparent 1px), linear-gradient(rgb(255 255 255 / 0.04) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

- [ ] **Step 3: Run the focused test to verify hero requirements pass**

Run: `node --test test/home-page-redesign.test.mjs`

Expected: the hero assertions pass; catalogue/filter assertions may remain failing until Tasks 3–4.

### Task 3: Make category filters usable at every viewport

**Files:**
- Modify: `v2/src/components/FilterTabs.tsx`
- Test: `v2/test/home-page-redesign.test.mjs`

**Interfaces:**
- Consumes: `FilterTabsProps` unchanged: `{ options, activeOption, onOptionChange }`.
- Produces: a `nav` with horizontally scrollable category controls and selected state announced through `aria-pressed`.

- [ ] **Step 1: Replace duplicated desktop/mobile markup with one responsive rail**

Use a single scrollable rail so every option retains a useful touch target:

```tsx
<nav aria-label="Tournament category" className="border-y border-[var(--color-calendar-rule)] bg-[var(--color-calendar-surface)]">
  <div className="mx-auto max-w-7xl overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
    <div className="flex min-w-max gap-2" role="group" aria-label="Tournament category filters">
      {options.map((option) => {
        const isActive = activeOption === option;
        return <button aria-pressed={isActive} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold transition-colors duration-200 motion-reduce:transition-none ${isActive ? "bg-primary-700 text-white" : "border border-primary-100 bg-white text-primary-800 hover:bg-primary-50"}`} key={option} onClick={() => onOptionChange(option)}>{option}</button>;
      })}
    </div>
  </div>
</nav>
```

- [ ] **Step 2: Confirm source-level responsive and touch-target requirements**

Run: `node --test test/home-page-redesign.test.mjs`

Expected: filter assertions pass; any remaining page-shell assertions identify Task 4 work.

### Task 4: Compose the catalogue shell and promote year navigation

**Files:**
- Modify: `v2/src/app/page.tsx`
- Test: `v2/test/home-page-redesign.test.mjs`

**Interfaces:**
- Consumes: existing `tournaments`, `filtered`, `year`, `years`, `yearIdx`, `FilterTabs`, and `TournamentCard` state/contracts.
- Produces: a home page with a labelled catalogue toolbar, live result count, top year controls, and the existing card grid inside a responsive content frame.

- [ ] **Step 1: Add a data-safe count label**

Above the filter rail, derive a label from existing data without making a new request:

```tsx
const tournamentCountLabel = `${filtered.length} ${filtered.length === 1 ? "tournament" : "tournaments"}`;
```

- [ ] **Step 2: Replace the generic white wrapper with the catalogue shell**

Render `HomeHero` followed by this hierarchy:

```tsx
<section id="tournaments" className="bg-[var(--color-calendar-paper)] py-8 sm:py-10">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="flex flex-col gap-5 rounded-[var(--radius-calendar-lg)] border border-[var(--color-calendar-rule)] bg-[var(--color-calendar-surface)] p-5 shadow-[0_16px_40px_var(--color-calendar-shadow)] sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary-700">Tournament archive</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-primary-900">Tournaments</h2>
          <p aria-live="polite" className="mt-1 text-sm font-medium text-[var(--color-calendar-muted)]">{tournamentCountLabel} in the current view</p>
        </div>
        <div aria-label="Tournament year" className="inline-flex min-h-11 items-center self-start rounded-full border border-primary-100 bg-white p-1 sm:self-auto">
          <button aria-label="Previous tournament year" disabled={yearIdx <= 0} onClick={() => yearIdx > 0 && setYear(years[yearIdx - 1])} className="grid size-10 place-items-center rounded-full text-primary-800 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700">←</button>
          <span className="min-w-20 px-3 text-center text-sm font-black text-primary-900">{year}</span>
          <button aria-label="Next tournament year" disabled={yearIdx >= years.length - 1} onClick={() => yearIdx < years.length - 1 && setYear(years[yearIdx + 1])} className="grid size-10 place-items-center rounded-full text-primary-800 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700">→</button>
        </div>
      </div>
      <FilterTabs options={CATEGORY_OPTIONS} activeOption={activeOption} onOptionChange={setActiveOption} />
    </div>
    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">...</div>
  </div>
</section>
```

- [ ] **Step 3: Preserve existing empty and card rendering behavior**

Keep the existing `filtered.map` calculation and `TournamentCard` props exactly as they are. Render the existing empty-state message inside the revised grid with a `rounded-[var(--radius-calendar-md)]` bordered surface, and remove the old bottom year paginator.

- [ ] **Step 4: Verify all redesign source assertions pass**

Run: `node --test test/home-page-redesign.test.mjs`

Expected: PASS with one passing test.

### Task 5: Run full validation and inspect responsive presentation

**Files:**
- Modify: none unless validation discovers a defect.
- Test: `v2/test/home-page-redesign.test.mjs`, `v2/test/calendar-redesign.test.mjs`

**Interfaces:**
- Consumes: completed home components.
- Produces: fresh verification evidence for source tests and the production build.

- [ ] **Step 1: Run the full node test suite**

Run: `node --test test/*.test.mjs`

Expected: PASS with all tests green.

- [ ] **Step 2: Run production build validation**

Run: `npm run build`

Expected: Next.js build completes with exit code 0.

- [ ] **Step 3: Inspect the rendered home page**

Run the local app and inspect at 375px, 768px, 1024px, and 1440px. Verify the following:

```text
375px: category chips can scroll horizontally; no page overflow; year controls and CTA are 44px or taller.
768px: catalogue heading, result count, and year controls are readable without collisions.
1024px: cards form a stable grid inside the shared max-width frame.
1440px: masthead and catalogue align to the same content edges; no empty full-width card field.
Keyboard: hero links, filters, year arrows, and cards show visible focus.
Reduced motion: card and control transitions do not animate when the preference is enabled.
```

- [ ] **Step 4: Review the diff before handoff**

Run: `git diff --check && git diff -- v2/src/app/page.tsx v2/src/components/HomeHero.tsx v2/src/components/FilterTabs.tsx v2/src/app/globals.css v2/test/home-page-redesign.test.mjs`

Expected: no whitespace errors and only the scoped home-page redesign changes.
