# Tournament Card Date-Range Rail Design

## Goal

Improve date-range readability inside the home-page tournament card without changing its routing, standings display, menu, filters, or brand treatment.

## Experience

One-day events keep the existing compact date chip. Multi-day events replace that chip with a narrow vertical rail on the left of the card content:

- A `From` label above a compact start-date chip.
- A subtle vertical connector.
- A `To` label above a compact end-date chip.

The title, location, status/category row, action label, and optional top-three standings remain unchanged and sit to the right of the rail. The rail uses existing Tailwind `primary-*` utilities and collapses safely within the card's existing mobile layout.

## Scope

Modify only `v2/src/components/TournamentCard.tsx`. No data, page, menu, filter, route, or global-style change is needed.

## Verification

Run `npx tsc --noEmit` from `v2/`. Inspect one-day and multi-day card instances to confirm one-day cards retain their current chip and multi-day cards show both dates in the vertical rail without wrapping or horizontal overflow.
