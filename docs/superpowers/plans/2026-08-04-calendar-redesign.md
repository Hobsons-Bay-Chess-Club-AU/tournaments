# Calendar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `/calendar` route a playful, mobile-first planning surface for Hobsons Bay Chess Club families while preserving its existing live CSV behaviour.

**Architecture:** Keep all fetching, parsing, filtering, month navigation, and link logic in `CalendarClient`. Replace its presentation-only Tailwind utility composition with semantic calendar classes styled by a route stylesheet, backed by named tokens. `page.tsx` remains a thin server-route shell and imports the route stylesheet.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4 (existing global entry), CSS custom properties.

## Global Constraints

- Preserve `CSV_URL`, CSV parsing, filtering, month navigation, selected-date behaviour, registration URL, and senior/junior links.
- Do not modify the shared header, footer, routing tree, data source, or external destinations.
- Preserve the HBCC teal anchor and Geist font variables; do not fabricate event content, metrics, testimonials, or logos.
- Use named tokens from `v2/tokens.css`; route CSS must not inline raw colour values or bypass tokenized font families.
- Support 320 px, 375 px, 414 px, and 768 px with no horizontal scroll and no wrapped clickable labels.
- Make all interactive controls keyboard reachable with an immediate visible `:focus-visible` treatment and 44 px minimum touch targets.
- Use transitions only for `background-color`, `border-color`, `color`, `opacity`, and `transform`; honour reduced motion.

---

## File structure

- `v2/tokens.css` — calendar design tokens: colour, spacing, type, radius, duration, and easing values.
- `v2/src/app/globals.css` — imports `tokens.css` below Tailwind’s entry import and provides safe global overflow handling.
- `v2/src/app/calendar/calendar.css` — the full route-scoped visual and responsive system, stamped with the Hallmark decision.
- `v2/src/app/calendar/page.tsx` — imports the route stylesheet and supplies the revised route shell and heading copy.
- `v2/src/app/calendar/CalendarClient.tsx` — retains state/data logic; replaces presentational class strings with semantic class names and accessible labels.

## Task 1: Establish the calendar token and stylesheet boundary

**Files:**

- Create: `v2/tokens.css`
- Modify: `v2/src/app/globals.css:1-42`
- Create: `v2/src/app/calendar/calendar.css`
- Modify: `v2/src/app/calendar/page.tsx:1-22`

**Interfaces:**

- Consumes: existing `--font-geist-sans`, `--font-geist-mono`, and HBCC primary colour intent.
- Produces: the `.calendar-page` route scope and tokens used by the route shell and `CalendarClient` classes in Task 2.

- [ ] **Step 1: Add the token import and confirm the build exposes a missing route stylesheet error**

In `v2/src/app/calendar/page.tsx`, add the exact import before the component:

```ts
import "./calendar.css";
```

Run: `npm run build` from `v2/`

Expected: FAIL with a module-resolution error for `./calendar.css`.

- [ ] **Step 2: Add named tokens and the route stylesheet**

Create `v2/tokens.css` with a `:root` block containing, at minimum:

```css
:root {
  --color-calendar-paper: oklch(98% 0.008 210);
  --color-calendar-surface: oklch(100% 0 0);
  --color-calendar-ink: oklch(28% 0.03 210);
  --color-calendar-muted: oklch(53% 0.025 210);
  --color-calendar-rule: oklch(87% 0.025 210);
  --color-calendar-teal: oklch(38% 0.075 205);
  --color-calendar-teal-strong: oklch(31% 0.07 205);
  --color-calendar-teal-soft: oklch(93% 0.028 205);
  --color-calendar-sun: oklch(82% 0.14 84);
  --color-calendar-coral: oklch(70% 0.13 30);
  --color-calendar-focus: oklch(50% 0.13 225);
  --font-calendar-body: var(--font-geist-sans), Arial, sans-serif;
  --font-calendar-mono: var(--font-geist-mono), monospace;
  --space-2xs: 0.5rem;
  --space-xs: 0.75rem;
  --space-sm: 1rem;
  --space-md: 1.5rem;
  --space-lg: 2rem;
  --space-xl: 3rem;
  --radius-calendar-sm: 0.75rem;
  --radius-calendar-md: 1.25rem;
  --radius-calendar-lg: 1.75rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-short: 180ms;
}
```

Append `@import "../../tokens.css";` to `globals.css` directly after `@import "tailwindcss";` and append:

```css
html,
body {
  overflow-x: clip;
}
```

Create `calendar.css`; its first line must be:

```css
/* Hallmark · macrostructure: Workbench · tone: playful · anchor hue: HBCC teal */
```

Give `.calendar-page` the tokenized background, text colour, typography, and responsive container padding. Add focus, transition, and reduced-motion rules shared by `.calendar-page button`, `.calendar-page a`, `.calendar-page input`, and `.calendar-page select`.

- [ ] **Step 3: Replace the existing route shell with semantic markup**

Replace the outer wrappers in `page.tsx` with:

```tsx
<div className="calendar-page">
  <div className="calendar-page__inner">
    <header className="calendar-page__intro">
      <p className="calendar-page__eyebrow">Hobsons Bay Chess Club</p>
      <h1>Plan your chess year</h1>
      <p>Find upcoming club events, browse a month, or choose a day to see every detail.</p>
    </header>
    <CalendarClient />
  </div>
</div>
```

- [ ] **Step 4: Verify the boundary**

Run: `npm run build` from `v2/`

Expected: PASS and no stylesheet import or TypeScript errors.

## Task 2: Recompose the calendar client without altering its data behaviour

**Files:**

- Modify: `v2/src/app/calendar/CalendarClient.tsx:541-840`
- Modify: `v2/src/app/calendar/calendar.css`

**Interfaces:**

