# Calendar Mobile Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce mobile calendar noise to one useful summary strip and present selected-day events in an accessible bottom-sheet modal.

**Architecture:** `CalendarClient` retains its existing state and uses `selectedDateKey` to derive modal content. A native `HTMLDialogElement` appears only below the desktop breakpoint; the desktop detail rail is unchanged. CSS controls the compact summary, mobile modal, and desktop-only rail.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS custom properties, native `<dialog>`.

## Global Constraints

- Preserve all calendar data, filtering, registration, month navigation, and senior/junior event URLs.
- Below 40 rem, show only the event count and existing “Up next” action in the summary area.
- Day activation opens a dismissible native dialog on mobile; Escape and a close button must dismiss it.
- Above 60 rem, retain the persistent details rail and do not show the dialog.
- Keep keyboard focus visible, restore focus to the activated day after closing, and respect reduced motion.
- Do not delete files or commit changes.

---

### Task 1: Add modal behaviour and semantics

**Files:**

- Modify: `v2/src/app/calendar/CalendarClient.tsx:1-3, 312-539, 660-751`
- Test: `v2/test/calendar-redesign.test.mjs`

**Interfaces:**

- Consumes: `selectedDateKey`, `selectedDayEntries`, `formatDateLabel`, and existing day-button handlers.
- Produces: `detailsDialogRef`, `openDayDetails(dateKey)`, and `closeDayDetails()` for the mobile dialog.

- [ ] **Step 1: Write the failing regression expectation**

Add source assertions for the required dialog primitives:

```js
assert.match(client, /useRef<HTMLDialogElement>\(null\)/);
assert.match(client, /function openDayDetails\(dateKey: string\)/);
assert.match(client, /<dialog ref=\{detailsDialogRef\}/);
assert.match(client, /onClose=\{closeDayDetails\}/);
```

- [ ] **Step 2: Run the regression test and verify it fails**

Run: `node --test test/calendar-redesign.test.mjs`

Expected: FAIL because `CalendarClient` has no dialog reference, open helper, or dialog markup.

- [ ] **Step 3: Implement the dialog lifecycle**

Import `useRef` and add:

```tsx
const detailsDialogRef = useRef<HTMLDialogElement>(null);
const lastDayButtonRef = useRef<HTMLButtonElement | null>(null);

function openDayDetails(dateKey: string, button: HTMLButtonElement) {
  setSelectedDateKey(dateKey);
  lastDayButtonRef.current = button;
  if (window.matchMedia("(max-width: 59.99rem)").matches) {
    requestAnimationFrame(() => detailsDialogRef.current?.showModal());
  }
}

function closeDayDetails() {
  detailsDialogRef.current?.close();
  lastDayButtonRef.current?.focus({ preventScroll: true });
}
```

Change day buttons to call `openDayDetails(day.dateKey, event.currentTarget)`. Render a `<dialog ref={detailsDialogRef} className="calendar-details-dialog" onClose={closeDayDetails}>` containing the selected date, the same event cards/links used by the details rail, and a `Close details` button. Prevent `onClose` from re-closing the dialog by treating it solely as focus restoration.

- [ ] **Step 4: Verify the regression test passes**

Run: `node --test test/calendar-redesign.test.mjs`

Expected: PASS with all source-level regression checks green.

### Task 2: Simplify the mobile summary and style the bottom sheet

**Files:**

- Modify: `v2/src/app/calendar/calendar.css:74-110, 201-254`
- Modify: `v2/test/calendar-redesign.test.mjs`

**Interfaces:**

- Consumes: `.calendar-utility__count`, `.calendar-utility__next`, `.calendar-utility__registration`, `.calendar-utility__hint`, and `.calendar-details-dialog`.
- Produces: a two-part mobile summary and a modal presentation that is hidden at desktop width.

- [ ] **Step 1: Add failing CSS expectations**

Add:

```js
assert.match(styles, /\.calendar-utility__registration,\s*\.calendar-utility__hint \{\s*display: none;/);
assert.match(styles, /\.calendar-details-dialog\[open\]/);
assert.match(styles, /\.calendar-details-dialog::backdrop/);
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test test/calendar-redesign.test.mjs`

Expected: FAIL because the current mobile layout still shows all utility items and has no dialog styling.

- [ ] **Step 3: Implement the compact layout and bottom sheet**

At the mobile base style, hide `.calendar-utility__registration` and `.calendar-utility__hint`; make `.calendar-utility` a single row with two equal tracks. Reduce utility padding and remove card-style borders from the count/next pieces so they read as one summary band.

Add the modal rules:

```css
.calendar-details-dialog {
  background: var(--color-calendar-surface);
  border: 1px solid var(--color-calendar-rule);
  border-radius: var(--radius-calendar-lg) var(--radius-calendar-lg) 0 0;
  bottom: 0;
  color: var(--color-calendar-ink);
  margin: auto 0 0;
  max-height: min(82dvh, 44rem);
  max-width: none;
  overflow: auto;
  padding: var(--space-md);
  width: 100%;
}
.calendar-details-dialog[open] { display: block; }
.calendar-details-dialog::backdrop { background: oklch(28% 0.03 210 / 0.42); }
@media (min-width: 60rem) { .calendar-details-dialog { display: none; } }
```

Move the backdrop colour to `tokens.css` as `--color-calendar-scrim` and reference that named token. Use the existing event card classes inside the dialog to keep detail content consistent.

- [ ] **Step 4: Restore desktop utility items**

At `@media (min-width: 40rem)`, set `.calendar-utility__registration` and `.calendar-utility__hint` back to `display: block` and restore the existing four-item grid. The desktop details rail remains visible.

- [ ] **Step 5: Verify tests and production build**

Run:

```bash
node --test test/calendar-redesign.test.mjs
npm run build
git diff --check
```

Expected: all tests pass, the production build succeeds, and the diff has no whitespace errors.
