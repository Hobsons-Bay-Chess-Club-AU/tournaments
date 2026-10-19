# Tournament Card Date Layout Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make empty multi-day cards use a larger, balanced date treatment and align the date rail with ranked players when standings exist.

**Architecture:** Keep the work inside `TournamentCard` by adding a presentation variant to its local date-chip helper and rank-specific utility classes. The existing date and player data interfaces, routes, and responsive card shell remain unchanged.

**Tech Stack:** React, TypeScript, Next.js, Tailwind CSS 4.

## Global Constraints

- Modify only the tournament card component; do not alter the menu, routes, data shape, page layout, or global CSS.
- Use the existing HBCC `primary-*` Tailwind palette; use no raw colour values.
- Preserve the compact single-day chip and all existing card interaction states.
- Do not add tests, per user direction; validate with TypeScript and whitespace checks.
- Work on `main`; leave implementation code uncommitted.

---

### Task 1: Refine the date and standings presentation

**Files:**
- Modify: `v2/src/components/TournamentCard.tsx`

**Interfaces:**
- Consumes: `date`, `endDate`, and optional `topPlayers` from `TournamentCardProps`.
- Produces: unchanged `TournamentCard` component API with refined local date-chip variants and podium styling.

- [x] **Step 1: Add a large date-chip variant for empty multi-day cards**

Extend the local `DateChip` helper with an optional presentation variant. Keep the existing `w-16` compact style as the default. Add a larger style for range cards without standings, then render those chips in a three-column grid so the first chip is left-aligned, the arrow stays centred, and the final chip is right-aligned.

- [x] **Step 2: Stretch the standings content to the range rail**

For cards with top players, make the two-column content row stretch its children. Render the ordered list as a three-row grid so its list rows fill the same available height as the vertical two-chip rail. Keep single-day player-card behavior intact.

- [x] **Step 3: Apply HBCC-teal podium hierarchy**

Map rank indexes 0, 1, and 2 to `primary-800`, `primary-200`, and `primary-50` utility combinations respectively. Retain accessible foreground contrast and the visible numeric rank label.

- [x] **Step 4: Verify the changed component**

Run:

```bash
cd v2 && npx tsc --noEmit
git diff --check
```

Expected: TypeScript exits successfully and Git reports no whitespace errors.