- Consumes: `CalendarEntry`, `filteredEntries`, `calendarDays`, `selectedDayEntries`, and the existing event handlers from `CalendarClient`.
- Produces: semantic presentation classes for the utility band, filters, month grid, and selected-day panel.

- [ ] **Step 1: Write a render-preservation checklist before changing JSX**

Record these required controls from the current JSX as an implementation checklist:

```text
Portal registration link → https://portal.hobsonsbaychess.com/
Search input → setSearch
Month select → setSelectedMonth
Event-type buttons → setSelectedType
Reset filters → clearFilters
Previous / Today / Next → shiftMonth(-1) / goToToday / shiftMonth(1)
Day button → setSelectedDateKey(day.dateKey)
Selected-day Clear → setSelectedDateKey(null)
Senior / Junior links → entry.seniorLink / entry.juniorLink
```

- [ ] **Step 2: Replace only presentation classes and add semantic labels**

Keep the existing handler expressions and data expressions. Replace the large Tailwind class strings from lines 549–839 with the following top-level class map:

```text
calendar-client
calendar-utility / calendar-utility__registration / calendar-utility__count / calendar-utility__next / calendar-utility__hint
calendar-filters / calendar-filters__field / calendar-filter-chips / calendar-filter-chip
calendar-workspace / calendar-month / calendar-month__toolbar / calendar-month__grid
calendar-day / calendar-day--outside / calendar-day--today / calendar-day--selected / calendar-day__event
calendar-details / calendar-details__summary / calendar-details__list / calendar-event
```

Add `aria-label={`View events for ${formatDateLabel(day.date)}`}` to every day button. Add `aria-pressed={isSelected}` to event-type buttons and `aria-current="date"` to the today date marker when `day.isToday` is true. Keep selected-day cards in the DOM after the calendar so CSS can place the detail section in the right rail only at desktop widths.

- [ ] **Step 3: Implement the desktop-first calendar workspace rules with mobile base styles**

In `calendar.css`, implement these exact layout relationships:

```css
.calendar-workspace { display: grid; gap: var(--space-md); }
.calendar-month__grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.calendar-details { min-width: 0; }

@media (min-width: 60rem) {
  .calendar-workspace {
    grid-template-columns: minmax(0, 1.7fr) minmax(18rem, 0.8fr);
    align-items: start;
  }
  .calendar-details { position: sticky; top: var(--space-md); }
}
```

Use a compact mobile day-cell presentation: always show the date and event-count marker, show at most one abbreviated event label at narrow widths, and reveal the current three-event presentation from 40 rem upward. Use `min-height: 4.75rem` at mobile and a larger content-driven height at 40 rem. Do not introduce horizontal scrolling.

- [ ] **Step 4: Implement the playful visual hierarchy and all visible states**

Style the utility band as an irregular but restrained grid: the registration item is teal, the upcoming-event item is selectable, and the total and helper items are quieter. Use the teal soft surface for selected days, the sun token for count badges, and coral only as a small event-accent signal.

Implement each of the following states in `calendar.css`:

```css
.calendar-filter-chip:hover, .calendar-filter-chip.is-hover { /* tokenized hover */ }
.calendar-filter-chip:focus-visible { /* immediate 3:1+ ring */ }
.calendar-filter-chip:active { transform: translateY(1px); }
.calendar-filter-chip[aria-pressed="true"] { /* selected state */ }
.calendar-filter-chip:disabled { opacity: 0.55; cursor: not-allowed; }
.calendar-day:hover, .calendar-day:focus-visible, .calendar-day:active { /* distinct states */ }
.calendar-day--selected { /* selected state */ }
```

Use the same state discipline for month controls, the reset control, and registration/event links. Use `white-space: nowrap` for every button/link label. Include `@media (prefers-reduced-motion: reduce)` that disables transforms and leaves opacity transitions at no more than 150 ms.

- [ ] **Step 5: Verify interaction and type safety**

Run: `npm run build` from `v2/`

Expected: PASS. Manually exercise each action from Step 1 and confirm it still invokes the same existing handler or destination.

## Task 3: Verify responsive behaviour and visual quality

**Files:**

- Modify only if verification finds a defect: `v2/src/app/calendar/calendar.css`, `v2/src/app/calendar/CalendarClient.tsx`, or `v2/src/app/calendar/page.tsx`

**Interfaces:**

- Consumes: the completed `/calendar` route and live CSV response.
- Produces: verified layout behaviour at the required viewports with unchanged live interactions.

- [ ] **Step 1: Start the calendar locally**

Run: `npm run dev` from `v2/`

Expected: Next.js serves `/calendar` locally; the existing parallel static server may also start on port 5555.

- [ ] **Step 2: Run the viewport checklist**

Inspect `/calendar` at 320 px, 375 px, 414 px, and 768 px. At each width, verify all of the following:

```text
No horizontal scrolling.
Intro copy wraps without overflowing.
Search, select, reset, type filters, and month controls are reachable and have single-line labels.
Day cells remain tappable and show date plus useful event status.
Selected-day details appear below the month at sub-960 px.
The selected-day details rail appears beside the month at 960 px and above.
```

- [ ] **Step 3: Run the functional checklist against live data**

Verify these outcomes:

```text
Typing a known event term filters the count and visible days.
Changing month updates the displayed month.
Selecting a type and Reset filters restore the unfiltered view.
Previous, Today, and Next change the visible month correctly.
Selecting a populated day updates the selected-day title and event cards.
Portal registration, Senior link, and Junior link retain their original URLs and open in a new tab.
Keyboard Tab displays a visible focus ring on every reachable control.
```

- [ ] **Step 4: Run final build and static checks**

Run:

```bash
npm run build
git diff --check
```

Expected: both commands exit successfully with no TypeScript, CSS import, or whitespace errors.
