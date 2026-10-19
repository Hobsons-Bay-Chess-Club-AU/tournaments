# Tournament Card Date-Range Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present tournament date ranges in a clearer card-content layout, pairing the date treatment with top standings when available.

**Architecture:** Keep the existing status header and title area. In `TournamentCard`, choose between a split date-and-standings content row for cards with top players and a full-width horizontal date treatment for cards without them. One-day events retain a single date chip.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4.

## Global Constraints

- Modify only `v2/src/components/TournamentCard.tsx`.
- Do not change data contracts, routing, menus, filters, or global styles.
- Use existing Tailwind `primary-*` utilities with no arbitrary colour values.
- Keep the card code uncommitted.
- Do not add automated tests; run `npx tsc --noEmit` and inspect the component variants.

---

### Task 1: Move date presentation into responsive card content

**Files:**
- Modify: `v2/src/components/TournamentCard.tsx:34-123`

**Interfaces:**
- Consumes: existing `date`, `endDate`, and optional `topPlayers` props.
- Produces: a one-day chip, a vertical multi-day rail paired with standings, or a horizontal multi-day treatment when standings are absent.

- [ ] **Step 1: Add reusable compact date-chip markup**

Keep `getDateChip(date)` as the date parser and add a local `DateChip` rendering helper that uses its day, month, and year fields. It returns the existing compact single-date chip for a valid date and a wrapping-safe fallback for an unparseable date.

```tsx
const DateChip = ({ value }: { value: string }) => {
  const chip = getDateChip(value);
  return chip ? (
    <time className="flex w-16 shrink-0 flex-col items-center rounded-2xl bg-primary-50 px-2 py-2 text-primary-800">
      <span className="text-2xl font-black leading-none">{chip.day}</span>
      <span className="mt-1 text-[10px] font-black leading-none tracking-wide">{chip.month}</span>
      <span className="mt-1 text-[10px] font-bold leading-none text-primary-700">{chip.year}</span>
    </time>
  ) : <time className="max-w-full break-words text-xs font-bold text-primary-800">{value || "Date TBC"}</time>;
};
```

- [ ] **Step 2: Render the date variants below the title/location block**

Set `isMultiDay` only when both values exist and differ. Use these variants:

```tsx
{topPlayers?.length ? (
  <div className="mt-6 grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] gap-4">
    <div className="flex flex-col items-center gap-2">
      <DateChip value={date} />
      {isMultiDay && <span aria-hidden="true" className="text-primary-700">↓</span>}
      {isMultiDay && <DateChip value={endDate} />}
    </div>
    <ol aria-label="Top standings">...</ol>
  </div>
) : isMultiDay ? (
  <div className="mt-6 flex min-w-0 items-center gap-3">
    <DateChip value={date} />
    <span aria-hidden="true" className="text-primary-700">→</span>
    <DateChip value={endDate} />
  </div>
) : (
  <div className="mt-6"><DateChip value={date} /></div>
)}
```

Remove the date chip from the title row. Keep the exact existing top-three `<ol>` content and preserve `aria-label="Top standings"`. The connector glyphs are decorative and must remain `aria-hidden`.

- [ ] **Step 3: Verify static types and visual states**

Run: `npx tsc --noEmit` from `v2/`

Inspect the preview component for a completed multi-day card with players, then temporarily use an empty `topPlayers` array to confirm the horizontal range treatment. Check a one-day card still has exactly one compact chip.

- [ ] **Step 4: Keep code uncommitted**

Do not stage or commit `TournamentCard.tsx`; the user requested that code remain uncommitted on `main`.
